/**
 * Status masa berlaku kontrak berdasarkan `tanggalBerakhirKontrak` (YYYY-MM-DD).
 *
 * Satu-satunya sumber aturan — dipakai halaman Kontrak dan API reminders
 * agar keduanya selalu sepakat.
 *
 *  - KEDALUWARSA     : tanggal berakhir sudah lewat (kemarin atau sebelumnya)
 *  - SEGERA_BERAKHIR : berakhir hari ini sampai 7 hari ke depan
 *  - AKTIF           : selebihnya, termasuk kontrak tanpa tanggal berakhir
 *
 * Perbandingan dilakukan per HARI KALENDER (bukan per milidetik), karena
 * kontrak yang berakhir hari ini masih berlaku sampai hari ini berakhir.
 */

export type ContractExpiryStatus = "AKTIF" | "SEGERA_BERAKHIR" | "KEDALUWARSA";

export const SEGERA_BERAKHIR_HARI = 7;

export const CONTRACT_EXPIRY_LABEL: Record<ContractExpiryStatus, string> = {
  AKTIF: "Aktif",
  SEGERA_BERAKHIR: "Segera Berakhir",
  KEDALUWARSA: "Kedaluwarsa",
};

/** Zona waktu bisnis. Tanggal "hari ini" selalu dihitung di zona ini. */
export const DEFAULT_TIME_ZONE = "Asia/Jakarta";

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Tanggal hari ini (YYYY-MM-DD) pada zona waktu tertentu. */
export function todayString(
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  // Lokal "en-CA" menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Ubah "YYYY-MM-DD" (atau ISO datetime) jadi nomor hari; null jika tidak valid. */
function toDayNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = ISO_DATE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  // Tolak tanggal yang "meluap" (mis. 2026-02-31 atau 2026-13-01).
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return ms / MS_PER_DAY;
}

/**
 * Selisih hari dari `today` ke `endDate`.
 * Positif = masih ke depan, 0 = hari ini, negatif = sudah lewat.
 * null jika `endDate` kosong/tidak valid.
 */
export function daysUntil(
  endDate: string | null | undefined,
  today: string = todayString(),
): number | null {
  const end = toDayNumber(endDate);
  const now = toDayNumber(today);
  if (end === null || now === null) return null;
  return end - now;
}

/** Geser tanggal YYYY-MM-DD sebanyak `days` hari (boleh negatif). */
export function shiftDate(date: string, days: number): string {
  const n = toDayNumber(date);
  if (n === null) throw new Error(`Tanggal tidak valid: ${date}`);
  return new Date((n + days) * MS_PER_DAY).toISOString().slice(0, 10);
}

export function getContractExpiryStatus(
  endDate: string | null | undefined,
  today: string = todayString(),
): ContractExpiryStatus {
  const days = daysUntil(endDate, today);
  // Tanpa tanggal berakhir yang valid, kontrak tidak bisa dinilai -> dianggap aktif.
  if (days === null) return "AKTIF";
  if (days < 0) return "KEDALUWARSA";
  if (days <= SEGERA_BERAKHIR_HARI) return "SEGERA_BERAKHIR";
  return "AKTIF";
}
