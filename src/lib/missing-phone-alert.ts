import { ObjectId, type Db } from 'mongodb'
import { flexParseDateExpr } from '@/lib/flex-date-expr'
import { getLeaderAllowedUserIds } from '@/lib/visit-auth'

type Visit = {
  _id: ObjectId
  nama_sales?: string
  pic_phone?: unknown
}

type AlertSeverity = 'warning' | 'danger' | 'critical'

/** Set of roles that are tracked by missing-phone alerts */
const TRACKED_ROLES = new Set(['SALES', 'LEADER'])

export function isPhoneFilled(value: unknown): boolean {
  if (value == null) return false
  const phone = String(value).trim()
  return phone !== '' && phone !== '-' && phone !== '0'
}

export function isVisitedStatus(value: unknown): boolean {
  return String(value ?? '').trim().toLowerCase() === 'visited'
}

export function normalizeSatuanKerjaKey(value: string): string {
  return value.trim().toLowerCase()
}

export function missingPhoneEntityExpr() {
  return {
    $ifNull: [
      {
        $cond: [
          { $ne: ['$satuan_kerja', ''] },
          '$satuan_kerja',
          null,
        ],
      },
      {
        $ifNull: [
          '$namaEntitas',
          { $ifNull: ['$nama_entitas', '$institusi_kerja'] },
        ],
      },
    ],
  }
}

export function countMissingPhoneStreak(visits: Pick<Visit, 'pic_phone'>[]) {
  let count = 0
  for (const visit of visits) {
    if (isPhoneFilled(visit.pic_phone)) break
    count += 1
  }
  return count
}

export function getMissingPhoneSeverity(count: number): AlertSeverity {
  if (count >= 8) return 'critical'
  if (count >= 5) return 'danger'
  return 'warning'
}

/**
 * Build a case-insensitive regex for exact satuan_kerja matching.
 * This handles user input with inconsistent casing or leading/trailing spaces.
 */
function satuanKerjaFilter(satuanKerja: string) {
  const trimmed = satuanKerja.trim()
  // Escape regex special characters
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { $regex: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }
}

/** Ensure indexes are created only once per process lifetime */
let indexesEnsured = false
async function ensureIndexes(db: Db) {
  if (indexesEnsured) return
  const alerts = db.collection('MissingPhoneAlert')
  await alerts.createIndex(
    { user_id: 1, satuan_kerja: 1 },
    {
      name: 'missing_phone_active',
      unique: true,
      partialFilterExpression: { status: 'active' },
    },
  )
  await alerts.createIndex(
    { user_id: 1, satuan_kerja: 1 },
    {
      name: 'missing_phone_acknowledged',
      unique: true,
      partialFilterExpression: { status: 'acknowledged' },
    },
  )
  indexesEnsured = true
}

async function getStreak(
  db: Db,
  userId: string,
  satuanKerja: string,
  excludeVisitId?: ObjectId,
) {
  if (!ObjectId.isValid(userId)) {
    return { count: 0, latest: null as Visit | null, user: null }
  }

  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { role: 1, fullName: 1, username: 1 } },
  )
  if (!user || !TRACKED_ROLES.has(user.role as string)) {
    return { count: 0, latest: null as Visit | null, user }
  }

  const ownerMatch: Record<string, unknown>[] = [
    { user_id: { $in: [new ObjectId(userId), userId] } },
  ]
  const names = [user.fullName, user.username]
    .map((name) => String(name || '').trim())
    .filter((name, index, all) => name && all.indexOf(name) === index)
  if (names.length) {
    ownerMatch.push({
      $and: [
        { $or: names.map((name) => ({ nama_sales: satuanKerjaFilter(name) })) },
        {
          $or: [{ user_id: { $exists: false } }, { user_id: null }],
        },
      ],
    })
  }

  const match: Record<string, unknown> = {
    $or: ownerMatch,
    __alertEntity: satuanKerjaFilter(satuanKerja),
    status_visit: { $regex: /^\s*visited\s*$/i },
  }
  if (excludeVisitId) match._id = { $ne: excludeVisitId }

  const visits = (await db
    .collection('VisitActivity')
    .aggregate([
      { $addFields: { __alertEntity: missingPhoneEntityExpr() } },
      { $match: match },
      {
        $addFields: {
          __alertDate: {
            $ifNull: [
              flexParseDateExpr('$visit_date'),
              flexParseDateExpr('$created_at'),
            ],
          },
        },
      },
      { $sort: { __alertDate: -1, _id: -1 } },
      { $project: { _id: 1, nama_sales: 1, pic_phone: 1 } },
    ])
    .toArray()) as Visit[]

  const count = countMissingPhoneStreak(visits)
  return { count, latest: visits[0] ?? null, user }
}

export async function getConsecutiveMissingPhoneCount(
  db: Db,
  userId: string,
  satuanKerja: string,
  excludeVisitId?: ObjectId,
) {
  const result = await getStreak(db, userId, satuanKerja, excludeVisitId)
  return result.count
}

async function upsertNotification(
  db: Db,
  userId: string,
  message: string,
  link: string,
  title: string,
  unread: boolean,
) {
  const now = new Date()
  await db.collection('notifications').updateOne(
    { userId, type: 'MISSING_PHONE', link },
    {
      $set: {
        title,
        message,
        updatedAt: now,
        ...(unread ? { isRead: false } : {}),
      },
      $setOnInsert: {
        ...(unread ? {} : { isRead: false }),
        createdAt: now,
      },
    },
    { upsert: true },
  )
}

