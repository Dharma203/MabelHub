import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { normalizePlanVisitSales } from '@/utils/planVisitSales'
import {
  planTimSalesNames,
  sumPlanTimSalesTargets,
} from '@/utils/planTimSales'

type PlanTimHeader = {
  code_submit: string
  leaderName: string
  note: string
  period: string
  periodOf: string
  month: string
  year: string
  total_active_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  sales_targets: {
    nama_sales: string
    visit_target: string
    demo_target: string
    sph_target: string
    sph_deal_target: string
    revenue: string
    note: string
  }[]
}

const salesTargetFields = [
  'visit_target',
  'demo_target',
  'sph_target',
  'sph_deal_target',
  'revenue',
  'note',
] as const

const fields = [
  'code_submit',
  'leaderName',
  'note',
  'period',
  'periodOf',
  'month',
  'year',
  'total_active_sales',
  'visit_target',
  'demo_target',
  'sph_target',
  'sph_deal_target',
  'revenue',
] as const

function isPlanTimHeader(value: unknown): value is PlanTimHeader {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  const isValidSalesTargets =
    Array.isArray(data.sales_targets) &&
    data.sales_targets.every(
      (row) =>
        !!row &&
        typeof row === 'object' &&
        typeof row.nama_sales === 'string' &&
        row.nama_sales.trim().length > 0 &&
        planTimSalesNames.includes(row.nama_sales.trim()) &&
        salesTargetFields.every(
          (field) =>
            typeof row[field] === 'string' &&
            (field === 'note' ||
              (row[field].trim() !== '' &&
                Number.isFinite(Number(row[field])) &&
                Number(row[field]) >= 0)),
        ),
    ) &&
    new Set(
      data.sales_targets.map((row) => row.nama_sales.trim().toLowerCase()),
    ).size ===
      data.sales_targets.length

  return (
    fields.every((field) => typeof data[field] === 'string') &&
    isValidSalesTargets &&
    ['code_submit', 'leaderName', 'period', 'periodOf', 'month', 'year'].every(
      (field) =>
        typeof data[field] === 'string' && data[field].trim().length > 0,
    )
  )
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const header =
      body && typeof body === 'object' && 'header' in body
        ? body.header
        : null
    if (!isPlanTimHeader(header)) {
      return NextResponse.json(
        { error: 'Payload tidak valid: field wajib kosong atau bukan teks' },
        { status: 400 },
      )
    }

    const salesTotals = sumPlanTimSalesTargets(
      header.sales_targets.map((row, index) => ({ ...row, id: String(index) })),
    )
    const salesVisit =
      body && typeof body === 'object' && 'sales_visit' in body
        ? normalizePlanVisitSales(
            body.sales_visit,
            header.sales_targets.map((row) => row.nama_sales),
          )
        : null
    if (!salesVisit) {
      return NextResponse.json(
        { error: 'Data sales_visit tidak valid atau belum lengkap' },
        { status: 400 },
      )
    }

    const document: PlanTimHeader & {
      sales_visit: typeof salesVisit
      created_at: Date
    } = {
      code_submit: header.code_submit,
      leaderName: header.leaderName,
      note: header.note,
      period: header.period,
      periodOf: header.periodOf,
      month: header.month,
      year: header.year,
      total_active_sales: String(header.sales_targets.length),
      visit_target: String(salesTotals.visit_target),
      demo_target: String(salesTotals.demo_target),
      sph_target: String(salesTotals.sph_target),
      sph_deal_target: String(salesTotals.sph_deal_target),
      revenue: String(salesTotals.revenue),
      sales_targets: header.sales_targets,
      sales_visit: salesVisit,
      created_at: new Date(),
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const result = await db.collection('sales-report-system').insertOne(document)

    return NextResponse.json(
      { success: true, id: result.insertedId },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/plan-tim] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 },
    )
  }
}