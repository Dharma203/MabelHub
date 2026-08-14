import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("MabelHubStaging");
    // ── Sumber data utama: tracking_broadcast ──────────────────────
    const col = db.collection("tracking_broadcast");
    const valCol = db.collection("validasi_sales");

    const { searchParams } = req.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      500,
      Math.max(1, Number(searchParams.get("limit") ?? 100))
    );
    const skip = (page - 1) * limit;

    // Filters
    const search = (searchParams.get("search") || "").trim();
    const picSales = searchParams.get("picSales") || "";
    const provinsiFilter = searchParams.get("provinsi") || "";
    const produkFilter = searchParams.get("produk") || "";
    const validasiFilter = searchParams.get("validasi") || "";
    const waFilter = searchParams.get("wa") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { nama_perusahaan: { $regex: search, $options: "i" } },
        { pic: { $regex: search, $options: "i" } },
        { kota: { $regex: search, $options: "i" } },
        { alamat: { $regex: search, $options: "i" } },
      ];
    }

    // tracking_broadcast field names: ke_sales, provinsi, produk
    if (picSales) filter["ke_sales"] = picSales;
    if (provinsiFilter) filter["provinsi"] = provinsiFilter;
    if (produkFilter) filter["produk"] = produkFilter;

    // Group by nama_perusahaan to get unique companies
    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: "$nama_perusahaan",
          ke_sales: { $first: "$ke_sales" },
          alamat: { $first: "$alamat" },
          kota: { $first: "$kota" },
          provinsi: { $first: "$provinsi" },
          pic: { $first: "$pic" },
          jabatan: { $first: "$jabatan" },
          produk: { $first: "$produk" },
          tipe: { $first: "$tipe" },
          telp: { $first: "$telp" },
          status_wa: { $first: "$status_wa" },
          kode: { $first: "$kode" },
          source_id: { $first: "$source_id" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $lookup: {
          from: "input_database",
          localField: "kode",
          foreignField: "code_input",
          as: "input_doc"
        }
      },
      {
        $addFields: {
          input_data: { $arrayElemAt: ["$input_doc", 0] }
        }
      },
    ];

    // Count total unique companies
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await col.aggregate(countPipeline).toArray();
    const totalCount = countResult[0]?.total ?? 0;

    // Paginate
    pipeline.push({ $skip: skip }, { $limit: limit });
    const rows = await col.aggregate(pipeline).toArray();

    // Get all validasi records for these companies
    const companyNames = rows.map((r) => r._id);
    const validasiRecords = await valCol
      .find({ nama_perusahaan: { $in: companyNames } })
      .toArray();
    const validasiMap = new Map(
      validasiRecords.map((v) => [v.nama_perusahaan, v])
    );

    // Map items — semua status dari submit hanya "Draft"
    const items = rows.map((r, idx) => {
      const val = validasiMap.get(r._id);
      return {
        _id: r.source_id?.toString() || `row-${skip + idx}-${r._id}`,
        source_id: r.source_id || "",
        nama_perusahaan: r._id || "",
        sales_internal: r.ke_sales || "",
        alamat: r.alamat || "",
        kota: r.kota || r.input_data?.kota || "",
        provinsi: r.provinsi || r.input_data?.provinsi || "",
        pic: r.pic || r.input_data?.nama || "",
        jabatan: r.jabatan || r.input_data?.jabatan || "",
        produk: r.produk || r.input_data?.produk || "",
        tipe_kontak: r.tipe || r.input_data?.tipe_kontak || "",
        no_telp: r.telp || r.input_data?.no_telp || "",
        status_wa: r.status_wa || "",
        // Validasi fields (dari koleksi validasi_sales)
        validasi: val?.validasi || "",
        detail_validasi: val?.detail_validasi || "",
        produk_relevan_val: val?.produk_relevan || "",
        tipe_penyedia: val?.tipe_penyedia || "",
        catatan: val?.catatan || "",
        // Status selalu "Draft" selama belum ada aksi final
        status: val?.status || "Kosong",
      };
    });

    // Filter by validasi status if needed
    let filteredItems = items;
    if (validasiFilter) {
      filteredItems = items.filter((i) => i.validasi === validasiFilter);
    }
    if (waFilter && waFilter !== "Semua") {
      filteredItems = filteredItems.filter((i) => {
        if (waFilter === "Ada") return !!i.status_wa;
        if (waFilter === "Tidak Ada") return !i.status_wa;
        return true;
      });
    }

    // Stats
    const totalPerusahaan = totalCount;
    const terhubung = validasiRecords.filter(
      (v) => v.validasi === "Terhubung"
    ).length;
    const pending = validasiRecords.filter(
      (v) => v.status === "Draft"
    ).length;
    const tidakTerhubung = validasiRecords.filter(
      (v) => v.validasi === "Tidak Terhubung"
    ).length;
    const belumDiproses = totalPerusahaan - validasiRecords.length;

    // Filter options dari tracking_broadcast
    const [salesOptions, provinsiOptions, produkOptions, validasiOptions] =
      await Promise.all([
        col.distinct("ke_sales", { ke_sales: { $nin: ["", null] } }),
        col.distinct("provinsi", { provinsi: { $nin: ["", null] } }),
        col.distinct("produk", { produk: { $nin: ["", null] } }),
        valCol.distinct("validasi", { validasi: { $nin: ["", null] } }),
      ]);

    return NextResponse.json({
      items: filteredItems,
      pagination: {
        page,
        limit,
        total:
          filteredItems.length !== items.length
            ? filteredItems.length
            : totalCount,
        totalPages: Math.max(
          1,
          Math.ceil(
            (filteredItems.length !== items.length
              ? filteredItems.length
              : totalCount) / limit
          )
        ),
      },
      stats: {
        totalPerusahaan,
        terhubung,
        pending,
        tidakTerhubung,
        belumDiproses,
      },
      filterOptions: {
        sales: salesOptions.sort(),
        provinsi: provinsiOptions.sort(),
        produk: produkOptions.sort(),
        validasi: validasiOptions.sort(),
      },
    });
  } catch (error) {
    console.error("Error fetching validasi-sales:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nama_perusahaan,
      source_id,
      sales_internal,
      alamat,
      kota,
      provinsi,
      pic,
      jabatan,
      produk,
      status_wa,
      tipe_kontak,
      no_telp,
      validasi,
      produk_relevan,
      detail_validasi,
      tipe_penyedia,
      catatan,
      status: bodyStatus,
    } = body;

    if (!nama_perusahaan) {
      return NextResponse.json(
        { error: "nama_perusahaan wajib diisi" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("MabelHubStaging");
    const valCol = db.collection("validasi_sales");

    const now = new Date();

    const status = bodyStatus || "Draft";

    const updateDoc = {
      $set: {
        nama_perusahaan,
        sales_internal: sales_internal || "",
        alamat: alamat || "",
        kota: kota || "",
        provinsi: provinsi || "",
        pic: pic || "",
        jabatan: jabatan || "",
        produk: produk || "",
        status_wa: status_wa || "",
        tipe_kontak: tipe_kontak || "",
        no_telp: no_telp || "",
        validasi: validasi || "",
        produk_relevan: produk_relevan || "",
        detail_validasi: detail_validasi || "",
        tipe_penyedia: tipe_penyedia || "",
        catatan: catatan || "",
        status,
        updated_at: now,
      },
      $setOnInsert: {
        source_id: source_id || null,
        created_at: now,
      },
    };

    await valCol.updateOne({ nama_perusahaan }, updateDoc, { upsert: true });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("Error saving validasi:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan validasi" },
      { status: 500 }
    );
  }
}
