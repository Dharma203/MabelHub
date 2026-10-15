export type FieldError = {
  field: string
  message: string
} | null

export function validateFormFieldsB2G(data: {
  requestor: string
  satuanKerja: string
  institusiKerja: string
  provinsi: string
  kota: string
  alamat: string
  klpd: string
  ring: string
  salesInternal: string

}): FieldError {
  const requiredHeader = [
    { value: data.requestor, label: 'Penginput' },
    { value: data.satuanKerja, label: 'Satuan Kerja' },
    { value: data.institusiKerja, label: 'Institusi Kerja'},
    { value: data.provinsi, label: 'Provinsi' },
    { value: data.kota, label: 'Kota' },
    { value: data.alamat, label: 'Alamat' },
    { value: data.klpd, label: 'KLPD'},
    { value: data.ring, label: 'RING'},
    { value: data.salesInternal, label: 'Sales Internal' },
  ]

  for (const field of requiredHeader) {
    if (field.label === 'Sales Internal') {
      if (data.requestor === 'Sales Internal' && !field.value.trim()) {
        return { field: field.label, message: `Field "${field.label}" wajib diisi.` }
      }
      continue
    }

    if (!field.value.trim()) {
      return { field: field.label, message: `Field "${field.label}" wajib diisi.` }
    }
  }

  return null
}

export type ContactItem = {
  nama: string
  jabatan: string
  role: string
  tipeKontak: string
  noTelp: string
  email: string
}

export type ContactError = {
  index: number
  field: string
  message: string
} | null

export function validateContactItemsB2G(items: ContactItem[]): ContactError {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (!item.nama.trim()) {
      return {
        index: i,
        field: 'Nama Lengkap',
        message: `Kontak ${i + 1}: "Nama Lengkap" wajib diisi.`,
      }
    }

    if (!item.tipeKontak.trim()) {
      return {
        index: i,
        field: 'Tipe Kontak',
        message: `Kontak ${i + 1}: "Tipe Kontak" wajib diisi.`,
      }
    }

    if (!item.noTelp.trim()) {
      return {
        index: i,
        field: 'No Kontak',
        message: `Kontak ${i + 1}: "No Kontak" wajib diisi.`,
      }
    }
  }

  return null
}
