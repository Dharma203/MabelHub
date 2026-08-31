import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode");
  const platform = searchParams.get("platform");

  const query: any = {};
  if (periode && periode !== "Semua") query.periode = periode;
  if (platform && platform !== "Semua") query.platform = platform;

  const client = await clientPromise;
  const db = client.db("MabelHub");

  try {
    const rows = await db
      .collection("digital_marketing_performance")
      .find(query)
      .sort({ created_at: -1 })
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
    periode: body.periode || "",
    tanggal_mulai: body.tanggal_mulai || null,
    tanggal_selesai: body.tanggal_selesai || null,
    platform: body.platform || "",
    akun: body.akun || "",
    jumlah_follower: parseInt(body.jumlah_follower) || 0,
    dm_tanya_produk: parseInt(body.dm_tanya_produk) || 0,
    dm_tanya_harga: parseInt(body.dm_tanya_harga) || 0,
    views: parseInt(body.views) || 0,
    likes: parseInt(body.likes) || 0,
    comments: parseInt(body.comments) || 0,
    shares: parseInt(body.shares) || 0,
    reach: parseInt(body.reach) || 0,

    submitter: {
      userId: session.userId || "",
      username: session.username || "",
      fullName: session.fullName || "",
    },
    created_at: new Date(),
  };

  try {
    const res = await db.collection("digital_marketing_performance").insertOne(doc);
    return NextResponse.json({ ok: true, insertedId: res.insertedId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
