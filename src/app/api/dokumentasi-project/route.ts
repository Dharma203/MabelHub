import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const DB_NAME = getDbName();
const COL_NAME = "dokumentasi_project";

declare global {
  // eslint-disable-next-line no-var
  var __dokumentasi_indexes_promise: Promise<void> | undefined;
}

async function ensureIndexes(db: any) {
  if (!global.__dokumentasi_indexes_promise) {
    global.__dokumentasi_indexes_promise = (async () => {
      const col = db.collection(COL_NAME);
      await col.createIndex({ createdAt: -1 });
      await col.createIndex({ namaSales: 1 });
      await col.createIndex({ nomorKontrak: 1 });
    })();
  }
  await global.__dokumentasi_indexes_promise;
}

// Save a base64-encoded file to /public/uploads/ and return its public path
async function saveBase64File(
  base64: string,
  prefix: string,
  ext: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);

  const items = await db
    .collection(COL_NAME)
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  // Stats
  const contractCol = db.collection("contracts");
  const totalKontrak = await contractCol.countDocuments();
  const reportedNomorKontraks = await db
    .collection(COL_NAME)
    .distinct("nomorKontrak");
  const sudahDireport = reportedNomorKontraks.length;
  const belumDireport = totalKontrak - sudahDireport;

  const usersCol = db.collection("users");
  const salesCount = await usersCol.countDocuments({
    role: { $in: ["SALES", "LEADER", "ADMIN SALES"] },
    isActive: true,
  });

  return NextResponse.json({
    data: items,
    stats: {
      totalKontrak,
      belumDireport: belumDireport < 0 ? 0 : belumDireport,
      sudahDireport,
      salesCount,
    },
  });
}

export async function POST(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));

  // Required fields
  const namaSales = String(body.namaSales ?? "").trim();
  const tanggalReport = String(body.tanggalReport ?? "").trim();
  const nomorKontrak = String(body.nomorKontrak ?? "").trim();

  if (!namaSales)
    return NextResponse.json(
      { error: "Nama Sales wajib diisi" },
      { status: 400 }
    );
  if (!tanggalReport)
    return NextResponse.json(
      { error: "Tanggal Report wajib diisi" },
      { status: 400 }
    );
  if (!nomorKontrak)
    return NextResponse.json(
      { error: "Nomor Kontrak/SPK wajib diisi" },
      { status: 400 }
    );

  // Process barang items — handle file uploads
  const barangList = [];
  if (Array.isArray(body.barang)) {
    for (const item of body.barang) {
      const barangItem: any = {
        unitProduk: String(item.unitProduk ?? "").trim(),
        merekBarang: String(item.merekBarang ?? "").trim(),
        tipeBarang: String(item.tipeBarang ?? "").trim(),
        jumlahUnit: Number(item.jumlahUnit) || 0,
        kondisiBarang: String(item.kondisiBarang ?? "").trim(),
        kendala: String(item.kendala ?? "").trim(),
      };

      // Handle foto serah terima
      if (item.fotoSerahTerimaBase64) {
        const ext = item.fotoSerahTerimaExt || "jpg";
        barangItem.fotoSerahTerima = await saveBase64File(
          item.fotoSerahTerimaBase64,
          "serah_terima",
          ext
        );
      }

      // Handle foto barang
      if (item.fotoBarangBase64) {
        const ext = item.fotoBarangExt || "jpg";
        barangItem.fotoBarang = await saveBase64File(
          item.fotoBarangBase64,
          "foto_barang",
          ext
        );
      }

      // Handle video barang
      if (item.videoBarangBase64) {
        const ext = item.videoBarangExt || "mp4";
        barangItem.videoBarang = await saveBase64File(
          item.videoBarangBase64,
          "video_barang",
          ext
        );
      }

      barangList.push(barangItem);
    }
  }

  const now = new Date();

  const doc = {
    namaSales,
    tanggalReport,
    kotaKabupaten: String(body.kotaKabupaten ?? "").trim(),
    nomorKontrak,
    // Auto-filled from contract
    bendera: String(body.bendera ?? "").trim(),
    tanggalKontrak: String(body.tanggalKontrak ?? "").trim(),
    entityProject: String(body.entityProject ?? "").trim(),
    nilaiPengadaan: Number(body.nilaiPengadaan) || 0,
    picAdmin: String(body.picAdmin ?? "").trim(),
    // Request ID SPH
    requestIdSph: Array.isArray(body.requestIdSph)
      ? body.requestIdSph.map((id: any) => String(id).trim()).filter(Boolean)
      : [],
    // Daftar Barang
    barang: barangList,
    createdAt: now,
    updatedAt: now,
  };

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);

  await db.collection(COL_NAME).insertOne(doc);

  // Otomatis tandai dokSales pada contracts sebagai 'Sudah Upload'
  if (nomorKontrak) {
    await db.collection("contracts").updateOne(
      { nomorKontrak },
      { $set: { dokSales: "Sudah Upload", updatedAt: now } }
    );
  }

  return NextResponse.json({ data: doc }, { status: 201 });
}

