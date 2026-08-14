import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

function toStringId(doc: any) {
  if (!doc) return doc;
  return { ...doc, _id: String(doc._id) };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(getDbName());

  // GET hanya approved (sesuai kebutuhan autocomplete/suggestion kamu)
  const company = await db.collection("companies").findOne({
    _id: new ObjectId(id),
    approval_status: "APPROVED",
  });

  if (!company) {
    return NextResponse.json(
      { error: "Company tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: toStringId(company) });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const client = await clientPromise;
  const db = client.db(getDbName());
  const col = db.collection("companies");

  const _id = new ObjectId(id);

  const oldDoc = await col.findOne({ _id, approval_status: "APPROVED" });
  if (!oldDoc) {
    return NextResponse.json(
      { error: "Company tidak ditemukan" },
      { status: 404 },
    );
  }

  const $set = {
    institusi_kerja: body.institusi_kerja,
    kota_kab: body.kota_kab,
    klpd: body.klpd,
    satuan_kerja: body.satuan_kerja,
    status_ring: body.status_ring,
    kode_dinas: body.kode_dinas,
    pic_default: body.pic_default,
    updatedAt: new Date(),
  };

  const updatedDoc = await col.findOneAndUpdate(
    { _id, approval_status: "APPROVED" },
    { $set },
    { returnDocument: "after" },
  );

  if (!updatedDoc) {
    return NextResponse.json(
      { error: "Company tidak ditemukan" },
      { status: 404 },
    );
  }

  // Determine what changed for history logging
  const changes: string[] = [];
  if (oldDoc.institusi_kerja !== body.institusi_kerja)
    changes.push("Institusi Kerja");
  if (oldDoc.kota_kab !== body.kota_kab) changes.push("Kota/Kab");
  if (oldDoc.klpd !== body.klpd) changes.push("KLPD");
  if (oldDoc.satuan_kerja !== body.satuan_kerja) changes.push("Satuan Kerja");
  if (oldDoc.status_ring !== body.status_ring) changes.push("Status Segmen");
  if (oldDoc.kode_dinas !== body.kode_dinas) changes.push("Kode Dinas");
  if (JSON.stringify(oldDoc.pic_default) !== JSON.stringify(body.pic_default)) {
    changes.push("PIC Default");
  }

  if (changes.length > 0) {
    const userFullName =
      gate.session.fullName || gate.session.username || "Unknown";
    const note = `Mengubah: ${changes.join(", ")}`;

    await db.collection("company_history").insertOne({
      companyId: _id,
      at: new Date(),
      action: "EDIT",
      by: userFullName,
      note,
    });
  }

  

  return NextResponse.json({
    data: { ...updatedDoc, _id: String((updatedDoc as any)._id) },
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(getDbName());

  // DELETE: juga jangan paksa approval_status
  const del = await db
    .collection("companies")
    .deleteOne({ _id: new ObjectId(id) });

  if (!del.deletedCount) {
    return NextResponse.json(
      { error: "Company tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
