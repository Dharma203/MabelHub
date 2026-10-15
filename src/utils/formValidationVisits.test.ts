import { validateFormFieldsVisits } from '@/utils/formValidationVisits'

it('validates each visit row and returns the missing field', () => {
  expect(
    validateFormFieldsVisits({
      nama_sales: 'Arie Muhamad Fajar',
      segmentasi: '',
      tipe_visit: 'Offline',
      nama_perusahaan: 'PT Contoh',
    }),
  ).toMatchObject({ field: 'Segmentasi' })
})
