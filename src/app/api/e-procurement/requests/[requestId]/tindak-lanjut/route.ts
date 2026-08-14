import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function PUT(
  req: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Resolve params
  const { requestId } = await Promise.resolve(ctx.params);
  const rid = decodeURIComponent(requestId);

  const body = await req.json().catch(() => ({}));
  const tindakLanjut = body?.tindakLanjut;
  const statusReqSales = body?.statusReqSales || "";
  const catatan = body?.catatan || "";

  if (
    tindakLanjut !== "" &&
    tindakLanjut !== "Lanjut" &&
    tindakLanjut !== "Cancel"
  ) {
    return NextResponse.json(
      {
        error:
          "Tindak lanjut tidak valid. Harus 'Lanjut', 'Cancel', atau kosong.",
      },
      { status: 400 },
    );
  }

  const client = await clientPromise;
  const db = client.db(getDbName());
  const col = db.collection("eproc_requests");

  const existing = await col.findOne(
    { requestId: rid },
    { projection: { _id: 0, createdBy: 1, assignedTo: 1, tindakLanjut: 1 } },
  );

  if (!existing) {
    return NextResponse.json(
      { error: "Request tidak ditemukan" },
      { status: 404 },
    );
  }

  // Permission check: allow if superadmin or if they are creator/assigned
  let canAccess = false;
  if (auth.session.role === "SUPERADMIN") canAccess = true;
  else if ((existing as any).createdBy?.userId === auth.session.userId)
    canAccess = true;
  else if ((existing as any).assignedTo?.userId === auth.session.userId)
    canAccess = true;

  if (!canAccess) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const now = new Date();

  // Menentukan teks Aksi
  const oldTindakLanjut = (existing as any).tindakLanjut;
  let actionString = "";
  if (tindakLanjut === "") {
    actionString = "Mengembalikan usulan ke tahap Lapor";
  } else if (oldTindakLanjut && oldTindakLanjut !== tindakLanjut) {
    actionString = `Mengubah ${oldTindakLanjut} menjadi ${tindakLanjut}`;
  } else {
    actionString = `Mengubah menjadi ${tindakLanjut}`;
  }

  // Buat history record
  const historyRecord = {
    requestId: rid,
    action: actionString,
    tindakLanjut,
    statusReqSales,
    catatan,
    at: now,
    by: auth.session.fullName || auth.session.username || "System",
  };

  const rawResult = await col.findOneAndUpdate(
    { requestId: rid },
    {
      $set: {
        tindakLanjut,
        statusReqSales,
        catatan,
        updatedAt: now,
      },
    } as any,
    {
      returnDocument: "after",
      projection: { _id: 0 },
    } as any,
  );

  // Insert to separate collection
  await db.collection("eproc_history").insertOne(historyRecord);

  const updated = (rawResult as any)?.value ?? rawResult ?? null;

  if (!updated) {
    return NextResponse.json(
      { error: "Gagal memperbarui tindak lanjut." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: updated });
}
