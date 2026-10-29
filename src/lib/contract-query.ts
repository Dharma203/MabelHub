/**
 * Query kontrak di sisi server: parsing parameter URL -> filter Mongo + paginasi.
 *
 * Satu-satunya sumber aturan filter, dipakai oleh:
 *   - GET /api/contracts          (daftar + paginasi)
 *   - GET /api/contracts/export   (ekspor Excel sesuai filter aktif)
 * sehingga isi Excel selalu sama dengan isi tabel yang sedang dilihat.
 *
 * Modul ini murni (tanpa akses database) agar bisa dites tanpa Mongo.
 */
import {
  SEGERA_BERAKHIR_HARI,
  contractStatusFromLabel,
  isValidDateString,
  shiftDate,
  type ContractExpiryStatus,
} from "./contract-status";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
/** Batas baris pada mode lama (tanpa `page`), dipertahankan agar halaman lain tidak berubah. */
export const LEGACY_LIMIT = 500;
export const MAX_EXPORT_ROWS = 20_000;
export const MAX_SEARCH_LENGTH = 100;

/** Kolom yang dicari oleh kotak pencarian (sama dengan perilaku lama di browser). */
export const SEARCH_FIELDS = [
  "nomorKontrak",
  "instansi",
  "marketing",
  "pic",
  "namaPengadaan",
  "bendera",
] as const;

/** Kolom yang nilai uniknya dipakai sebagai opsi dropdown filter. */
export const FACET_FIELDS = ["marketing", "bendera", "pic", "instansi"] as const;

/** Urutan stabil: createdAt terbaru dulu, nomorKontrak sebagai pemecah seri agar paginasi tidak melompat. */
export const CONTRACT_SORT = { createdAt: -1, nomorKontrak: 1 } as const;

const DATE_RE = "^\\d{4}-\\d{2}-\\d{2}";
const END_FIELD = "tanggalBerakhirKontrak";

export type ContractQuery = {
  perusahaan: string;
  q: string;
  dateFrom: string;
  dateTo: string;
  marketing: string;
  bendera: string;
  pic: string;
  status: ContractExpiryStatus | null;
};

type ParamsLike = { get(name: string): string | null };

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s === "Semua" ? "" : s;
};

/** Escape karakter spesial regex agar input pengguna dicari apa adanya (dan aman dari ReDoS/injeksi). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseContractQuery(sp: ParamsLike): ContractQuery {
  const rawStatus = clean(sp.get("status"));
  const status =
    (["AKTIF", "SEGERA_BERAKHIR", "KEDALUWARSA"] as const).find((s) => s === rawStatus) ??
    contractStatusFromLabel(rawStatus);

  const dateFrom = clean(sp.get("dateFrom"));
  const dateTo = clean(sp.get("dateTo"));

  return {
    perusahaan: clean(sp.get("perusahaan")),
    q: clean(sp.get("q")).slice(0, MAX_SEARCH_LENGTH),
    dateFrom: isValidDateString(dateFrom) ? dateFrom : "",
    dateTo: isValidDateString(dateTo) ? dateTo : "",
    marketing: clean(sp.get("marketing")),
    bendera: clean(sp.get("bendera")),
    pic: clean(sp.get("pic")),
    status: status ?? null,
  };
}

/** Kebalikan parseContractQuery: dipakai klien agar nama parameter tidak bisa menyimpang dari server. */
export function contractQueryToParams(q: Partial<ContractQuery>): URLSearchParams {
  const params = new URLSearchParams();
  (
    ["perusahaan", "q", "dateFrom", "dateTo", "marketing", "bendera", "pic", "status"] as const
  ).forEach((key) => {
    const v = q[key];
    if (v) params.set(key, String(v));
  });
  return params;
}

