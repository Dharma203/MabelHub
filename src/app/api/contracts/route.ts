import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";

const DB_NAME = getDbName();
const COL_NAME = "contracts";

declare global {
  // eslint-disable-next-line no-var
  var __contracts_indexes_promise: Promise<void> | undefined;
}

async function ensureIndexes(db: any) {
  if (!global.__contracts_indexes_promise) {
    global.__contracts_indexes_promise = (async () => {
      const col = db.collection(COL_NAME);
      await col.createIndex({ nomorKontrak: 1 }, { unique: true });
      await col.createIndex({ perusahaan: 1 });
      await col.createIndex({ tanggalBerakhirKontrak: 1 });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  await global.__contracts_indexes_promise;
}

export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const perusahaan = searchParams.get("perusahaan") || "";

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);

  const filter: any = {};
  if (perusahaan) filter.perusahaan = perusahaan;

  const items = await db
    .collection(COL_NAME)
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));

  const nomorKontrak = String(body.nomorKontrak ?? "").trim();
  if (!nomorKontrak) {
    return NextResponse.json(
      { error: "Nomor Kontrak wajib diisi" },
      { status: 400 },
    );
  }

  const perusahaan = String(body.perusahaan ?? "").trim();

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);

  // Check uniqueness
  const existing = await db
    .collection(COL_NAME)
    .findOne({ nomorKontrak });
  if (existing) {
    return NextResponse.json(
      { error: `Nomor Kontrak "${nomorKontrak}" sudah ada` },
      { status: 409 },
    );
  }

  const now = new Date();

  const doc = {
    nomorKontrak,
    perusahaan,
    requestIds: Array.isArray(body.requestIds)
      ? body.requestIds.map((id: any) => String(id).trim()).filter(Boolean)
      : [],
    link: String(body.link ?? "").trim(),
    namaFolder: String(body.namaFolder ?? "").trim(),
    instansi: String(body.instansi ?? "").trim(),
    tanggalKontrak: String(body.tanggalKontrak ?? "").trim(),
    namaPengadaan: String(body.namaPengadaan ?? "").trim(),
    nominalKontrak: Number(body.nominalKontrak) || 0,
    fisik: body.fisik === "YA" ? "YA" : "TIDAK",
    scan: body.scan === "YA" ? "YA" : "TIDAK",
    keterangan: String(body.keterangan ?? "").trim(),
    marketing: String(body.marketing ?? "").trim(),
    bendera: String(body.bendera ?? "").trim(),
    tanggalPenyerahan: String(body.tanggalPenyerahan ?? "").trim(),
    catatan: String(body.catatan ?? "").trim(),
    pic: String(body.pic ?? "").trim(),
    tanggalBerakhirKontrak: String(body.tanggalBerakhirKontrak ?? "").trim(),

    // Penagihan (embedded, one per contract)
    penagihan: {
      tanggalMulai: String(body.penagihan?.tanggalMulai ?? "").trim(),
      tanggalBerakhir: String(body.penagihan?.tanggalBerakhir ?? "").trim(),
      nominalPenagihan: Number(body.penagihan?.nominalPenagihan) || 0,
    },

    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COL_NAME).insertOne(doc);

  // Return without _id
  const { ...rest } = doc;
  return NextResponse.json({ data: rest }, { status: 201 });
}
