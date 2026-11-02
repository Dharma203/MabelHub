import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { flexParseDateExpr } from '@/lib/flex-date-expr'

const visitStatuses = ['Terlaksana', 'Tidak Terlaksana', 'Reschedule', 'Pending']
const actualFields = ['visit', 'demo', 'sph', 'closing', 'revenue'] as const
const visitFields = ['nama_sales', 'segmentasi', 'tipe_visit', 'nama_perusahaan'] as const
const monthNumbers: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const code = new URL(req.url).searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Kode plan wajib diisi' }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const plan = await db.collection('sales-report-system').findOne({ code_submit: code })
    if (!plan) {
      return NextResponse.json({ error: 'Data plan tidak ditemukan' }, { status: 404 })
    }

    const month = monthNumbers[String(plan.month).toLowerCase()]
    const year = Number(plan.year)
    if (!month || !Number.isInteger(year)) {
      return NextResponse.json({ error: 'Bulan atau tahun pada plan tidak valid' }, { status: 400 })
    }

    const salesNames = Array.isArray(plan.sales_targets)
      ? plan.sales_targets.map((sale) => sale.nama_sales).filter((name): name is string => typeof name === 'string' && !!name.trim())
      : []
    const counts = salesNames.length
      ? await db.collection('VisitActivity').aggregate([
          { $match: { nama_sales: { $in: salesNames } } },
          { $addFields: { _visitDate: flexParseDateExpr('$visit_date') } },
          { $match: { _visitDate: { $ne: null } } },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: [{ $year: '$_visitDate' }, year] },
                  { $eq: [{ $month: '$_visitDate' }, month] },
                ],
              },
            },
          },
          { $group: { _id: '$nama_sales', count: { $sum: 1 } } },
        ]).toArray()
      : []
    const activityCounts = Object.fromEntries(counts.map((row) => [row._id, row.count]))
    const planCounts = plannedVisitCounts(plan.sales_visit)
    const effectiveCounts = Object.fromEntries(
      salesNames.map((name) => [name, activityCounts[name] || planCounts[name] || 0]),
    )
    const sources = Object.fromEntries(
      salesNames.map((name) => [
        name,
        activityCounts[name] ? 'VisitActivity' : planCounts[name] ? 'Plan Visit' : 'Belum ada data',
      ]),
    )

    return NextResponse.json({
      month: plan.month,
      year: plan.year,
      counts: effectiveCounts,
      sources,
    })
  } catch (error) {
    console.error('[GET /api/realisasi-plan] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function plannedVisitCounts(visits: unknown) {
  if (!Array.isArray(visits)) return {}
  return visits.reduce<Record<string, number>>((counts, visit) => {
    if (visit && typeof visit.nama_sales === 'string') {
      counts[visit.nama_sales] = (counts[visit.nama_sales] || 0) + 1
    }
    return counts
  }, {})
}

export async function POST(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Payload realisasi tidak valid' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const code = typeof data.code_submit === 'string' ? data.code_submit.trim() : ''
  if (
    !code ||
    typeof data.team_note !== 'string' ||
    !Array.isArray(data.sales) ||
    !Array.isArray(data.visits)
  ) {
    return NextResponse.json({ error: 'Data realisasi belum lengkap' }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const plan = await db.collection('sales-report-system').findOne({ code_submit: code })
    if (!plan) {
      return NextResponse.json({ error: 'Data plan tidak ditemukan' }, { status: 404 })
    }

    const targets = Array.isArray(plan.sales_targets) ? plan.sales_targets : []
    const plannedVisits = Array.isArray(plan.sales_visit) ? plan.sales_visit : []
    const validSales =
      data.sales.length === targets.length &&
      data.sales.every((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false
        const sale = row as Record<string, unknown>
        return (
          sale.nama_sales === targets[index]?.nama_sales &&
          typeof sale.note === 'string' &&
          actualFields.every(
            (field) =>
              typeof sale[field] === 'number' &&
              Number.isFinite(sale[field]) &&
              (sale[field] as number) >= 0,
          )
        )
      })
    const validVisits =
      data.visits.length === plannedVisits.length &&
      data.visits.every((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false
        const visit = row as Record<string, unknown>
        return (
          visitFields.every((field) => visit[field] === plannedVisits[index]?.[field]) &&
          typeof visit.status === 'string' &&
          visitStatuses.includes(visit.status) &&
          typeof visit.note === 'string'
        )
      })

    if (!validSales || !validVisits) {
      return NextResponse.json({ error: 'Data realisasi tidak sesuai dengan plan' }, { status: 400 })
    }

    const realizations = db.collection('sales-report-realizations')
    // ponytail: check-then-insert can race; add a unique index if concurrent saves become an issue.
    if (await realizations.findOne({ code_submit: code })) {
      return NextResponse.json({ error: 'Realisasi untuk plan ini sudah pernah disimpan' }, { status: 409 })
    }

    const savedSales = data.sales.map((row, index) => {
      const sale = row as Record<string, unknown>
      return {
        nama_sales: targets[index].nama_sales,
        visit: sale.visit,
        demo: sale.demo,
        sph: sale.sph,
        closing: sale.closing,
        revenue: sale.revenue,
        note: sale.note,
      }
    })
    const savedVisits = data.visits.map((row, index) => {
      const visit = row as Record<string, unknown>
      return {
        ...Object.fromEntries(visitFields.map((field) => [field, plannedVisits[index][field]])),
        status: visit.status,
        note: visit.note,
      }
    })
    const result = await realizations.insertOne({
      code_submit: code,
      plan: {
        leaderName: plan.leaderName,
        period: plan.period,
        periodOf: plan.periodOf,
        month: plan.month,
        year: plan.year,
        visit_target: plan.visit_target,
        demo_target: plan.demo_target,
        sph_target: plan.sph_target,
        sph_deal_target: plan.sph_deal_target,
        revenue: plan.revenue,
      },
      team_note: data.team_note.trim(),
      sales: savedSales,
      visits: savedVisits,
      created_by: {
        userId: auth.session.userId,
        name: auth.session.fullName || auth.session.username,
      },
      created_at: new Date(),
    })
    return NextResponse.json({ success: true, id: String(result.insertedId) }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/realisasi-plan] Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
