import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getVisitAuthMatch } from '@/lib/visit-auth'
import { clamp } from 'motion/react'


export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')
  

  const { searchParams } = new URL(req.url)
  const filterStatsB2G = searchParams.get('filterStatsB2G') === 'true'
  const filterStatsB2B = searchParams.get('filterStatsB2B') === 'true'
  const limit = clamp(Number(searchParams.get('limit') || 25), 1, 10000)
  const page = Math.max(Number(searchParams.get('page') || 1), 1)
  const skip = (page - 1) * limit
  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }

  const extraMatch: any = {}

  // filterStatsB2G = gabungan excludeOffice + excludeRing4 + excludeKlpd
  if (filterStatsB2G) {
    extraMatch.satuan_kerja = { $exists: true, $not: /office/i }
    extraMatch.status_ring = { $exists: true, $not: /ring[\s_]*4/i }
    extraMatch.klpd = {
      $exists: true,
      $not: /kabupaten|ptnbh|lembaga|swasta|kesehatan|lainnya|b2b|bumn/i,
    }
  }

  // filterStatsB2B = excludeOffice + includeRing4 + includeKlpd(B2B)
  if (filterStatsB2B) {
    extraMatch.satuan_kerja = { $exists: true, $not: /office/i }
    extraMatch.status_ring = { $exists: true, $regex: /ring[\s_]*4/i }
    extraMatch.klpd = {
      $exists: true,
      $regex: /kabupaten|swasta|lainnya|b2b/i,
    }
  }

  const combinedMatch = { ...extraMatch, ...(authMatch || {}) }

  const groupedPipeline = [
    { $match: combinedMatch },
    {
      $group: {
        _id: '$satuan_kerja',
        nama_sales: { $first: '$nama_sales' },
        city: { $first: '$city' },
        status_ring: { $first: '$status_ring' },
        klpd: { $first: '$klpd' },
        pic_name: { $first: '$pic_name' },
        pic_phone: { $first: '$pic_phone' },
        total_visit: { $sum: 1 },
      },
    },
    { $sort: { total_visit: -1 } },
  ]

   // items with pagination
  const itemsPipeline = [
    ...groupedPipeline,
    { $skip: skip },
    { $limit: limit},
  ]

  const groupedRows = await col.aggregate(groupedPipeline).toArray()

  // Rank sekuensial
  const ranked = groupedRows.map((row: any, idx: number) => ({
    satuan_kerja: row._id,
    nama_sales: row.nama_sales,
    city: row.city,
    status_ring: row.status_ring,
    klpd: row.klpd,
    pic_name: row.pic_name,
    pic_phone: row.pic_phone,
    total_visit: row.total_visit,
    rank: idx + 1,
  }))
  // Total satuan kerja unik
  const totalSatuanKerja = ranked.length

  // Total visit keseluruhan (filtered by role + filterStatsB2G)
  const totalVisit = await col.countDocuments(combinedMatch)

  // Satker paling banyak dikunjungi
  const topSatker = ranked?.[0]?.satuan_kerja ?? '-'
  const topSatkerCount = ranked?.[0]?.total_visit ?? 0

  // Breakdown satker unik per kategori — dihitung dari `ranked`,
  // yang sudah 1 baris per satker, jadi tinggal dikelompokkan ulang
  function countBy(
    rows: typeof ranked,
    key: 'klpd' | 'status_ring' | 'nama_sales',
    fallbackLabel: string,
  ) {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const label = (row[key] as string) || fallbackLabel
      counts.set(label, (counts.get(label) || 0) + 1)
    }
    return Array.from(counts, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value,
    )
  }

  const countPipeline = [...groupedPipeline, { $count: 'count' }]

  const [itemsRaw, totalResult] = await Promise.all([
    col.aggregate(itemsPipeline).toArray(),
    col.aggregate(countPipeline).toArray(),
  ])

  const total = Number(totalResult?.[0]?.count || 0)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const byKlpd = countBy(ranked, 'klpd', 'Tidak diketahui')
  const byRing = countBy(ranked, 'status_ring', 'Tidak diketahui')
  const bySales = countBy(ranked, 'nama_sales', '(Belum dikunjungi)')
  const salesAktif = bySales.length

  const items = itemsRaw.map((it : any) => ({
    ...it,
    _id: String(it._id),
  }))

  return NextResponse.json({
    totalSatuanKerja,
    totalVisit,
    topSatker,
    topSatkerCount,
    ranked,
    byKlpd,
    bySales,
    byRing,
    salesAktif,
    items,
    pagination: { total , page, limit, totalPages}
  })
}
