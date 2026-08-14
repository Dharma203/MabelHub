import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";

const DB_NAME = getDbName();
const COL_NAME = "contracts";

async function getParams<T>(ctx: { params: T | Promise<T> }) {
  return await Promise.resolve(ctx.params);
}

export async function GET(
  req: Request,
  ctx: { params: { nomorKontrak: string } | Promise<{ nomorKontrak: string }> },
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await getParams(ctx);
  const nk = decodeURIComponent(nomorKontrak);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const doc = await db
    .collection(COL_NAME)
    .findOne({ nomorKontrak: nk }, { projection: { _id: 0 } });

  if (!doc) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: doc });
}

export async function PUT(
  req: Request,
  ctx: { params: { nomorKontrak: string } | Promise<{ nomorKontrak: string }> },
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await getParams(ctx);
  const nk = decodeURIComponent(nomorKontrak);

  const body = await req.json().catch(() => ({}));

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const existing = await db.collection(COL_NAME).findOne({ nomorKontrak: nk });
  if (!existing) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  const now = new Date();

  const setPayload: any = {
    updatedAt: now,
  };

  // Update fields if provided
  const stringFields = [
    "link", "namaFolder", "instansi", "tanggalKontrak",
    "namaPengadaan", "keterangan", "marketing", "bendera",
    "tanggalPenyerahan", "catatan", "pic", "tanggalBerakhirKontrak",
    "perusahaan",
  ];

  for (const f of stringFields) {
    if (body[f] !== undefined) {
      setPayload[f] = String(body[f] ?? "").trim();
    }
  }

  if (body.nominalKontrak !== undefined) {
    setPayload.nominalKontrak = Number(body.nominalKontrak) || 0;
  }

  if (body.fisik !== undefined) {
    setPayload.fisik = body.fisik === "YA" ? "YA" : "TIDAK";
  }

  if (body.scan !== undefined) {
    setPayload.scan = body.scan === "YA" ? "YA" : "TIDAK";
  }

  if (body.requestIds !== undefined && Array.isArray(body.requestIds)) {
    setPayload.requestIds = body.requestIds
      .map((id: any) => String(id).trim())
      .filter(Boolean);
  }

  // Update penagihan (embedded)
  if (body.penagihan !== undefined) {
    setPayload.penagihan = {
      tanggalMulai: String(body.penagihan?.tanggalMulai ?? "").trim(),
      tanggalBerakhir: String(body.penagihan?.tanggalBerakhir ?? "").trim(),
      nominalPenagihan: Number(body.penagihan?.nominalPenagihan) || 0,
    };
  }

  const rawResult = await db.collection(COL_NAME).findOneAndUpdate(
    { nomorKontrak: nk },
    { $set: setPayload },
    { returnDocument: "after", projection: { _id: 0 } },
  );

  const updated = rawResult?.value ?? rawResult ?? null;

  if (!updated) {
    return NextResponse.json(
      { error: "Gagal menyimpan kontrak" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: Request,
  ctx: { params: { nomorKontrak: string } | Promise<{ nomorKontrak: string }> },
) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { nomorKontrak } = await getParams(ctx);
  const nk = decodeURIComponent(nomorKontrak);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const result = await db.collection(COL_NAME).deleteOne({ nomorKontrak: nk });

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { error: "Kontrak tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
