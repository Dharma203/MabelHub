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
  const filterStatsB2B = searchParams.get('filterStatsB2B') === 'true'

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHub')
  const col = db.collection('VisitActivity')

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

  if (filterStatsB2B) {
    extraMatch.satuan_kerja = { $exists: true, $not: /office/i }
    extraMatch.namaEntitas = { $exists: true, $not: /office/i }
    extraMatch.status_ring = { $exists: true, $not: /ring[\s_]*4/i }
    extraMatch.klpd = {
      $exists: true, 
      $regex: /kabupaten|swasta|lainnya|b2b/i}
  }

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }
  const combinedMatch = { ...(authMatch || {}), ...extraMatch }

  // so we use aggregation instead
  const [
    salesResult,
    citiesResult,
    satkersResult,
    ringResult,
    klpdResult,
    statusVisitResult,
    namaEntitasResult,
    jenisEntitasResult
  ] = await Promise.all([
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
    col
      .aggregate([
        { $match: combinedMatch },
        { $group: { _id: '$klpd' } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: combinedMatch },
        { $group: { _id: '$status_visit' } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: combinedMatch },
        { $group: { _id: '$namaEntitas' } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: combinedMatch },
        { $group: { _id: '$jenisEntitas' } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ])

  return NextResponse.json({
    sales: salesResult.map((r: any) => r._id).filter(Boolean),
    cities: citiesResult.map((r: any) => r._id).filter(Boolean),
    satkers: satkersResult.map((r: any) => r._id).filter(Boolean),
    rings: ringResult.map((r: any) => r._id).filter(Boolean),
    klpd: klpdResult.map((r: any) => r._id).filter(Boolean),
    status_visit: statusVisitResult.map((r: any) => r._id).filter(Boolean),
    namaEntitas: namaEntitasResult.map((r: any) => r._id).filter(Boolean),
    jenisEntitas: jenisEntitasResult.map((r: any) => r._id).filter(Boolean),
  })
}
