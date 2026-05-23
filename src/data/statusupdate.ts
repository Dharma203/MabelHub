const rawData: { status: string; update: string }[] = [
  { status: 'Respon Netral', update: 'Baik, terima kasih informasinya' },
  { status: 'Respon Netral', update: 'Mohon ditunggu sebentar.' },
  { status: 'Respon Netral', update: 'Kami pelajari terlebih dahulu.' },
  { status: 'Respon Netral', update: 'Informasi sudah kami terima.' },
  { status: 'Respon Netral', update: 'Terima kasih sudah menghubungi kami.' },
  { status: 'Respon Netral', update: 'Hanya Menjawab Nama' },
  { status: 'Respon Netral', update: 'Nanti jika ada kebutuhan kami hubungi.' },
  { status: 'Respon Positif', update: 'Bertanya status TKDN' },
  { status: 'Respon Positif', update: 'Bertanya Spesifikasi' },
  { status: 'Respon Positif', update: 'Bertanya Pricelist' },
  {
    status: 'Respon Positif',
    update: 'Bersedia berdiskusi lebih lanjut dengan sales',
  },
  {
    status: 'Respon Positif',
    update: 'Bersedia di Presentasikan untuk presales',
  },
  { status: 'Respon Positif', update: 'Meminta & mengisi form reseller' },
  { status: 'Respon Positif', update: 'Meminta SPH' },
  { status: 'Respon Negatif', update: 'Tidak tertarik' },
  { status: 'Respon Negatif', update: 'Belum butuh' },
  { status: 'Respon Negatif', update: 'Budget belum ada' },
  { status: 'Respon Negatif', update: 'Sudah pakai brand lain' },
  { status: 'Respon Negatif', update: 'Jangan hubungi lagi' },
  { status: 'Respon Negatif', update: 'Harga terlalu mahal' },
  { status: 'Respon Negatif', update: 'Spesifikasi tidak cocok' },
]

export type StatusUpdate = {
  status: string
  update: string
}

export const listStatusUpdate: StatusUpdate[] = rawData

// Dropdown Status WA — unik per status
export const listStatusByUpdate = [
  { value: '', label: '-- Pilih Status --' },
  { value: 'Nomor Invalid', label: 'Nomor Invalid' },
  { value: 'Terkirim(1C)', label: 'Terkirim(1C)' },
  { value: 'Diterima(2C)', label: 'Diterima(2C)' },
  { value: 'Aktif Broadcast', label: 'Aktif Broadcast' },
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
