import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const perusahaan = searchParams.get("perusahaan");
  const produk = searchParams.get("produk");
  const provinsi = searchParams.get("provinsi");
  const kota = searchParams.get("kota");
  const status_wa = searchParams.get("status_wa");
  const to_sales = searchParams.get("to_sales");

  const query: any = {};
  if (perusahaan && perusahaan !== "Semua Perusahaan") query.perusahaan = { $regex: perusahaan, $options: "i" };
  if (produk && produk !== "Semua Produk") query.produk = produk;
  if (provinsi && provinsi !== "Semua Provinsi") query.provinsi = provinsi;
  if (kota && kota !== "Semua Kota") query.kota = kota;
  if (status_wa && status_wa !== "Semua Status") query.status_wa = status_wa;
  if (to_sales && to_sales !== "Semua Sales") query.to_sales = to_sales;

  const client = await clientPromise;
  const db = client.db("MabelHub");

  try {
    const rows = await db
      .collection("telemarketing_database")
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
    perusahaan: body.perusahaan || "",
    produk: body.produk || "",
    provinsi: body.provinsi || "",
    kota: body.kota || "",
    alamat_lengkap: body.alamat_lengkap || "",
    
    kontak_pic: {
      nama: body.kontak_pic?.nama || "",
      no_telp: body.kontak_pic?.no_telp || "",
      jabatan: body.kontak_pic?.jabatan || "",
    },
    
    sumber_data: body.sumber_data || "",
    
    // Status tracking for Broadcast WA
    status_wa: body.status_wa || "- Pilih Status -",
    to_sales: body.to_sales || "- Pilih Sales -",

    submitter: {
      userId: session.userId || "",
      username: session.username || "",
      fullName: session.fullName || "",
    },
    created_at: new Date(),
  };

  try {
    const res = await db.collection("telemarketing_database").insertOne(doc);
    return NextResponse.json({ ok: true, insertedId: res.insertedId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = assertLoggedIn(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const { _id, status_wa, to_sales } = body;

  if (!_id) {
    return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db("MabelHub");
  
  const { ObjectId } = require("mongodb");

  try {
    const updateDoc: any = {};
    if (status_wa) updateDoc.status_wa = status_wa;
    if (to_sales) updateDoc.to_sales = to_sales;

    const res = await db.collection("telemarketing_database").updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateDoc }
    );
    
    return NextResponse.json({ ok: true, modifiedCount: res.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
