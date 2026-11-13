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

Boxes,

Clock,

Plus,

Minus,

  Maximize2,

  X,

} from "lucide-react";

import {

hitungUmurProduk,

formatTanggalIndo,

StockLogItem,

} from "@/lib/katalog-specs";

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
hargaModal?: number;
feeAdminPersen?: number;
feeAdminNominal?: number;
labaKotor?: number;
labaBersih?: number;
persenMargin?: number;

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

namaPic?: string;

noHpPic?: string;

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

tanggalMasukKatalog?: string;

createdAt?: string;

riwayatStok?: StockLogItem[];

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

const [activeTab, setActiveTab] = useState<"detail" | "pendukung" | "riwayatStok">("detail");

const [isDescExpanded, setIsDescExpanded] = useState(false);

const [copiedLink, setCopiedLink] = useState(false);

const [showDeleteModal, setShowDeleteModal] = useState(false);

const [deleting, setDeleting] = useState(false);

  const [showFullscreenImage, setShowFullscreenImage] = useState(false);

// Modal Sesuaikan Stok (Log Produk)

const [showStockModal, setShowStockModal] = useState(false);

const [stockActionType, setStockActionType] = useState<"tambah" | "kurang">("tambah");

const [stockAmount, setStockAmount] = useState<string>("");

const [stockNote, setStockNote] = useState<string>("");

const [updatingStock, setUpdatingStock] = useState(false);

const handleQuickUpdateStock = async (e: React.FormEvent) => {

e.preventDefault();

if (!product?._id) return;

const qty = parseInt(stockAmount, 10);

if (!qty || qty <= 0) {

alert("Masukkan jumlah stok yang valid (> 0)");

return;

}

const delta = stockActionType === "tambah" ? qty : -qty;

if (stockActionType === "kurang" && (product.jumlahStok || 0) - qty < 0) {

alert("Jumlah pengurangan melebihi stok yang tersedia saat ini!");

return;

}

try {

setUpdatingStock(true);

const res = await fetch(`/api/katalog-produk/${product._id}`, {

method: "PUT",

headers: { "Content-Type": "application/json" },

body: JSON.stringify({

quickAdjustmentStok: delta,

catatanPerubahanStok: stockNote.trim() || undefined,

}),

});

const data = await res.json();

if (!res.ok) throw new Error(data.error || "Gagal memperbarui stok");

// Fetch ulang produk untuk sinkronisasi state

const resProd = await fetch(`/api/katalog-produk/${product._id}`);

if (resProd.ok) {

const prodData = await resProd.json();

if (prodData.product) {

setProduct(prodData.product);

}

}

setShowStockModal(false);

setStockAmount("");

setStockNote("");

} catch (err: any) {

console.error(err);

alert(err.message || "Gagal memperbarui stok produk");

} finally {

setUpdatingStock(false);

}

};

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

  // Combine photos
  const allImages = [
    product?.fotoUtama ||
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
    ...(product?.fotoLainnya || []),
  ].filter(Boolean);

  // Keyboard listener for Fullscreen Image Viewer

useEffect(() => {

if (!showFullscreenImage) return;

const handleKeyDown = (e: KeyboardEvent) => {

if (e.key === "Escape") {

setShowFullscreenImage(false);

} else if (e.key === "ArrowLeft") {

setActiveImageIndex((p) => Math.max(0, p - 1));

} else if (e.key === "ArrowRight") {

setActiveImageIndex((p) => Math.min(allImages.length - 1, p + 1));

}

};

window.addEventListener("keydown", handleKeyDown);

return () => window.removeEventListener("keydown", handleKeyDown);

}, [showFullscreenImage, allImages.length]);

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

<div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">

<div className="flex flex-col items-center gap-3">

<div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />

<p className="text-sm font-semibold text-slate-500">Memuat data produk...</p>

</div>

</div>

);

}

if (!product) {

return (

<div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6 space-y-4 text-center">

<Package className="w-16 h-16 text-slate-300" />

<h2 className="text-base font-bold text-slate-800">Produk Tidak Ditemukan</h2>

<p className="text-sm text-slate-500 max-w-sm">

Produk yang Anda cari tidak tersedia atau telah dihapus dari katalog internal.

</p>

<Link

href="/katalog-produk"

className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"

>

<ArrowLeft className="w-4 h-4" />

Kembali ke List Produk

</Link>

</div>

);

}



