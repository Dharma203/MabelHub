import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const akun = searchParams.get("akun");
  const jenis = searchParams.get("jenis");
  const format = searchParams.get("format");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  const query: any = {};
  if (platform && platform !== "Semua") query.platform = platform;
  if (akun && akun !== "Semua") query.akun = akun;
  if (jenis && jenis !== "Semua") query.jenis = jenis;
  if (format && format !== "Semua") query.format = format;

  if (start_date || end_date) {
    query.tanggal = {};
    if (start_date) query.tanggal.$gte = start_date; // Assuming YYYY-MM-DD format strings or ISO dates
    if (end_date) query.tanggal.$lte = end_date;
  }

  const client = await clientPromise;
  const db = client.db("MabelHub");

  try {
    const rows = await db
      .collection("digital_marketing_reports")
      .find(query)
      .sort({ tanggal: -1 })
      .toArray();

    return NextResponse.json({ ok: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
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
    tanggal: body.tanggal || new Date().toISOString().split("T")[0],
    platform: body.platform || "",
    akun: body.akun || "",
    jenis: body.jenis || "",
    format: body.format || "",
    judul_konten: body.judul_konten || "",
    link: body.link || "",
    pic: body.pic || "",
    notif_report: "Sudah Report", // Default status

    submitter: {
      userId: session.userId || "",
      username: session.username || "",
      fullName: session.fullName || "",
    },
    created_at: new Date(),
  };

  try {
    const res = await db.collection("digital_marketing_reports").insertOne(doc);
    return NextResponse.json({ ok: true, insertedId: res.insertedId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
