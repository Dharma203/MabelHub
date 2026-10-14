import {
  createInitialPlanTimSalesTargets,
  sumPlanTimSalesTargets,
} from '@/utils/planTimSales'

it('starts with the example team and calculates its totals', () => {
  const rows = createInitialPlanTimSalesTargets()
  expect(rows).toHaveLength(9)
  expect(rows[0].nama_sales).toBe('Arie Muhamad Fajar')
  expect(sumPlanTimSalesTargets(rows)).toEqual({
    visit_target: 1239,
    demo_target: 0,
    sph_target: 0,
    sph_deal_target: 0,
    revenue: 0,
  })
})
