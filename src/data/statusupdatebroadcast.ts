const rawData: { status: string; update: string }[] = [
  { status: 'Dibaca - Respons Netral', update: 'Baik, terima kasih informasinya' },
  { status: 'Dibaca - Respons Netral', update: 'Mohon ditunggu sebentar.' },
  { status: 'Dibaca - Respons Netral', update: 'Kami pelajari terlebih dahulu.' },
  { status: 'Dibaca - Respons Netral', update: 'Informasi sudah kami terima.' },
  { status: 'Dibaca - Respons Netral', update: 'Terima kasih sudah menghubungi kami.' },
  { status: 'Dibaca - Respons Netral', update: 'Hanya Menjawab Nama' },
  { status: 'Dibaca - Respons Netral', update: 'Nanti jika ada kebutuhan kami hubungi.' },
  { status: 'Dibaca - Respons Netral', update: 'Diberikan Nomor PIC' },
  { status: 'Dibaca - Respons Positif', update: 'Bertanya status TKDN' },
  { status: 'Dibaca - Respons Positif', update: 'Bertanya Spesifikasi' },
  { status: 'Dibaca - Respons Positif', update: 'Bertanya Pricelist' },
  {
    status: 'Dibaca - Respons Positif',
    update: 'Bersedia berdiskusi lebih lanjut dengan sales',
  },
  {
    status: 'Dibaca - Respons Positif',
    update: 'Bersedia di Presentasikan untuk presales',
  },
  { status: 'Dibaca - Respons Positif', update: 'Meminta & mengisi form reseller' },
  { status: 'Dibaca - Respons Positif', update: 'Meminta SPH' },
  { status: 'Dibaca - Respons Negatif', update: 'Tidak tertarik' },
  { status: 'Dibaca - Respons Negatif', update: 'Belum butuh' },
  { status: 'Dibaca - Respons Negatif', update: 'Budget belum ada' },
  { status: 'Dibaca - Respons Negatif', update: 'Sudah pakai brand lain' },
  { status: 'Dibaca - Respons Negatif', update: 'Jangan hubungi lagi' },
  { status: 'Dibaca - Respons Negatif', update: 'Harga terlalu mahal' },
  { status: 'Dibaca - Respons Negatif', update: 'Spesifikasi tidak cocok' },
]

export type StatusUpdate = {
  status: string
  update: string
}

export const listStatusUpdate: StatusUpdate[] = rawData

// Dropdown Status WA — unik per status
export const listStatusByUpdate = [
  { value: '', label: '--Pilih Status--' },
  { value: 'Nomor Invalid', label: 'Nomor Invalid' },
  { value: 'Terkirim (1C)', label: 'Terkirim (1C)' },
  { value: 'Diterima (2C)', label: 'Diterima (2C)' },
  { value: 'Aktif Progres', label: 'Aktif Progres' },
  { value: 'Dibaca - Belum Respons', label: 'Dibaca - Belum Respons' },
  ...Array.from(new Set(rawData.map((w) => w.status)))
    .sort()
    .map((s) => ({ value: s, label: s })),
]

// Fungsi: ambil opsi Detail berdasarkan status yang dipilih (cascading)
export function getDetailOptions(selectedStatus: string) {
  const filtered = selectedStatus
    ? rawData.filter((w) => w.status === selectedStatus)
    : rawData

  return [
    { value: '', label: '-- Pilih Detail --' },
    ...filtered.map((w) => ({ value: w.update, label: w.update })),
  ]
}
