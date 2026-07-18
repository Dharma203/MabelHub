import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function getDbName() {
  return process.env.MONGODB_DB || "MabelHub";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawRing = searchParams.get("ring");
    const q = String(searchParams.get("q") ?? "").trim();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "10"), 1),
      50
    );

    if (!rawRing) {
      return NextResponse.json(
        { error: "Query ring wajib" },
        { status: 400 }
      );
    }

    // NORMALISASI RING (biar kebal +, spasi, dll)
    const ring = rawRing.toUpperCase().replace(/\s+/g, " ").trim();

    const client = await clientPromise;
    const db = client.db(getDbName());

    const filter: any = {
      status_ring: ring,
      approval_status: "APPROVED",
      institusi_kerja: { $exists: true, $ne: ""},
    };

    if (q) {
      filter.institusi_kerja = {
        $exists: true,
        $ne: "",
        $regex: q,
        $options: "i",
      };
    }

    const items = await db
      .collection("companies")
      .find(filter)
      .sort({ institusi_kerja: 1 })
      .limit(limit)
      .project({
        institusi_kerja: 1,
        kota_kab: 1,
        klpd: 1,
        satuan_kerja: 1,
        status_ring: 1,
        pic_default: 1,
      })
      .toArray();

    return NextResponse.json({
      items: items.map((x: any) => ({
        ...x,
        _id: String(x._id),
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal mengambil suggestion" },
      { status: 500 }
    );
  }
}
