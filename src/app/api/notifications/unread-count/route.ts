import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());

    const count = await db.collection("notifications").countDocuments({
      userId: auth.session.userId,
      isRead: false,
    });

    return NextResponse.json({
      ok: true,
      unreadCount: count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