/**
 * Filter Mongo untuk status masa berlaku. HARUS setara dengan getContractExpiryStatus:
 *  - KEDALUWARSA     : tanggal berakhir < hari ini
 *  - SEGERA_BERAKHIR : hari ini <= tanggal berakhir <= hari ini + 7
 *  - AKTIF           : selain keduanya (termasuk kosong / tidak valid)
 * Batas atas dibuat eksklusif ke hari berikutnya agar nilai berformat datetime
 * ("2026-11-02T00:00:00Z") tetap terhitung sebagai hari itu.
 *
 * Satu-satunya selisih dengan fungsi di browser: tanggal kalender yang mustahil
 * (mis. "2026-02-31"). Query tidak bisa menolaknya; input <input type="date"> tidak
 * menghasilkannya, jadi dianggap tidak relevan.
 */
export function expiryStatusFilter(status: ContractExpiryStatus, today: string): Record<string, unknown> {
  const soonEndExclusive = shiftDate(today, SEGERA_BERAKHIR_HARI + 1);
  switch (status) {
    case "KEDALUWARSA":
      return { [END_FIELD]: { $regex: DATE_RE, $lt: today } };
    case "SEGERA_BERAKHIR":
      return { [END_FIELD]: { $regex: DATE_RE, $gte: today, $lt: soonEndExclusive } };
    case "AKTIF":
      return { $nor: [{ [END_FIELD]: { $regex: DATE_RE, $lt: soonEndExclusive } }] };
  }
}

export function buildContractFilter(query: ContractQuery, today: string): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];

  if (query.perusahaan) clauses.push({ perusahaan: query.perusahaan });

  if (query.q) {
    const rx = { $regex: escapeRegex(query.q), $options: "i" };
    clauses.push({ $or: SEARCH_FIELDS.map((f) => ({ [f]: rx })) });
  }

  // Rentang tanggal kontrak. Kontrak tanpa tanggal kontrak tidak ikut saat rentang dipakai.
  if (query.dateFrom || query.dateTo) {
    const cond: Record<string, unknown> = { $regex: DATE_RE };
    if (query.dateFrom) cond.$gte = query.dateFrom;
    if (query.dateTo) cond.$lt = shiftDate(query.dateTo, 1);
    clauses.push({ tanggalKontrak: cond });
  }

  if (query.marketing) clauses.push({ marketing: query.marketing });
  if (query.bendera) clauses.push({ bendera: query.bendera });
  if (query.pic) clauses.push({ pic: query.pic });

  if (query.status) clauses.push(expiryStatusFilter(query.status, today));

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

export type Pagination = { page: number; pageSize: number };

/** null = mode lama (tanpa paginasi). Paginasi aktif bila `page` atau `pageSize` diberikan. */
export function parsePagination(sp: ParamsLike): Pagination | null {
  const rawPage = sp.get("page");
  const rawSize = sp.get("pageSize");
  if (rawPage === null && rawSize === null) return null;

  const page = Math.max(1, Math.floor(Number(rawPage)) || 1);
  const size = Math.floor(Number(rawSize)) || DEFAULT_PAGE_SIZE;
  return { page, pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, size)) };
}

export function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Halaman yang diminta di luar jangkauan (mis. setelah filter menyempit) dikembalikan ke halaman terakhir. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), totalPagesOf(total, pageSize));
}

/** Bersihkan hasil distinct(): hanya string tidak kosong, unik, terurut. */
export function normalizeFacetValues(values: unknown[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

/** Ringkasan filter aktif untuk sheet "Filter Aktif" pada file Excel. */
export function describeActiveFilters(
  q: ContractQuery,
  labels: Record<ContractExpiryStatus, string>,
): { label: string; value: string }[] {
  return [
    { label: "Perusahaan", value: q.perusahaan || "Semua" },
    { label: "Pencarian", value: q.q || "-" },
    { label: "Tgl Kontrak Dari", value: q.dateFrom || "-" },
    { label: "Tgl Kontrak Sampai", value: q.dateTo || "-" },
    { label: "Marketing", value: q.marketing || "Semua" },
    { label: "Bendera", value: q.bendera || "Semua" },
    { label: "PIC", value: q.pic || "Semua" },
    { label: "Status Masa Berlaku", value: q.status ? labels[q.status] : "Semua" },
  ];
}
