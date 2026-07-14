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
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')

  const { searchParams } = new URL(req.url)
  const excludeOffice = searchParams.get('excludeOffice') === 'true'
  const excludeRing4 = searchParams.get('excludeRing4') === 'true'

  const matchCondition: any = {
    satuan_kerja: { $exists: true, $ne: 'OFFICE' },
  }

  const matchConditionRing: any = {
    status_ring: { $exists: true, $ne: 'RING 4' },
  }

  if (excludeOffice) {
    matchCondition.satuan_kerja = { $exists: true, $not: /office/i }
  }

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }

  const extraMatch: any = { satuan_kerja: { $exists: true, $ne: 'OFFICE' } }
  if (excludeOffice)
    extraMatch.satuan_kerja = { $exists: true, $not: /office/i }
  if (excludeRing4)
    extraMatch.status_ring = { $exists: true, $not: /ring[\s_]*4/i }

  const combinedMatch = { ...extraMatch, ...(authMatch || {}) }

  const groupedPipeline = [
    { $match: combinedMatch },
    {
      $group: {
        _id: '$satuan_kerja',
        nama_sales: { $first: '$nama_sales' },
        city: { $first: '$city' },
        status_ring: { $first: '$status_ring' },
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
    pic_name: row.pic_name,
    pic_phone: row.pic_phone,
    total_visit: row.total_visit,
    rank: idx + 1,
  }))

  // Total satuan kerja unik
  const totalSatuanKerja = ranked.length

  // Total visit keseluruhan (filtered by role)
  // const totalVisit = await col.countDocuments(authMatch || {})
  const countMatch: any = {}
  if (excludeOffice) {
    countMatch.satuan_kerja = { $not: /office/i }
  }
  const totalVisit = await col.countDocuments(countMatch)

  // Satker paling banyak dikunjungi
  const topSatker = ranked?.[0]?.satuan_kerja ?? '-'
  const topSatkerCount = ranked?.[0]?.total_visit ?? 0

  return NextResponse.json({
    totalSatuanKerja,
    totalVisit,
    topSatker,
    topSatkerCount,
    ranked,
  })
}
