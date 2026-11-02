import { NextResponse } from "next/server";
import { MASTER_KBKI_LIST, searchKbkiItems } from "@/lib/master-kbki";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const items = searchKbkiItems(q, category).slice(0, limit);

    return NextResponse.json({
      success: true,
      total: items.length,
      items,
    });
  } catch (error) {
    console.error("[GET /api/master/kbki] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data KBKI" },
      { status: 500 }
    );
  }
}
