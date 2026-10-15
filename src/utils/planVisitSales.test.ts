import { normalizePlanVisitSales } from '@/utils/planVisitSales'

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

  expect(normalizePlanVisitSales([entry, entry])).toBeNull()
})
