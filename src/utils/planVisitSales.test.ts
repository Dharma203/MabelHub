import {
  createInitialPlanVisitsSalesTargets,
  normalizePlanVisitSales,
  planVisitSalesNames,
} from '@/utils/planVisitSales'
import { planTimSalesNames } from '@/utils/planTimSales'

it('uses the same nine sales names as plan targets', () => {
  expect(planVisitSalesNames).toEqual(planTimSalesNames)
  expect(createInitialPlanVisitsSalesTargets()).toHaveLength(9)
})

it('normalizes valid visit rows and rejects incomplete entries', () => {
  const entry = {
    nama_sales: 'Arie Muhamad Fajar',
    segmentasi: 'B2G-R1',
    tipe_visit: 'Visit',
    nama_perusahaan: 'PT Contoh',
    note: '',
  }

  expect(
    normalizePlanVisitSales([
      {
        ...entry,
        nama_perusahaan: ' PT Contoh ',
        note: ' Follow up ',
      },
    ]),
  ).toEqual([
    {
      nama_sales: 'Arie Muhamad Fajar',
      segmentasi: 'B2G-R1',
      tipe_visit: 'Visit',
      nama_perusahaan: 'PT Contoh',
      note: 'Follow up',
    },
  ])

  expect(
    normalizePlanVisitSales([
      {
        nama_sales: 'Arie Muhamad Fajar',
        segmentasi: 'B2G-R1',
        tipe_visit: 'Visit',
        nama_perusahaan: '',
        note: '',
      },
    ]),
  ).toBeNull()

  expect(
    normalizePlanVisitSales([
      entry,
      {
        ...entry,
        nama_sales: 'Beffry Rizkana',
        nama_perusahaan: 'PT Contoh Lain',
      },
    ]),
  ).toHaveLength(2)

  expect(normalizePlanVisitSales([entry, entry])).toBeNull()

  const addedSales = [
    { ...entry, nama_sales: 'Ema Dwi Jayanti' },
    { ...entry, nama_sales: 'Denden Permana' },
  ]
  expect(normalizePlanVisitSales(addedSales)).toHaveLength(2)
  expect(normalizePlanVisitSales(addedSales, ['Ema Dwi Jayanti'])).toBeNull()
})
