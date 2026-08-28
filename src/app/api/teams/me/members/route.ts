import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";
import { ObjectId } from "mongodb";

type TeamDoc = {
  name: string;
  leaderId: string;
  leaderName?: string;
  memberIds: string[];
};

type UserDoc = {
  fullName?: string;
  username?: string;
  role?: string;
};

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const session = auth.session;

  const client = await clientPromise;
  const db = client.db(getDbName());

  const team = await db.collection<TeamDoc>("teams").findOne({
    $or: [{ leaderId: session.userId }, { memberIds: session.userId }],
  });

  if (!team) {
    return NextResponse.json({ team: null, members: [] }, { status: 200 });
  }

  const allIds = Array.from(
    new Set([
      team.leaderId,
      ...(Array.isArray(team.memberIds) ? team.memberIds : []),
    ]),
  ).filter((id) => ObjectId.isValid(String(id)));

  const objIds = allIds.map((id) => new ObjectId(String(id)));

  const users = await db
    .collection<UserDoc>("users")
    .find(
      { _id: { $in: objIds } },
      { projection: { fullName: 1, username: 1, role: 1 } },
    )
    .toArray();

  const members = users.map((u: any) => ({
    userId: String(u._id),
    fullName: String(u.fullName || ""),
    username: String(u.username || ""),
    role: String(u.role || ""),
  }));

  return NextResponse.json(
    {
      team: { ...team, _id: String((team as any)._id) },
      members,
    },
    { status: 200 },
  );
}
