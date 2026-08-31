import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const client = await clientPromise;
  const db = client.db("MabelHub");

  const rows = await db
    .collection("company_requests")
    .find({ status })
    .sort({ requested_at: -1 })
    .toArray();

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const session = gate.session;
  const body = await req.json();

  const client = await clientPromise;
  const db = client.db("MabelHub");

  const doc = {
    institusi_kerja: body.institusi_kerja || "",
    satuan_kerja: body.satuan_kerja || "",
    kota_kab: body.kota_kab || "",
    klpd: body.klpd || "",
    status_ring: body.status_ring || "",

    pic_default: {
      nama: body.pic_default?.nama || "",
      no_telp: body.pic_default?.no_telp || "",
      jabatan: body.pic_default?.jabatan || "",
      role: body.pic_default?.role || "",
    },

    status: "PENDING",
    requested_by: {
      userId: session.userId || "",
      username: session.username || "",
      fullName: session.fullName || "",
      role: session.role || "",
    },
    requested_at: new Date(),

    reviewed_by: null,
    reviewed_at: null,
    reject_reason: "",
  };

  const res = await db.collection("company_requests").insertOne(doc);

  // Send notifications to SUPERADMIN
  const admins = await db
    .collection("users")
    .find({ role: "SUPERADMIN" })
    .toArray();

  if (admins.length > 0) {
    const notificationsToInsert = admins.map((admin) => ({
      userId: admin.userId || admin._id.toString(),
      title: "Request Instansi Baru",
      message: `${session.fullName || session.username} (${session.role}) meminta penambahan instansi ${doc.institusi_kerja}.`,
      type: "REQUEST",
      isRead: false,
      link: "/instansi?tab=requests", // Or wherever company requests are shown
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.collection("notifications").insertMany(notificationsToInsert);
  }

  return NextResponse.json({ ok: true, insertedId: res.insertedId });
}
