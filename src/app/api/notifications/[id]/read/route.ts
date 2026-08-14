import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";
import { ObjectId } from "mongodb";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(getDbName());

    const result = await db
      .collection("notifications")
      .updateOne(
        { _id: new ObjectId(id), userId: auth.session.userId },
        { $set: { isRead: true, updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
