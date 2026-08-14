import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertSuperadmin } from "@/lib/auth-server";
import { ObjectId } from "mongodb";
import { getParams, toObjectId } from "@/lib/api-helpers";

type UserRole = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES";
type UserDoc = {
  role: UserRole;
  teamId?: string | null;
  fullName: string;
  username: string;
};

type TeamDoc = {
  name: string;
  leaderId: string;
  leaderName: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function PUT(
  req: Request,
  ctx: { params: { teamId: string } | Promise<{ teamId: string }> },
) {
  const gate = assertSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { teamId } = await getParams(ctx);
  const teamOid = toObjectId(teamId);
  if (!teamOid)
    return NextResponse.json({ error: "teamId tidak valid" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const memberIds: string[] = Array.isArray(body?.memberIds)
    ? body.memberIds.map(String)
    : [];

  const client = await clientPromise;
  const db = client.db(getDbName());
  const teamsCol = db.collection<TeamDoc>("teams");
  const usersCol = db.collection<UserDoc>("users");

  const team = await teamsCol.findOne({ _id: teamOid });
  if (!team)
    return NextResponse.json(
      { error: "Team tidak ditemukan" },
      { status: 404 },
    );

  const cleaned = memberIds.filter((x) => x && x !== team.leaderId);
  const memberOids = cleaned
    .map((x) => (ObjectId.isValid(x) ? new ObjectId(x) : null))
    .filter(Boolean) as ObjectId[];

  // validasi: semua member adalah SALES dan belum di team lain (kecuali team ini)
  if (memberOids.length) {
    const bad = await usersCol.findOne({
      _id: { $in: memberOids },
      $or: [
        { role: { $ne: "SALES" } },
        {
          teamId: { $exists: true, $ne: null },
          $and: [{ teamId: { $ne: String(team._id) } }],
        },
      ],
    });
    if (bad) {
      return NextResponse.json(
        {
          error: "Ada member bukan SALES atau sudah tergabung team lain",
          badUserId: String((bad as any)._id),
          badRole: String((bad as any).role || ""),
          badTeamId: (bad as any).teamId ?? null,
        },
        { status: 409 },
      );
    }
  }

  // reset teamId dari member lama yang keluar
  const oldIds = (team.memberIds ?? [])
    .map((x) => (ObjectId.isValid(x) ? new ObjectId(x) : null))
    .filter(Boolean) as ObjectId[];

  // set memberIds baru
  await teamsCol.updateOne(
    { _id: teamOid },
    { $set: { memberIds: cleaned, updatedAt: new Date() } },
  );

  // 1) set teamId=null untuk member lama
  if (oldIds.length) {
    await usersCol.updateMany(
      { _id: { $in: oldIds } },
      { $set: { teamId: null } },
    );
  }

  // 2) set teamId=team untuk member baru
  if (memberOids.length) {
    await usersCol.updateMany(
      { _id: { $in: memberOids } },
      { $set: { teamId: String(team._id) } },
    );
  }

  return NextResponse.json({ ok: true });
}
