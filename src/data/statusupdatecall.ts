const rawData: { status: string; update: string }[] = [
    { status: 'Diangkat Respon Positif', update: 'Memberikan Nomor Wa' },
    { status: 'Diangkat Respon Positif', update: 'Memberi Tau PIC' },
    { status: 'Diangkat Respon Positif', update: 'Bersedia disambungkan ke bagian terkait' },
    { status: 'Diangkat Respon Negatif', update: 'Tidak Tertarik' },
    { status: 'Diangkat Respon Negatif', update: 'Menolak Hubungan Lanjutan' },
]

export type StatusUpdate = { status: string; update: string }


export const listStatusUpdate: StatusUpdate[] = rawData

export const listStatusByUpdate = [
    { value: '', label: '--Pilih Status--' },
    { value: 'Nomor Tidak Tersedia', label: 'Nomor Tidak Tersedia' },
    { value: 'Nomor Sedang Sibuk', label: 'Nomor Sedang Sibuk' },
    { value: 'Tidak Diangkat', label: 'Tidak Diangkat' },
    { value: 'Mailbox', label: 'Mailbox' },
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