"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Building2,
  Printer,
  Copy,
  Check,
  Package,
  Layers,
  FileText,
  Truck,
  Info,
  Calendar,
  Tag,
  Wrench,
  Award,
  Edit,
  Trash2,
} from "lucide-react";

interface Product {
  _id: string;
  namaProduk: string;
  kategori: string;
  subKategori?: string;
  merek?: string;
  jenisProduk: string;
  statusPreOrder?: string;
  isPreOrder?: boolean;
  durasiPreOrder?: number;
  statusDraf?: boolean;
  hargaProduk: number;
  pajak?: string;
  persenPajak?: number;
  hargaSetelahPajak?: number;
  minimumPembelian?: number;
  jumlahStok?: number;
  satuanProduk?: string;
  terjual?: number;
  tkdnBmp?: number;
  nilaiTkdn?: number;
  nilaiBmp?: number;
  pemilikSertifikat?: string;
  jenisLabel?: string;
  jenisPenyedia?: string;
  namaPenyedia?: string;
  lokasiPenyedia?: string;
  dikirimDari?: string;
  kodeKbki?: string;
  sku?: string;
  spesifikasiProduk?: string;
  garansi?: string;
  beratProduk?: string;
  dimensiProduk?: string;
  kelengkapanProduk?: string;
  deskripsi?: string;
  fotoUtama?: string;
  fotoLainnya?: string[];
  videoUrl?: string;
  klasifikasiPdn?: string;
  lokasiProduksi?: string;
  tenagaKerja?: string;
  bahanBaku?: string;
  sertifikatSni?: string;
  varian?: { nama: string; pilihan: string[] }[];
  layananTambahan?: string[];
  spesifikasiDetail?: Record<string, string>;
  strukturHarga?: string;
  sertifikatTelekomunikasi?: string;
  ramahLingkungan?: string;
}

