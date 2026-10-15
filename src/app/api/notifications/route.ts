import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(getDbName());

    // Sort by createdAt descending
    const notifications = await db
      .collection("notifications")
      .find({ userId: auth.session.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db
      .collection("notifications")
      .countDocuments({ userId: auth.session.userId });

    return NextResponse.json({
      ok: true,
      items: notifications.map((n) => ({
        id: n._id.toString(),
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type || "SYSTEM", // This line already exists and defines the 'type' field
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
