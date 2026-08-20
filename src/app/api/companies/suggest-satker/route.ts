import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawRing = searchParams.get("ring");
    const institusi = String(searchParams.get("institusi") ?? "").trim();
    const q = String(searchParams.get("q") ?? "").trim();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "10"), 1),
      50
    );

    if (!rawRing || !institusi) {
      return NextResponse.json(
        { error: "ring dan institusi wajib" },
        { status: 400 }
      );
    }

    const ring = rawRing.toUpperCase().replace(/\s+/g, " ").trim();

    const client = await clientPromise;
    const db = client.db(getDbName());

    const filter: any = {
      ring,
      institusiKerja: { $regex: `^${institusi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      satuanKerja: { $exists: true, $ne: "" },
    };

    if (q) {
      filter.satuanKerja = {
        $exists: true, $ne: "",
        $regex: q, $options: "i",
      };
    }

    const items = await db
      .collection("database_b2g")
      .find(filter)
      .sort({ satuanKerja: 1 })
      .limit(limit)
      .project({ satuanKerja: 1, kota: 1, klpd: 1, ring: 1, pic_default: 1 })
      .toArray();

    const result = items.map((x: any) => ({
      _id: String(x._id),
      satuanKerja: x.satuanKerja || "",
      kota: x.kota || "",
      klpd: x.klpd || "",
      ring: x.ring || "",
      pic_default: x.pic_default || null,
    }));

    // Dedupe by satuanKerja
    const seen = new Set<string>();
    const unique = result.filter((item) => {
      const key = item.satuanKerja.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);

    return NextResponse.json({ items: unique });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal mengambil satuan kerja" },
      { status: 500 }
    );
  }
}
