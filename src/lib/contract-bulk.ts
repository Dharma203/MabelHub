/**
 * Aksi massal kontrak: ubah PIC dan/atau Marketing untuk banyak kontrak sekaligus.
 * Modul murni — validasi permintaan, rencana perubahan per kontrak, dan catatan riwayat.
 *
 * Sengaja dibatasi dua kolom saja. Mengosongkan nilai juga tidak diizinkan lewat jalur ini,
 * supaya salah klik tidak menghapus PIC/Marketing ratusan kontrak sekaligus.
 */

export const MAX_BULK = 200;
export const MAX_VALUE_LENGTH = 100;

export const BULK_FIELDS = ["pic", "marketing"] as const;
export type BulkField = (typeof BULK_FIELDS)[number];
export type BulkChanges = Partial<Record<BulkField, string>>;

export const BULK_FIELD_LABEL: Record<BulkField, string> = { pic: "PIC", marketing: "Marketing" };

/** Peran pengguna yang boleh dipilih untuk tiap kolom — sama dengan daftar pilihan di form kontrak. */
export const BULK_ALLOWED_ROLES: Record<BulkField, string[]> = {
  pic: ["ADMIN", "SUPERADMIN"],
  marketing: ["SALES", "LEADER", "SUPERADMIN"],
};

export type BulkParse =
  | { ok: true; value: { nomorKontrak: string[]; changes: BulkChanges } }
  | { ok: false; error: string };

export function parseBulkRequest(raw: unknown): BulkParse {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  if (!Array.isArray(body.nomorKontrak)) {
    return { ok: false, error: "Daftar nomor kontrak wajib diisi" };
  }
  const nomor: string[] = [];
  const seen = new Set<string>();
  for (const item of body.nomorKontrak) {
    if (typeof item !== "string") return { ok: false, error: "Nomor kontrak harus berupa teks" };
    const nk = item.trim();
    if (nk && !seen.has(nk)) {
      seen.add(nk);
      nomor.push(nk);
    }
  }
  if (nomor.length === 0) return { ok: false, error: "Pilih minimal satu kontrak" };
  if (nomor.length > MAX_BULK) {
    return { ok: false, error: `Maksimal ${MAX_BULK} kontrak per aksi massal (dipilih ${nomor.length})` };
  }

  const rawChanges = body.changes;
  if (!rawChanges || typeof rawChanges !== "object" || Array.isArray(rawChanges)) {
    return { ok: false, error: "Perubahan wajib diisi" };
  }
  const changes: BulkChanges = {};
  for (const [key, value] of Object.entries(rawChanges as Record<string, unknown>)) {
    if (!(BULK_FIELDS as readonly string[]).includes(key)) {
      return { ok: false, error: `Kolom "${key}" tidak dapat diubah secara massal` };
    }
    const field = key as BulkField;
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return { ok: false, error: `${BULK_FIELD_LABEL[field]} baru wajib dipilih (tidak boleh dikosongkan)` };
    if (v.length > MAX_VALUE_LENGTH) {
      return { ok: false, error: `${BULK_FIELD_LABEL[field]} terlalu panjang (maks ${MAX_VALUE_LENGTH} karakter)` };
    }
    changes[field] = v;
  }
  if (Object.keys(changes).length === 0) return { ok: false, error: "Pilih PIC atau Marketing yang akan diubah" };

  return { ok: true, value: { nomorKontrak: nomor, changes } };
}

export type BulkHistoryChange = { field: string; label: string; oldValue: string; newValue: string };
export type BulkPlanItem = { nomorKontrak: string; set: BulkChanges; changes: BulkHistoryChange[] };

/**
 * Bandingkan kontrak yang ada dengan perubahan yang diminta.
 * Kontrak yang nilainya sudah sama dilewati (tidak ditulis, tidak masuk riwayat).
 */
export function planBulkUpdate(
  docs: { nomorKontrak: string; pic?: unknown; marketing?: unknown }[],
  changes: BulkChanges,
): { updates: BulkPlanItem[]; unchanged: string[] } {
  const updates: BulkPlanItem[] = [];
  const unchanged: string[] = [];

  for (const doc of docs) {
    const set: BulkChanges = {};
    const hist: BulkHistoryChange[] = [];
    for (const field of BULK_FIELDS) {
      const next = changes[field];
      if (next === undefined) continue;
      const prev = String(doc[field] ?? "").trim();
      if (prev === next) continue;
      set[field] = next;
      hist.push({ field, label: BULK_FIELD_LABEL[field], oldValue: prev || "-", newValue: next });
    }
    if (hist.length === 0) unchanged.push(doc.nomorKontrak);
    else updates.push({ nomorKontrak: doc.nomorKontrak, set, changes: hist });
  }
  return { updates, unchanged };
}

export function buildBulkHistoryEntry(
  changes: BulkHistoryChange[],
  ctx: { now: Date; by: string; role: string },
) {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    at: ctx.now,
    by: ctx.by,
    role: ctx.role,
    action: "BULK_UPDATE",
    changes,
  };
}
