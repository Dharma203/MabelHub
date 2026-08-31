import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const kota = searchParams.get("kota") || "ALL";
  const klpd = searchParams.get("klpd") || "ALL";
  const segmen = searchParams.get("segmen") || "ALL";

  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 100);
  const skip = (page - 1) * limit;

  const client = await clientPromise;
  const db = client.db("MabelHub");
  const col = db.collection("companies");

  const filter: any = { approval_status: "APPROVED" };

  if (kota !== "ALL") filter.kota_kab = kota;
  if (klpd !== "ALL") filter.klpd = klpd;
  if (segmen !== "ALL") filter.status_ring = segmen;

  if (q) {
    filter.$or = [
      { institusi_kerja: { $regex: q, $options: "i" } },
      { satuan_kerja: { $regex: q, $options: "i" } },
      { kota_kab: { $regex: q, $options: "i" } },
      { klpd: { $regex: q, $options: "i" } },
      { "pic_default.nama": { $regex: q, $options: "i" } },
      { "pic_default.no_telp": { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    col
      .find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  // options untuk dropdown (biar gampang, ambil distinct berdasarkan APPROVED saja)
  const [kotaOptions, klpdOptions, segmenOptions] = await Promise.all([
    col.distinct("kota_kab", { approval_status: "APPROVED" }),
    col.distinct("klpd", { approval_status: "APPROVED" }),
    col.distinct("status_ring", { approval_status: "APPROVED" }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    options: {
      kota: kotaOptions.filter(Boolean).sort(),
      klpd: klpdOptions.filter(Boolean).sort(),
      segmen: segmenOptions.filter(Boolean).sort(),
    },
  });
}
