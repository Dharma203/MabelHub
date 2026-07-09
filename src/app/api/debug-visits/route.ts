import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("MabelHub");
  const col = db.collection("VisitActivity");

  // Check status_ring field
  const withStatusRing = await col.countDocuments({ status_ring: { $exists: true, $ne: null } });
  const withoutStatusRing = await col.countDocuments({
    $or: [{ status_ring: { $exists: false } }, { status_ring: null }]
  });
  const distinctRings = await col.distinct("status_ring");
  
  // Check status_visit values
  const distinctStatusVisit = await col.distinct("status_visit");
  
  // Check visit_date formats
  const sampleDates = await col.aggregate([
    { $group: { _id: "$visit_date" } },
    { $limit: 10 },
  ]).toArray();

  // Count all fields
  const sampleWithRing = await col.find({ status_ring: { $exists: true, $ne: null } }).limit(2).toArray();

  return NextResponse.json({
    withStatusRing,
    withoutStatusRing,
    distinctRings,
    distinctStatusVisit,
    sampleDates: sampleDates.map(d => d._id),
    sampleWithRing: sampleWithRing.map(s => ({ ...s, _id: String(s._id) })),
  });
}
