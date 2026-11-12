"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  Edit3,
  Trash2,
  AlertCircle,
  RotateCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  X,
  SlidersHorizontal,
  Globe,
  Archive,
  Loader2,
} from "lucide-react";
import {
  PRODUCT_SPEC_REGISTRY,
  hitungUmurProduk,
  formatTanggalIndo,
  StockLogItem,
} from "@/lib/katalog-specs";

interface ProductItem {
  _id: string;
  namaProduk: string;
  sku?: string;
  kategori: string;
  subKategori?: string;
  merek?: string;
  jenisProduk?: string;
  hargaProduk: number;
  persenPajak?: number;
  hargaSetelahPajak?: number;
  jumlahStok: number;
  satuanProduk?: string;
  statusPreOrder?: string;
  isPreOrder?: boolean;
  durasiPreOrder?: number;
  statusDraf?: boolean;
  fotoUtama?: string;
  tkdnBmp?: number;
  nilaiTkdn?: number;
  nilaiBmp?: number;
  namaPenyedia?: string;
  namaPic?: string;
  noHpPic?: string;
  lokasiPenyedia?: string;
  dikirimDari?: string;
  tanggalMasukKatalog?: string;
  riwayatStok?: StockLogItem[];
  createdAt?: string;
  updatedAt?: string;
}

