import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";

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

    const ring = rawRing.toUpperCase().replace(/\s+/g, " ").trim();

    const client = await clientPromise;
    const db = client.db(getDbName());

    // --- B2G ---
    const filterB2G: any = {
      ring,
      institusiKerja: { $exists: true, $ne: "" },
    };
    if (q) {
      filterB2G.institusiKerja = {
        $exists: true, $ne: "",
        $regex: q, $options: "i",
      };
    }

    const b2gItems = await db
      .collection("database_b2g")
      .find(filterB2G)
      .sort({ institusiKerja: 1 })
      .limit(limit)
      .project({ institusiKerja: 1, kota: 1, klpd: 1, satuanKerja: 1, ring: 1, pic_default: 1 })
      .toArray();

    // --- B2B ---
    const filterB2B: any = {
      ring,
      namaEntitas: { $exists: true, $ne: "" },
    };
    if (q) {
      filterB2B.namaEntitas = {
        $exists: true, $ne: "",
        $regex: q, $options: "i",
      };
    }

    const b2bItems = await db
      .collection("database_b2b")
      .find(filterB2B)
      .sort({ namaEntitas: 1 })
      .limit(limit)
      .project({ namaEntitas: 1, kota: 1, ring: 1, pic_default: 1 })
      .toArray();

    // Normalize ke shape yang sama
    const merged = [
      ...b2gItems.map((x: any) => ({
        _id: String(x._id),
        institusiKerja: x.institusiKerja || "",
        kota: x.kota || "",
        klpd: x.klpd || "",
        satuanKerja: x.satuanKerja || "",
        ring: x.ring || "",
        pic_default: x.pic_default || null,
      })),
      ...b2bItems.map((x: any) => ({
        _id: String(x._id),
        institusiKerja: x.namaEntitas || "",
        kota: x.kota || "",
        klpd: "",
        satuanKerja: "",
        ring: x.ring || "",
        pic_default: x.pic_default || null,
      })),
    ];

    // Dedupe by institusiKerja (case-insensitive), keep first, cap to limit
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      const key = item.institusiKerja.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);

    return NextResponse.json({ items: unique });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal mengambil suggestion" },
      { status: 500 }
    );
  }
}
