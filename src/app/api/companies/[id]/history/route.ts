import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(getDbName());

  const items = await db
    .collection("company_history")
    .find({ companyId: new ObjectId(id) })
    .sort({ at: -1 })
    .toArray();

  const formatted = items.map((x) => ({
    _id: String(x._id),
    at: new Date(x.at).toLocaleString("id-ID"),
    action: x.action,
    by: x.by,
    note: x.note,
  }));

  return NextResponse.json({ items: formatted });
}
