import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ring = searchParams.get("ring");
  const q = (searchParams.get("q") || "").trim();

  const client = await clientPromise;
  const db = client.db("MabelHub");

  const filter: any = { approval_status: "APPROVED" };
  if (ring) filter.status_ring = ring;

  if (q) {
    filter.$or = [
      { institusi_kerja: { $regex: q, $options: "i" } },
      { satuan_kerja: { $regex: q, $options: "i" } },
      { kota_kab: { $regex: q, $options: "i" } },
      { klpd: { $regex: q, $options: "i" } },
    ];
  }

  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const rows = await db
    .collection("companies")
    .find(filter)
    .project({
      institusi_kerja: 1,
      satuan_kerja: 1,
      kota_kab: 1,
      klpd: 1,
      status_ring: 1,
      pic_default: 1,
    })
    .sort({ institusi_kerja: 1 })
    .limit(limit)
    .toArray();

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();

  const client = await clientPromise;
  const db = client.db("MabelHub");

  const doc = {
    institusi_kerja: body.institusi_kerja || "",
    satuan_kerja: body.satuan_kerja || "",
    kota_kab: body.kota_kab || "",
    klpd: body.klpd || "",
    status_ring: body.status_ring || "",
    kode_dinas: body.kode_dinas || "",
    pic_default: {
      nama: body.pic_default?.nama || "",
      no_telp: body.pic_default?.no_telp || "",
      jabatan: body.pic_default?.jabatan || "",
      role: body.pic_default?.role || "",
    },

    approval_status: "APPROVED",
    requested_by: body.requested_by || null,
    approved_by: body.approved_by || null,
    approved_at: new Date(),

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await db.collection("companies").insertOne(doc);

  const userFullName =
    gate.session.fullName || gate.session.username || "Unknown";
  await db.collection("company_history").insertOne({
    companyId: res.insertedId,
    at: new Date(),
    action: "CREATE",
    by: userFullName,
    note: "Pembuatan instansi baru",
  });

  return NextResponse.json({ ok: true, insertedId: res.insertedId });
}
