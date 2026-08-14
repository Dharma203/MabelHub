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

  const { searchParams } = new URL(req.url)
  const filterStatsB2G = searchParams.get('filterStatsB2G') === 'true'

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  const extraMatch: any = {}

  // filterStatsB2G = gabungan excludeOffice + excludeRing4 + excludeKlpd
  if (filterStatsB2G) {
    extraMatch.satuan_kerja = { $not: /office/i }
    extraMatch.status_ring = { $not: /ring[\s_]*4/i }
    extraMatch.klpd = {
      $not: /kabupaten|ptnbh|lembaga|swasta|kesehatan|lainnya|b2b|bumn/i,
    }
  }

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }
  const combinedMatch = { ...(authMatch || {}), ...extraMatch }

  // so we use aggregation instead
  const [salesResult, citiesResult, satkersResult, ringResult] =
    await Promise.all([
      col
        .aggregate([
          { $match: combinedMatch },
          { $group: { _id: '$nama_sales' } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: combinedMatch },
          { $group: { _id: '$city' } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: combinedMatch },
          { $group: { _id: '$satuan_kerja' } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: combinedMatch },
          { $group: { _id: '$status_ring' } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ])

  return NextResponse.json({
    sales: salesResult.map((r: any) => r._id).filter(Boolean),
    cities: citiesResult.map((r: any) => r._id).filter(Boolean),
    satkers: satkersResult.map((r: any) => r._id).filter(Boolean),
    rings: ringResult.map((r: any) => r._id).filter(Boolean),
  })
}
