import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const body = await req.json();

  const client = await clientPromise;
  const db = client.db("MabelHub");

  const doc = {
    tanggal_plan: body.tanggal_plan ? new Date(body.tanggal_plan) : null,
    status_ring: body.status_ring || "",

    company_id: body.company_id || null, // string ObjectId (boleh)
    snapshot: body.snapshot || {},

    created_by_user_id: body.created_by_user_id || null,
    status_plan: "SUBMITTED",

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const res = await db.collection("plans").insertOne(doc);
  return NextResponse.json({ ok: true, insertedId: res.insertedId });
}
