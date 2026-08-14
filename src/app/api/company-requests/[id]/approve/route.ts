import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = assertLoggedIn(req);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const { id } = await ctx.params; // ✅ params harus di-await

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, message: "Invalid id" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(getDbName());

    const reqCol = db.collection("company_requests");
    const compCol = db.collection("companies");

    // ambil request PENDING
    const reqDoc = await reqCol.findOne({
      _id: new ObjectId(id),
      status: "PENDING",
    });

    if (!reqDoc) {
      return NextResponse.json(
        { ok: false, message: "Request not found / not pending" },
        { status: 404 },
      );
    }

    // anti-duplikat (opsional) pakai key unik
    const uniqueKey = {
      institusi_kerja: reqDoc.institusi_kerja ?? "",
      satuan_kerja: reqDoc.satuan_kerja ?? "",
      kota_kab: reqDoc.kota_kab ?? "",
      klpd: reqDoc.klpd ?? "",
      status_ring: reqDoc.status_ring ?? "",
    };

    const existing = await compCol.findOne({
      ...uniqueKey,
      approval_status: "APPROVED",
    });

    let companyId: ObjectId;

    if (existing?._id) {
      companyId = existing._id as ObjectId;
    } else {
      const ins = await compCol.insertOne({
        institusi_kerja: reqDoc.institusi_kerja ?? "",
        satuan_kerja: reqDoc.satuan_kerja ?? "",
        kota_kab: reqDoc.kota_kab ?? "",
        klpd: reqDoc.klpd ?? "",
        status_ring: reqDoc.status_ring ?? "",
        kode_dinas: reqDoc.kode_dinas ?? "",

        pic_default: reqDoc.pic_default ?? {
          nama: "",
          no_telp: "",
          jabatan: "",
          role: "",
        },

        approval_status: "APPROVED",
        source_request_id: new ObjectId(id),
        approved_at: new Date(),

        createdAt: new Date(),
        updatedAt: new Date(),
      });

      companyId = ins.insertedId;
    }

    // ✅ ini yang bikin request hilang dari pending
    await reqCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "APPROVED",
          approved_at: new Date(),
          approved_company_id: companyId,
        },
      },
    );

    const userFullName =
      gate.session.fullName || gate.session.username || "Unknown";
    await db.collection("company_history").insertOne({
      companyId,
      at: new Date(),
      action: existing?._id ? "APPROVE_MERGE" : "APPROVE_NEW",
      by: userFullName,
      note: existing?._id
        ? "Disetujui dan digabung ke instansi lama"
        : "Disetujui menjadi instansi baru",
    });

    return NextResponse.json({ ok: true, companyId });
  } catch (e: any) {
    console.error("approve error:", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
