import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { sumPlanTimSalesTargets } from '@/utils/planTimSales'

const isStringRecord = (
  value: unknown,
  fields: string[],
): value is Record<string, string> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  fields.every((field) => typeof (value as Record<string, unknown>)[field] === 'string')

function normalizeRows(
  value: unknown,
  fields: string[],
): Record<string, string>[] | null {
  if (!Array.isArray(value) || !value.every((row) => isStringRecord(row, fields))) {
    return null
  }
  return value
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams
  const code = searchParams.get('code')?.trim()
  const period = searchParams.get('period')?.trim()
  const leaderName = searchParams.get('leaderName')?.trim()

  if (code) {
    try {
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB || 'MabelHub')
      const plan = await db
        .collection('sales-report-system')
        .find({ code_submit: code })
        .sort({ created_at: -1 })
        .limit(1)
        .next()

      if (!plan) {
        return NextResponse.json({ error: 'Data plan tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json({ plan })
    } catch (error) {
      console.error('[GET /api/list-plan] Error loading plan:', error)
      return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
    }
  }

  if (!period && !leaderName) {
    return NextResponse.json(
      { error: 'Pilih periode atau leader untuk mencari plan' },
      { status: 400 },
    )
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const plans = await db
      .collection('sales-report-system')
      .find(
        {
          ...(period ? { period } : {}),
          ...(leaderName ? { leaderName } : {}),
        },
        {
          projection: {
            code_submit: 1,
            leaderName: 1,
            period: 1,
            month: 1,
            year: 1,
            created_at: 1,
            revised_at: 1,
          },
        },
      )
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      plans: plans.map(({ _id, ...plan }) => ({
        ...plan,
        id: String(_id),
        revised: Boolean(plan.revised_at),
      })),
    })
  } catch (error) {
    console.error('[GET /api/list-plan] Error searching plans:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON tidak valid' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Payload revisi tidak valid' }, { status: 400 })
  }

  const data = body as Record<string, unknown>
  const code = typeof data.code_submit === 'string' ? data.code_submit.trim() : ''
  const newCode = typeof data.new_code_submit === 'string'
    ? data.new_code_submit.trim()
    : code
  const salesFields = [
    'nama_sales',
    'visit_target',
    'demo_target',
    'sph_target',
    'sph_deal_target',
    'revenue',
    'note',
  ]
  const visitFields = [
    'nama_sales',
    'segmentasi',
    'tipe_visit',
    'nama_perusahaan',
    'note',
  ]
  const salesRows = normalizeRows(data.sales_targets, salesFields)
  const visitRows = normalizeRows(data.sales_visit, visitFields)

  if (
    !code ||
    !newCode ||
    (data.new_code_submit !== undefined && typeof data.new_code_submit !== 'string') ||
    typeof data.note !== 'string' ||
    !salesRows ||
    !visitRows
  ) {
    return NextResponse.json({ error: 'Data revisi tidak valid' }, { status: 400 })
  }

  const salesTargets = salesRows.map((row) => ({
    nama_sales: row.nama_sales.trim(),
    visit_target: row.visit_target.trim(),
    demo_target: row.demo_target.trim(),
    sph_target: row.sph_target.trim(),
    sph_deal_target: row.sph_deal_target.trim(),
    revenue: row.revenue.trim(),
    note: row.note.trim(),
  }))
  const numericFields = [
    'visit_target',
    'demo_target',
    'sph_target',
    'sph_deal_target',
    'revenue',
  ] as const
  const salesNames = salesTargets.map((row) => row.nama_sales.toLowerCase())

  if (
    !salesTargets.length ||
    salesTargets.some(
      (row) =>
        !row.nama_sales ||
        numericFields.some(
          (field) =>
            !row[field] ||
            !Number.isFinite(Number(row[field])) ||
            Number(row[field]) < 0,
        ),
    ) ||
    new Set(salesNames).size !== salesNames.length
  ) {
    return NextResponse.json(
      { error: 'Nama sales harus unik dan target harus berupa angka nol atau lebih' },
      { status: 400 },
    )
  }

  const salesVisit = visitRows.map((row) => ({
    nama_sales: row.nama_sales.trim(),
    segmentasi: row.segmentasi.trim(),
    tipe_visit: row.tipe_visit.trim(),
    nama_perusahaan: row.nama_perusahaan.trim(),
    note: row.note.trim(),
  }))
  const totals = sumPlanTimSalesTargets(
    salesTargets.map((row, id) => ({ ...row, id: String(id) })),
  )
  if (Object.values(totals).some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: 'Total target melebihi batas angka' }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const collection = db.collection('sales-report-system')
    const existing = await collection
      .find({ code_submit: code })
      .sort({ created_at: -1 })
      .limit(1)
      .next()

    if (!existing) {
      return NextResponse.json({ error: 'Data plan tidak ditemukan' }, { status: 404 })
    }
    if (newCode !== code) {
      const duplicate = await collection
        .find({ code_submit: newCode, _id: { $ne: existing._id } })
        .limit(1)
        .next()
      if (duplicate) {
        return NextResponse.json({ error: 'Kode submit sudah digunakan plan lain' }, { status: 409 })
      }
    }
    if (!Array.isArray(existing.sales_targets) || existing.sales_targets.length !== salesTargets.length) {
      return NextResponse.json(
        { error: 'Jumlah sales harus tetap sama seperti plan awal' },
        { status: 400 },
      )
    }

    const result = await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          code_submit: newCode,
          note: data.note.trim(),
          sales_targets: salesTargets,
          sales_visit: salesVisit,
          visit_target: String(totals.visit_target),
          demo_target: String(totals.demo_target),
          sph_target: String(totals.sph_target),
          sph_deal_target: String(totals.sph_deal_target),
          revenue: String(totals.revenue),
          revised_at: new Date(),
        },
      },
    )
    if (!result.matchedCount) {
      return NextResponse.json({ error: 'Plan berubah atau sudah dihapus' }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PUT /api/list-plan] Error revising plan:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
