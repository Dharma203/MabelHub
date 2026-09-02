import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getLeaderAllowedUserIds } from '@/lib/visit-auth'
import { toVisitDateStr, toCreatedAtStrUTC } from '@/lib/visit-date'

type UserLite = {
  userId: string
  role: string
  username: string
  fullName: string
}

async function loadUsersMap(db: any, userIds: string[]) {
  const ids = Array.from(new Set(userIds)).filter((x) => ObjectId.isValid(x))
  if (!ids.length) return new Map<string, UserLite>()

  const rows = await db
    .collection('users')
    .find(
      { _id: { $in: ids.map((x) => new ObjectId(x)) } },
      { projection: { role: 1, username: 1, fullName: 1 } },
    )
    .toArray()

  const map = new Map<string, UserLite>()
  for (const r of rows) {
    map.set(String((r as any)._id), {
      userId: String((r as any)._id),
      role: String((r as any).role || ''),
      username: String((r as any).username || ''),
      fullName: String((r as any).fullName || ''),
    })
  }
  return map
}

export async function POST(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const tanggal = String(body?.tanggal ?? '').trim()
    const items = Array.isArray(body?.items) ? body.items : []

    if (!tanggal)
      return NextResponse.json({ error: 'tanggal wajib' }, { status: 400 })
    if (!items.length) {
      return NextResponse.json(
        { error: 'items wajib (min 1)' },
        { status: 400 },
      )
    }

    const visit_date = toVisitDateStr(tanggal)
    if (!visit_date) {
      return NextResponse.json(
        { error: 'format tanggal tidak valid' },
        { status: 400 },
      )
    }

    const now = new Date()
    const created_at = toCreatedAtStrUTC(now)

    const session = auth.session
    const client = await clientPromise
    const db = client.db(getDbName())
    const visits = db.collection('VisitActivity')

    // LEADER allowed list (self + memberIds)
    const leaderAllowed =
      session.role === 'LEADER'
        ? await getLeaderAllowedUserIds(db, session.userId)
        : []

    // 1) hitung target user per item + validasi role
    const resolvedTargets: string[] = []

    for (const it of items) {
      let targetUserId = session.userId
      const requestedTarget = String(it?.targetUserId ?? '').trim()

      if (requestedTarget) {
        // SALES tidak boleh override
        if (session.role === 'SALES') {
          return NextResponse.json(
            { error: 'FORBIDDEN: sales tidak boleh assign user lain' },
            { status: 403 },
          )
        }

        // LEADER: harus anggota tim / self
        if (session.role === 'LEADER') {
          if (!leaderAllowed.includes(requestedTarget)) {
            return NextResponse.json(
              { error: 'FORBIDDEN: target bukan anggota team leader' },
              { status: 403 },
            )
          }
          targetUserId = requestedTarget
        }

        // SUPERADMIN/ADMIN: boleh assign ke SALES/LEADER saja (atau self)
        if (session.role === 'SUPERADMIN' || session.role === 'ADMIN') {
          targetUserId = requestedTarget
        }
      }

      resolvedTargets.push(targetUserId)
    }

    // 2) preload user map untuk semua target agar nama_sales benar
    const userMap = await loadUsersMap(db, [session.userId, ...resolvedTargets])

    // 3) validasi role target untuk SUPERADMIN/ADMIN
    if (session.role === 'SUPERADMIN' || session.role === 'ADMIN') {
      for (const tid of resolvedTargets) {
        if (tid === session.userId) continue
        const u = userMap.get(tid)
        if (!u) {
          return NextResponse.json(
            { error: `Target user tidak ditemukan: ${tid}` },
            { status: 404 },
          )
        }
        if (u.role !== 'SALES' && u.role !== 'LEADER') {
          return NextResponse.json(
            {
              error: 'FORBIDDEN: SUPERADMIN hanya boleh assign ke SALES/LEADER',
            },
            { status: 403 },
          )
        }
      }
    }

    // 4) build docs
    const docs: any[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]

      const status_ring = String(it?.status_ring ?? '').trim()
      const institusi_kerja = String(it?.institusi_kerja ?? '').trim()
      const jenisEntitas = String(it?.jenisEntitas ?? '').trim()
      const namaEntitas = String(it?.namaEntitas ?? '').trim()
      const kota_kab = String(it?.kota_kab ?? '').trim()
      const klpd = String(it?.klpd ?? '').trim()
      const satuan_kerja = String(it?.satuan_kerja ?? '').trim()

      const isRing4 = status_ring === 'RING 4'

      if (isRing4) {
        if (!jenisEntitas || !namaEntitas) {
          return NextResponse.json(
            { error: 'RING 4 wajib punya jenisEntitas dan namaEntitas' },
            { status: 400 },
          )
        }
      } else {
        if (!institusi_kerja || !satuan_kerja) {
          return NextResponse.json(
            { error: 'Setiap plan non-RING 4 wajib punya institusi_kerja dan satuan_kerja' },
            { status: 400 },
          )
        }
      }

      const targetUserId = resolvedTargets[i]
      const targetUser = userMap.get(targetUserId)

      const nama_sales =
        (targetUser?.fullName || '').trim() ||
        (targetUser?.username || '').trim() ||
        session.fullName ||
        session.username ||
        null

      const pic = it?.pic_default ?? {}

      const activeFields = isRing4
        ? {
            jenisEntitas: jenisEntitas || null,
            namaEntitas: namaEntitas || null,
          }
        : {
            institusi_kerja: institusi_kerja || null,
            satuan_kerja: satuan_kerja || null,
          }

      docs.push({
        // legacy
        user_id: targetUserId || null,

        nama_sales,

        visit_date,
        city: kota_kab || null,
        klpd: klpd || null,
        ...activeFields,
        pic_name: pic?.nama ?? null,
        pic_phone: pic?.no_telp ?? null,
        pic_position: pic?.jabatan ?? null,
        pic_role: pic?.role ?? null,

        created_at,

        visit_image: null,

        status_visit: 'NOT VISITED',
        status_market: null,
        descriptions: null,
        tindak_lanjut: null,
        kegiatan_status: null,
        no_visit_per_month: null,

        status_ring,
      })
    }

    const result = await visits.insertMany(docs)

    // 5) Create Notifications if assigned to another user
    const notificationsToInsert = []
    for (const doc of docs) {
      if (doc.user_id && doc.user_id !== session.userId) {
        notificationsToInsert.push({
          userId: doc.user_id,
          title: 'Tugas Visit Baru',
          message: `${session.fullName || session.username} (Leader/Admin) memberikan tugas visit ke instansi ${doc.institusi_kerja} pada tanggal ${visit_date}.`,
          type: 'TASK',
          isRead: false,
          link: '/plan-activity',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }

    if (notificationsToInsert.length > 0) {
      await db.collection('notifications').insertMany(notificationsToInsert)
    }

    return NextResponse.json(
      {
        ok: true,
        insertedCount: result.insertedCount,
        insertedIds: Object.values(result.insertedIds).map(String),
      },
      { status: 201 },
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Gagal insert bulk' },
      { status: 500 },
    )
  }
}