export async function recomputeAlert(
  db: Db,
  userId: string,
  satuanKerja: string,
) {
  if (!satuanKerja.trim()) return
  const { count, latest, user } = await getStreak(db, userId, satuanKerja)
  if (!user || !TRACKED_ROLES.has(user.role as string)) return

  const alerts = db.collection('MissingPhoneAlert')
  await ensureIndexes(db)

  const key = { user_id: new ObjectId(userId), satuan_kerja: satuanKerja }
  const existing = await alerts.findOne({
    ...key,
    status: { $in: ['active', 'acknowledged'] },
  })
  if (!existing && latest && count >= 3) {
    const dismissed = await alerts.findOne({
      ...key,
      status: 'resolved',
      resolved_by: 'admin_dismissed',
      last_visit_id: latest._id,
    })
    if (dismissed) return
  }

  if (count < 3 || !latest) {
    if (existing?.status === 'active' || existing?.status === 'acknowledged') {
      const resolvedAt = new Date()
      const resolvedBy = count === 0 && isPhoneFilled(latest?.pic_phone)
        ? 'user_filled'
        : undefined
      const update: {
        $set: Record<string, unknown>
        $unset?: Record<string, string>
      } = {
        $set: {
          status: 'resolved',
          resolved_at: resolvedAt,
          consecutive_count: count,
          ...(latest ? { last_visit_id: latest._id } : {}),
          ...(resolvedBy ? { resolved_by: resolvedBy } : {}),
        },
      }
      if (!resolvedBy) update.$unset = { resolved_by: '' }
      await alerts.updateOne(
        { _id: existing._id },
        update,
      )
      const links = [
        `/plan-activity?missingPhoneAlert=${existing._id}`,
        `/monitoring-leader?tab=missing-phone&alertId=${existing._id}`,
      ]
      await db.collection('notifications').updateMany(
        { type: 'MISSING_PHONE', link: { $in: links } },
        { $set: { isRead: true, updatedAt: resolvedAt } },
      )
    }
    return
  }

  const now = new Date()
  const severity = getMissingPhoneSeverity(count)
  const severityChanged = existing?.severity !== severity
  const alertData = {
    nama_sales: latest.nama_sales || user.fullName || user.username || '',
    consecutive_count: count,
    severity,
    status: existing?.status === 'acknowledged' ? 'acknowledged' : 'active',
    last_visit_id: latest._id,
  }

  let alertId: ObjectId
  if (existing) {
    await alerts.updateOne(
      { _id: existing._id },
      { $set: alertData },
    )
    alertId = existing._id
  } else {
    try {
      const inserted = await alerts.insertOne({
        ...key,
        ...alertData,
        first_triggered_at: now,
      })
      alertId = inserted.insertedId
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error
      const concurrentAlert = await alerts.findOne({
        ...key,
        status: { $in: ['active', 'acknowledged'] },
      })
      if (!concurrentAlert) throw error
      await alerts.updateOne(
        { _id: concurrentAlert._id },
        { $set: alertData },
      )
      alertId = concurrentAlert._id
    }
  }

  const salesLink = `/plan-activity?missingPhoneAlert=${alertId}`
  const monitoringLink = `/monitoring-leader?tab=missing-phone&alertId=${alertId}`
  const title =
    severity === 'warning'
      ? 'Nomor Telepon Belum Diisi'
      : 'Peringatan: Nomor Telepon Belum Diisi'
  const salesMessage = `Anda sudah ${count}x kunjungan ke ${satuanKerja} tanpa nomor telepon.`

  await upsertNotification(
    db,
    userId,
    salesMessage,
    salesLink,
    title,
    severityChanged,
  )

  if (severity !== 'warning') {
    const teams = await db
      .collection('teams')
      .find({ memberIds: userId }, { projection: { leaderId: 1 } })
      .toArray()
    const recipients = new Set<string>(
      teams.map((team) => String(team.leaderId || '')).filter(Boolean),
    )
    const admins = await db
      .collection('users')
      .find({ role: 'SUPERADMIN' }, { projection: { _id: 1 } })
      .toArray()
    for (const admin of admins) recipients.add(String(admin._id))

    for (const recipientId of recipients) {
      await upsertNotification(
        db,
        recipientId,
        `${alertData.nama_sales} sudah ${count}x kunjungan ke ${satuanKerja} tanpa nomor telepon.`,
        monitoringLink,
        title,
        severityChanged,
      )
    }
  } else if (existing?.severity && existing.severity !== 'warning') {
    await db.collection('notifications').updateMany(
      {
        type: 'MISSING_PHONE',
        link: monitoringLink,
        isRead: false,
      },
      { $set: { isRead: true, updatedAt: now } },
    )
  }
}

export async function canManageMissingPhoneAlert(
  db: Db,
  role: string,
  userId: string,
  alertUserId: string,
) {
  if (role === 'SUPERADMIN') return true
  if (role !== 'LEADER') return false
  const allowed = await getLeaderAllowedUserIds(db, userId)
  return allowed.includes(alertUserId)
}