export default function SingleProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const { user } = useSession();
  const canManage = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"detail" | "pendukung">("detail");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProduct = async () => {
    if (!product?._id) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/katalog-produk/${product._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");
      setShowDeleteModal(false);
      router.push("/katalog-produk/kelola");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghapus produk");
    } finally {
      setDeleting(false);
    }
  };

  // Selected variants state
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/katalog-produk/${productId}`);
        if (!res.ok) throw new Error("Produk tidak ditemukan");
        const data = await res.json();
        setProduct(data.product);

        // Pre-select first option of each variant
        if (data.product?.varian && data.product.varian.length > 0) {
          const defaults: Record<string, string> = {};
          data.product.varian.forEach((v: any) => {
            if (v.pilihan && v.pilihan.length > 0) {
              defaults[v.nama] = v.pilihan[0];
            }
          });
          setSelectedVariants(defaults);
        }
      } catch (err) {
        console.error("Fetch product error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatRupiah = (val?: number) => {
    if (!val && val !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat data produk...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <Package className="w-16 h-16 text-slate-300" />
        <h2 className="text-base font-bold text-slate-800">Produk Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Produk yang Anda cari tidak tersedia atau telah dihapus dari katalog internal.
        </p>
        <Link
          href="/katalog-produk"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke List Produk
        </Link>
      </div>
    );
  }

  // Combine photos
  const allImages = [
    product.fotoUtama ||
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
    ...(product.fotoLainnya || []),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-800 pb-20">
      {/* ── Top Navigation & Breadcrumbs ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium text-slate-500 scrollbar-none">
            <Link
              href="/katalog-produk"
              className="hover:text-red-600 flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Katalog Produk</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="shrink-0">{product.kategori || "Produk"}</span>
            {product.subKategori && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="shrink-0 font-medium text-slate-700">{product.subKategori}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
              {product.namaProduk}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canManage && (
              <Link
                href={`/katalog-produk/tambah?id=${product._id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Produk</span>
              </Link>
            )}

            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Salin Tautan"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Cetak Spesifikasi"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Draft Notice Banner (Only for Admin when viewing Draft product) ── */}
        {product.statusDraf && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold">
            <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-700 text-amber-100 text-[10px] uppercase font-black">
                  Status: Draf
                </span>
                <span>Produk ini masih disimpan sebagai draf dan belum ditampilkan di katalog publik umum.</span>
              </div>
              {canManage && (
                <Link
                  href={`/katalog-produk/tambah?id=${product._id}`}
                  className="px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-extrabold transition-colors"
                >
                  Edit & Publikasikan
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Detail Content ── */}
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ═══════════════════════════════════════════
              LEFT COLUMN (~65% / 8 cols): Image, Vendor, PDN, Specs Tabs
             ═══════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Image Showcase Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="relative aspect-4/3 w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                <img
                  src={allImages[activeImageIndex] || allImages[0]}
                  alt={product.namaProduk}
                  className="w-full h-full object-contain max-h-[500px]"
                />
              </div>

              {/* Thumbnail Slider */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                  <button
                    disabled={activeImageIndex === 0}
                    onClick={() => setActiveImageIndex((p) => Math.max(0, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? "border-red-600 ring-2 ring-red-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={activeImageIndex === allImages.length - 1}
                    onClick={() =>
                      setActiveImageIndex((p) => Math.min(allImages.length - 1, p + 1))
                    }
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Vendor / Penyedia Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-sm">
                  <Building2 className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {product.jenisPenyedia || "UMKK"}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                      {product.namaPenyedia || "Penyedia Terdaftar LKPP"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 pt-0.5">
                    {product.lokasiPenyedia || "Indonesia"}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
                Profil Toko Mitra
              </span>
            </div>

            {/* Informasi Produk Dalam Negeri Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Informasi Produk Dalam Negeri
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Jenis Produk:</span>
                  <span className="font-semibold text-slate-800">
                    {product.jenisLabel || "PDN"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nilai TKDN(%):</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    {product.nilaiTkdn !== undefined && product.nilaiTkdn !== null && product.nilaiTkdn > 0
                      ? `${product.nilaiTkdn}%`
                      : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nilai BMP:</span>
                  <span className="font-semibold text-slate-800">
                    {product.nilaiBmp !== undefined && product.nilaiBmp !== null && product.nilaiBmp > 0
                      ? `${product.nilaiBmp}%`
                      : "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nilai TKDN + Nilai BMP:</span>
                  <span className="font-extrabold text-emerald-700">
                    {(product.nilaiTkdn || 0) + (product.nilaiBmp || 0) > 0
                      ? `${((product.nilaiTkdn || 0) + (product.nilaiBmp || 0)).toFixed(2)}%`
                      : (product.tkdnBmp ? `${product.tkdnBmp}%` : "-")}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50 sm:col-span-2">
                  <span className="text-slate-500">Nama Pemilik Sertifikat:</span>
                  <span className="font-semibold text-slate-800">
                    {product.pemilikSertifikat || "-"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Klasifikasi Produk:</span>
                  <span className="font-semibold text-slate-800">
                    {product.klasifikasiPdn || "Lokal"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Lokasi Produksi:</span>
                  <span className="font-semibold text-slate-800">
                    {product.lokasiProduksi || "Diproduksi di seluruh Indonesia"}
                  </span>
                </div>
              </div>
            </div>

            {/* Specifications Tabs Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="flex items-center border-b border-slate-200 bg-slate-50/50 px-4">
                <button
                  onClick={() => setActiveTab("detail")}
                  className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "detail"
                      ? "border-red-600 text-red-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Detail Produk
                </button>
                <button
                  onClick={() => setActiveTab("pendukung")}
                  className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "pendukung"
                      ? "border-red-600 text-red-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Info Pendukung
                </button>
              </div>

              <div className="p-5">
                {activeTab === "detail" ? (
                  <div className="space-y-4">
                    {/* Specs List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-8 text-xs">
                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Merek:</span>
                        <span className="font-bold text-slate-800">
                          {product.merek || "Tanpa Merek"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Nomor SKU:</span>
                        <span className="font-semibold text-slate-800">
                          {product.sku || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Kode KBKI:</span>
                        <span className="font-bold text-blue-600 flex items-center gap-1">
                          {product.kodeKbki || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Garansi:</span>
                        <span className="font-semibold text-slate-800">
                          {product.garansi || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Satuan Barang:</span>
                        <span className="font-semibold text-slate-800">
                          {product.satuanProduk || "Unit"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Berat per Produk:</span>
                        <span className="font-semibold text-slate-800">
                          {product.beratProduk || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100 sm:col-span-2">
                        <span className="text-slate-500">Dimensi per Produk:</span>
                        <span className="font-semibold text-slate-800">
                          {product.dimensiProduk || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100 sm:col-span-2">
                        <span className="text-slate-500 shrink-0 pr-4">Kelengkapan Produk:</span>
                        <span className="font-medium text-slate-800 text-right">
                          {product.kelengkapanProduk || "-"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">SNI / Standar Mutu:</span>
                        <span className="font-semibold text-slate-800">
                          {product.sertifikatSni || "Tidak ada"}
                        </span>
                      </div>

                      <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Lokasi Tempat Usaha:</span>
                        <span className="font-semibold text-slate-800">
                          {product.lokasiPenyedia || "-"}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Category Specifications if available */}
                    {product.spesifikasiDetail && Object.keys(product.spesifikasiDetail).length > 0 && (
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Spesifikasi Teknis ({product.subKategori || product.kategori})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-8 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          {Object.entries(product.spesifikasiDetail)
                            .filter(([_, val]) => Boolean(val))
                            .map(([key, val]) => {
                              // Format camelCase key into readable title
                              const readableKey = key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase());
                              return (
                                <div key={key} className="flex items-start justify-between py-1 border-b border-slate-200/50">
                                  <span className="text-slate-500 capitalize">{readableKey}:</span>
                                  <span className="font-semibold text-slate-800 text-right">{val}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Deskripsi */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-bold text-slate-900">Deskripsi Produk:</h4>
                      <p
                        className={`text-xs text-slate-600 leading-relaxed whitespace-pre-line ${
                          !isDescExpanded ? "line-clamp-4" : ""
                        }`}
                      >
                        {product.deskripsi ||
                          "Tidak ada deskripsi khusus untuk produk ini dalam katalog."}
                      </p>
                      {product.deskripsi && product.deskripsi.length > 200 && (
                        <button
                          type="button"
                          onClick={() => setIsDescExpanded(!isDescExpanded)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer block pt-1"
                        >
                          {isDescExpanded ? "Lihat Lebih Sedikit ^" : "Lihat Selengkapnya v"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-blue-600" />
                        Sertifikasi & Kepatuhan
                      </h4>
                      <p className="text-slate-600">
                        Produk ini telah melalui verifikasi kepatuhan sertifikat Tingkat Komponen Dalam Negeri (TKDN) dan memenuhi spesifikasi teknis untuk pengadaan pemerintah.
                      </p>
                    </div>

                    {product.layananTambahan && product.layananTambahan.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-emerald-600" />
                          Layanan Tambahan
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {product.layananTambahan.map((lay, idx) => (
                            <li key={idx}>{lay}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {product.videoUrl && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="font-bold text-slate-800">Tautan Video Produk:</h4>
                        <a
                          href={product.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          {product.videoUrl}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              RIGHT COLUMN (~35% / 4-5 cols, STICKY):
              Internal Display Specs, Price, Variants, Delivery Info
              (Per user instruction: NO shopping cart, NO preorder cart buttons!)
             ═══════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5 sticky top-20">
            {/* Main Spec Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {product.jenisProduk || "Barang"}
                </span>
                {product.isPreOrder ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                    {product.statusPreOrder || `Pre Order ${product.durasiPreOrder || 30} Hari`}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Ready Stock
                  </span>
                )}
              </div>

              {/* Title & Stats */}
              <div className="space-y-1">
                <h1 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {product.namaProduk}
                </h1>
                <p className="text-xs text-slate-500">
                  Terjual {product.terjual || 0} • {product.statusPreOrder || "Ready Stock"}
                </p>
              </div>

              {/* Price */}
              <div className="pt-2 border-t border-slate-100 space-y-0.5">
                <div className="text-2xl font-black text-slate-900">
                  {formatRupiah(product.hargaProduk)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {product.persenPajak && product.persenPajak > 0
                    ? `Termasuk PPN ${product.persenPajak}% (${formatRupiah(product.hargaSetelahPajak)})`
                    : "Bebas / Tidak Dikenakan PPN"}
                </div>
              </div>

              {/* Variants Selector */}
              {product.varian && product.varian.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {product.varian.map((v) => (
                    <div key={v.nama} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Pilih {v.nama}:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {v.pilihan.map((opt) => {
                          const isSelected = selectedVariants[v.nama] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setSelectedVariants((prev) => ({ ...prev, [v.nama]: opt }))
                              }
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-red-600 bg-red-50 text-red-700 font-bold shadow-2xs"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pengiriman info */}
              <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                <span className="font-bold text-slate-700 block">Pengiriman</span>
                <div className="flex items-center gap-2 text-slate-600">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>
                    Dikirim Dari{" "}
                    <strong>{product.dikirimDari || product.lokasiPenyedia || "INDONESIA"}</strong>
                  </span>
                </div>
              </div>

              {/* Stock info */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Stok Tersedia:</span>
                <span className="font-extrabold text-slate-800">
                  {product.jumlahStok?.toLocaleString("id-ID") || 0} {product.satuanProduk || "Unit"}
                </span>
              </div>



              {/* Internal Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Lembar Spesifikasi
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      Tautan Disalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Tautan Produk
                    </>
                  )}
                </button>

                <Link
                  href="/katalog-produk"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar Produk
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Konfirmasi Hapus Produk ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Konfirmasi Hapus Produk</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500">Nama Produk:</div>
              <div className="font-bold text-slate-900 line-clamp-2">{product.namaProduk}</div>
              {product.sku && (
                <div className="text-[11px] text-slate-600 font-mono pt-0.5">
                  SKU: {product.sku}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh spesifikasi teknis, riwayat draf, varian, dan harga akan dihapus secara permanen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Ya, Hapus Produk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
