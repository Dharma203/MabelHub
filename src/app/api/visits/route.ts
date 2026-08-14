import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from "@/lib/mongodb";
import { ObjectId } from 'mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getLeaderAllowedUserIds, getUserLiteById } from '@/lib/visit-auth'
import { flexParseDateExpr } from '@/lib/flex-date-expr'
import { toVisitDateStr, toCreatedAtStr } from '@/lib/visit-date'

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

// escape regex search
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}





/**
 * GET /api/visits?limit=25&page=1&q=...
 * Optional:
 *  - assignedTo=USER_ID  (leader/admin filter)
 */
export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const session = auth.session

  const { searchParams } = new URL(req.url)

  const limit = clamp(Number(searchParams.get('limit') || 25), 1, 100000)
  const page = Math.max(Number(searchParams.get('page') || 1), 1)
  const skip = (page - 1) * limit

  const q = String(searchParams.get('q') || '').trim()
  const assignedTo = String(searchParams.get('assignedTo') || '').trim()

  // ====== FILTER PARAMS ======
  const sales = searchParams.get('sales')
  const status = searchParams.get('status')
  const ring = searchParams.get('ring')
  const city = searchParams.get('city')
  const satker = searchParams.get('satker')
  const startStr = searchParams.get('start')
  const endStr = searchParams.get('end')
  const statusGroup = searchParams.get('statusGroup')
  const klpd = searchParams.get('klpd')
  const dateStr = searchParams.get('date') // specific date e.g. "01 Feb"
  const filterStatsB2G = searchParams.get('filterStatsB2G') === 'true'
  const groupBySatker = searchParams.get('groupBySatker') === 'true'

  // Sort Params
  const sortByParams = String(searchParams.get('sortBy') || 'total_visit')
  const sortDirParam = String(
    searchParams.get('sortDir') || 'desc',
  ).toLowerCase()
  const sortDirNum = sortDirParam === 'asc' ? 1 : -1

  const client = await clientPromise
  const db = client.db(getDbName());
  const col = db.collection('VisitActivity')

  // =========================
  // ACCESS FILTER (ROLE)
  // =========================
  // Many legacy VisitActivity docs have no user_id field —
  // they only carry nama_sales. To support both old and new data
  // we build an $or filter that matches:
  //   (a) user_id == targetId, OR
  //   (b) nama_sales == fullName AND user_id is absent/null (legacy docs)
  // =========================
  const match: any = {}

  /** Condition: document has no user_id (legacy data) */
  const NO_USER_ID = {
    $or: [{ user_id: { $exists: false } }, { user_id: null }],
  }

  /**
   * Build an ownership filter for a single user that covers both
   * new docs (with user_id) and legacy docs (only nama_sales).
   */
  function ownerFilter(userId: string, fullName: string | null) {
    const conditions: any[] = [{ user_id: userId }]
    if (fullName) {
      // Legacy docs: match by nama_sales where user_id is absent
      conditions.push({
        $and: [{ nama_sales: fullName }, NO_USER_ID],
      })
    }
    return { $or: conditions }
  }

  /**
   * Build an ownership filter for multiple users (team scenario).
   */
  function multiOwnerFilter(userIds: string[], fullNames: string[]) {
    const conditions: any[] = [{ user_id: { $in: userIds } }]
    if (fullNames.length > 0) {
      conditions.push({
        $and: [{ nama_sales: { $in: fullNames } }, NO_USER_ID],
      })
    }
    return { $or: conditions }
  }

  /** Merge an ownership filter into the match object via $and */
  function applyOwnerFilter(ownerCondition: any) {
    if (!match.$and) match.$and = []
    match.$and.push(ownerCondition)
  }

  if (session.role === 'SALES') {
    applyOwnerFilter(ownerFilter(session.userId, session.fullName || null))
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)

    if (assignedTo) {
      if (!allowed.includes(assignedTo)) {
        return NextResponse.json(
          { error: 'FORBIDDEN: bukan anggota tim' },
          { status: 403 },
        )
      }
      const targetUser = await getUserLiteById(db, assignedTo)
      applyOwnerFilter(ownerFilter(assignedTo, targetUser?.fullName || null))
    } else {
      // Resolve fullNames for all allowed userIds
      const fullNames: string[] = []
      for (const uid of allowed) {
        const u = await getUserLiteById(db, uid)
        if (u?.fullName) fullNames.push(u.fullName)
      }
      applyOwnerFilter(multiOwnerFilter(allowed, fullNames))
    }
  } else {
    // ADMIN/SUPERADMIN
    if (assignedTo) {
      const targetUser = await getUserLiteById(db, assignedTo)
      applyOwnerFilter(ownerFilter(assignedTo, targetUser?.fullName || null))
    }
  }

  // =========================
  // SEARCH FILTER
  // =========================
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    match.$or = [
      { visit_date: rx },
      { city: rx },
      { klpd: rx },
      { institusi_kerja: rx },
      { satuan_kerja: rx },
      { status_visit: rx },
      { nama_sales: rx },
      { status_ring: rx },
    ]
  }

  // =========================
  // EXACT FILTERS
  // =========================
  if (sales && sales.toUpperCase() !== 'ALL') match.nama_sales = sales
  if (status) match.status_visit = status
  if (ring) match.status_ring = ring.toUpperCase() // Ensure ring filter from dashboard is uppercase
  if (city) match.city = city
  if (satker) match.satuan_kerja = satker
  if (klpd) match.klpd = klpd

  // Partial date matching from clicked trend chart
  if (dateStr) {
    const parts = dateStr.split(' ')
    if (parts.length >= 2) {
      const regexStr = `${parts[0]}-${parts[1]}`
      match.visit_date = { $regex: new RegExp(regexStr, 'i') }
    }
  }

  // =========================
  // STATUS GROUP FILTER
  // =========================
  if (statusGroup) {
    if (statusGroup === 'Visits') {
      if (!match.$and) match.$and = []
      match.$and.push({ status_visit: { $regex: /visit/i } })
      match.$and.push({ status_visit: { $not: /not|belum/i } })
    } else if (statusGroup === 'Stay Office') {
      match.status_visit = { $regex: /stay[\s_]*office/i }
    } else if (statusGroup === 'Not Visited') {
      match.status_visit = {
        $regex:
          /not[\s_]*visited|not[\s_]*visit|belum[\s_]*visit|belum[\s_]*visited/i,
      }
    }
  }

  // filterStatsB2G = gabungan excludeOffice + excludeRing4 + excludeKlpd
  if (filterStatsB2G) {
    if (!match.$and) match.$and = []
    match.$and.push({ satuan_kerja: { $not: /office/i } })
    match.$and.push({ status_ring: { $not: /ring[\s_]*4/i } })
    match.$and.push({
      klpd: {
        $not: /kabupaten|ptnbh|lembaga|swasta|kesehatan|lainnya|b2b|bumn/i,
      },
    })
  }

  // =========================
  // DATE RANGE FILTER (Post-Match)
  // =========================
  const postMatch: any = {}
  if (startStr || endStr) {
    postMatch.__visitDate = {}
    if (startStr) postMatch.__visitDate.$gte = new Date(startStr)
    if (endStr) {
      const endDt = new Date(endStr)
      endDt.setHours(23, 59, 59, 999)
      postMatch.__visitDate.$lte = endDt
    }
  }

  // =========================
  // SHARED SORT FIELD MAP
  // =========================
  const TEXT_SORT_FIELDS: Record<string, string> = {
    satuan_kerja: 'satuan_kerja',
    nama_sales: 'nama_sales',
    city: 'city',
    status_ring: 'status_ring',
    pic_name: 'pic_name',
    pic_phone: 'pic_phone',
  }

  // =========================
  // GROUP BY SATKER MODE (untuk tracking-satker page)
  // =========================
  if (groupBySatker) {
    // Pipeline: match → parse date → postMatch → group by satuan_kerja
    const groupPipeline: any[] = [
      { $match: match },
      {
        $addFields: {
          __visitDate: flexParseDateExpr('$visit_date'),
        },
      },
    ]

    if (Object.keys(postMatch).length > 0) {
      groupPipeline.push({ $match: postMatch })
    }

    // Filter out docs without satuan_kerja
    groupPipeline.push({
      $match: { satuan_kerja: { $exists: true, $nin: [null, ''] } },
    })

    groupPipeline.push({ $sort: { __visitDate: -1 } })

    // Group by satuan_kerja, take $first for display fields, $sum for total_visit
    groupPipeline.push({
      $group: {
        _id: '$satuan_kerja',
        satuan_kerja: { $first: '$satuan_kerja' },
        nama_sales: { $first: '$nama_sales' },
        city: { $first: '$city' },
        status_ring: { $first: '$status_ring' },
        pic_name: { $first: '$pic_name' },
        pic_phone: { $first: '$pic_phone' },
        visit_date: { $first: '$visit_date' },
        created_at: { $first: '$created_at' },
        status_market: { $first: '$status_market' },
        klpd: { $first: '$klpd' },
        reschedule: { $first: '$reschedule' },
        institusi_kerja: { $first: '$institusi_kerja' },
        pic_position: { $first: '$pic_position' },
        pic_role: { $first: '$pic_role' },
        tindak_lanjut: { $first: '$tindak_lanjut' },
        kegiatan_status: { $first: '$kegiatan_status' },
        descriptions: { $first: '$descriptions' },
        status_visit: { $first: '$status_visit' },
        total_visit: { $sum: 1 },
        __latestVisitDate: { $max: '$__visitDate' },
      },
    })

    // Add rank based on total_visit (sorted descending)
    groupPipeline.push({ $sort: { total_visit: -1 } })
    groupPipeline.push({
      $group: {
        _id: null,
        docs: { $push: '$$ROOT' },
      },
    })
    groupPipeline.push({
      $unwind: { path: '$docs', includeArrayIndex: '__idx' },
    })
    groupPipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ['$docs', { rank: { $add: ['$__idx', 1] } }],
        },
      },
    })

    // Sort (uses TEXT_SORT_FIELDS hoisted above)

    let sortStage: Record<string, 1 | -1>
    if (sortByParams === 'total_visit') {
      sortStage = { total_visit: sortDirNum as 1 | -1 }
    } else if (sortByParams === 'rank') {
      sortStage = { rank: sortDirNum as 1 | -1 }
    } else if (TEXT_SORT_FIELDS[sortByParams]) {
      sortStage = { [TEXT_SORT_FIELDS[sortByParams]]: sortDirNum as 1 | -1 }
    } else {
      sortStage = { total_visit: -1 as 1 | -1 }
    }
    sortStage.__latestVisitDate = -1
    sortStage._id = -1

    // Count total grouped rows
    const countPipeline = [...groupPipeline, { $count: 'count' }]

    // Items with pagination
    const itemsPipeline = [
      ...groupPipeline,
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      { $project: { __latestVisitDate: 0, __idx: 0 } },
    ]

    const [itemsRaw, totalResult] = await Promise.all([
      col.aggregate(itemsPipeline).toArray(),
      col.aggregate(countPipeline).toArray(),
    ])

    const total = Number(totalResult?.[0]?.count || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const items = itemsRaw.map((it: any) => ({
      ...it,
      _id: String(it._id),
    }))

    return NextResponse.json({
      items,
      pagination: { total, page, limit, totalPages },
    })
  }

  // // =========================
  // GLOBAL SATKER RANKING (baru)
  // rank & total_visit tetap angka lifetime per satker,
  // tidak dipengaruhi filter tabel — sama seperti /api/visits/stats
  // =========================
  const globalRankingMatch: any = {
    satuan_kerja: { $exists: true, $nin: [null, ''] },
    status_ring: { $exists: true, $nin: [null, ''] },
    klpd: { $exists: true, $nin: [null, ''] },
  }

  if (filterStatsB2G) {
    globalRankingMatch.satuan_kerja.$not = /office/i
    globalRankingMatch.status_ring.$not = /ring[\s_]*4/i
    globalRankingMatch.klpd.$not = /kabupaten|ptnbh|lembaga|swasta|kesehatan|lainnya|b2b|bumn/i
  }

  const globalRanking = await col
    .aggregate([
      { $match: globalRankingMatch },
      { $group: { _id: '$satuan_kerja', total_visit: { $sum: 1 } } },
      { $sort: { total_visit: -1 } },
    ])
    .toArray()

  const satkerOrder = globalRanking.map((g: any) => String(g._id))
  const satkerVisitCounts = globalRanking.map((g: any) => g.total_visit)

  // =========================
  // PIPELINE
  // =========================
  const pipeline: any[] = [
    { $match: match },
    {
      $addFields: {
        __visitDate: flexParseDateExpr('$visit_date'),
        __createdAt: {
          $switch: {
            branches: [
              { case: { $eq: [{ $type: '$created_at' }, 'date'] }, then: '$created_at' },
            ],
            default: {
              $dateFromString: {
                dateString: { $ifNull: ['$created_at', ''] },
                format: '%Y-%m-%d %H:%M:%S',
                onError: {
                  $dateFromString: {
                    dateString: { $ifNull: ['$created_at', ''] },
                    onError: null,
                    onNull: null,
                  },
                },
                onNull: null,
              },
            },
          },
        },
      },
    },
  ]

  if (Object.keys(postMatch).length > 0) {
    pipeline.push({ $match: postMatch })
  }

  pipeline.push({
    $addFields: {
      __rankIndex: { $indexOfArray: [satkerOrder, '$satuan_kerja'] },
    },
  })
  pipeline.push({
    $addFields: {
      rank: {
        $cond: [
          { $gte: ['$__rankIndex', 0] },
          { $add: ['$__rankIndex', 1] },
          null,
        ],
      },
      total_visit: {
        $cond: [
          { $gte: ['$__rankIndex', 0] },
          { $arrayElemAt: [satkerVisitCounts, '$__rankIndex'] },
          null,
        ],
      },
      // dorong dokumen tanpa satuan_kerja ke paling bawah, arah sort apapun
      __rankIndex: {
        $cond: [{ $gte: ['$__rankIndex', 0] }, '$__rankIndex', 9999],
      },
    },
  })

  // =========================
  // SORT (baru) — dipilih dari header tabel
  // =========================


  let sortStage: Record<string, 1 | -1>
  if (sortByParams === 'total_visit') {
    // total_visit tinggi = __rankIndex kecil (rank 1 punya visit terbanyak)
    // desc (default) = visit terbanyak paling atas = __rankIndex ascending (1)
    // asc = visit terendah paling atas = __rankIndex descending (-1)
    sortStage = { __rankIndex: (sortDirNum === -1 ? 1 : -1) as 1 | -1 }
  } else if (sortByParams === 'rank') {
    // asc = rank 1 paling atas = __rankIndex ascending (1)
    // desc = rank terbesar paling atas = __rankIndex descending (-1)
    sortStage = { __rankIndex: sortDirNum as 1 | -1 }
  } else if (TEXT_SORT_FIELDS[sortByParams]) {
    sortStage = { [TEXT_SORT_FIELDS[sortByParams]]: sortDirNum as 1 | -1 }
  } else {
    sortStage = { __rankIndex: 1 as 1 | -1 }
  }
  // tiebreaker: tanggal terbaru dulu, lalu _id
  sortStage.__visitDate = -1
  sortStage._id = -1

  const itemsPipeline = [
    ...pipeline,
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
    {
      $addFields: {
        // Replace base64 visit_image with just a flag to keep response lightweight
        // If visit_image contains 'data:image' (base64), replace with placeholder
        // Otherwise keep original value (e.g. /uploads/visit_xxx.jpeg)
        visit_image: {
          $cond: {
            if: {
              $and: [
                { $ne: [{ $type: '$visit_image' }, 'missing'] },
                { $ne: ['$visit_image', null] },
                { $ne: ['$visit_image', ''] },
              ],
            },
            then: {
              $cond: {
                if: {
                  $regexMatch: { input: { $ifNull: ['$visit_image', ''] }, regex: /data:image/ },
                },
                then: '__base64_image__',
                else: '$visit_image',
              },
            },
            else: null,
          },
        },
      },
    },
    { $project: { __visitDate: 0, __createdAt: 0, __rankIndex: 0 } },
  ]

  const countPipeline = [...pipeline, { $count: 'count' }]

  const [itemsRaw, totalResult] = await Promise.all([
    col.aggregate(itemsPipeline).toArray(),
    col.aggregate(countPipeline).toArray(),
  ])

  const total = Number(totalResult?.[0]?.count || 0)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const items = itemsRaw.map((it: any) => ({ ...it, _id: String(it._id) }))

  return NextResponse.json({
    items,
    pagination: { total, page, limit, totalPages },
  })
}

