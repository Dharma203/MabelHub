import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import {
  BULK_ALLOWED_ROLES,
  BULK_FIELDS,
  BULK_FIELD_LABEL,
  buildBulkHistoryEntry,
  parseBulkRequest,
  planBulkUpdate,
} from "@/lib/contract-bulk";
import { CONTRACTS_COL, pushHistoryFirst } from "@/lib/contracts-data";

export const dynamic = "force-dynamic";

const DB_NAME = getDbName();

/**
 * Ubah PIC dan/atau Marketing untuk banyak kontrak sekaligus.
 * Body: { nomorKontrak: string[], changes: { pic?: string, marketing?: string } }
 *
 * - Hanya dua kolom itu yang boleh diubah, dan tidak boleh dikosongkan.
 * - Nilai baru harus pengguna sungguhan dengan peran yang sesuai (sama seperti pilihan di form).
 * - Kontrak yang nilainya sudah sama dilewati. Tiap kontrak yang berubah mendapat catatan riwayat.
 */
export async function POST(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const parsed = parseBulkRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { nomorKontrak, changes } = parsed.value;

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  for (const field of BULK_FIELDS) {
    const value = changes[field];
    if (!value) continue;
    const user = await db
      .collection("users")
      .findOne({ fullName: value, role: { $in: BULK_ALLOWED_ROLES[field] } }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json(
        { error: `${BULK_FIELD_LABEL[field]} "${value}" tidak ditemukan atau tidak berhak menjadi ${BULK_FIELD_LABEL[field]}` },
        { status: 400 },
      );
    }
  }

  const col = db.collection(CONTRACTS_COL);
  const docs = await col
    .find({ nomorKontrak: { $in: nomorKontrak } }, { projection: { _id: 0, nomorKontrak: 1, pic: 1, marketing: 1 } })
    .toArray();

  const found = new Set(docs.map((d) => String(d.nomorKontrak)));
  const notFound = nomorKontrak.filter((nk) => !found.has(nk));
  const { updates, unchanged } = planBulkUpdate(
    docs.map((d) => ({ nomorKontrak: String(d.nomorKontrak), pic: d.pic, marketing: d.marketing })),
    changes,
  );

  let modified = 0;
  if (updates.length > 0) {
    const now = new Date();
    const ctx = {
      now,
      by: gate.session.fullName || gate.session.username || "Admin",
      role: gate.session.role || "ADMIN",
    };
    const result = await col.bulkWrite(
      updates.map((u) => ({
        updateOne: {
          filter: { nomorKontrak: u.nomorKontrak },
          update: {
            $set: { ...u.set, updatedAt: now },
            $push: pushHistoryFirst(buildBulkHistoryEntry(u.changes, ctx)),
          },
        },
      })),
      { ordered: false },
    );
    modified = result.modifiedCount ?? updates.length;
  }

  return NextResponse.json({
    ok: true,
    requested: nomorKontrak.length,
    modified,
    unchanged: unchanged.length,
    notFound,
  });
}
