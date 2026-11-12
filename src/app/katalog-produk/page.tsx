"use client";

import { useEffect, useState, useTransition, useCallback, Suspense } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/SessionProvider";

import {

  Search,

  Filter,

  Plus,

  ArrowLeft,

  ChevronDown,

  ChevronRight,

  ChevronLeft,

  X,

  Building2,

  CheckCircle2,

  Tag,

  ShieldCheck,

  Package,

  Layers,

  RotateCcw,

  SlidersHorizontal,

} from "lucide-react";

import { PRODUCT_SPEC_REGISTRY } from "@/lib/katalog-specs";

interface Product {

  _id: string;

  namaProduk: string;

  kategori: string;

  merek?: string;

  jenisProduk: string;

  statusPreOrder?: string;

  isPreOrder?: boolean;

  hargaProduk: number;

  hargaSetelahPajak?: number;

  tkdnBmp?: number;

  jenisLabel?: string;

  jenisPenyedia?: string;

  namaPenyedia?: string;

  lokasiPenyedia?: string;

  jumlahStok?: number;

  satuanProduk?: string;

  terjual?: number;

  fotoUtama?: string;

  kodeKbki?: string;

  sku?: string;

}

function KatalogProdukContent() {

  const router = useRouter();

  const { user } = useSession();

  const canAddProduct = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  // State

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);



  const [limit, setLimit] = useState<number>(15);


  // Filters

  const [search, setSearch] = useState("");

  const [kategori, setKategori] = useState("");

  const [merek, setMerek] = useState("");

  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  const [jenisProduk, setJenisProduk] = useState<string[]>([]);

  const [minTkdn, setMinTkdn] = useState("");

  const [labelProduk, setLabelProduk] = useState<string[]>([]);

  const [jenisPenyedia, setJenisPenyedia] = useState<string[]>([]);

  const [lokasi, setLokasi] = useState<string[]>([]);

  const [minHarga, setMinHarga] = useState("");

  const [maxHarga, setMaxHarga] = useState("");

  const [sort, setSort] = useState("paling_sesuai");

  // UI Toggles

  const [showMoreLokasi, setShowMoreLokasi] = useState(false);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lokasi options

  const LOCATIONS = [

    "DKI Jakarta",

    "Jabodetabek",

    "Bandung",

    "Jogjakarta",

    "Bantul",

    "Semarang",

    "Surabaya",

    "Malang",

    "Tulungagung",

    "Depok",

    "Tangerang",

    "Aceh",

  ];

  const fetchProducts = useCallback(async () => {

    try {

      setLoading(true);

      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());

      if (kategori && kategori !== "all") params.set("kategori", kategori);

      if (merek && merek !== "all") params.set("merek", merek);

      if (jenisProduk.length === 1) params.set("jenisProduk", jenisProduk[0]);

      if (labelProduk.length === 1) params.set("labelProduk", labelProduk[0]);

      if (jenisPenyedia.length === 1) params.set("jenisPenyedia", jenisPenyedia[0]);

      if (lokasi.length === 1) params.set("lokasi", lokasi[0]);

      if (minTkdn) params.set("minTkdn", minTkdn);

      if (minHarga) params.set("minHarga", minHarga);

      if (maxHarga) params.set("maxHarga", maxHarga);

      if (sort) params.set("sort", sort);

      params.set("page", currentPage.toString());

      params.set("limit", limit.toString());

      const res = await fetch(`/api/katalog-produk?${params.toString()}`);

      if (!res.ok) throw new Error("Gagal mengambil data");

      const data = await res.json();

      setProducts(data.items || []);

      setTotal(data.total || 0);

      setTotalPages(data.totalPages || 1);

      if (data.availableBrands && Array.isArray(data.availableBrands)) {

        setAvailableBrands(data.availableBrands);

      }

    } catch (err) {

      console.error("Fetch products error:", err);

    } finally {

      setLoading(false);

    }

  }, [

    search,

    kategori,

    merek,

    jenisProduk,

    labelProduk,

    jenisPenyedia,

    lokasi,

    minTkdn,

    minHarga,

    maxHarga,

    sort,

    currentPage,
    limit,

  ]);

  useEffect(() => {

    fetchProducts();

  }, [fetchProducts]);

  const toggleArrayItem = (

    item: string,

    state: string[],

    setter: React.Dispatch<React.SetStateAction<string[]>>

  ) => {

    setter((prev) =>

      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]

    );

    setCurrentPage(1);

  };

  const handleResetFilters = () => {

    setSearch("");

    setKategori("");

    setMerek("");

    setJenisProduk([]);

    setMinTkdn("");

    setLabelProduk([]);

    setJenisPenyedia([]);

    setLokasi([]);

    setMinHarga("");

    setMaxHarga("");

    setSort("paling_sesuai");

    setCurrentPage(1);

  };

  const formatRupiah = (val: number) => {

    return new Intl.NumberFormat("id-ID", {

      style: "currency",

      currency: "IDR",

      maximumFractionDigits: 0,

    }).format(val);

  };

  return (

    <div className="min-h-screen bg-blue-50 text-slate-800 pb-16">

      <div className="flex">

        <div className="flex-1 min-w-0 p-4 sm:p-6">

          <div className="max-w-[1520px] mx-auto">

            {/* HEADER */}

            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="ml-2 sm:ml-4 px-2 sm:px-4 pt-2 pb-2 space-y-1">

                <h2 className="text-3xl font-extrabold text-black drop-shadow-sm uppercase">

                  KATALOG PRODUK

                </h2>

                <p className="text-sm text-neutral-600">

                  Daftar dan Pengelolaan Informasi Katalog Produk & Komoditas

                </p>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="relative w-full md:w-80">

                  <input

                    value={search}

                    onChange={(e) => {

                      setSearch(e.target.value);

                      setCurrentPage(1);

                    }}

                    placeholder="Search..."

                    className="h-11 w-full rounded-full bg-white px-5 pr-11 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black/20 shadow-xs"

                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">

                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">

                      <path

                        d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"

                        stroke="currentColor"

                        strokeWidth="2"

                      />

                      <path

                        d="M16.5 16.5 21 21"

                        stroke="currentColor"

                        strokeWidth="2"

                        strokeLinecap="round"

                      />

                    </svg>

                  </span>

                </div>

                <button

                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}

                  className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"

                >

                  <Filter className="w-4 h-4" />

                  Filter

                </button>

                {canAddProduct && (

                  <div className="flex items-center gap-2">

                    <Link

                      href="/katalog-produk/kelola"

                      className="inline-flex items-center gap-1.5 h-11 px-4 bg-gray-600 hover:bg-slate-900 active:bg-slate-950 text-white text-m font-bold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"

                    >

                      <SlidersHorizontal className="w-3.5 h-3.5" />

                      <span>Kelola Katalog</span>

                    </Link>

                    <Link

                      href="/katalog-produk/tambah"

                      className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-m font-bold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"

                    >

                      <Plus className="w-4 h-4 stroke-[2.5]" />

                      <span>Tambah Produk</span>

                    </Link>

                  </div>

                )}

              </div>

            </div>

            {/* Main Content Layout */}

            <div className="flex gap-6 items-start">

          {/* ── Left Sidebar Filter ── */}

          <aside

            className={`

              fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white lg:bg-transparent p-5 lg:p-0 

              border-r lg:border-r-0 border-slate-200 shadow-xl lg:shadow-none overflow-y-auto lg:overflow-visible

              transition-transform duration-200 ease-in-out shrink-0

              ${mobileFilterOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}

            `}

          >

            <div className="flex items-center justify-between lg:hidden mb-4 pb-2 border-b border-slate-200">

              <h2 className="font-bold text-slate-800 text-base">Filter Produk</h2>

              <button

                onClick={() => setMobileFilterOpen(false)}

                className="p-1 text-slate-500 hover:text-slate-800 rounded-md"

              >

                <X className="w-5 h-5" />

              </button>

            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-5">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">

                  <Filter className="w-4 h-4 text-slate-500" /> Filter

                </span>

                <button

                  onClick={handleResetFilters}

                  className="text-sm text-red-600 hover:text-red-700 font-semibold cursor-pointer"

                >

                  Reset

                </button>

              </div>

              {/* Cari Produk dalam Koleksi */}

              <div className="space-y-1.5">

                <label className="text-sm font-bold text-slate-700">

                  Cari Produk dalam Koleksi

                </label>

                <div className="relative">

                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />

                  <input

                    type="text"

                    placeholder="Cari di sini..."

                    value={search}

                    onChange={(e) => {

                      setSearch(e.target.value);

                      setCurrentPage(1);

                    }}

                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-red-500 rounded-lg outline-none transition-all placeholder:text-slate-400"

                  />

                </div>

              </div>



              {/* Kategori Produk */}

              <div className="pt-2 border-t border-slate-100 space-y-1.5">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-bold text-slate-700 block">Kategori</span>

                  {kategori && (

                    <button

                      type="button"

                      onClick={() => {

                        setKategori("");

                        setCurrentPage(1);

                      }}

                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"

                    >

                      Reset

                    </button>

                  )}

                </div>

                <select

                  value={kategori}

                  onChange={(e) => {

                    setKategori(e.target.value);

                    setCurrentPage(1);

                  }}

                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg outline-none font-medium text-slate-700 cursor-pointer"

                >

                  <option value="">Semua Kategori</option>

                  {PRODUCT_SPEC_REGISTRY.map((cat) => (

                    <option key={cat.id} value={cat.name}>

                      {cat.name}

                    </option>

                  ))}

                </select>

              </div>



              {/* Merek / Brand */}

              <div className="pt-2 border-t border-slate-100 space-y-1.5">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-bold text-slate-700 block">Merk / Brand</span>

                  {merek && (

                    <button

                      type="button"

                      onClick={() => {

                        setMerek("");

                        setCurrentPage(1);

                      }}

                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"

                    >

                      Reset

                    </button>

                  )}

                </div>

                <select

                  value={merek}

                  onChange={(e) => {

                    setMerek(e.target.value);

                    setCurrentPage(1);

                  }}

                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg outline-none font-medium text-slate-700 cursor-pointer"

                >

                  <option value="">Semua Merk</option>

                  {availableBrands.map((b) => (

                    <option key={b} value={b}>

                      {b}

                    </option>

                  ))}

                </select>

              </div>

              {/* Jenis Produk */}

              <div className="pt-2 border-t border-slate-100 space-y-2">

                <span className="text-sm font-bold text-slate-700 block">Jenis Produk</span>

                {["Barang", "Jasa", "Produk Digital"].map((item) => (

                  <label

                    key={item}

                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"

                  >

                    <input

                      type="checkbox"

                      checked={jenisProduk.includes(item)}

                      onChange={() => toggleArrayItem(item, jenisProduk, setJenisProduk)}

                      className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"

                    />

                    <span>{item}</span>

                  </label>

                ))}

              </div>

              {/* TKDN + BMP */}

              <div className="pt-2 border-t border-slate-100 space-y-1.5">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-bold text-slate-700">TKDN + BMP</span>

                  <span className="text-[10px] text-slate-400">Minimum (%)</span>

                </div>

                <input

                  type="number"

                  placeholder="Contoh: 20"

                  value={minTkdn}

                  onChange={(e) => {

                    setMinTkdn(e.target.value);

                    setCurrentPage(1);

                  }}

                  className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 focus:border-red-500 rounded-lg outline-none transition-all"

                />

              </div>

              {/* Label Produk */}

              <div className="pt-2 border-t border-slate-100 space-y-2">

                <span className="text-sm font-bold text-slate-700 block">Label Produk</span>

                {[

                  { id: "PDN", label: "PDN" },

                  { id: "Import", label: "Import" },

                  { id: "Verified", label: "Verified" },

                  { id: "Inovasi", label: "Inovasi" },

                ].map((item) => (

                  <label

                    key={item.id}

                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"

                  >

                    <input

                      type="checkbox"

                      checked={labelProduk.includes(item.id)}

                      onChange={() => toggleArrayItem(item.id, labelProduk, setLabelProduk)}

                      className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"

                    />

                    <span>{item.label}</span>

                  </label>

                ))}

              </div>

              {/* Jenis Penyedia */}

              <div className="pt-2 border-t border-slate-100 space-y-2">

                <span className="text-sm font-bold text-slate-700 block">Jenis Penyedia</span>

                {["UMKK", "Non UMKK", "Official Vendor"].map((item) => (

                  <label

                    key={item}

                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"

                  >

                    <input

                      type="checkbox"

                      checked={jenisPenyedia.includes(item)}

                      onChange={() => toggleArrayItem(item, jenisPenyedia, setJenisPenyedia)}

                      className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"

                    />

                    <span>{item}</span>

                  </label>

                ))}

              </div>

              {/* Lokasi Pengiriman */}

              <div className="pt-2 border-t border-slate-100 space-y-2">

                <span className="text-sm font-bold text-slate-700 block">Lokasi Pengiriman</span>

                {(showMoreLokasi ? LOCATIONS : LOCATIONS.slice(0, 5)).map((item) => (

                  <label

                    key={item}

                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer select-none"

                  >

                    <input

                      type="checkbox"

                      checked={lokasi.includes(item)}

                      onChange={() => toggleArrayItem(item, lokasi, setLokasi)}

                      className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"

                    />

                    <span>{item}</span>

                  </label>

                ))}

                <button

                  type="button"

                  onClick={() => setShowMoreLokasi(!showMoreLokasi)}

                  className="text-m text-red-600 hover:text-red-700 font-semibold cursor-pointer block pt-1"

                >

                  {showMoreLokasi ? "Tampilkan Lebih Sedikit" : "Lihat Selengkapnya"}

                </button>

              </div>

              {/* Harga */}

              <div className="pt-1.5 border-t border-slate-100 space-y-1">

                <span className="text-sm font-bold text-slate-700 block">Harga</span>

                <div className="space-y-1.5">

                  <div className="flex items-center gap-2">

                    <span className="text-[10px] text-slate-400 w-12">Terendah:</span>

                    <input

                      type="number"

                      placeholder="Contoh: 100.000"

                      value={minHarga}

                      onChange={(e) => {

                        setMinHarga(e.target.value);

                        setCurrentPage(1);

                      }}

                      className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-md outline-none"

                    />

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="text-[10px] text-slate-400 w-12">Tertinggi:</span>

                    <input

                      type="number"

                      placeholder="Contoh: 500.000"

                      value={maxHarga}

                      onChange={(e) => {

                        setMaxHarga(e.target.value);

                        setCurrentPage(1);

                      }}

                      className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 focus:border-red-500 rounded-md outline-none"

                    />

                  </div>

                  {/* Pilihan Cepat Rentang Harga */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMinHarga("");
                        setMaxHarga("1000000");
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                        maxHarga === "1000000" && !minHarga
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      &lt; 1 Jt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinHarga("1000000");
                        setMaxHarga("5000000");
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                        minHarga === "1000000" && maxHarga === "5000000"
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      1 - 5 Jt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinHarga("5000000");
                        setMaxHarga("20000000");
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                        minHarga === "5000000" && maxHarga === "20000000"
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      5 - 20 Jt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinHarga("20000000");
                        setMaxHarga("");
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                        minHarga === "20000000" && !maxHarga
                          ? "bg-blue-600 text-white border-blue-600 font-bold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      &gt; 20 Jt
                    </button>
                  </div>

                </div>

              </div>

            </div>

          </aside>

          {/* Mobile backdrop */}

          {mobileFilterOpen && (

            <div

              onClick={() => setMobileFilterOpen(false)}

              className="fixed inset-0 bg-black/40 z-30 lg:hidden"

            />

          )}

          {/* ── Right Product Grid Area ── */}

          <main className="flex-1 min-w-0">

            {/* Filter tags & Sorting Top Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-3">
              {/* Sisi Kiri: Rangkuman Jumlah Produk & Filter Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  Menampilkan{" "}
                  <strong className="text-slate-800">
                    {total > 0 ? Math.min((currentPage - 1) * limit + 1, total) : 0}
                    {total > 1 ? `–${Math.min(currentPage * limit, total)}` : ""}
                  </strong>{" "}
                  produk dari total <strong className="text-slate-800">{total}</strong>
                </span>

                {/* Filter tags */}
                <div className="flex flex-wrap items-center gap-1.5 ml-1">
                  {kategori && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                      Kategori: {kategori}
                      <button
                        onClick={() => {
                          setKategori("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-blue-900 cursor-pointer"
                        title="Hapus filter kategori"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {merek && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60">
                      Merk: {merek}
                      <button
                        onClick={() => {
                          setMerek("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-blue-900 cursor-pointer"
                        title="Hapus filter merk"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(minHarga || maxHarga) && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-200/60">
                      Harga: {minHarga ? `≥ ${formatRupiah(Number(minHarga))}` : ""}
                      {minHarga && maxHarga ? " - " : ""}
                      {maxHarga ? `≤ ${formatRupiah(Number(maxHarga))}` : ""}
                      <button
                        onClick={() => {
                          setMinHarga("");
                          setMaxHarga("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-emerald-900 cursor-pointer"
                        title="Hapus filter harga"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {minTkdn && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold border border-purple-200/60">
                      TKDN ≥ {minTkdn}%
                      <button
                        onClick={() => {
                          setMinTkdn("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-purple-900 cursor-pointer"
                        title="Hapus filter TKDN"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {labelProduk.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-semibold border border-red-200/60"
                    >
                      {l}
                      <button
                        onClick={() => toggleArrayItem(l, labelProduk, setLabelProduk)}
                        className="hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {jenisPenyedia.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200/60"
                    >
                      {p}
                      <button
                        onClick={() => toggleArrayItem(p, jenisPenyedia, setJenisPenyedia)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {jenisProduk.map((j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200"
                    >
                      {j}
                      <button
                        onClick={() => toggleArrayItem(j, jenisProduk, setJenisProduk)}
                        className="hover:text-slate-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {lokasi.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60"
                    >
                      {loc}
                      <button
                        onClick={() => toggleArrayItem(loc, lokasi, setLokasi)}
                        className="hover:text-amber-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(kategori || merek || minHarga || maxHarga || minTkdn || labelProduk.length > 0 || jenisPenyedia.length > 0 || jenisProduk.length > 0 || lokasi.length > 0) && (
                    <button
                      onClick={handleResetFilters}
                      className="text-[11px] text-red-600 hover:text-red-700 font-bold ml-1 cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Sisi Kanan: Pagination (Limit & Navigasi Halaman) & Urutkan */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 ml-auto">
                {/* Selector Limit Per Halaman */}
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <span className="hidden md:inline">Tampilkan:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value={10}>10 / hal</option>
                    <option value={15}>15 / hal</option>
                    <option value={20}>20 / hal</option>
                    <option value={30}>30 / hal</option>
                    <option value={50}>50 / hal</option>
                  </select>
                </div>

                {/* Navigasi Pagination Halaman di Top Bar */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-0.5 px-1.5 text-xs">
                      <span className="font-bold text-slate-800">{currentPage}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-600 font-medium">{totalPages}</span>
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-2xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Sorting dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium text-xs sm:text-sm">Urutkan:</span>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="paling_sesuai">Paling Sesuai</option>
                    <option value="harga_asc">Harga Terendah</option>
                    <option value="harga_desc">Harga Tertinggi</option>
                    <option value="terbaru">Terbaru</option>
                    <option value="tkdn_desc">TKDN Tertinggi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}

            {loading ? (

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">

                {Array.from({ length: 10 }).map((_, i) => (

                  <div

                    key={i}

                    className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 animate-pulse"

                  >

                    <div className="aspect-square bg-slate-100 rounded-lg" />

                    <div className="h-3 bg-slate-100 rounded w-3/4" />

                    <div className="h-3 bg-slate-100 rounded w-1/2" />

                    <div className="h-4 bg-slate-100 rounded w-2/3" />

                  </div>

                ))}

              </div>

            ) : products.length === 0 ? (

              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">

                <Package className="w-12 h-12 text-slate-300 mx-auto" />

                <h3 className="font-bold text-slate-800 text-sm">Produk tidak ditemukan</h3>

                <p className="text-xs text-slate-500 max-w-sm mx-auto">

                  {total === 0 && !search

                    ? "Belum ada produk yang ditambahkan ke dalam katalog."

                    : "Coba ubah kata kunci pencarian atau sesuaikan filter untuk melihat produk lainnya."}

                </p>

                <div className="flex items-center justify-center gap-2 pt-2">

                  <button

                    onClick={handleResetFilters}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"

                  >

                    <RotateCcw className="w-3.5 h-3.5" />

                    Reset Filter

                  </button>

                  {canAddProduct && (

                    <Link

                      href="/katalog-produk/tambah"

                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#d32f2f] hover:bg-[#b71c1c] rounded-lg transition-colors cursor-pointer shadow-xs"

                    >

                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />

                      Tambah Produk Baru

                    </Link>

                  )}

                </div>

              </div>

            ) : (

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">

                {products.map((item) => (

                  <div

                    key={item._id}

                    onClick={() => router.push(`/katalog-produk/${item._id}`)}

                    className="group bg-white rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"

                  >

                    {/* Image Box */}

                    <div className="relative aspect-square w-full bg-slate-50 overflow-hidden border-b border-slate-100">

                      {/* Top Badges */}

                      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">

                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600/90 text-white shadow-xs">

                          {item.jenisProduk || "Barang"}

                        </span>

                        {item.isPreOrder && (

                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-white shadow-xs">

                            Pre Order

                          </span>

                        )}

                      </div>

                      <img

                        src={

                          item.fotoUtama ||

                          "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80"

                        }

                        alt={item.namaProduk}

                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"

                        loading="lazy"

                      />

                    </div>

                    {/* Content Box */}

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">

                      <div className="space-y-1">

                        <h4

                          className="text-xl font-medium text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors"

                          title={item.namaProduk}

                        >

                          {item.namaProduk}

                        </h4>

                        <div className="text-xl font-bold text-slate-900">

                          {formatRupiah(item.hargaProduk)}

                        </div>

                      </div>

                      <div className="space-y-1.5 pt-1">

                        {/* TKDN Badge */}

                        <div className="flex items-center gap-1.5 flex-wrap">

                          {typeof item.tkdnBmp === "number" && item.tkdnBmp > 0 && (

                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">

                              TKDN+BMP {item.tkdnBmp}%

                            </span>

                          )}

                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">

                            {item.jenisLabel || "PDN"}

                          </span>

                        </div>

                        {/* Provider & City */}

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">

                          <span className="font-extrabold text-blue-600 shrink-0">

                            {item.jenisPenyedia || "UMKK"}

                          </span>

                          <span className="truncate text-slate-500">

                            {item.lokasiPenyedia || "Indonesia"}

                          </span>

                        </div>

                        {/* Stok */}

                        <div className="text-[10px] text-slate-500 font-medium">

                          Stok {item.jumlahStok?.toLocaleString("id-ID") || 0} {item.satuanProduk || "Unit"}

                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </main>

        </div>

      </div>

    </div>

  </div>

</div>

  );

}

export default function KatalogProdukPage() {

  return (

    <Suspense

      fallback={

        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">

          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />

        </div>

      }

    >

      <KatalogProdukContent />

    </Suspense>

  );

}

