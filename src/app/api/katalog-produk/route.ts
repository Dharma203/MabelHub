import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const kategori = searchParams.get("kategori") || "";
    const jenisProduk = searchParams.get("jenisProduk") || "";
    const labelProduk = searchParams.get("labelProduk") || "";
    const jenisPenyedia = searchParams.get("jenisPenyedia") || "";
    const lokasi = searchParams.get("lokasi") || "";
    const minTkdn = parseFloat(searchParams.get("minTkdn") || "0");
    const minHarga = parseFloat(searchParams.get("minHarga") || "0");
    const maxHarga = parseFloat(searchParams.get("maxHarga") || "0");
    const sort = searchParams.get("sort") || "paling_sesuai";
    const status = searchParams.get("status"); // "all" | "draft" | "published" | null
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const client = await clientPromise;
    const db = client.db(getDbName());
    const col = db.collection("katalog_produk");

    const query: Record<string, any> = {};

    // Status filter:
    // If status is "draft", show only drafts
    // If status is "published", show only published
    // If status is "all", show everything
    // Default (e.g. from public catalog): only show published products
    if (status === "draft") {
      query.statusDraf = true;
    } else if (status === "published") {
      query.statusDraf = { $ne: true };
    } else if (status !== "all") {
      // Default behavior: public catalog only shows published items
      query.statusDraf = { $ne: true };
    }

    if (search.trim()) {
      query.$or = [
        { namaProduk: { $regex: search.trim(), $options: "i" } },
        { sku: { $regex: search.trim(), $options: "i" } },
        { merek: { $regex: search.trim(), $options: "i" } },
        { kategori: { $regex: search.trim(), $options: "i" } },
        { namaPenyedia: { $regex: search.trim(), $options: "i" } },
        { deskripsi: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (kategori) {
      query.kategori = { $regex: kategori, $options: "i" };
    }

    if (jenisProduk) {
      query.jenisProduk = jenisProduk;
    }

    if (labelProduk) {
      query.jenisLabel = labelProduk;
    }

    if (jenisPenyedia) {
      query.jenisPenyedia = jenisPenyedia;
    }

    if (lokasi) {
      query.lokasiPenyedia = { $regex: lokasi, $options: "i" };
    }

    if (minTkdn > 0) {
      query.tkdnBmp = { $gte: minTkdn };
    }

    if (minHarga > 0 || maxHarga > 0) {
      query.hargaProduk = {};
      if (minHarga > 0) query.hargaProduk.$gte = minHarga;
      if (maxHarga > 0) query.hargaProduk.$lte = maxHarga;
    }

    let sortOptions: Record<string, 1 | -1> = { _id: -1 };
    if (sort === "harga_asc") sortOptions = { hargaProduk: 1 };
    else if (sort === "harga_desc") sortOptions = { hargaProduk: -1 };
    else if (sort === "terbaru") sortOptions = { createdAt: -1 };
    else if (sort === "terlama") sortOptions = { createdAt: 1 };
    else if (sort === "nama_asc") sortOptions = { namaProduk: 1 };
    else if (sort === "tkdn_desc") sortOptions = { tkdnBmp: -1 };

    const skip = (page - 1) * limit;
    const [items, filteredTotal, totalDraft, totalPublished, totalAll] = await Promise.all([
      col.find(query).sort(sortOptions).skip(skip).limit(limit).toArray(),
      col.countDocuments(query),
      col.countDocuments({ statusDraf: true }),
      col.countDocuments({ statusDraf: { $ne: true } }),
      col.countDocuments({}),
    ]);

    const formattedItems = items.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      items: formattedItems,
      total: filteredTotal,
      counts: {
        all: totalAll,
        draft: totalDraft,
        published: totalPublished,
      },
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit) || 1,
    });
  } catch (error) {
    console.error("[GET /api/katalog-produk] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = assertLoggedIn(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Hanya Admin dan Superadmin yang dapat menambahkan produk" },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.namaProduk || !body.kategori) {
      return NextResponse.json(
        { error: "Nama Produk dan Kategori wajib diisi" },
        { status: 400 }
      );
    }

    const harga = Number(body.hargaProduk) || 0;
    const persenPajak = Number(body.persenPajak) || 0;
    const hargaSetelahPajak =
      body.hargaSetelahPajak !== undefined
        ? Number(body.hargaSetelahPajak)
        : Math.round(harga + (harga * persenPajak) / 100);

    const newProduct = {
      namaProduk: body.namaProduk,
      kategori: body.kategori || "Umum",
      subKategori: body.subKategori || "",
      merek: body.merek || "Tanpa Merek",
      jenisProduk: body.jenisProduk || "Barang",
      statusPreOrder: body.isPreOrder ? `Pre Order ${body.durasiPreOrder || 30} Hari` : "Ready Stock",
      isPreOrder: Boolean(body.isPreOrder),
      durasiPreOrder: Number(body.durasiPreOrder) || 0,
      hargaProduk: harga,
      pajak: body.pajak || "PPN",
      persenPajak,
      hargaSetelahPajak,
      minimumPembelian: Number(body.minimumPembelian) || 1,
      jumlahStok: Number(body.jumlahStok) || 0,
      satuanProduk: body.satuanProduk || "Unit",
      terjual: 0,
      tkdnBmp: (Number(body.nilaiTkdn) || 0) + (Number(body.nilaiBmp) || 0) || Number(body.tkdnBmp) || 0,
      nilaiTkdn: Number(body.nilaiTkdn) || 0,
      nilaiBmp: Number(body.nilaiBmp) || 0,
      pemilikSertifikat: body.pemilikSertifikat || "-",
      jenisLabel: body.jenisLabel || "PDN",
      jenisPenyedia: body.jenisPenyedia || "UMKK",
      namaPenyedia: body.namaPenyedia || "MabelHub Store",
      lokasiPenyedia: body.lokasiPenyedia || "-",
      dikirimDari: body.dikirimDari || body.lokasiPenyedia || "-",
      kodeKbki: body.kodeKbki || "-",
      sku: body.sku || `MBL-${Date.now().toString().slice(-6)}`,
      spesifikasiProduk: body.spesifikasiProduk || body.namaProduk,
      garansi: body.garansi || "-",
      beratProduk: body.beratProduk || "-",
      dimensiProduk: body.dimensiProduk || "-",
      kelengkapanProduk: body.kelengkapanProduk || "-",
      deskripsi: body.deskripsi || "",
      fotoUtama:
        body.fotoUtama ||
        "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
      fotoLainnya: Array.isArray(body.fotoLainnya) ? body.fotoLainnya : [],
      videoUrl: body.videoUrl || "",
      klasifikasiPdn: body.klasifikasiPdn || "Lokal",
      lokasiProduksi: body.lokasiProduksi || "Diproduksi di seluruh Indonesia",
      tenagaKerja: body.tenagaKerja || "Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri",
      bahanBaku: body.bahanBaku || "Seluruh bahan baku dalam negeri",
      sertifikatSni: body.sertifikatSni || "Tidak ada",
      nomorSni: body.nomorSni || "",
      varian: Array.isArray(body.varian) ? body.varian : [],
      hargaGrosir: Array.isArray(body.hargaGrosir) ? body.hargaGrosir : [],
      layananTambahan: Array.isArray(body.layananTambahan) ? body.layananTambahan : [],
      spesifikasiDetail: typeof body.spesifikasiDetail === "object" ? body.spesifikasiDetail : {},
      strukturHarga: body.strukturHarga || "Harga Satuan",
      sertifikatTelekomunikasi: body.sertifikatTelekomunikasi || "",
      ramahLingkungan: body.ramahLingkungan || "",
      statusDraf: Boolean(body.statusDraf),
      createdAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db(getDbName());
    const result = await db.collection("katalog_produk").insertOne(newProduct);

    return NextResponse.json(
      {
        success: true,
        id: result.insertedId.toString(),
        message: "Produk berhasil ditambahkan ke katalog",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/katalog-produk] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan produk" },
      { status: 500 }
    );
  }
}
