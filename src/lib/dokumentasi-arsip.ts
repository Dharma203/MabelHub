/**
 * Aturan pengarsipan dokumentasi project.
 *
 * Satu kontrak punya SATU dokumentasi aktif. Saat sales mengirim ulang,
 * dokumentasi lama TIDAK dihapus: ia ditandai `archived: true` (beserta
 * foto/videonya) dan tetap bisa dilihat sebagai versi sebelumnya.
 * Arsip baru dihapus permanen setelah masa retensi lewat.
 *
 * Dokumen lama yang dibuat sebelum fitur ini tidak punya field `archived`,
 * sehingga otomatis dianggap aktif (`$ne: true`).
 */

/** Filter Mongo: hanya dokumentasi aktif (bukan arsip). */
export const DOK_AKTIF_FILTER = { archived: { $ne: true } } as const;

export const DEFAULT_RETENSI_HARI = 90;

const MS_PER_DAY = 86_400_000;

/**
 * Masa retensi arsip (hari) dari env DOKUMENTASI_ARSIP_RETENSI_HARI.
 *  - tidak diset / tidak valid -> 90 hari
 *  - 0 atau negatif            -> 0 (arsip disimpan selamanya)
 */
export function getRetensiHari(raw: string | undefined = process.env.DOKUMENTASI_ARSIP_RETENSI_HARI): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_RETENSI_HARI;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_RETENSI_HARI;
  return n > 0 ? Math.floor(n) : 0;
}

/**
 * Arsip yang `archivedAt`-nya lebih lama dari batas ini boleh dihapus permanen.
 * null = retensi dimatikan, jangan hapus apa pun.
 */
export function retentionCutoff(now: Date, retensiHari: number): Date | null {
  if (!(retensiHari > 0)) return null;
  return new Date(now.getTime() - retensiHari * MS_PER_DAY);
}

/**
 * Nomor versi berikutnya berdasarkan dokumentasi TERBARU kontrak itu
 * (aktif maupun arsip). Dokumen lama tanpa field `version` dihitung sebagai v1.
 */
export function nextVersion(latest: object | null | undefined): number {
  if (!latest) return 1;
  const v = Number((latest as { version?: unknown }).version);
  return (Number.isFinite(v) && v > 0 ? v : 1) + 1;
}
