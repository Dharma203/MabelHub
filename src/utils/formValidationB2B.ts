export type FieldError = {
  field: string
  message: string
} | null

export function validateFormFieldsB2B(data: {
  requestor: string
  jenisEntitas: string
  namaEntitas: string
  bidangUsaha: string
  provinsi: string
  kota: string
  alamat: string
  ring: string
  produkRelevan: string
  merekTayang: string
  brandOwner: string
  sumberData: string
  linkProduk: string
  linkToko: string
  salesInternal: string

}): FieldError {
  const requiredHeader = [
    { value: data.requestor, label: 'Penginput' },
    { value: data.jenisEntitas, label: 'Jenis Entitas'},
    { value: data.namaEntitas, label: 'Nama Entitas'},
    { value: data.bidangUsaha, label: 'Bidang Usaha'},
    { value: data.provinsi, label: 'Provinsi' },
    { value: data.kota, label: 'Kota' },
    { value: data.alamat, label: 'Alamat' },
    { value: data.ring, label: 'RING'},
    { value: data.produkRelevan, label: 'Produk Relevan'},
    { value: data.merekTayang, label: 'Merek Tayang'},
    { value: data.brandOwner, label: 'Brand Owenr'},
    { value: data.sumberData, label: 'Sumber Data'},
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

export function validateContactItemsB2B(items: ContactItem[]): ContactError {
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
