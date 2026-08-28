import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertSuperadmin } from "@/lib/auth-server";
import { ObjectId } from "mongodb";
import { getParams, normStr, toObjectId } from "@/lib/api-helpers";

type TeamDoc = {
  name: string;
  leaderId: string;
  leaderName: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

type UserRole = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES";
type UserDoc = {
  fullName: string;
  username: string;
  role: UserRole;
  teamId?: string | null;
};

export async function GET(
  req: Request,
  ctx: { params: { teamId: string } | Promise<{ teamId: string }> },
) {
  const gate = assertSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { teamId } = await getParams(ctx);
  const oid = toObjectId(teamId);
  if (!oid)
    return NextResponse.json({ error: "teamId tidak valid" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(getDbName());

  const team = await db.collection<TeamDoc>("teams").findOne({ _id: oid });
  if (!team)
    return NextResponse.json(
      { error: "Team tidak ditemukan" },
      { status: 404 },
    );

  return NextResponse.json({
    data: { ...team, _id: String((team as any)._id) },
  });
}

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
  const name = body?.name !== undefined ? normStr(body.name) : undefined;

  const $set: any = { updatedAt: new Date() };
  if (name !== undefined) {
    if (!name)
      return NextResponse.json(
        { error: "name tidak boleh kosong" },
        { status: 400 },
      );
    $set.name = name;
  }

  const client = await clientPromise;
  const db = client.db(getDbName());

  try {
    const res = await db
      .collection("teams")
      .findOneAndUpdate(
        { _id: teamOid },
        { $set },
        { returnDocument: "after" },
      );

    // NOTE: driver versi tertentu bisa return null kalau not found
    const updated = (res as any)?.value ?? null;
    if (!updated)
      return NextResponse.json(
        { error: "Team tidak ditemukan" },
        { status: 404 },
      );

    return NextResponse.json({
      data: { ...updated, _id: String(updated._id) },
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      const keys = Object.keys(e?.keyPattern ?? {});
      return NextResponse.json(
        { error: `Duplicate: ${keys.join(", ")}` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e?.message ?? "Gagal update team" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  // hapus team
  await teamsCol.deleteOne({ _id: teamOid });

  // reset teamId untuk leader + members
  const ids = [team.leaderId, ...(team.memberIds ?? [])]
    .filter(Boolean)
    .map((s) => (ObjectId.isValid(s) ? new ObjectId(s) : null))
    .filter(Boolean) as ObjectId[];

  if (ids.length) {
    await usersCol.updateMany(
      { _id: { $in: ids } },
      { $set: { teamId: null } },
    );
  }

  return NextResponse.json({ ok: true });
}
