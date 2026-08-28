import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(
  req: Request,
  { params }: any, // To avoid Next.js 15 Promise type mismatch
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const paramsResolved = await params;
  const { requestId } = paramsResolved;
  if (!requestId) {
    return NextResponse.json(
      { error: "Missing requestId parameter" },
      { status: 400 },
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());

    // Fetch from eproc_history collection where requestId matches
    const history = await db
      .collection("eproc_history")
      .find({ requestId })
      .sort({ at: -1 }) // Sort default newest first
      .toArray();

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error: any) {
    console.error("GET Eproc History Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
