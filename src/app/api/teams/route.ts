import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertSuperadmin } from "@/lib/auth-server";
import { ObjectId } from "mongodb";
import { normStr } from "@/lib/api-helpers";

type UserRole = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES";

type TeamDoc = {
  name: string;
  leaderId: string; // string ObjectId user
  leaderName: string;
  memberIds: string[]; // string ObjectId users
  createdAt: Date;
  updatedAt: Date;
};

type UserDoc = {
  fullName: string;
  username: string;
  role: UserRole;
  teamId?: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __teams_indexes_promise: Promise<void> | undefined;
}

async function ensureIndexes(db: any) {
  if (!global.__teams_indexes_promise) {
    global.__teams_indexes_promise = (async () => {
      await db.collection("teams").createIndex({ name: 1 }, { unique: true });
      await db
        .collection("teams")
        .createIndex({ leaderId: 1 }, { unique: true });
      await db.collection("teams").createIndex({ createdAt: -1 });

      await db.collection("users").createIndex({ role: 1 });
      await db.collection("users").createIndex({ teamId: 1 });
    })();
  }
  await global.__teams_indexes_promise;
}

function toOidOr400(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

export async function GET(req: Request) {
  const gate = assertSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const client = await clientPromise;
  const db = client.db(getDbName());
  await ensureIndexes(db);

  const teams = await db
    .collection<TeamDoc>("teams")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    data: teams.map((t: any) => ({ ...t, _id: String(t._id) })),
  });
}

export async function POST(req: Request) {
  const gate = assertSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const name = normStr(body?.name);
  const leaderId = normStr(body?.leaderId);
  const memberIds = Array.isArray(body?.memberIds)
    ? body.memberIds.map(String)
    : [];

  if (!name || !leaderId) {
    return NextResponse.json(
      { error: "Field wajib: name, leaderId" },
      { status: 400 },
    );
  }

  const leaderOid = toOidOr400(leaderId);
  if (!leaderOid)
    return NextResponse.json(
      { error: "leaderId tidak valid" },
      { status: 400 },
    );

  const memberOids = memberIds
    .filter(Boolean)
    .map((x: string) => toOidOr400(x))
    .filter(Boolean) as ObjectId[];

  // leader tidak boleh ada di memberIds (biar bersih)
  const cleanedMemberIds = memberIds.filter((x: string) => x && x !== leaderId);

  const client = await clientPromise;
  const db = client.db(getDbName());
  await ensureIndexes(db);

  const usersCol = db.collection<UserDoc>("users");

  // validasi: leader harus role LEADER
  const leader = await usersCol.findOne(
    { _id: leaderOid },
    { projection: { fullName: 1, username: 1, role: 1, teamId: 1 } },
  );
  if (!leader)
    return NextResponse.json(
      { error: "Leader tidak ditemukan" },
      { status: 404 },
    );
  if (leader.role !== "LEADER") {
    return NextResponse.json(
      { error: "leaderId harus user role=LEADER" },
      { status: 400 },
    );
  }
  if (leader.teamId) {
    return NextResponse.json(
      { error: "Leader sudah memiliki team" },
      { status: 409 },
    );
  }

  // validasi members harus role SALES dan belum punya team
  if (memberOids.length) {
    const badMember = await usersCol.findOne(
      {
        _id: { $in: memberOids },
        $or: [
          { role: { $ne: "SALES" } },
          { teamId: { $exists: true, $ne: null } },
        ],
      },
      { projection: { username: 1, role: 1, teamId: 1 } },
    );
    if (badMember) {
      return NextResponse.json(
        { error: "Ada member bukan SALES atau sudah punya team" },
        { status: 409 },
      );
    }
  }

  const now = new Date();
  const teamDoc: TeamDoc = {
    name,
    leaderId,
    leaderName: leader.fullName || leader.username,
    memberIds: cleanedMemberIds,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ins = await db.collection<TeamDoc>("teams").insertOne(teamDoc);
    const teamId = String(ins.insertedId);

    // set teamId di leader + members
    await usersCol.updateOne({ _id: leaderOid }, { $set: { teamId } });

    if (memberOids.length) {
      await usersCol.updateMany(
        { _id: { $in: memberOids } },
        { $set: { teamId } },
      );
    }

    return NextResponse.json({ ok: true, teamId }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      // name / leaderId duplicate
      const keys = Object.keys(e?.keyPattern ?? {});
      return NextResponse.json(
        { error: `Duplicate: ${keys.join(", ")}` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e?.message ?? "Gagal membuat team" },
      { status: 500 },
    );
  }
}
