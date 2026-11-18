import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

export async function POST(req: Request) {
  try {
    const auth = assertLoggedIn(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Hanya Admin dan Superadmin yang dapat mengimpor produk" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Daftar produk yang akan diimpor tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (items.length > 500) {
      return NextResponse.json(
        { error: "Maksimal 500 produk per proses impor" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();
    const userName = auth.session.fullName || auth.session.username || "Admin";

    const documentsToInsert = items.map((item: any, idx: number) => {
      const harga = Number(item.hargaProduk) || 0;
      const persenPajak = Number(item.persenPajak) || 0;
      const hargaSetelahPajak =
        item.hargaSetelahPajak !== undefined
          ? Number(item.hargaSetelahPajak)
          : Math.round(harga + (harga * persenPajak) / 100);

      const jumlahStok = Math.max(0, Number(item.jumlahStok) || 0);
      const nilaiTkdn = Number(item.nilaiTkdn) || 0;
      const nilaiBmp = Number(item.nilaiBmp) || 0;

      const initialLog = [
        {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${idx}`,
          tanggal: nowIso,
          tipe: "awal",
          jumlahPerubahan: jumlahStok,
          stokSebelum: 0,
          stokSesudah: jumlahStok,
          catatan: "Stok awal produk dari impor Excel",
          user: userName,
        },
      ];

      return {
        namaProduk: String(item.namaProduk || "").trim(),
        kategori: String(item.kategori || "Umum & Lainnya").trim(),
        subKategori: String(item.subKategori || "").trim(),
        merek: String(item.merek || "Tanpa Merek").trim(),
        jenisProduk: "Barang",
        statusPreOrder: "Ready Stock",
        isPreOrder: false,
        durasiPreOrder: 0,
        hargaProduk: harga,
        pajak: "PPN",
        persenPajak,
        hargaSetelahPajak,
        minimumPembelian: 1,
        jumlahStok,
        satuanProduk: String(item.satuanProduk || "Unit").trim(),
        tanggalMasukKatalog: todayStr,
        riwayatStok: initialLog,
        terjual: 0,
        tkdnBmp: nilaiTkdn + nilaiBmp,
        nilaiTkdn,
        nilaiBmp,
        pemilikSertifikat: "-",
        jenisLabel: "PDN",
        jenisPenyedia: String(item.jenisPenyedia || "UMKK").trim(),
        namaPenyedia: String(item.namaPenyedia || "MabelHub Store").trim(),
        namaPic: String(item.namaPic || "-").trim(),
        noHpPic: String(item.noHpPic || "-").trim(),
        namaPicPenyedia: String(item.namaPic || "-").trim(),
        noHpPicPenyedia: String(item.noHpPic || "-").trim(),
        lokasiPenyedia: String(item.lokasiPenyedia || "DKI Jakarta").trim(),
        dikirimDari: String(item.dikirimDari || item.lokasiPenyedia || "DKI Jakarta").trim(),
        kodeKbki: String(item.kodeKbki || "-").trim(),
        sku: String(item.sku || `MBL-${Date.now().toString().slice(-6)}-${idx + 1}`).trim(),
        spesifikasiProduk: String(item.namaProduk || "").trim(),
        garansi: String(item.garansi || "-").trim(),
        beratProduk: String(item.beratProduk || "-").trim(),
        dimensiProduk: String(item.dimensiProduk || "-").trim(),
        kelengkapanProduk: String(item.kelengkapanProduk || "-").trim(),
        deskripsi: String(item.deskripsi || "").trim(),
        fotoUtama:
          item.fotoUtama ||
          "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
        fotoLainnya: [],
        videoUrl: "",
        klasifikasiPdn: "Lokal",
        lokasiProduksi: "Diproduksi di seluruh Indonesia",
        tenagaKerja: "Dibuat oleh seluruh tenaga kerja Indonesia di dalam negeri",
        bahanBaku: "Seluruh bahan baku dalam negeri",
        sertifikatSni: item.sertifikatSni || "Tidak ada",
        nomorSni: item.nomorSni || "",
        varian: [],
        hargaGrosir: [],
        layananTambahan: [],
        spesifikasiDetail: {},
        strukturHarga: "Harga Satuan",
        sertifikatTelekomunikasi: "",
        ramahLingkungan: "",
        statusDraf: Boolean(item.statusDraf),
        createdAt: nowIso,
      };
    });

    const client = await clientPromise;
    const db = client.db(getDbName());
    const result = await db.collection("katalog_produk").insertMany(documentsToInsert);

    return NextResponse.json(
      {
        success: true,
        count: result.insertedCount,
        message: `Berhasil mengimpor ${result.insertedCount} produk ke katalog.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/katalog-produk/import] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses impor produk" },
      { status: 500 }
    );
  }
}

