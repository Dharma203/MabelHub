import { getPlanTimPeriodConfig } from '@/utils/planTimPeriod'

it('offers week numbers for weekly plans', () => {
  expect(getPlanTimPeriodConfig('Mingguan').periodOfOptions).toEqual([
    { value: '', label: '-- Pilih --' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
  ])
})

it('locks monthly period number and quarterly month selection with X defaults', () => {
  expect(getPlanTimPeriodConfig('Bulanan')).toMatchObject({
    periodOfDisabled: true,
    periodOfValue: 'X',
    monthDisabled: false,
  })
  for (const period of ['Triwulan', 'Kuartal']) {
    expect(getPlanTimPeriodConfig(period)).toMatchObject({
      monthDisabled: true,
      monthValue: 'X',
    })
  }
})
