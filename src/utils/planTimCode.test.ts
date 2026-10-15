import { generatePlanTimCode } from '@/utils/planTimCode'
import { validateFormFieldsPlan } from '@/utils/formValidationPlan'

it('builds a plan code from the selected leader and period fields', () => {
  expect(
    generatePlanTimCode({
      leaderName: 'Arie Muhamad Fajar',
      period: 'Bulanan',
      periodOf: 'X',
      month: 'February',
      year: '2026',
    }),
  ).toBe('ARI-BL-X-FEB-2026')
})

it('requires a leader name before submission', () => {
  expect(
    validateFormFieldsPlan({
      leaderName: ' ',
      visit_target: '1',
      demo_target: '1',
      revenue: '1',
      sph_target: '1',
    }),
  ).toMatchObject({ field: 'Leader Name' })
})
