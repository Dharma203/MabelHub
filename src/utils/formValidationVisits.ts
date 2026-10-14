export type FieldError = {
  field: string
  message: string
} | null

export function validateFormFieldsVisits(data: {
  nama_sales: string
  segmentasi: string
  tipe_visit: string
  nama_perusahaan: string
  

}): FieldError {
  const requiredHeader = [
  { value: data.nama_sales, label: 'Nama Sales'},
  { value: data.segmentasi, label: 'Segmentasi'},
  { value: data.tipe_visit, label: 'Tipe Visit'},
  { value: data.nama_perusahaan, label: 'Nama Perusahaan'}
  ]

  for (const field of requiredHeader) {
    if (!field.value.trim()) {
      return { field: field.label, message: `Field "${field.label}" wajib diisi.` }
    }
  }

  return null
}
