import { NextResponse } from 'next/server'
import { ObjectId, type Db } from 'mongodb'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getLeaderAllowedUserIds } from '@/lib/visit-auth'
import { flexParseDateExpr } from '@/lib/flex-date-expr'
import {
  countMissingPhoneStreak,
  missingPhoneEntityExpr,
  normalizeSatuanKerjaKey,
  recomputeAlert,
} from '@/lib/missing-phone-alert'

async function syncMissingPhoneAlerts(
  db: Db,
  role: string,
  userId: string,
) {
  // ponytail: scans authorized visit history per load; materialize on writes if history grows.
  let userIds = [userId]
  if (role === 'LEADER') {
    userIds = await getLeaderAllowedUserIds(db, userId)
  }
  const idObjects = userIds
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id))
  const users = await db
    .collection('users')
    .find(
      role === 'SUPERADMIN'
        ? { role: { $in: ['SALES', 'LEADER'] } }
        : {
            _id: { $in: idObjects },
            role: { $in: ['SALES', 'LEADER'] },
          },
      { projection: { _id: 1, fullName: 1, username: 1 } },
    )
    .toArray()

  const ownersById = new Set(users.map((user) => String(user._id)))
  const ownersByName = new Map<string, string[]>()
  const names: string[] = []
  for (const user of users) {
    for (const name of [user.fullName, user.username]
      .map((value) => String(value || '').trim())
      .filter((value, index, all) => value && all.indexOf(value) === index)) {
      names.push(name)
      const key = name.toLowerCase()
      const ids = ownersByName.get(key) || []
      ownersByName.set(key, ids.includes(String(user._id)) ? ids : [...ids, String(user._id)])
    }
  }
  const userIdStrings = [...ownersById]
  const ownerMatches: Record<string, unknown>[] = [
    {
      user_id: {
        $in: [
          ...userIdStrings,
          ...userIdStrings
            .filter(ObjectId.isValid)
            .map((id) => new ObjectId(id)),
        ],
      },
    },
  ]
  if (names.length) {
    const namePatterns = names.map(
      (name) =>
        new RegExp(
          `^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
          'i',
        ),
    )
    ownerMatches.push({
      $and: [
        { nama_sales: { $in: namePatterns } },
        { $or: [{ user_id: { $exists: false } }, { user_id: null }] },
      ],
    })
  }

  const visits = await db
    .collection('VisitActivity')
    .aggregate([
      { $addFields: { __alertEntity: missingPhoneEntityExpr() } },
      {
        $match: {
          status_visit: { $regex: /^\s*visited\s*$/i },
          __alertEntity: { $type: 'string', $ne: '' },
          $or: ownerMatches,
        },
      },
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
      {
        $project: {
          _id: 1,
          user_id: 1,
          nama_sales: 1,
          satuan_kerja: '$__alertEntity',
          pic_phone: 1,
        },
      },
    ])
    .toArray()

  const groups = new Map<string, { userId: string; satuanKerja: string; phones: unknown[] }>()
  for (const visit of visits) {
    const ownerIds = ownersByName.get(
      String(visit.nama_sales || '').trim().toLowerCase(),
    )
    const userId = visit.user_id
      ? ownersById.has(String(visit.user_id))
        ? String(visit.user_id)
        : undefined
      : ownerIds?.length === 1
        ? ownerIds[0]
        : undefined
    if (!userId) continue
    const satuanKerja = String(visit.satuan_kerja).trim()
    const key = JSON.stringify([userId, normalizeSatuanKerjaKey(satuanKerja)])
    const group = groups.get(key) || { userId, satuanKerja, phones: [] }
    group.phones.push(visit.pic_phone)
    groups.set(key, group)
  }

  for (const { userId: ownerId, satuanKerja, phones } of groups.values()) {
    if (countMissingPhoneStreak(phones.map((pic_phone) => ({ pic_phone }))) >= 3) {
      await recomputeAlert(db, ownerId, satuanKerja)
    }
  }
}

export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { session } = auth
  if (!['SALES', 'LEADER', 'SUPERADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const params = new URL(req.url).searchParams
  const status = params.get('status')
  const severity = params.get('severity')
  const userId = params.get('user_id')
  const satuanKerja = params.get('satuan_kerja')
  if (status && !['active', 'resolved', 'acknowledged'].includes(status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
  }
  if (severity && !['warning', 'danger', 'critical'].includes(severity)) {
    return NextResponse.json({ error: 'Severity tidak valid' }, { status: 400 })
  }
  if (userId && !ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
  }


  const client = await clientPromise
  const db = client.db(getDbName())
  const filter: Record<string, unknown> = {}

  if (session.role === 'SALES') {
    if (userId && userId !== session.userId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    filter.user_id = new ObjectId(session.userId)
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)
    if (userId && !allowed.includes(userId)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    filter.user_id = {
      $in: (userId ? [userId] : allowed)
        .filter(ObjectId.isValid)
        .map((id) => new ObjectId(id)),
    }
  } else if (userId) {
    filter.user_id = new ObjectId(userId)
  }
  if (status) filter.status = status
  if (severity) filter.severity = severity
  if (satuanKerja) filter.satuan_kerja = satuanKerja
  await syncMissingPhoneAlerts(db, session.role, session.userId)

  const alerts = await db
    .collection('MissingPhoneAlert')
    .find(filter)
    .sort({ consecutive_count: -1, last_visit_id: -1 })
    .toArray()
  const visitIds = alerts
    .map((alert) => alert.last_visit_id)
    .filter((id): id is ObjectId => id instanceof ObjectId)
  const visits = await db
    .collection('VisitActivity')
    .find({ _id: { $in: visitIds } }, { projection: { visit_date: 1 } })
    .toArray()
  const visitDates = new Map(
    visits.map((visit) => [String(visit._id), visit.visit_date]),
  )

  return NextResponse.json({
    items: alerts.map((alert) => ({
      ...alert,
      _id: String(alert._id),
      user_id: String(alert.user_id),
      last_visit_id: String(alert.last_visit_id),
      last_visit_date: visitDates.get(String(alert.last_visit_id)) || null,
      acknowledged_by: alert.acknowledged_by
        ? String(alert.acknowledged_by)
        : null,
    })),
  })
}
