/**
 * Akses data kontrak yang dipakai bersama oleh beberapa route
 * (daftar, ekspor, reminders). Hanya untuk server.
 */
import type { Db, Document, PushOperator } from "mongodb";
import { DOK_AKTIF_FILTER } from "./dokumentasi-arsip";
import { FACET_FIELDS, normalizeFacetValues } from "./contract-query";

export const CONTRACTS_COL = "contracts";
export const DOKUMENTASI_COL = "dokumentasi_project";

type Doc = Record<string, unknown>;

/**
 * Tentukan status dokumen sales per kontrak. "Proses Verifikasi" diset manual oleh admin
 * dan hanya berlaku bila dokumentasi memang sudah diunggah.
 * Hanya menanyakan kontrak yang sedang ditampilkan (bukan seluruh koleksi dokumentasi).
 */
export async function withDokSales<T extends Doc>(db: Db, items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const nomors = items.map((c) => String(c.nomorKontrak ?? "").trim());
  const uploaded = await db
    .collection(DOKUMENTASI_COL)
    .distinct("nomorKontrak", { nomorKontrak: { $in: nomors }, ...DOK_AKTIF_FILTER });
  const uploadedSet = new Set(uploaded.map((nk: unknown) => String(nk ?? "").trim()));

  return items.map((c) => {
    const isUploaded = uploadedSet.has(String(c.nomorKontrak ?? "").trim());
    return {
      ...c,
      dokSales: !isUploaded
        ? "Belum Upload"
        : c.dokSales === "Proses Verifikasi"
          ? "Proses Verifikasi"
          : "Sudah Upload",
    };
  });
}

/**
 * Opsi dropdown filter (nilai unik) + jumlah seluruh kontrak, dalam lingkup perusahaan.
 * Dihitung dari SELURUH kontrak, bukan hanya halaman yang tampil, agar opsi tidak ikut menyusut.
 */
export async function loadFacets(db: Db, perusahaan: string) {
  const scope = perusahaan ? { perusahaan } : {};
  const col = db.collection(CONTRACTS_COL);
  const [lists, totalAll] = await Promise.all([
    Promise.all(FACET_FIELDS.map((f) => col.distinct(f, scope))),
    col.countDocuments(scope),
  ]);
  const facets = Object.fromEntries(
    FACET_FIELDS.map((f, i) => [f, normalizeFacetValues(lists[i])]),
  ) as Record<(typeof FACET_FIELDS)[number], string[]>;
  return { facets, totalAll };
}

/**
 * Operator $push untuk menaruh catatan riwayat di posisi paling atas (terbaru dulu).
 * Satu-satunya tempat cast: tipe `PushOperator<Document>` milik driver Mongo tidak bisa
 * memetakan `$each` + `$position` pada koleksi berskema bebas.
 */
export function pushHistoryFirst(entry: object): PushOperator<Document> {
  return { history: { $each: [entry], $position: 0 } } as unknown as PushOperator<Document>;
}
