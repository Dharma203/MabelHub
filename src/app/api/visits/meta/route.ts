import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";
import { getVisitAuthMatch } from "@/lib/visit-auth";

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "MabelHub");
  const col = db.collection("VisitActivity");

  // Build role-based filter
  const { match: authMatch, error } = await getVisitAuthMatch(db, session);
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  // Use the auth match as a filter for distinct queries
  // MongoDB distinct() doesn't support match filters directly,
  // so we use aggregation instead
  const [salesResult, citiesResult, satkersResult] = await Promise.all([
    col.aggregate([
      { $match: authMatch || {} },
      { $group: { _id: "$nama_sales" } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    col.aggregate([
      { $match: authMatch || {} },
      { $group: { _id: "$city" } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    col.aggregate([
      { $match: authMatch || {} },
      { $group: { _id: "$satuan_kerja" } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  return NextResponse.json({
    sales: salesResult.map((r: any) => r._id).filter(Boolean),
    cities: citiesResult.map((r: any) => r._id).filter(Boolean),
    satkers: satkersResult.map((r: any) => r._id).filter(Boolean),
  });
}