return (

<div className="min-h-screen bg-blue-50 text-slate-800 pb-16">

<div className="flex">

<div className="flex-1 min-w-0 p-4 sm:px-6 sm:pt-3 sm:pb-8">

<div className="max-w-[1520px] mx-auto">

<div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

<div className="ml-1 sm:ml-2 px-1 sm:px-2 pt-0.5 pb-0.5 space-y-0.5">

<div className="flex items-center gap-2 text-sm text-slate-500 mb-0.5">

<Link

href="/katalog-produk"

className="hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"

>

<span>Katalog Produk</span>

</Link>

{product.subKategori && (

<>

<ChevronRight className="w-3 h-3 text-slate-400" />

<span className="text-slate-600">{product.subKategori}</span>

</>

)}

</div>

<h2 className="text-2xl sm:text-3xl font-extrabold text-black drop-shadow-sm uppercase tracking-tight">

DETAIL PRODUK

</h2>

<p className="text-sm text-neutral-600 line-clamp-1">

{product.namaProduk}

</p>

</div>

{/* Actions on right side of header */}

<div className="flex items-center gap-2 flex-wrap">

{canManage && (

<Link

href={`/katalog-produk/tambah?id=${product._id}`}

className="inline-flex items-center gap-1.5 h-10 px-4 bg-blue-700 hover:bg-blue-900 text-white rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"

>

<Edit className="w-3.5 h-3.5" />

<span>Edit Produk</span>

</Link>

)}

<button

onClick={handleCopyLink}

className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer"

title="Salin Tautan"

>

{copiedLink ? (

<>

<Check className="w-3.5 h-3.5 text-emerald-600" />

<span>Tersalin</span>

</>

) : (

<>

<Copy className="w-3.5 h-3.5" />

<span>Salin Tautan</span>

</>

)}

</button>

<button

onClick={handlePrint}

className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer"

title="Cetak Spesifikasi"

>

<Printer className="w-3.5 h-3.5" />

<span>Cetak</span>

</button>

{canManage && (

<button

onClick={() => setShowDeleteModal(true)}

className="inline-flex items-center justify-center w-10 h-10 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium shadow-xs transition-colors cursor-pointer"

title="Hapus Produk"

>

<Trash2 className="w-4 h-4" />

</button>

)}

</div>

</div>

{/* ── Draft Notice Banner (Only for Admin when viewing Draft product) ── */}

{product.statusDraf && (

<div className="mb-3 bg-amber-500 text-white px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold flex flex-wrap items-center justify-between gap-2">

<div className="flex items-center gap-2">

<span className="px-2 py-0.5 rounded bg-amber-700 text-amber-100 text-[10px] uppercase font-black">

Status: Draf

</span>

<span>Produk ini masih disimpan sebagai draf dan belum ditampilkan di katalog publik umum.</span>

</div>

{canManage && (

<Link

href={`/katalog-produk/tambah?id=${product._id}`}

className="px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-sm font-extrabold transition-colors"

>

Edit & Publikasikan

</Link>

)}

</div>

)}

{/* ── Main Detail Grid ── */}

<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

{/* ═══════════════════════════════════════════

LEFT COLUMN: Image Showcase & Main Spec Card (STICKY)

═══════════════════════════════════════════ */}

<div className="space-y-3 lg:sticky lg:top-2 lg:self-start">

{/* Image Showcase Card */}

<div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">

<div

                onClick={() => setShowFullscreenImage(true)}

                className="group/img relative aspect-16/10 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center max-h-[240px] cursor-zoom-in"

                title="Klik untuk melihat gambar layar penuh"

              >

<img

src={allImages[activeImageIndex] || allImages[0]}

alt={product.namaProduk}

className="w-full h-full object-contain max-h-[230px]"

/>

                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 hover:bg-black/80 text-white text-sm font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">

                  <Maximize2 className="w-3 h-3" />

                  <span>Layar Penuh</span>

                </div>

</div>

{/* Thumbnail Slider */}

{allImages.length > 1 && (

<div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-0.5">

<button

disabled={activeImageIndex === 0}

onClick={() => setActiveImageIndex((p) => Math.max(0, p - 1))}

className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shrink-0"

>

<ChevronLeft className="w-3.5 h-3.5" />

</button>

<div className="flex items-center gap-1.5">

{allImages.map((img, idx) => (

<button

key={idx}

onClick={() => setActiveImageIndex(idx)}

className={`w-11 h-11 rounded-md overflow-hidden border transition-all cursor-pointer shrink-0 ${

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

className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer shrink-0"

>

<ChevronRight className="w-3.5 h-3.5" />

</button>

</div>

)}

</div>

{/* Main Spec Card (Modal sebelah kiri - Compact) */}

<div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">

{/* Badges */}

<div className="flex flex-wrap items-center gap-1.5">

<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">

{product.jenisProduk || "Barang"}

</span>

{product.isPreOrder ? (

<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">

{product.statusPreOrder || `Pre Order ${product.durasiPreOrder || 30} Hari`}

</span>

) : (

<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">

Ready Stock

</span>

)}

</div>

{/* Title & Stats */}

<div className="space-y-0.5">

<h1 className="text-base font-bold text-slate-900 leading-snug">

{product.namaProduk}

</h1>

<p className="text-[11px] text-slate-500">

Stok {product.jumlahStok?.toLocaleString("id-ID") || 0} {product.satuanProduk || "Unit"} • {product.statusPreOrder || "Ready Stock"}

</p>

</div>

{/* Price */}

<div className="pt-2 border-t border-slate-100 space-y-0.5">

<div className="text-xl font-black text-slate-900">

{formatRupiah(product.hargaProduk)}

</div>

<div className="text-[10px] text-slate-500">

{product.persenPajak && product.persenPajak > 0

? `Termasuk PPN ${product.persenPajak}% (${formatRupiah(product.hargaSetelahPajak)})`

: "Bebas / Tidak Dikenakan PPN"}

</div>

{canManage && (
  <div className="mt-2.5 p-3 rounded-xl bg-[#1D80D9]/5 border border-[#1D80D9]/25 text-xs space-y-2">
    <div className="flex items-center justify-between border-b border-[#1D80D9]/20 pb-1.5">
      <span className="font-bold uppercase tracking-wider text-[10px] text-[#1D80D9] flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        Kalkulasi Margin Admin (CRM)
      </span>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D80D9]/10 text-[#1D80D9] font-bold border border-[#1D80D9]/20">
        Internal
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      <div>
        <span className="text-slate-400 block text-[10px]">Harga Modal (HPP):</span>
        <span className="font-extrabold text-amber-700">{formatRupiah(product.hargaModal ?? 0)}</span>
      </div>
      <div>
        <span className="text-slate-400 block text-[10px]">Fee Admin ({product.feeAdminPersen ?? 5}%):</span>
        <span className="font-extrabold text-rose-600">
          -{formatRupiah(product.feeAdminNominal ?? Math.round(((product.hargaProduk || 0) * (product.feeAdminPersen ?? 5)) / 100))}
        </span>
      </div>
    </div>
    <div className="pt-1.5 border-t border-[#1D80D9]/20 flex items-center justify-between">
      <span className="text-slate-500 text-[10px]">Estimasi Laba Bersih:</span>
      <span className="font-black text-emerald-700 text-xs">
        +{formatRupiah(product.labaBersih ?? ((product.hargaProduk || 0) - (product.hargaModal || 0) - Math.round(((product.hargaProduk || 0) * (product.feeAdminPersen ?? 5)) / 100)))}
        <span className="ml-1 text-[10px] font-bold text-slate-500">
          ({product.persenMargin ?? (product.hargaProduk > 0 ? Math.round((((product.hargaProduk - (product.hargaModal || 0) - Math.round((product.hargaProduk * (product.feeAdminPersen ?? 5)) / 100)) / product.hargaProduk) * 1000)) / 10 : 0)}%)
        </span>
      </span>
    </div>
  </div>
)}

</div>

{/* Variants Selector */}

{product.varian && product.varian.length > 0 && (

<div className="space-y-2 pt-2 border-t border-slate-100">

{product.varian.map((v) => (

<div key={v.nama} className="space-y-1">

<label className="text-[11px] font-bold text-slate-700">

Pilih {v.nama}:

</label>

<div className="flex flex-wrap gap-1.5">

{v.pilihan.map((opt) => {

const isSelected = selectedVariants[v.nama] === opt;

return (

<button

key={opt}

type="button"

onClick={() =>

setSelectedVariants((prev) => ({ ...prev, [v.nama]: opt }))

}

className={`px-2.5 py-1 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${

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

{/* Pengiriman & Stok Info Compact */}

<div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">

<div className="space-y-0.5">

<span className="text-slate-400 block text-[10px]">Pengiriman:</span>

<span className="font-medium text-slate-700 flex items-center gap-1 truncate">

<Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />

<strong className="truncate">{product.dikirimDari || product.lokasiPenyedia || "INDONESIA"}</strong>

</span>

</div>

<div className="space-y-0.5 text-right">

<span className="text-slate-400 block text-[10px]">Stok Tersedia:</span>

<span className="font-bold text-slate-800">

{product.jumlahStok?.toLocaleString("id-ID") || 0} {product.satuanProduk || "Unit"}

</span>

</div>

</div>

{/* Umur Produk di Katalog */}

<div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">

<span className="text-slate-500 flex items-center gap-1.5">

<Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />

<span>Umur di Katalog:</span>

</span>

<span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10.5px]">

{hitungUmurProduk(product.tanggalMasukKatalog || product.createdAt)}

</span>

</div>

</div>

</div>

{/* ═══════════════════════════════════════════

RIGHT COLUMN: Vendor, Informasi PDN, & Specifications Tabs (SCROLLABLE)

═══════════════════════════════════════════ */}

<div className="space-y-3 lg:max-h-[calc(100vh-4.25rem)] lg:overflow-y-auto pr-1.5">

{/* Vendor / Penyedia Card */}

<div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between gap-3">

<div className="flex items-center gap-2.5 min-w-0">

<div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">

<Building2 className="w-4 h-4 text-slate-600" />

</div>

<div className="min-w-0">

<div className="flex items-center gap-1.5 flex-wrap">

<span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">

{product.jenisPenyedia || "UMKK"}

</span>

<h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate max-w-[200px] sm:max-w-xs">

{product.namaPenyedia || "Penyedia Terdaftar LKPP"}

</h3>

</div>

<p className="text-[11px] text-slate-500 truncate">

{product.lokasiPenyedia || "Indonesia"}

</p>

</div>

</div>

<span className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-medium shrink-0">

Mitra

</span>

</div>

{/* Informasi Produk Dalam Negeri Card */}

<div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">

<div className="flex items-center justify-between pb-1.5 border-b border-slate-100">

<h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">

Informasi PDN & TKDN

</h3>

<span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">

TKDN+BMP: {(product.nilaiTkdn || 0) + (product.nilaiBmp || 0) > 0

? `${((product.nilaiTkdn || 0) + (product.nilaiBmp || 0)).toFixed(2)}%`

: (product.tkdnBmp ? `${product.tkdnBmp}%` : "-")}

</span>

</div>

<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">

<div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">

<span className="text-[10px] text-slate-400 block">Jenis Produk</span>

<span className="font-semibold text-slate-800 text-[11px]">{product.jenisLabel || "PDN"}</span>

</div>

<div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">

<span className="text-[10px] text-slate-400 block">Nilai TKDN</span>

<span className="font-bold text-emerald-700 text-[11px]">

{product.nilaiTkdn !== undefined && product.nilaiTkdn !== null && product.nilaiTkdn > 0

? `${product.nilaiTkdn}%`

: "-"}

</span>

</div>

<div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">

<span className="text-[10px] text-slate-400 block">Nilai BMP</span>

<span className="font-semibold text-slate-800 text-[11px]">

{product.nilaiBmp !== undefined && product.nilaiBmp !== null && product.nilaiBmp > 0

? `${product.nilaiBmp}%`

: "-"}

</span>

</div>

<div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">

<span className="text-[10px] text-slate-400 block">Klasifikasi</span>

<span className="font-semibold text-slate-800 text-[11px] truncate block">{product.klasifikasiPdn || "Lokal"}</span>

</div>

</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-bold text-sm pt-0.5 text-slate-600">

<div className="flex items-center justify-between">

<span className="text-slate-400">Pemilik Sertifikat:</span>

<span className="font-bold text-slate-700 truncate max-w-[180px]">{product.pemilikSertifikat || "-"}</span>

</div>

<div className="flex items-center justify-between">

<span className="text-slate-400">Lokasi Produksi:</span>

<span className="font-bold text-slate-700 truncate max-w-[180px]">{product.lokasiProduksi || "Indonesia"}</span>

</div>

</div>

</div>

{/* Specifications Tabs Card */}

<div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">

<div className="flex items-center border-b border-slate-200 bg-slate-50/60 px-3">

<button

onClick={() => setActiveTab("detail")}

className={`py-2 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${

activeTab === "detail"

? "border-red-600 text-red-600 bg-white"

: "border-transparent text-slate-600 hover:text-slate-900"

}`}

>

Detail Produk

</button>

<button

onClick={() => setActiveTab("pendukung")}

className={`py-2 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${

activeTab === "pendukung"

? "border-red-600 text-red-600 bg-white"

: "border-transparent text-slate-600 hover:text-slate-900"

}`}

>

Info Pendukung

</button>

<button

onClick={() => setActiveTab("riwayatStok")}

className={`py-2 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${

activeTab === "riwayatStok"

? "border-red-600 text-red-600 bg-white"

: "border-transparent text-slate-600 hover:text-slate-900"

}`}

>

<Boxes className="w-3.5 h-3.5" />

<span>Riwayat Stok ({product.riwayatStok?.length || 0})</span>

</button>

</div>

<div className="p-3.5">

{activeTab === "detail" ? (

<div className="space-y-3">

{/* Specs List */}

<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm">

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Merek:</span>

<span className="font-bold text-slate-800">

{product.merek || "Tanpa Merek"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Umur Produk di Katalog:</span>

<span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10.5px]">

{hitungUmurProduk(product.tanggalMasukKatalog || product.createdAt)}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Tanggal Masuk:</span>

<span className="font-semibold text-slate-800">

{formatTanggalIndo(product.tanggalMasukKatalog || product.createdAt)}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Nomor SKU:</span>

<span className="font-semibold text-slate-800">

{product.sku || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Kode KBKI:</span>

<span className="font-bold text-blue-600 flex items-center gap-1">

{product.kodeKbki || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Garansi:</span>

<span className="font-semibold text-slate-800">

{product.garansi || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Satuan Barang:</span>

<span className="font-semibold text-slate-800">

{product.satuanProduk || "Unit"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Berat per Produk:</span>

<span className="font-semibold text-slate-800">

{product.beratProduk || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80 sm:col-span-2">

<span className="text-slate-500">Dimensi per Produk:</span>

<span className="font-semibold text-slate-800">

{product.dimensiProduk || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80 sm:col-span-2">

<span className="text-slate-500 shrink-0 pr-4">Kelengkapan:</span>

<span className="font-medium text-slate-800 text-right">

{product.kelengkapanProduk || "-"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">SNI / Standar Mutu:</span>

<span className="font-semibold text-slate-800">

{product.sertifikatSni || "Tidak ada"}

</span>

</div>

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Lokasi Usaha:</span>

<span className="font-semibold text-slate-800">

{product.lokasiPenyedia || "-"}

</span>

</div>

{Boolean(product.namaPic && product.namaPic !== "-") && (

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">Nama PIC:</span>

<span className="font-semibold text-slate-800">

{product.namaPic}

</span>

</div>

)}

{Boolean(product.noHpPic && product.noHpPic !== "-") && (

<div className="flex items-start justify-between py-1 border-b border-slate-100/80">

<span className="text-slate-500">No. HP / WA PIC:</span>

<span className="font-mono font-semibold text-slate-800">

{product.noHpPic}

</span>

</div>

)}

</div>

{/* Dynamic Category Specifications if available */}

{product.spesifikasiDetail && Object.keys(product.spesifikasiDetail).length > 0 && (

<div className="pt-2 border-t border-slate-100 space-y-1.5">

<h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">

Spesifikasi Teknis ({product.subKategori || product.kategori})

</h4>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">

{Object.entries(product.spesifikasiDetail)

.filter(([_, val]) => Boolean(val))

.map(([key, val]) => {

const readableKey = key

.replace(/([A-Z])/g, " $1")

.replace(/^./, (str) => str.toUpperCase());

return (

<div key={key} className="flex items-start justify-between py-0.5 border-b border-slate-200/50">

<span className="text-slate-500 capitalize">{readableKey}:</span>

<span className="font-semibold text-slate-800 text-right">{val}</span>

</div>

);

})}

</div>

</div>

)}

{/* Deskripsi */}

<div className="pt-2 border-t border-slate-100 space-y-1">

<h4 className="text-[11px] font-bold text-slate-900">Deskripsi Produk:</h4>

<p

className={`text-sm text-slate-600 leading-relaxed whitespace-pre-line ${

!isDescExpanded ? "line-clamp-3" : ""

}`}

>

{product.deskripsi ||

"Tidak ada deskripsi khusus untuk produk ini dalam katalog."}

</p>

{product.deskripsi && product.deskripsi.length > 150 && (

<button

type="button"

onClick={() => setIsDescExpanded(!isDescExpanded)}

className="text-sm font-bold text-red-600 hover:text-red-700 cursor-pointer block pt-0.5"

>

{isDescExpanded ? "Lihat Lebih Sedikit ^" : "Lihat Selengkapnya v"}

</button>

)}

</div>

</div>

) : activeTab === "pendukung" ? (

<div className="space-y-3 text-sm">

<div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">

<h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">

<Award className="w-3.5 h-3.5 text-blue-600" />

Sertifikasi & Kepatuhan

</h4>

<p className="text-slate-600 text-[11px] leading-relaxed">

Produk ini telah melalui verifikasi kepatuhan sertifikat Tingkat Komponen Dalam Negeri (TKDN) dan memenuhi spesifikasi teknis untuk pengadaan pemerintah.

</p>

</div>

{product.layananTambahan && product.layananTambahan.length > 0 && (

<div className="space-y-1">

<h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">

<Wrench className="w-3.5 h-3.5 text-emerald-600" />

Layanan Tambahan

</h4>

<ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">

{product.layananTambahan.map((lay, idx) => (

<li key={idx}>{lay}</li>

))}

</ul>

</div>

)}

{product.videoUrl && (

<div className="space-y-1 pt-1.5 border-t border-slate-100">

<h4 className="font-bold text-slate-800 text-sm">Tautan Video Produk:</h4>

<a

href={product.videoUrl}

target="_blank"

rel="noreferrer"

className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"

>

{product.videoUrl}

<ExternalLink className="w-3 h-3" />

</a>

</div>

)}

</div>

) : (

/* ── TAB 3: Riwayat Stok / Log Produk ── */

<div className="space-y-3.5 text-sm">

{/* Header Summary & Tombol Quick Adjust */}

<div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">

<div className="space-y-0.5">

<span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">

Stok Saat Ini

</span>

<div className="text-base font-black text-slate-900 flex items-center gap-2">

<span>{product.jumlahStok?.toLocaleString("id-ID") || 0} {product.satuanProduk || "Unit"}</span>

<span className="text-[10px] font-normal text-slate-500">

({hitungUmurProduk(product.tanggalMasukKatalog || product.createdAt)} di katalog)

</span>

</div>

</div>

{canManage && (

<button

type="button"

onClick={() => {

setStockActionType("tambah");

setStockAmount("");

setStockNote("");

setShowStockModal(true);

}}

className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-2xs"

>

<Boxes className="w-3.5 h-3.5" />

<span>Sesuaikan Stok</span>

</button>

)}

</div>

{/* Timeline List */}

{product.riwayatStok && product.riwayatStok.length > 0 ? (

<div className="space-y-2">

<h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">

<Clock className="w-3.5 h-3.5 text-blue-600" />

Log Riwayat Perubahan Stok:

</h4>

<div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">

{product.riwayatStok.map((log, idx) => (

<div

key={log.id || idx}

className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors"

>

<div className="flex items-center justify-between gap-2 flex-wrap">

<div className="flex items-center gap-2">

<span

className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${

log.tipe === "tambah" || log.jumlahPerubahan > 0

? "bg-emerald-100 text-emerald-800 border border-emerald-300"

: log.tipe === "kurang" || log.jumlahPerubahan < 0

? "bg-rose-100 text-rose-800 border border-rose-300"

: "bg-blue-100 text-blue-800 border border-blue-300"

}`}

>

{log.jumlahPerubahan > 0 ? `+${log.jumlahPerubahan}` : log.jumlahPerubahan}{" "}

{product.satuanProduk || "Unit"}

</span>

<span className="font-bold text-slate-900 text-sm">

{log.catatan || (log.jumlahPerubahan > 0 ? `Penambahan stok (+${log.jumlahPerubahan})` : `Pengurangan stok (${log.jumlahPerubahan})`)}

</span>

</div>

<span className="text-[10px] text-slate-400 font-mono">

{new Date(log.tanggal).toLocaleDateString("id-ID", {

day: "numeric",

month: "short",

year: "numeric",

hour: "2-digit",

minute: "2-digit",

})}

</span>

</div>

<div className="text-[11px] text-slate-500 flex items-center gap-3 pt-0.5 border-t border-slate-100">

<span>

Perubahan: <strong className="text-slate-700">{log.stokSebelum}</strong> →{" "}

<strong className="text-slate-900">{log.stokSesudah}</strong>

</span>

<span>•</span>

<span>Oleh: <strong className="text-slate-700">{log.user || "Admin"}</strong></span>

</div>

</div>

))}

</div>

</div>

) : (

<div className="py-8 text-center bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">

<Boxes className="w-8 h-8 text-slate-300 mx-auto" />

<p className="text-slate-500 font-medium text-sm">

Belum ada catatan riwayat perubahan stok untuk produk ini.

</p>

</div>

)}

</div>

)}

</div>

</div>

</div>

</div>

</div>

</div>

</div>

{/* ── Modal Sesuaikan Stok (Log Produk) ── */}

{showStockModal && (

<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

<div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">

<div className="flex items-center justify-between pb-3 border-b border-slate-100">

<div className="flex items-center gap-2.5">

<div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

<Boxes className="w-5 h-5" />

</div>

<div>

<h3 className="text-sm font-black text-slate-900">Sesuaikan Stok Produk</h3>

<p className="text-sm text-slate-500">Catat penambahan atau pengurangan stok</p>

</div>

</div>

<button

type="button"

onClick={() => setShowStockModal(false)}

className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"

>

✕

</button>

</div>

<div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1">

<div className="text-slate-500">Produk:</div>

<div className="font-bold text-slate-900 line-clamp-1">{product.namaProduk}</div>

<div className="text-[11px] text-slate-600 pt-0.5">

Stok saat ini: <strong>{product.jumlahStok || 0} {product.satuanProduk || "Unit"}</strong>

</div>

</div>

<form onSubmit={handleQuickUpdateStock} className="space-y-4">

{/* Type Switcher */}

<div className="space-y-1.5">

<label className="text-sm font-bold text-slate-700 block">Jenis Penyesuaian:</label>

<div className="grid grid-cols-2 gap-2">

<button

type="button"

onClick={() => setStockActionType("tambah")}

className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${

stockActionType === "tambah"

? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"

: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"

}`}

>

<Plus className="w-3.5 h-3.5" />

<span>Tambah Stok (+)</span>

</button>

<button

type="button"

onClick={() => setStockActionType("kurang")}

className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${

stockActionType === "kurang"

? "bg-rose-600 text-white border-rose-600 shadow-2xs"

: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"

}`}

>

<Minus className="w-3.5 h-3.5" />

<span>Kurang Stok (-)</span>

</button>

</div>

</div>

{/* Amount Input */}

<div className="space-y-1.5">

<label className="text-sm font-bold text-slate-700 block">

Jumlah ({product.satuanProduk || "Unit"}):

</label>

<input

type="number"

min={1}

required

placeholder="Contoh: 10"

value={stockAmount}

onChange={(e) => setStockAmount(e.target.value)}

className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"

/>

</div>

{/* Note Input */}

<div className="space-y-1.5">

<label className="text-sm font-bold text-slate-700 block">

Catatan / Keterangan (Opsional):

</label>

<input

type="text"

placeholder="Contoh: Tambah stok batch minggu ini, pesanan instansi"

value={stockNote}

onChange={(e) => setStockNote(e.target.value)}

className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"

/>

</div>

{/* Summary calculation preview */}

{stockAmount && parseInt(stockAmount, 10) > 0 && (

<div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center justify-between font-bold text-blue-900">

<span>Estimasi Stok Baru:</span>

<span>

{stockActionType === "tambah"

? (product.jumlahStok || 0) + parseInt(stockAmount, 10)

: Math.max(0, (product.jumlahStok || 0) - parseInt(stockAmount, 10))}{" "}

{product.satuanProduk || "Unit"}

</span>

</div>

)}

<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">

<button

type="button"

onClick={() => setShowStockModal(false)}

disabled={updatingStock}

className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors cursor-pointer"

>

Batal

</button>

<button

type="submit"

disabled={updatingStock || !stockAmount}

className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"

>

{updatingStock ? (

<div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />

) : (

<Check className="w-3.5 h-3.5" />

)}

<span>Simpan Perubahan Stok</span>

</button>

</div>

</form>

</div>

</div>

)}

{/* ── Modal Fullscreen Image Viewer ── */}

{showFullscreenImage && (

<div

className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"

onClick={() => setShowFullscreenImage(false)}

>

{/* Top Bar */}

<div

className="flex items-center justify-between text-white z-10 w-full max-w-6xl mx-auto"

onClick={(e) => e.stopPropagation()}

>

<div className="space-y-0.5 min-w-0 pr-4">

<h3 className="text-sm font-bold truncate text-slate-100">

{product.namaProduk}

</h3>

{allImages.length > 1 && (

<p className="text-sm text-slate-400">

Gambar {activeImageIndex + 1} dari {allImages.length}

</p>

)}

</div>

<button

type="button"

onClick={() => setShowFullscreenImage(false)}

className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-bold shrink-0"

title="Tutup (Esc)"

>

<span>Tutup</span>

<X className="w-4 h-4" />

</button>

</div>

{/* Center Image with Prev / Next Buttons */}

<div

className="relative flex-1 flex items-center justify-center p-2 sm:p-4 max-w-6xl mx-auto w-full my-auto"

onClick={(e) => e.stopPropagation()}

>

{allImages.length > 1 && (

<button

type="button"

disabled={activeImageIndex === 0}

onClick={() => setActiveImageIndex((p) => Math.max(0, p - 1))}

className="absolute left-2 sm:left-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 transition-all cursor-pointer border border-white/10 shadow-lg"

title="Gambar Sebelumnya (Panah Kiri)"

>

<ChevronLeft className="w-5 h-5" />

</button>

)}

<div className="relative max-h-[75vh] max-w-[85vw] flex items-center justify-center">

<img

src={allImages[activeImageIndex] || allImages[0]}

alt={product.namaProduk}

className="max-h-[75vh] max-w-[85vw] w-auto h-auto object-contain rounded-xl shadow-2xl drop-shadow-2xl"

/>

                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">

                  <Maximize2 className="w-3 h-3" />

                  <span>Layar Penuh</span>

                </div>

</div>

{allImages.length > 1 && (

<button

type="button"

disabled={activeImageIndex === allImages.length - 1}

onClick={() => setActiveImageIndex((p) => Math.min(allImages.length - 1, p + 1))}

className="absolute right-2 sm:right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 transition-all cursor-pointer border border-white/10 shadow-lg"

title="Gambar Selanjutnya (Panah Kanan)"

>

<ChevronRight className="w-5 h-5" />

</button>

)}

</div>

{/* Bottom Thumbnails */}

{allImages.length > 1 && (

<div

className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-2xl mx-auto"

onClick={(e) => e.stopPropagation()}

>

{allImages.map((img, idx) => (

<button

key={idx}

type="button"

onClick={() => setActiveImageIndex(idx)}

className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${

activeImageIndex === idx

? "border-blue-500 scale-105 shadow-md"

: "border-white/20 opacity-60 hover:opacity-100"

}`}

>

<img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />

</button>

))}

</div>

)}

</div>

)}

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

<p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan</p>

</div>

</div>

<div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1">

<div className="text-slate-500">Nama Produk:</div>

<div className="font-bold text-slate-900 line-clamp-2">{product.namaProduk}</div>

{product.sku && (

<div className="text-[11px] text-slate-600 font-mono pt-0.5">

SKU: {product.sku}

</div>

)}

</div>

<p className="text-sm text-slate-600 leading-relaxed">

Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh spesifikasi teknis, riwayat draf, varian, dan harga akan dihapus secara permanen.

</p>

<div className="flex items-center justify-end gap-2.5 pt-2">

<button

type="button"

onClick={() => setShowDeleteModal(false)}

disabled={deleting}

className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors cursor-pointer"

>

Batal

</button>

<button

type="button"

onClick={handleDeleteProduct}

disabled={deleting}

className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"

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

