import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getVisitAuthMatch } from '@/lib/visit-auth'


export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  const { searchParams } = new URL(req.url)
  const filterStatsB2G = searchParams.get('filterStatsB2G') === 'true'

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
  const salesAktif = ranked?.[0]?.nama_sales ?? 0

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

  const byKlpd = countBy(ranked, 'klpd', 'Tidak diketahui')
  const byRing = countBy(ranked, 'status_ring', 'Tidak diketahui')
  const bySales = countBy(ranked, 'nama_sales', '(Belum dikunjungi)')

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
  })
}
