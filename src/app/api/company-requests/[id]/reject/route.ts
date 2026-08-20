import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authentication + Authorization
  const auth = assertAdminOrSuperadmin(req);

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  // 2. Ambil ID request
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 }
    );
  }

  try {
    // 3. Akses database HANYA setelah user lolos auth
    const client = await clientPromise;
    const db = client.db("MabelHubStaging");

    const result = await db.collection("company_requests").updateOne(
      { id: id },
      {
        $set: {
          status: "REJECTED",
          rejected_at: new Date(),
          rejected_by: auth.session.userId,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Company request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company request rejected",
    });
  } catch (error) {
    console.error("[POST /api/company-requests/[id]/reject]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}