export type PlanTimSalesTarget = {
  id: string
  nama_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  note: string
}

export const planTimSalesNames = [
  'Arie Muhamad Fajar',
  'Beffry Rizkana',
  'Ferrie Ferdinal',
  'Toni Ramdan',
  'Hery Nugraha',
  'Mugi Khairul',
  'Meliany Anggraini',
]

export function createInitialPlanTimSalesTargets(): PlanTimSalesTarget[] {
  return planTimSalesNames.map((nama_sales, index) => ({
    id: String(index + 1),
    nama_sales,
    visit_target: index === 0 ? '63' : '147',
    demo_target: '0',
    sph_target: '0',
    sph_deal_target: '0',
    revenue: '0',
    note: '',
  }))
}

export function sumPlanTimSalesTargets(rows: PlanTimSalesTarget[]) {
  return rows.reduce(
    (totals, row) => ({
      visit_target: totals.visit_target + (Number(row.visit_target) || 0),
      demo_target: totals.demo_target + (Number(row.demo_target) || 0),
      sph_target: totals.sph_target + (Number(row.sph_target) || 0),
      sph_deal_target: totals.sph_deal_target + (Number(row.sph_deal_target) || 0),
      revenue: totals.revenue + (Number(row.revenue) || 0),
    }),
    {
      visit_target: 0,
      demo_target: 0,
      sph_target: 0,
      sph_deal_target: 0,
      revenue: 0,
    },
  )
}