export async function POST(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  try {
    const body = await req.json().catch(() => ({}))

    const tanggal = String(body?.tanggal || '').trim()
    const status_ring = String(body?.status_ring || '').trim()
    const institusi_kerja = String(body?.institusi_kerja || '').trim()
    const kota_kab = String(body?.kota_kab || '').trim()
    const klpd = String(body?.klpd || '').trim()
    const satuan_kerja = String(body?.satuan_kerja || '').trim()

    const assignedToUserIdRaw = String(body?.assignedToUserId || '').trim()

    if (
      !tanggal ||
      !status_ring ||
      !institusi_kerja ||
      !kota_kab ||
      !klpd ||
      !satuan_kerja
    ) {
      return NextResponse.json(
        {
          error:
            'Field wajib: tanggal, status_ring, institusi_kerja, kota_kab, klpd, satuan_kerja',
        },
        { status: 400 },
      )
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')

    // =========================
    // TARGET ASSIGNMENT RULES
    // =========================
    let targetUserId = session.userId

    if (assignedToUserIdRaw) {
      // SALES tidak boleh assign
      if (session.role === 'SALES') {
        return NextResponse.json(
          { error: 'FORBIDDEN: sales tidak boleh assign ke user lain' },
          { status: 403 },
        )
      }

      // LEADER: hanya self atau anggota team
      if (session.role === 'LEADER') {
        const allowed = await getLeaderAllowedUserIds(db, session.userId)
        if (!allowed.includes(assignedToUserIdRaw)) {
          return NextResponse.json(
            { error: 'FORBIDDEN: bukan anggota tim' },
            { status: 403 },
          )
        }
      }

      // SUPERADMIN/ADMIN: hanya boleh ke SALES/LEADER (atau self)
      if (session.role === 'SUPERADMIN' || session.role === 'ADMIN') {
        if (assignedToUserIdRaw !== session.userId) {
          const u = await getUserLiteById(db, assignedToUserIdRaw)
          if (!u) {
            return NextResponse.json(
              { error: 'Target user tidak ditemukan' },
              { status: 404 },
            )
          }
          if (u.role !== 'SALES' && u.role !== 'LEADER') {
            return NextResponse.json(
              {
                error:
                  'FORBIDDEN: SUPERADMIN hanya boleh assign ke SALES/LEADER',
              },
              { status: 403 },
            )
          }
        }
      }

      targetUserId = assignedToUserIdRaw
    }

    // lookup assigned user info untuk nama_sales + assignedTo
    const targetUser = await getUserLiteById(db, targetUserId)
    const nama_sales =
      targetUser?.fullName?.trim() ||
      targetUser?.username?.trim() ||
      session.fullName ||
      session.username ||
      null

    const visits = db.collection('VisitActivity')

    // incremental numeric id
    const last = await visits
      .find({}, { projection: { id: 1 } })
      .sort({ id: -1 })
      .limit(1)
      .toArray()
    const nextId = Number((last?.[0] as any)?.id || 0) + 1

    const now = new Date()

    const doc = {
      id: nextId,

      // legacy field (dipakai query existing)
      user_id: targetUserId,

      // new field (biar stats/team bisa pakai assignedTo.userId)
      assignedTo: targetUser
        ? {
            userId: targetUser.userId,
            role: targetUser.role,
            username: targetUser.username,
            fullName: targetUser.fullName,
          }
        : {
            userId: targetUserId,
            role: '',
            username: '',
            fullName: '',
          },

      visit_date: toVisitDateStr(tanggal),
      city: kota_kab,
      klpd,
      institusi_kerja,
      satuan_kerja,

      pic_name: body?.pic_default?.nama ?? null,
      pic_phone: body?.pic_default?.no_telp ?? null,
      pic_position: body?.pic_default?.jabatan ?? null,
      pic_role: body?.pic_default?.role ?? null,

      created_at: toCreatedAtStr(now),

      created_by_user_id: session.userId,
      created_by_name: session.fullName || session.username,

      visit_image: null,
      status_visit: null,
      status_market: null,
      descriptions: null,
      tindak_lanjut: null,
      kegiatan_status: null,
      no_visit_per_month: null,

      status_ring,
      nama_sales,
    }

    const ins = await visits.insertOne(doc as any)

    return NextResponse.json(
      { ok: true, data: { ...doc, _id: String(ins.insertedId) } },
      { status: 201 },
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Gagal menyimpan' },
      { status: 500 },
    )
  }
}
