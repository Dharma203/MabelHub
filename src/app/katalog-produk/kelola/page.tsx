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
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Layers,
  Store,
  Tag,
  Check,
  X,
  FileText,
  SlidersHorizontal,
  Globe,
  Archive,
} from "lucide-react";
import { PRODUCT_SPEC_REGISTRY } from "@/lib/katalog-specs";

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
  lokasiPenyedia?: string;
  dikirimDari?: string;
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
  const [sortFilter, setSortFilter] = useState("terbaru");
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
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, categoryFilter, sortFilter, page, limit]);

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

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-800 pb-24">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-50 border-emerald-700"
              : "bg-red-900 text-red-50 border-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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

      {/* ── Top Header Navigation ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link
                href="/katalog-produk"
                className="hover:text-red-600 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Katalog Produk</span>
              </Link>
              <span>/</span>
              <span className="font-bold text-slate-800">Kelola Produk & Draf</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Manajemen Katalog & Draf Produk
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/katalog-produk"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Lihat Katalog Publik</span>
            </Link>

            <Link
              href="/katalog-produk/tambah"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Produk Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── Stat Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Seluruh Produk
              </span>
              <div className="text-2xl font-black text-slate-900">{counts.all}</div>
              <p className="text-[11px] text-slate-500">Semua item terdaftar</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Produk Tersimpan (Aktif)
              </span>
              <div className="text-2xl font-black text-emerald-700">{counts.published}</div>
              <p className="text-[11px] text-emerald-600">Tampil di katalog publik</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Produk Draf
              </span>
              <div className="text-2xl font-black text-amber-700">{counts.draft}</div>
              <p className="text-[11px] text-amber-600">Disimpan sementara (Draf)</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Kategori Produk
              </span>
              <div className="text-2xl font-black text-slate-900">
                {PRODUCT_SPEC_REGISTRY.length}
              </div>
              <p className="text-[11px] text-slate-500">Kategori spesifikasi aktif</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── Filter Tabs & Controls ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setStatusTab("all");
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  statusTab === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
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
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  statusTab === "published"
                    ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
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
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  statusTab === "draft"
                    ? "bg-amber-500 text-white shadow-2xs font-extrabold"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Search & Select Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama produk, SKU, merek, atau toko..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none font-medium text-slate-800 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                {PRODUCT_SPEC_REGISTRY.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={sortFilter}
                onChange={(e) => {
                  setSortFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="terbaru">Terbaru Ditambahkan</option>
                <option value="terlama">Terlama Ditambahkan</option>
                <option value="nama_asc">Nama Produk (A - Z)</option>
                <option value="harga_desc">Harga Tertinggi</option>
                <option value="harga_asc">Harga Terendah</option>
                <option value="tkdn_desc">TKDN Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[280px]">Produk & SKU</th>
                  <th className="py-3 px-4 min-w-[120px]">Status</th>
                  <th className="py-3 px-4 min-w-[150px]">Harga Satuan</th>
                  <th className="py-3 px-4 min-w-[110px]">Stok</th>
                  <th className="py-3 px-4 min-w-[100px]">TKDN</th>
                  <th className="py-3 px-4 min-w-[170px]">Penyedia & Asal</th>
                  <th className="py-3 px-4 min-w-[160px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                        <span className="font-semibold text-xs text-slate-500">
                          Memuat data produk...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Package className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                        <h4 className="text-sm font-bold text-slate-700">Tidak Ada Produk</h4>
                        <p className="text-xs text-slate-400">
                          {search
                            ? `Tidak ada produk yang cocok dengan kata kunci "${search}".`
                            : statusTab === "draft"
                            ? "Belum ada produk yang disimpan sebagai draf."
                            : "Belum ada produk yang terdaftar dalam katalog."}
                        </p>
                        <Link
                          href="/katalog-produk/tambah"
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Produk Baru</span>
                        </Link>
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
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isDraft ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* No */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {(page - 1) * limit + index + 1}
                        </td>

                        {/* Product Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
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
                                className="font-bold text-slate-900 hover:text-red-600 line-clamp-1 transition-colors text-xs"
                                title={item.namaProduk}
                              >
                                {item.namaProduk}
                              </Link>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                  {item.sku || "TANPA-SKU"}
                                </span>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">
                                  {item.kategori}
                                  {item.subKategori ? ` > ${item.subKategori}` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status (Draf vs Tersimpan) */}
                        <td className="py-3.5 px-4">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Draf</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-2xs">
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
                          <div className="text-[10px] text-slate-400">
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
                          <div className="text-[10px] text-slate-400">
                            {item.isPreOrder ? "Pre-Order" : "Ready Stock"}
                          </div>
                        </td>

                        {/* TKDN */}
                        <td className="py-3.5 px-4">
                          {item.tkdnBmp || item.nilaiTkdn ? (
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.tkdnBmp || item.nilaiTkdn}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>

                        {/* Penyedia & Asal */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                            {item.namaPenyedia || "MabelHub Store"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {item.dikirimDari || item.lokasiPenyedia || "-"}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Lihat Detail */}
                            <Link
                              href={`/katalog-produk/${item._id}`}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Rincian Publik"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Toggle Publish / Draft */}
                            <button
                              type="button"
                              disabled={isLoadingAction}
                              onClick={() => handleToggleStatus(item)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                                isDraft
                                  ? "text-emerald-700 hover:bg-emerald-50"
                                  : "text-amber-700 hover:bg-amber-50"
                              }`}
                              title={
                                isDraft
                                  ? "Publikasikan (Ubah ke Tersimpan)"
                                  : "Jadikan Draf (Tarik dari Katalog)"
                              }
                            >
                              {isLoadingAction ? (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                              ) : isDraft ? (
                                <Globe className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </button>

                            {/* Edit */}
                            <Link
                              href={`/katalog-produk/tambah?id=${item._id}`}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Sunting Produk"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => setDeleteModalProduct(item)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
          {(totalItems > 0) && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              {/* Left: Info & Per-page selector */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-slate-500">
                  Menampilkan{" "}
                  <strong>{Math.min((page - 1) * limit + 1, totalItems)}</strong>
                  –
                  <strong>{Math.min(page * limit, totalItems)}</strong>{" "}
                  dari <strong>{totalItems}</strong> produk
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Tampilkan</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold outline-none cursor-pointer"
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
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
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
                              ? "bg-[#1D80D9] text-white border-[#1D80D9] shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
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
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteModalProduct && (
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

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div className="text-slate-500">Nama Produk:</div>
              <div className="font-bold text-slate-900 line-clamp-2">
                {deleteModalProduct.namaProduk}
              </div>
              {deleteModalProduct.sku && (
                <div className="text-[11px] text-slate-600 font-mono pt-1">
                  SKU: {deleteModalProduct.sku}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus produk ini dari katalog? Seluruh data spesifikasi teknis,
              varian, dan harga akan dihapus secara permanen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoadingId === deleteModalProduct._id}
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoadingId === deleteModalProduct._id ? (
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
