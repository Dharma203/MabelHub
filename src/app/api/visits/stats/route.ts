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

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }

  // Group per satuan_kerja — filtered by user role
  const baseMatch = {
    satuan_kerja: { $exists: true, $ne: 'OFFICE' },
    ...authMatch,
  }

  const groupedPipeline = [
    { $match: baseMatch },
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
  const totalVisit = await col.countDocuments(authMatch || {})

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
