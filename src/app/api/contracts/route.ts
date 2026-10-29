import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertAdminOrSuperadmin } from "@/lib/auth-server";
import {
  CONTRACT_SORT,
  LEGACY_LIMIT,
  buildContractFilter,
  clampPage,
  parseContractQuery,
  parsePagination,
  totalPagesOf,
} from "@/lib/contract-query";
import { todayString } from "@/lib/contract-status";
import { CONTRACTS_COL, loadFacets, withDokSales } from "@/lib/contracts-data";

const DB_NAME = getDbName();
const COL_NAME = CONTRACTS_COL;

export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __contracts_indexes_promise: Promise<void> | undefined;
}

async function ensureIndexes(db: any) {
  if (!global.__contracts_indexes_promise) {
    global.__contracts_indexes_promise = (async () => {
      const col = db.collection(COL_NAME);
      await col.createIndex({ nomorKontrak: 1 }, { unique: true });
      await col.createIndex({ perusahaan: 1 });
      await col.createIndex({ tanggalBerakhirKontrak: 1 });
      await col.createIndex({ createdAt: -1 });
      // Urutan stabil untuk paginasi + kolom yang dipakai filter di server
      await col.createIndex({ createdAt: -1, nomorKontrak: 1 });
      await col.createIndex({ tanggalKontrak: 1 });
      await col.createIndex({ marketing: 1 });
      await col.createIndex({ pic: 1 });
      await col.createIndex({ bendera: 1 });
    })();
  }
  await global.__contracts_indexes_promise;
}

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Dua mode:
 *  - Tanpa `page`/`pageSize`  -> mode lama: maks. 500 baris terbaru, `{ data }`.
 *    Dipertahankan karena halaman Data Project & Dokumentasi Project masih memakainya.
 *  - Dengan `page`/`pageSize` -> filter, pencarian, dan paginasi dikerjakan di database:
 *    `{ data, pagination }`, plus `facets` & `totalAll` bila `facets=1`.
 *
 * Filter (opsional, keduanya mode): perusahaan, q, dateFrom, dateTo, marketing, bendera,
 * pic, status (AKTIF|SEGERA_BERAKHIR|KEDALUWARSA), jenis (UTAMA|PERPANJANGAN|ADENDUM).
 */
export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(req.url);
  const query = parseContractQuery(searchParams);
  const paging = parsePagination(searchParams);
  const filter = buildContractFilter(query, todayString());

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  const col = db.collection(COL_NAME);

  if (!paging) {
    const items = await col
      .find(filter, { projection: { _id: 0 } })
      .sort(CONTRACT_SORT)
      .limit(LEGACY_LIMIT)
      .toArray();
    return NextResponse.json({ data: await withDokSales(db, items) }, { headers: NO_STORE });
  }

  const total = await col.countDocuments(filter);
  const page = clampPage(paging.page, total, paging.pageSize);
  const items = await col
    .find(filter, { projection: { _id: 0 } })
    .sort(CONTRACT_SORT)
    .skip((page - 1) * paging.pageSize)
    .limit(paging.pageSize)
    .toArray();

  const data = await withDokSales(db, items);

  const body: Record<string, unknown> = {
    data,
    pagination: {
      page,
      pageSize: paging.pageSize,
      total,
      totalPages: totalPagesOf(total, paging.pageSize),
    },
  };
  if (searchParams.get("facets") === "1") {
    Object.assign(body, await loadFacets(db, query.perusahaan));
  }

  return NextResponse.json(body, { headers: NO_STORE });
}

export async function POST(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok)
    return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({}));

  const nomorKontrak = String(body.nomorKontrak ?? "").trim();
  if (!nomorKontrak) {
    return NextResponse.json(
      { error: "Nomor Kontrak wajib diisi" },
      { status: 400 },
    );
  }

  const tanggalKontrak = String(body.tanggalKontrak ?? "").trim();
  const tanggalBerakhirKontrak = String(body.tanggalBerakhirKontrak ?? "").trim();
  if (tanggalKontrak && tanggalBerakhirKontrak && tanggalBerakhirKontrak < tanggalKontrak) {
    return NextResponse.json(
      { error: "Tanggal Berakhir harus lebih besar atau sama dengan Tanggal Kontrak" },
      { status: 400 },
    );
  }

  const nominalKontrak = Number(body.nominalKontrak) || 0;
  if (nominalKontrak < 0) {
    return NextResponse.json(
      { error: "Nominal Kontrak tidak boleh bernilai negatif" },
      { status: 400 },
    );
  }

  const perusahaan = String(body.perusahaan ?? "").trim();

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureIndexes(db);

  // Check uniqueness
  const existing = await db
    .collection(COL_NAME)
    .findOne({ nomorKontrak });
  if (existing) {
    return NextResponse.json(
      { error: `Nomor Kontrak "${nomorKontrak}" sudah ada` },
      { status: 409 },
    );
  }

  const now = new Date();

  const doc = {
    nomorKontrak,
    perusahaan,
    requestIds: Array.isArray(body.requestIds)
      ? body.requestIds.map((id: any) => String(id).trim()).filter(Boolean)
      : [],
    link: String(body.link ?? "").trim(),
    namaFolder: String(body.namaFolder ?? "").trim(),
    instansi: String(body.instansi ?? "").trim(),
    tanggalKontrak: String(body.tanggalKontrak ?? "").trim(),
    namaPengadaan: String(body.namaPengadaan ?? "").trim(),
    nominalKontrak: Number(body.nominalKontrak) || 0,
    fisik: body.fisik === "YA" ? "YA" : "TIDAK",
    scan: body.scan === "YA" ? "YA" : "TIDAK",
    keterangan: String(body.keterangan ?? "").trim(),
    marketing: String(body.marketing ?? "").trim(),
    bendera: String(body.bendera ?? "").trim(),
    tanggalPenyerahan: String(body.tanggalPenyerahan ?? "").trim(),
    catatan: String(body.catatan ?? "").trim(),
    pic: String(body.pic ?? "").trim(),
    tanggalBerakhirKontrak: String(body.tanggalBerakhirKontrak ?? "").trim(),
    status: String(body.status ?? "PENAGIHAN").trim(),
    dokSales: String(body.dokSales ?? "Belum Upload").trim(),

    // Penagihan (embedded, one per contract)
    penagihan: {
      tanggalMulai: String(body.penagihan?.tanggalMulai ?? "").trim(),
      tanggalBerakhir: String(body.penagihan?.tanggalBerakhir ?? "").trim(),
      nominalPenagihan: Number(body.penagihan?.nominalPenagihan) || 0,
    },

    pembayaran: Array.isArray(body.pembayaran)
      ? body.pembayaran.map((p: any) => ({
          id: String(p.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
          tanggal: String(p.tanggal ?? "").trim(),
          jumlah: Number(p.jumlah) || 0,
          keterangan: String(p.keterangan ?? "").trim(),
          createdAt: now,
          createdBy: gate.session.fullName || gate.session.username || "Admin",
        }))
      : [],

    history: [
      {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        at: now,
        by: gate.session.fullName || gate.session.username || "Admin",
        role: gate.session.role || "ADMIN",
        action: "CREATE",
        changes: [
          {
            field: "nomorKontrak",
            label: "Pembuatan Kontrak",
            oldValue: "-",
            newValue: nomorKontrak,
          },
        ],
      },
    ],

    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COL_NAME).insertOne(doc);

  // Return without _id
  const { ...rest } = doc;
  return NextResponse.json({ data: rest }, { status: 201 });
}
