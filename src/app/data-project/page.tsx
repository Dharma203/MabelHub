"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  RotateCw,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react";

type Penagihan = {
  tanggalMulai?: string;
  tanggalBerakhir?: string;
  nominalPenagihan?: number;
};

type Contract = {
  nomorKontrak: string;
  perusahaan?: string;
  requestIds?: string[];
  instansi?: string;
  tanggalKontrak?: string;
  namaPengadaan?: string;
  nominalKontrak?: number;
  bendera?: string;
  marketing?: string;
  pic?: string;
  tanggalBerakhirKontrak?: string;
  status?: string;
  dokSales?: string;
  penagihan?: Penagihan;
  [key: string]: any;
};

type SortField =
  | "no"
  | "marketing"
  | "bendera"
  | "instansi"
  | "nomorKontrak"
  | "tanggalKontrak"
  | "nominalKontrak"
  | "pic"
  | "dokSales"
  | "status";

function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtCurrency(n?: number) {
  if (typeof n !== "number" || isNaN(n) || n === 0) return "—";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function DataProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perusahaanQuery = searchParams.get("perusahaan") || "";
  const { user, loading: sessionLoading } = useSession();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMarketing, setFilterMarketing] = useState("Semua");
  const [filterBendera, setFilterBendera] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterDokSales, setFilterDokSales] = useState("Semua");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("tanggalKontrak");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Edit Modal State
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editStatus, setEditStatus] = useState("PENAGIHAN");
  const [editDokSales, setEditDokSales] = useState("Belum Upload");
  const [editTglMulai, setEditTglMulai] = useState("");
  const [editTglBerakhir, setEditTglBerakhir] = useState("");
  const [editNominal, setEditNominal] = useState<number | string>(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  useEffect(() => {
    if (!sessionLoading) {
      if (!user) {
        router.replace("/");
      } else if (user.role !== "SUPERADMIN" && user.role !== "ADMIN") {
        router.replace("/dashboard-response");
      } else {
        fetchData();
      }
    }
  }, [user, sessionLoading, router, perusahaanQuery]);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");
      const url = perusahaanQuery
        ? `/api/contracts?perusahaan=${encodeURIComponent(perusahaanQuery)}`
        : "/api/contracts";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengambil data");
      setContracts(json.data || []);
    } catch (e: any) {
      setError(e.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleResetFilter = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setFilterMarketing("Semua");
    setFilterBendera("Semua");
    setFilterPic("Semua");
    setFilterStatus("Semua");
    setFilterDokSales("Semua");
    setCurrentPage(1);
  };

  // Unique options for filters
  const uniqueMarketing = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.marketing) set.add(c.marketing);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const uniqueBendera = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.bendera) set.add(c.bendera);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const uniquePic = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.pic) set.add(c.pic);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const uniqueStatus = useMemo(() => {
    const set = new Set<string>(["PENAGIHAN", "DONE PROJECT", "PENDING"]);
    contracts.forEach((c) => {
      if (c.status) set.add(c.status);
    });
    return Array.from(set);
  }, [contracts]);

  const uniqueDokSales = useMemo(() => {
    const set = new Set<string>(["Belum Upload", "Approved", "Proses Verifikasi"]);
    contracts.forEach((c) => {
      if (c.dokSales) set.add(c.dokSales);
    });
    return Array.from(set);
  }, [contracts]);

  // Filtered and Sorted Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchInstansi = c.instansi?.toLowerCase().includes(q);
        const matchKontrak = c.nomorKontrak?.toLowerCase().includes(q);
        const matchMarketing = c.marketing?.toLowerCase().includes(q);
        const matchPic = c.pic?.toLowerCase().includes(q);
        const matchPengadaan = c.namaPengadaan?.toLowerCase().includes(q);
        if (!matchInstansi && !matchKontrak && !matchMarketing && !matchPic && !matchPengadaan) {
          return false;
        }
      }

      // Date range on tanggalKontrak
      if (dateFrom && c.tanggalKontrak && c.tanggalKontrak < dateFrom) {
        return false;
      }
      if (dateTo && c.tanggalKontrak && c.tanggalKontrak > dateTo) {
        return false;
      }

      // Dropdown filters
      if (filterMarketing !== "Semua" && c.marketing !== filterMarketing) {
        return false;
      }
      if (filterBendera !== "Semua" && c.bendera !== filterBendera) {
        return false;
      }
      if (filterPic !== "Semua" && c.pic !== filterPic) {
        return false;
      }
      if (filterStatus !== "Semua" && (c.status || "PENAGIHAN") !== filterStatus) {
        return false;
      }
      if (filterDokSales !== "Semua" && (c.dokSales || "Belum Upload") !== filterDokSales) {
        return false;
      }

      return true;
    });
  }, [
    contracts,
    searchTerm,
    dateFrom,
    dateTo,
    filterMarketing,
    filterBendera,
    filterPic,
    filterStatus,
    filterDokSales,
  ]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "marketing":
          valA = a.marketing || "";
          valB = b.marketing || "";
          break;
        case "bendera":
          valA = a.bendera || "";
          valB = b.bendera || "";
          break;
        case "instansi":
          valA = a.instansi || "";
          valB = b.instansi || "";
          break;
        case "nomorKontrak":
          valA = a.nomorKontrak || "";
          valB = b.nomorKontrak || "";
          break;
        case "tanggalKontrak":
          valA = a.tanggalKontrak || "";
          valB = b.tanggalKontrak || "";
          break;
        case "nominalKontrak":
          valA = a.nominalKontrak || 0;
          valB = b.nominalKontrak || 0;
          break;
        case "pic":
          valA = a.pic || "";
          valB = b.pic || "";
          break;
        case "dokSales":
          valA = a.dokSales || "";
          valB = b.dokSales || "";
          break;
        case "status":
          valA = a.status || "PENAGIHAN";
          valB = b.status || "PENAGIHAN";
          break;
        default:
          valA = a.tanggalKontrak || "";
          valB = b.tanggalKontrak || "";
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredContracts, sortField, sortDirection]);

  // Pagination Slice
  const totalItems = sortedContracts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedContracts.slice(start, start + pageSize);
  }, [sortedContracts, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Open Edit Modal
  const openEditModal = (c: Contract) => {
    setEditingContract(c);
    setEditStatus(c.status || "PENAGIHAN");
    setEditDokSales(c.dokSales || "Belum Upload");
    setEditTglMulai(c.penagihan?.tanggalMulai || "");
    setEditTglBerakhir(c.penagihan?.tanggalBerakhir || "");
    setEditNominal(c.penagihan?.nominalPenagihan ?? 0);
    setModalError("");
    setModalSuccess("");
  };

  // Save Modal
  const handleSaveModal = async () => {
    if (!editingContract) return;
    setSavingEdit(true);
    setModalError("");
    setModalSuccess("");

    try {
      const payload = {
        status: editStatus,
        dokSales: editDokSales,
        penagihan: {
          tanggalMulai: editTglMulai,
          tanggalBerakhir: editTglBerakhir,
          nominalPenagihan: Number(editNominal) || 0,
        },
      };

      const res = await fetch(
        `/api/contracts/${encodeURIComponent(editingContract.nomorKontrak)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan perubahan");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === editingContract.nomorKontrak ? { ...c, ...json.data } : c
        )
      );

      setModalSuccess("Perubahan berhasil disimpan!");
      setTimeout(() => {
        setEditingContract(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || "Gagal menyimpan");
    } finally {
      setSavingEdit(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex w-full min-h-[400px] items-center justify-center p-8 text-slate-500 font-medium">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Memuat data project...</span>
        </div>
      </div>
    );
  }

  const startRecordIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="min-h-screen bg-blue-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ─── Top Header Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {perusahaanQuery ? `Data Kontrak — ${perusahaanQuery}` : "Data Kontrak"}
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100/80 text-blue-700 border border-blue-200/60 shadow-xs">
            {totalItems} data
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          title="Segarkan Data"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-rose-600 text-sm font-semibold border border-rose-200 shadow-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Filter Section Card ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-4">
        {/* Row 1: Search + Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search Input */}
          <div className="md:col-span-6 lg:col-span-8">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              PENCARIAN
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari instansi, no kontrak, marketing..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tanggal Dari */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              TANGGAL KONTRAK DARI
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Tanggal Sampai */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              TANGGAL KONTRAK SAMPAI
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Dropdowns & Reset */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1 items-end">
          {/* Marketing */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              MARKETING
            </label>
            <select
              value={filterMarketing}
              onChange={(e) => {
                setFilterMarketing(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Semua">Semua</option>
              {uniqueMarketing.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Bendera */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              BENDERA
            </label>
            <select
              value={filterBendera}
              onChange={(e) => {
                setFilterBendera(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Semua">Semua</option>
              {uniqueBendera.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* PIC */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              PIC
            </label>
            <select
              value={filterPic}
              onChange={(e) => {
                setFilterPic(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Semua">Semua</option>
              {uniquePic.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              STATUS
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Semua">Semua</option>
              {uniqueStatus.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Dok. Sales */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              DOK. SALES
            </label>
            <select
              value={filterDokSales}
              onChange={(e) => {
                setFilterDokSales(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="Semua">Semua</option>
              {uniqueDokSales.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          <div>
            <button
              onClick={handleResetFilter}
              className="w-full py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs hover:border-slate-300 active:scale-[0.98]"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* ─── Table Section Card ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 text-center font-bold text-[11px] tracking-wider uppercase w-12 text-slate-400">
                  NO
                </th>
                <th
                  onClick={() => handleSort("marketing")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MARKETING</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("bendera")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>BENDERA</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("instansi")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>INSTANSI</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nomorKontrak")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NO KONTRAK/SPK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("tanggalKontrak")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TGL KONTRAK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nominalKontrak")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NILAI PENGADAAN</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("pic")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>PIC</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dokSales")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DOK. SALES</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>STATUS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center font-bold text-[11px] tracking-wider uppercase w-12 text-slate-400">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-16 text-center text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <span>Tidak ada data kontrak yang sesuai filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedContracts.map((c, idx) => {
                  const rowNumber =
                    (currentPage - 1) * pageSize + idx + 1;
                  const statusVal = c.status || "PENAGIHAN";
                  const dokVal = c.dokSales || "—";

                  return (
                    <tr
                      key={c.nomorKontrak || idx}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* NO */}
                      <td className="py-4 px-3 text-center text-xs font-semibold text-slate-400">
                        {rowNumber}
                      </td>

                      {/* MARKETING */}
                      <td className="py-4 px-3.5 font-semibold text-slate-800">
                        {c.marketing || "—"}
                      </td>

                      {/* BENDERA */}
                      <td className="py-4 px-3.5 text-slate-600 font-medium">
                        {c.bendera || "—"}
                      </td>

                      {/* INSTANSI */}
                      <td className="py-4 px-3.5 font-semibold text-slate-900 max-w-xs truncate" title={c.instansi}>
                        {c.instansi || "—"}
                      </td>

                      {/* NO KONTRAK */}
                      <td className="py-4 px-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {c.nomorKontrak || "—"}
                      </td>

                      {/* TGL KONTRAK */}
                      <td className="py-4 px-3.5 text-slate-600 whitespace-nowrap">
                        {fmtDate(c.tanggalKontrak)}
                      </td>

                      {/* NILAI PENGADAAN */}
                      <td className="py-4 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                        {fmtCurrency(c.nominalKontrak)}
                      </td>

                      {/* PIC */}
                      <td className="py-4 px-3.5 text-slate-700 uppercase font-semibold text-xs">
                        {c.pic || "—"}
                      </td>

                      {/* DOK. SALES */}
                      <td className="py-4 px-3.5 whitespace-nowrap">
                        {dokVal === "Approved" ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Approved
                          </span>
                        ) : dokVal === "Proses Verifikasi" ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Proses Verifikasi
                          </span>
                        ) : dokVal === "Belum Upload" ? (
                          <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            Belum Upload
                          </span>
                        ) : (
                          <span className="text-slate-400">{dokVal}</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-3.5 whitespace-nowrap">
                        {statusVal === "DONE PROJECT" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            DONE PROJECT
                          </span>
                        ) : statusVal === "PENAGIHAN" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            PENAGIHAN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            {statusVal}
                          </span>
                        )}
                      </td>

                      {/* EDIT ACTION BUTTON */}
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-2xs active:scale-90"
                          title="Edit Status & Penagihan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-600">
              {startRecordIndex}–{endRecordIndex} / {totalItems}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal Edit Status & Penagihan ─── */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Data Project
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {editingContract.nomorKontrak}
                </p>
              </div>
              <button
                onClick={() => setEditingContract(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs md:text-sm">
              {/* Instansi Info */}
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 space-y-1">
                <div className="font-bold text-blue-900 text-xs">
                  {editingContract.instansi || "—"}
                </div>
                <div className="text-slate-600 text-xs">
                  {editingContract.namaPengadaan || "—"}
                </div>
                <div className="text-slate-700 font-bold text-xs pt-1">
                  Nilai: {fmtCurrency(editingContract.nominalKontrak)}
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status Project
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="PENAGIHAN">PENAGIHAN</option>
                  <option value="DONE PROJECT">DONE PROJECT</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              {/* Dok. Sales Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Dokumen Sales
                </label>
                <select
                  value={editDokSales}
                  onChange={(e) => setEditDokSales(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Belum Upload">Belum Upload</option>
                  <option value="Approved">Approved</option>
                  <option value="Proses Verifikasi">Proses Verifikasi</option>
                </select>
              </div>

              {/* Penagihan fields */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Kelola Penagihan
                </h4>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tgl Mulai Penagihan
                    </label>
                    <input
                      type="date"
                      value={editTglMulai}
                      onChange={(e) => setEditTglMulai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tgl Berakhir Penagihan
                    </label>
                    <input
                      type="date"
                      value={editTglBerakhir}
                      onChange={(e) => setEditTglBerakhir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nominal Penagihan (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold text-xs pointer-events-none">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editNominal ? editNominal.toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setEditNominal(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 text-xs font-semibold border border-rose-200">
                  {modalError}
                </div>
              )}

              {modalSuccess && (
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{modalSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                disabled={savingEdit}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={savingEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all disabled:opacity-50 active:scale-95"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-blue-50/50 p-8 flex items-center justify-center text-slate-500 font-medium">
          Memuat halaman Data Project...
        </div>
      }
    >
      <DataProjectContent />
    </Suspense>
  );
}
