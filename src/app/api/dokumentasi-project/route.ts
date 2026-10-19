import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import path from "path";
import { writeFile, mkdir, unlink } from "fs/promises";
import { verifyDokumentasi } from "@/lib/verifikasi-dokumentasi";

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

// Hapus file upload lama (foto/video) milik dokumentasi yang digantikan
async function removeUploadedFiles(docs: any[]) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  for (const d of docs) {
    for (const b of d.barang ?? []) {
      for (const f of [b.fotoSerahTerima, b.fotoBarang, b.videoBarang]) {
        if (typeof f !== "string" || !f.startsWith("/uploads/")) continue;
        const full = path.join(uploadsDir, path.basename(f));
        try {
          await unlink(full);
        } catch {
          // file sudah tidak ada — abaikan
        }
      }
    }
  }
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

  // Verifikasi otomatis: cocokkan input dengan data kontrak
  const contract = await db.collection("contracts").findOne({ nomorKontrak });
  const issues = verifyDokumentasi({ doc, contract: contract as any });
  const verified = issues.length === 0;

  const docWithVerif = {
    ...doc,
    verifikasi: {
      status: verified ? "TERVERIFIKASI" : "PERLU_DIPERIKSA",
      issues,
      checkedAt: now,
    },
  };

  // Satu kontrak = satu dokumentasi: yang baru menggantikan yang lama.
  // Simpan yang baru dulu, baru hapus yang lama agar data tidak hilang jika insert gagal.
  const inserted = await db.collection(COL_NAME).insertOne(docWithVerif);
  const oldDocs = await db
    .collection(COL_NAME)
    .find({ nomorKontrak, _id: { $ne: inserted.insertedId } })
    .toArray();
  if (oldDocs.length > 0) {
    await db
      .collection(COL_NAME)
      .deleteMany({ _id: { $in: oldDocs.map((d: any) => d._id) } });
    await removeUploadedFiles(oldDocs);
  }

  // Lolos -> "Sudah Upload"; ada masalah -> "Proses Verifikasi" (menunggu admin)
  if (nomorKontrak) {
    await db.collection("contracts").updateOne(
      { nomorKontrak },
      verified
        ? { $set: { dokSales: "Sudah Upload", updatedAt: now }, $unset: { dokVerifikasi: "" } }
        : {
            $set: {
              dokSales: "Proses Verifikasi",
              dokVerifikasi: { issues, checkedAt: now },
              updatedAt: now,
            },
          }
    );
  }

  const { _id, ...safeDoc } = docWithVerif as any;
  return NextResponse.json(
    { data: safeDoc, verifikasi: { verified, issues }, replaced: oldDocs.length > 0 },
    { status: 201 }
  );
}