export default function KelolaKatalogPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Filter & Search states
  const [statusTab, setStatusTab] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [minHarga, setMinHarga] = useState("");
  const [maxHarga, setMaxHarga] = useState("");
  const [minTkdn, setMinTkdn] = useState("");
  const [sortFilter, setSortFilter] = useState("terbaru");
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data states
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Action states
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<ProductItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Access check
  const isAllowed = user && (user.role === "SUPERADMIN" || user.role === "ADMIN");

  useEffect(() => {
    if (!sessionLoading && !isAllowed) {
      router.replace("/katalog-produk");
    }
  }, [user, sessionLoading, isAllowed, router]);

  // Show Toast Helper
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", statusTab);
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter !== "all") params.set("kategori", categoryFilter);
      if (brandFilter !== "all") params.set("merek", brandFilter);
      if (minHarga.trim()) params.set("minHarga", minHarga.trim());
      if (maxHarga.trim()) params.set("maxHarga", maxHarga.trim());
      if (minTkdn.trim()) params.set("minTkdn", minTkdn.trim());
      params.set("sort", sortFilter);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/katalog-produk?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil daftar produk");
      const data = await res.json();

      setProducts(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.availableBrands && Array.isArray(data.availableBrands)) {
        setAvailableBrands(data.availableBrands);
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, categoryFilter, brandFilter, minHarga, maxHarga, minTkdn, sortFilter, page, limit]);

  useEffect(() => {
    if (isAllowed) {
      fetchProducts();
    }
  }, [fetchProducts, isAllowed]);

  // Handle Toggle Status (Draf <-> Tersimpan)
  const handleToggleStatus = async (product: ProductItem) => {
    const nextStatusDraf = !product.statusDraf;
    const actionName = nextStatusDraf ? "dijadikan Draf" : "dipublikasikan ke Katalog";

    try {
      setActionLoadingId(product._id);
      const res = await fetch(`/api/katalog-produk/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusDraf: nextStatusDraf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Gagal mengubah status produk`);

      showToast("success", `Produk "${product.namaProduk}" berhasil ${actionName}!`);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || `Gagal memperbarui status`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteModalProduct) return;
    const id = deleteModalProduct._id;
    const name = deleteModalProduct.namaProduk;

    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/katalog-produk/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk");

      showToast("success", `Produk "${name}" berhasil dihapus dari sistem!`);
      setDeleteModalProduct(null);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Gagal menghapus produk");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setBrandFilter("all");
    setMinHarga("");
    setMaxHarga("");
    setMinTkdn("");
    setSortFilter("terbaru");
    setPage(1);
  };

  const activeFiltersCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (brandFilter !== "all" ? 1 : 0) +
    (minHarga.trim() ? 1 : 0) +
    (maxHarga.trim() ? 1 : 0) +
    (minTkdn.trim() ? 1 : 0);

  if (sessionLoading) {
    return (
      <div className="flex w-full min-h-[400px] items-center justify-center p-8 text-slate-500 font-medium">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Memuat halaman kelola katalog...</span>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-bold transition-all animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-50 border-emerald-700"
              : "bg-rose-900 text-rose-50 border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Breadcrumb & Page Header ── */}
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm font-medium text-gray-500">
            <li>
              <Link
                href="/katalog-produk"
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                Katalog Produk
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </li>
            <li aria-current="page">
              <span className="text-black font-extrabold">
                Kelola Produk & Draf
              </span>
            </li>
          </ol>
        </nav>

        {/* Header Judul Page */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black drop-shadow-sm uppercase">
                  MANAJEMEN KATALOG & DRAF PRODUK
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                  Katalog Admin
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                Kelola status publikasi, edit spesifikasi teknis, harga, stok, dan arsipkan draf produk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">

            <Link
              href="/katalog-produk/tambah"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-m font-bold rounded-xl shadow-sm transition-all duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Produk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Seluruh Produk
            </span>
            <div className="text-2xl font-black text-slate-900">{counts.all}</div>
            <p className="text-[11px] text-slate-500 font-medium">Semua item terdaftar</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Produk Tersimpan (Aktif)
            </span>
            <div className="text-2xl font-black text-emerald-700">{counts.published}</div>
            <p className="text-[11px] text-emerald-600 font-medium">Tampil di katalog publik</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Produk Draf
            </span>
            <div className="text-2xl font-black text-amber-700">{counts.draft}</div>
            <p className="text-[11px] text-amber-600 font-medium">Disimpan sementara (Draf)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Kategori Produk
            </span>
            <div className="text-2xl font-black text-blue-700">
              {PRODUCT_SPEC_REGISTRY.length}
            </div>
            <p className="text-[11px] text-blue-600 font-medium">Kategori spesifikasi aktif</p>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs & Controls ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setStatusTab("all");
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                statusTab === "all"
                  ? "bg-white text-slate-900 shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Semua Produk</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("published");
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                statusTab === "published"
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tersimpan (Aktif)</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusTab === "published"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {counts.published}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("draft");
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                statusTab === "draft"
                  ? "bg-amber-500 text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Draf</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusTab === "draft"
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {counts.draft}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchProducts}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 px-3 py-2 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-200"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Search & Select Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, merek, atau toko..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50/80 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl outline-none font-medium text-slate-800 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Kategori Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            >
              <option value="all">Semua Kategori</option>
              {PRODUCT_SPEC_REGISTRY.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Merek Filter */}
          <div className="sm:col-span-2">
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            >
              <option value="all">Semua Merk</option>
              {availableBrands.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Urutkan */}
          <div className="sm:col-span-2">
            <select
              value={sortFilter}
              onChange={(e) => {
                setSortFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 text-sm bg-slate-50/80 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="nama_asc">Nama (A - Z)</option>
              <option value="harga_desc">Harga Tertinggi</option>
              <option value="harga_asc">Harga Terendah</option>
              <option value="tkdn_desc">TKDN Tertinggi</option>
            </select>
          </div>

          {/* Toggle Filter Lanjutan */}
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => setShowAdvancedFilter((prev) => !prev)}
              className={`w-full h-full min-h-[42px] px-2.5 py-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                showAdvancedFilter || activeFiltersCount > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700 shadow-xs"
                  : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Filter Lanjutan (Harga & TKDN)"
            >
              <Filter className="w-3.5 h-3.5" />
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-extrabold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filter Lanjutan (Harga & TKDN) ── */}
        {(showAdvancedFilter || minHarga || maxHarga || minTkdn) && (
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                Filter Tambahan (Harga & TKDN)
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Min Harga */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Harga Minimum (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 500000"
                    value={minHarga}
                    onChange={(e) => {
                      setMinHarga(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Max Harga */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Harga Maksimum (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 15000000"
                    value={maxHarga}
                    onChange={(e) => {
                      setMaxHarga(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Min TKDN */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Minimal TKDN + BMP (%)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Contoh: 25"
                    value={minTkdn}
                    onChange={(e) => {
                      setMinTkdn(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all pr-8"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Quick Price Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Pilihan Cepat Harga:</span>
              <button
                type="button"
                onClick={() => {
                  setMinHarga("");
                  setMaxHarga("1000000");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  maxHarga === "1000000" && !minHarga
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                &lt; 1 Juta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMinHarga("1000000");
                  setMaxHarga("5000000");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  minHarga === "1000000" && maxHarga === "5000000"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                1 Juta – 5 Juta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMinHarga("5000000");
                  setMaxHarga("20000000");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  minHarga === "5000000" && maxHarga === "20000000"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                5 Juta – 20 Juta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMinHarga("20000000");
                  setMaxHarga("");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  minHarga === "20000000" && !maxHarga
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                &gt; 20 Juta
              </button>
            </div>
          </div>
        )}

        {/* ── Active Filter Badges ── */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Filter Aktif ({activeFiltersCount}):
            </span>

            {categoryFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>Kategori: {categoryFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setPage(1);
                  }}
                  className="hover:text-blue-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {brandFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>Merk: {brandFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBrandFilter("all");
                    setPage(1);
                  }}
                  className="hover:text-blue-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(minHarga || maxHarga) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <span>
                  Harga: {minHarga ? `≥ ${formatRupiah(Number(minHarga))}` : ""}
                  {minHarga && maxHarga ? " - " : ""}
                  {maxHarga ? `≤ ${formatRupiah(Number(maxHarga))}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinHarga("");
                    setMaxHarga("");
                    setPage(1);
                  }}
                  className="hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {minTkdn && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <span>TKDN ≥ {minTkdn}%</span>
                <button
                  type="button"
                  onClick={() => {
                    setMinTkdn("");
                    setPage(1);
                  }}
                  className="hover:text-purple-900 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 underline ml-2 cursor-pointer"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-sm">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 min-w-[280px]">Produk & SKU</th>
                <th className="py-3.5 px-4 min-w-[120px]">Status</th>
                <th className="py-3.5 px-4 min-w-[150px]">Harga Satuan</th>
                <th className="py-3.5 px-4 min-w-[110px]">Stok</th>
                <th className="py-3.5 px-4 min-w-[100px]">TKDN</th>
                <th className="py-3.5 px-4 min-w-[170px]">Penyedia & Asal</th>
                <th className="py-3.5 px-4 min-w-[160px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-semibold text-sm text-slate-500">
                        Memuat data produk...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Package className="w-7 h-7 text-slate-400 stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">Tidak Ada Produk</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {search
                          ? `Tidak ada produk yang cocok dengan kata kunci "${search}".`
                          : activeFiltersCount > 0
                          ? "Tidak ada produk yang cocok dengan kombinasi filter yang dipilih."
                          : statusTab === "draft"
                          ? "Belum ada produk yang disimpan sebagai draf."
                          : "Belum ada produk yang terdaftar dalam katalog."}
                      </p>
                      {activeFiltersCount > 0 ? (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reset Semua Filter</span>
                        </button>
                      ) : (
                        <Link
                          href="/katalog-produk/tambah"
                          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Produk Baru</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((item, index) => {
                  const isDraft = Boolean(item.statusDraf);
                  const isLoadingAction = actionLoadingId === item._id;

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isDraft ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                        {(page - 1) * limit + index + 1}
                      </td>

                      {/* Product Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.fotoUtama ? (
                              <img
                                src={item.fotoUtama}
                                alt={item.namaProduk}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-1 max-w-md">
                            <Link
                              href={`/katalog-produk/${item._id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1 transition-colors text-sm"
                              title={item.namaProduk}
                            >
                              {item.namaProduk}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-sm font-semibold border border-slate-200">
                                {item.sku || "TANPA-SKU"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600 font-medium">
                                {item.kategori}
                                {item.subKategori ? ` > ${item.subKategori}` : ""}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span
                                className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold border border-blue-200"
                                title={`Masuk sejak ${formatTanggalIndo(item.tanggalMasukKatalog || item.createdAt)}`}
                              >
                                Umur: {hitungUmurProduk(item.tanggalMasukKatalog || item.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status (Draf vs Tersimpan) */}
                      <td className="py-3.5 px-4">
                        {isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Draf</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Tersimpan</span>
                          </span>
                        )}
                      </td>

                      {/* Harga */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">
                          {formatRupiah(item.hargaProduk)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.persenPajak && item.persenPajak > 0
                            ? `PPN ${item.persenPajak}%`
                            : "Bebas PPN"}
                        </div>
                      </td>

                      {/* Stok */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {item.jumlahStok?.toLocaleString("id-ID") || 0}{" "}
                          <span className="text-[10px] font-medium text-slate-500">
                            {item.satuanProduk || "Unit"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.isPreOrder ? "Pre-Order" : "Ready Stock"}
                        </div>
                      </td>

                      {/* TKDN */}
                      <td className="py-3.5 px-4">
                        {item.tkdnBmp || item.nilaiTkdn ? (
                          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-sm">
                            {item.tkdnBmp || item.nilaiTkdn}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Penyedia & Asal */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {item.namaPenyedia || "MabelHub Store"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {item.dikirimDari || item.lokasiPenyedia || "—"}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lihat Detail */}
                          <Link
                            href={`/katalog-produk/${item._id}`}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Lihat Rincian Publik"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Toggle Publish / Draft */}
                          <button
                            type="button"
                            disabled={isLoadingAction}
                            onClick={() => handleToggleStatus(item)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
                              isDraft
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-amber-700 hover:bg-amber-50"
                            }`}
                            title={
                              isDraft
                                ? "Publikasikan"
                                : "Jadikan Draf"
                            }
                          >
                            {isLoadingAction ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isDraft ? (
                              <Globe className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/katalog-produk/tambah?id=${item._id}`}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalProduct(item)}
                            className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
            {/* Left: Info & Per-page selector */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan{" "}
                <strong className="text-slate-700">{Math.min((page - 1) * limit + 1, totalItems)}</strong>
                {" – "}
                <strong className="text-slate-700">{Math.min(page * limit, totalItems)}</strong>{" "}
                dari <strong className="text-slate-700">{totalItems}</strong> produk
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Tampilkan</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold outline-none cursor-pointer focus:border-blue-500 transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>per halaman</span>
              </div>
            </div>

            {/* Right: Page navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Numbered page buttons */}
                {(() => {
                  const pages: (number | "...")[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push("...");
                    const start = Math.max(2, page - 1);
                    const end = Math.min(totalPages - 1, page + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (page < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-slate-400 select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          page === p
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Konfirmasi Hapus Produk</h3>
                <p className="text-xs text-slate-500 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
              <button
                onClick={() => setDeleteModalProduct(null)}
                className="ml-auto p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-sm space-y-1.5">
                <div className="text-slate-500 font-medium">Nama Produk:</div>
                <div className="font-bold text-slate-900 line-clamp-2">
                  {deleteModalProduct.namaProduk}
                </div>
                {deleteModalProduct.sku && (
                  <div className="text-[11px] text-slate-600 font-mono pt-1">
                    SKU: {deleteModalProduct.sku}
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh data spesifikasi teknis,
                varian, dan harga akan dihapus secara permanen.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoadingId === deleteModalProduct._id}
                onClick={handleDeleteProduct}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <span>Hapus Produk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
