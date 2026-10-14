export type PlanVisitSalesTarget = {
  id: string
  nama_sales: string
  segmentasi: string
  tipe_visit: string
  nama_perusahaan: string
  note: string
}

export type PlanVisitSalesEntry = Omit<PlanVisitSalesTarget, 'id'>

export const planVisitSalesNames = [
  'Arie Muhamad Fajar',
  'Beffry Rizkana',
  'Ferrie Ferdinal',
  'Toni Ramdan',
  'Hery Nugraha',
  'Mugi Khairul',
  'Meliany Anggraini',
]

export const planVisitSegmenNames = [
  'B2G-R1',
  'B2G-R2',
  'B2G-R3',
  'B2B',
  'B2C',
  'C2C',
  'C2B',
]

export const planVisitTypes = ['Visit', 'Follow Up']

export function normalizePlanVisitSales(
  value: unknown,
): PlanVisitSalesEntry[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > planVisitSalesNames.length
  ) {
    return null
  }

  const sales = new Set<string>()
  const segments = new Set<string>()
  const entries: PlanVisitSalesEntry[] = []

  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null

    const item = row as Record<string, unknown>
    if (
      typeof item.nama_sales !== 'string' ||
      typeof item.segmentasi !== 'string' ||
      typeof item.tipe_visit !== 'string' ||
      typeof item.nama_perusahaan !== 'string' ||
      typeof item.note !== 'string'
    ) {
      return null
    }

    const entry = {
      nama_sales: item.nama_sales.trim(),
      segmentasi: item.segmentasi.trim(),
      tipe_visit: item.tipe_visit.trim(),
      nama_perusahaan: item.nama_perusahaan.trim(),
      note: item.note.trim(),
    }
    if (
      !planVisitSalesNames.includes(entry.nama_sales) ||
      !planVisitSegmenNames.includes(entry.segmentasi) ||
      !planVisitTypes.includes(entry.tipe_visit) ||
      !entry.nama_perusahaan ||
      sales.has(entry.nama_sales) ||
      segments.has(entry.segmentasi)
    ) {
      return null
    }

    sales.add(entry.nama_sales)
    segments.add(entry.segmentasi)
    entries.push(entry)
  }

  return entries
}

export function createInitialPlanVisitsSalesTargets(): PlanVisitSalesTarget[] {
  return planVisitSalesNames.map((nama_sales, index) => ({
    id: String(index + 1),
    nama_sales,
    segmentasi: '',
    tipe_visit: '',
    nama_perusahaan: '',
    note: '',
  }))
}

export function createInitialPlanVisitsTargets(): PlanVisitSalesTarget[] {
  return planVisitSegmenNames.map((segmentasi, index) => ({
    id: String(index + 1),
    nama_sales: '',
    segmentasi,
    tipe_visit: '',
    nama_perusahaan: '',
    note: '',
  }))
}

export function sumPlanVisitSalesTargets(rows: PlanVisitSalesTarget[]) {
  return rows.reduce(
    (totals, row) => ({
      segmentasi: totals.segmentasi + (Number(row.segmentasi) || 0),
      tipe_visit: totals.tipe_visit + (Number(row.tipe_visit) || 0),
      nama_perusahaan: totals.nama_perusahaan + (Number(row.nama_perusahaan) || 0),
      note: totals.note + (Number(row.note) || 0),
    }),
    {
      segmentasi: 0,
      tipe_visit: 0,
      nama_perusahaan: 0,
      note: 0,
    },
  )
}
