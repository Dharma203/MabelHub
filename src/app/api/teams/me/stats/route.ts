import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const client = await clientPromise;
  const db = client.db(getDbName());

  const team = await db.collection("teams").findOne({
    $or: [
      { leaderId: auth.session.userId },
      { memberIds: auth.session.userId },
    ],
  });
  if (!team)
    return NextResponse.json(
      { error: "Team tidak ditemukan" },
      { status: 404 },
    );

  const memberIds: string[] = Array.from(
    new Set([team.leaderId, ...(team.memberIds ?? [])]),
  );

  // contoh statistik sederhana (nanti bisa kamu perluas)
  const [visitTotal, eprocTotal, eprocTaken] = await Promise.all([
    db.collection("VisitActivity").countDocuments({
      "assignedTo.userId": { $in: memberIds },
    }),
    db.collection("eproc_requests").countDocuments({
      "assignedTo.userId": { $in: memberIds },
    }),
    db.collection("eproc_requests").countDocuments({
      "assignedTo.userId": { $in: memberIds },
      takenByAdminId: { $ne: null },
    }),
  ]);

  return NextResponse.json({
    team: { _id: String((team as any)._id), name: team.name },
    stats: {
      members: memberIds.length,
      visitTotal,
      eprocTotal,
      eprocTaken,
    },
  });
}
