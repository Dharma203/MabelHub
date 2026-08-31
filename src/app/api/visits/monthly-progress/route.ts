import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getVisitAuthMatch } from '@/lib/visit-auth'

const SALES_COLORS = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f59e0b', // amber
  '#6366f1', // indigo
]

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

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
  const filterStatsB2B = searchParams.get('filterStatsB2B') === 'true'

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session)
  if (error) {
    return NextResponse.json({ error }, { status: 403 })
  }

  const extraMatch: any = {}

  if (filterStatsB2B) {
    extraMatch.satuan_kerja = { $exists: true, $not: /office/i }
    extraMatch.status_ring = { $exists: true, $regex: /ring[\s_]*4/i }
    extraMatch.klpd = {
      $exists: true,
      $regex: /kabupaten|ptnbh|lembaga|swasta|kesehatan|lainnya|b2b|bumn/i,
    }
  }

  const combinedMatch = { ...extraMatch, ...(authMatch || {}) }

  // Aggregate: group by sales + month-year
  const pipeline = [
    { $match: combinedMatch },
    {
      $addFields: {
        _visitDate: {
          $cond: {
            if: { $eq: [{ $type: '$visit_date' }, 'string'] },
            then: {
              $dateFromString: { dateString: '$visit_date', onError: null },
            },
            else: '$visit_date',
          },
        },
      },
    },
    { $match: { _visitDate: { $ne: null } } },
    {
      $group: {
        _id: {
          nama_sales: '$nama_sales',
          year: { $year: '$_visitDate' },
          month: { $month: '$_visitDate' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } as any },
  ]

  const rawData = await col.aggregate(pipeline).toArray()

  // Collect unique months and sort them
  const monthSet = new Set<string>()
  const salesMap = new Map<string, Map<string, number>>()

  for (const row of rawData) {
    const { nama_sales, year, month } = row._id
    const shortYear = String(year).slice(-2)
    const monthKey = `${MONTH_NAMES[month - 1]} ${shortYear}`
    monthSet.add(monthKey)

    if (!salesMap.has(nama_sales)) {
      salesMap.set(nama_sales, new Map())
    }
    salesMap.get(nama_sales)!.set(monthKey, row.count)
  }

  // Sort months chronologically
  const months = Array.from(monthSet).sort((a, b) => {
    const [mA, yA] = a.split(' ')
    const [mB, yB] = b.split(' ')
    const yearDiff = parseInt(yA) - parseInt(yB)
    if (yearDiff !== 0) return yearDiff
    return MONTH_NAMES.indexOf(mA) - MONTH_NAMES.indexOf(mB)
  })

  // Build sales data with penambahan (growth = current - previous)
  const salesData = Array.from(salesMap.entries()).map(
    ([name, monthData], idx) => {
      const monthsObj: Record<string, { total: number; penambahan: number }> =
        {}
      let prevTotal = 0
      let grandTotal = 0

      for (const m of months) {
        const total = monthData.get(m) || 0
        grandTotal += total
        const penambahan = Math.max(0, total - prevTotal)
        monthsObj[m] = { total, penambahan }
        prevTotal = total
      }

      return {
        name,
        color: SALES_COLORS[idx % SALES_COLORS.length],
        months: monthsObj,
        grandTotal,
      }
    },
  )

  // Sort by grandTotal descending
  salesData.sort((a, b) => b.grandTotal - a.grandTotal)

  // Re-assign colors after sort
  salesData.forEach((s, i) => {
    s.color = SALES_COLORS[i % SALES_COLORS.length]
  })

  // Grand total row
  const grandTotalMonths: Record<
    string,
    { total: number; penambahan: number }
  > = {}
  let grandTotalAll = 0
  let prevGrandTotal = 0

  for (const m of months) {
    let total = 0
    for (const s of salesData) {
      total += s.months[m]?.total || 0
    }
    grandTotalAll += total
    const penambahan = Math.max(0, total - prevGrandTotal)
    grandTotalMonths[m] = { total, penambahan }
    prevGrandTotal = total
  }

  return NextResponse.json({
    months,
    salesData,
    grandTotal: {
      months: grandTotalMonths,
      grandTotal: grandTotalAll,
    },
  })
}
