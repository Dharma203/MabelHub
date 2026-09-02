import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    const escapedInstitusi = escapeRegex(institusi);

    const client = await clientPromise;
    const db = client.db(getDbName());

    const b2gFilter: Record<string, unknown> = {
      ring,
      institusiKerja: { $regex: `^${escapedInstitusi}$`, $options: "i" },
      satuanKerja: { $exists: true, $ne: "" },
    };

    const b2bFilter: Record<string, unknown> = {
      ring,
      namaEntitas: { $exists: true, $ne: "" },
    };

    if (q) {
      const qRegex = { $regex: escapeRegex(q), $options: "i" };
      b2gFilter.satuanKerja = qRegex;
      b2bFilter.namaEntitas = qRegex;
    } else {
      b2bFilter.namaEntitas = {
        $exists: true,
        $ne: "",
        $regex: `^${escapedInstitusi}$`,
        $options: "i",
      };
    }

    const [b2gItems, b2bItems] = await Promise.all([
      db
        .collection("database_b2g")
        .find(b2gFilter)
        .sort({ satuanKerja: 1 })
        .limit(limit)
        .project({ satuanKerja: 1, kota: 1, klpd: 1, ring: 1, pic_default: 1, institusiKerja: 1 })
        .toArray(),
      db
        .collection("database_b2b")
        .find(b2bFilter)
        .sort({ namaEntitas: 1 })
        .limit(limit)
        .project({ namaEntitas: 1, kota: 1, ring: 1, pic_default: 1 })
        .toArray(),
    ]);

    const merged = [
      ...b2gItems.map((x: Record<string, unknown>) => {
        const row = x as Record<string, unknown>;
        return {
          _id: String(row._id ?? ""),
          satuanKerja: typeof row.satuanKerja === "string" ? row.satuanKerja : "",
          kota: typeof row.kota === "string" ? row.kota : "",
          klpd: typeof row.klpd === "string" ? row.klpd : "",
          ring: typeof row.ring === "string" ? row.ring : "",
          pic_default: row.pic_default ?? null,
        };
      }),
      ...b2bItems.map((x: Record<string, unknown>) => {
        const row = x as Record<string, unknown>;
        return {
          _id: String(row._id ?? ""),
          satuanKerja: typeof row.namaEntitas === "string" ? row.namaEntitas : "",
          kota: typeof row.kota === "string" ? row.kota : "",
          klpd: "",
          ring: typeof row.ring === "string" ? row.ring : "",
          pic_default: row.pic_default ?? null,
        };
      }),
    ];

    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      const key = item.satuanKerja.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);

    return NextResponse.json({ items: unique });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Gagal mengambil satuan kerja";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
