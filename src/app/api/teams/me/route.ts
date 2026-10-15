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

  if (!team) return NextResponse.json({ team: null }, { status: 200 });

  return NextResponse.json({
    team: { ...team, _id: String((team as any)._id) },
  });
}
