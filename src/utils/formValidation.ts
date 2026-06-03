export type FieldError = {
  field: string
  message: string
} | null

export function validateFormFields(data: {
  requestor: string
  segmen: string
  namaPerusahaan: string
  provinsi: string
  kota: string
  alamat: string
  bidangPerusahaan: string
  segmentasi: string
  produkRelevan: string
  merekTayang: string
  brandOwner: string
  sumberData: string
  linkProduk: string
  linkToko: string
  merekLainnya: string
  salesInternal: string
}): FieldError {
  const requiredHeader = [
    { value: data.requestor, label: 'Requestor' },
    { value: data.segmen, label: 'Segmen' },
    { value: data.namaPerusahaan, label: 'Nama Perusahaan' },
    { value: data.provinsi, label: 'Provinsi' },
    { value: data.kota, label: 'Kota' },
    { value: data.alamat, label: 'Alamat' },
    { value: data.bidangPerusahaan, label: 'Bidang Perusahaan' },
    { value: data.segmentasi, label: 'Segmentasi' },
    { value: data.produkRelevan, label: 'Produk Relevan' },
    { value: data.merekTayang, label: 'Merek Tayang' },
    { value: data.brandOwner, label: 'Brand Owner' },
    { value: data.sumberData, label: 'Sumber Data' },
    { value: data.linkProduk, label: 'Link Produk' },
    { value: data.linkToko, label: 'Link Toko' },
    { value: data.merekLainnya, label: 'Merek Lainnya' },
    { value: data.salesInternal, label: 'Sales Internal' },
  ]

  for (const field of requiredHeader) {
    if (field.label === 'Merek Lainnya') {
      if (data.merekTayang === 'Lainnya' && !field.value.trim()) {
        return { field: field.label, message: `Field "${field.label}" wajib diisi.` }
      }
      continue
    }

    if (field.label === 'Sales Internal') {
      if (data.sumberData === 'Sales Internal' && !field.value.trim()) {
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
  tipeKontak: string
  noTelp: string
  email: string
}

export type ContactError = {
  index: number
  field: string
  message: string
} | null

export function validateContactItems(items: ContactItem[]): ContactError {
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
