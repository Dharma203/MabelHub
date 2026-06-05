const rawData: {validasi: string, detail_validasi: string} [] = [
    {validasi: 'Valid', detail_validasi: 'PIC Sesuai'},
    {validasi: 'Valid', detail_validasi: 'Penyedia Relevan dengan Produk'},
    {validasi: 'Valid', detail_validasi: 'Perusahaan Aktif'},
    {validasi: 'Valid', detail_validasi: 'Bisa Dihubungi'},
    {validasi: 'Valid', detail_validasi: 'Bisa Dikunjungi'},
    {validasi: 'Valid', detail_validasi: 'Potensi Kerja Sama'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'PIC Belum Jelas'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'Kontak Alternatif Diperlukan'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'Perusahaan Sulit Dihubungi'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'Informasi Perusahaan Kurang Lengkap'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'Perlu Konfirmasi Kebutuhan'},
    {validasi: 'Perlu Verifikasi', detail_validasi: 'Perlu Cek Keberadaan Perusahaan'},
    {validasi: 'Tidak Valid', detail_validasi: 'Nomor Tidak Aktif'},
    {validasi: 'Tidak Valid', detail_validasi: 'Tidak Merespon'},
    {validasi: 'Tidak Valid', detail_validasi: 'Bukan PIC'},
    {validasi: 'Tidak Valid', detail_validasi: 'Bukan Target Market'},
    {validasi: 'Tidak Valid', detail_validasi: 'Perusahaan Tidak Ditemukan'},
    {validasi: 'Tidak Valid', detail_validasi: 'Informasi Tidak Sesuai'}
];

export type DetailValidasi = {
    validasi: string
    detail_validasi: string
}

export const listDetailValidasi: DetailValidasi[] = rawData

/**
 * Opsi dropdown untuk field VALIDASI (hanya kategori unik)
 * Returns: ['', 'Perlu Verifikasi', 'Tidak Valid', 'Valid']
 */
export function getValidasiOptions() {
    return [
        { value: '', label: '--Pilih Validasi --' },
        ...Array.from(new Set(rawData.map((w) => w.validasi)))
            .sort()
            .map((s) => ({ value: s, label: s }))
    ]
}

/**
 * Opsi dropdown untuk field DETAIL VALIDASI (filtered berdasarkan validasi yang dipilih)
 * Jika selectedValidasi kosong, tampilkan semua detail
 */
export function getDetailOptions(selectedValidasi: string) {
    const filtered = selectedValidasi
        ? rawData.filter((w) => w.validasi === selectedValidasi)
        : rawData
    return [
        { value: '', label: '--Pilih Detail Validasi --' },
        ...filtered.map((w) => ({ value: w.detail_validasi, label: w.detail_validasi }))
    ]
}