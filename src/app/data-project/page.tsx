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
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  ExternalLink,
  Tag,
  ImageIcon,
  Video,
  Eye,
  Loader2,
  Receipt,
  Plus,
  Trash2,
  Wallet,
  Sparkles,
  Download,
} from "lucide-react";
import { getSuggestedProjectStatus } from "@/lib/project-status-helper";
import { buildDataProjectWorkbook } from "@/lib/data-project-export";
import * as XLSX from "xlsx-js-style";

export type PembayaranItem = {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jumlah: number;
  keterangan?: string;
  createdAt?: string | Date;
  createdBy?: string;
};

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
  pembayaran?: PembayaranItem[];
  [key: string]: any;
};

// Satu versi dokumentasi project yang sudah diarsipkan (dari ?riwayat=1)
type DokBarangArsip = {
  unitProduk?: string;
  fotoSerahTerima?: string;
  fotoBarang?: string;
  videoBarang?: string;
};
type DokVersiArsip = {
  version?: number;
  namaSales?: string;
  tanggalReport?: string;
  createdAt?: string;
  archivedAt?: string;
  archivedBy?: string;
  barang?: DokBarangArsip[];
};

type SortField =
  | "no"
  | "marketing"
  | "bendera"
  | "instansi"
  | "nomorKontrak"
  | "tanggalKontrak"
  | "nominalKontrak"
  | "terbayar"
  | "sisa"
  | "pic"
  | "dokSales"
  | "status";

function getTotalTerbayar(c: Contract): number {
  if (!c.pembayaran || !Array.isArray(c.pembayaran)) return 0;
  return c.pembayaran.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
}

function getSisaTagihan(c: Contract): number {
  const nominal = Number(c.nominalKontrak) || 0;
  const terbayar = getTotalTerbayar(c);
  return nominal - terbayar;
}

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

function fmtCurrencyWithZero(n?: number) {
  if (typeof n !== "number" || isNaN(n)) return "Rp 0";
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

  // Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<Contract | null>(null);
  const [dokDetail, setDokDetail] = useState<any>(null);
  const [dokRiwayat, setDokRiwayat] = useState<DokVersiArsip[]>([]); // versi dokumentasi yang sudah diarsipkan
  const [loadingDok, setLoadingDok] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    title: string;
    isVideo?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!selectedDetail?.nomorKontrak) {
      setDokDetail(null);
      setDokRiwayat([]);
      return;
    }
    let active = true;
    setLoadingDok(true);
    fetch(
      `/api/dokumentasi-project?nomorKontrak=${encodeURIComponent(
        selectedDetail.nomorKontrak
      )}&riwayat=1`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) {
          setDokDetail(json?.data || null);
          setDokRiwayat(Array.isArray(json?.riwayat) ? json.riwayat : []);
        }
      })
      .catch(() => {
        if (active) {
          setDokDetail(null);
          setDokRiwayat([]);
        }
      })
      .finally(() => {
        if (active) setLoadingDok(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDetail?.nomorKontrak]);

  // Edit Modal State (hanya ubah status)
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editStatus, setEditStatus] = useState("PENAGIHAN");
  const [editDokSales, setEditDokSales] = useState("Proses Verifikasi");
  const [editAlasanPenolakan, setEditAlasanPenolakan] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Quick Verification State (di dalam modal detail)
  const [verifyingDok, setVerifyingDok] = useState(false);
  const [showTolakPrompt, setShowTolakPrompt] = useState(false);
  const [tolakReason, setTolakReason] = useState("");

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

  // ─── Ekspor Excel ───
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = () => {
    if (sortedContracts.length === 0) return;
    setExporting(true);
    try {
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now) + " WIB";

      const activeFilters: { label: string; value: string }[] = [];
      if (filterStatus !== "Semua") activeFilters.push({ label: "Status Project", value: filterStatus });
      if (filterMarketing !== "Semua") activeFilters.push({ label: "Sales / Marketing", value: filterMarketing });
      if (filterBendera !== "Semua") activeFilters.push({ label: "Bendera / PT", value: filterBendera });
      if (filterPic !== "Semua") activeFilters.push({ label: "PIC Admin", value: filterPic });
      if (filterDokSales !== "Semua") activeFilters.push({ label: "Dokumen Sales", value: filterDokSales });
      if (searchTerm.trim()) activeFilters.push({ label: "Pencarian", value: searchTerm.trim() });

      const wb = buildDataProjectWorkbook(sortedContracts, {
        today: todayStr,
        exportedBy: user?.fullName || user?.username || "Admin",
        exportedAt: now,
        filters: activeFilters,
      });

      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const dateTag = now.toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data_project_${dateTag}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Gagal mengekspor Excel");
    } finally {
      setExporting(false);
    }
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
    const set = new Set<string>(["Belum Upload", "Proses Verifikasi", "Disetujui", "Ditolak", "Sudah Upload"]);
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
      if (filterDokSales !== "Semua") {
        const val = c.dokSales || "Belum Upload";
        if (filterDokSales === "Disetujui") {
          if (val !== "Disetujui" && val !== "Sudah Upload") return false;
        } else {
          if (val !== filterDokSales) return false;
        }
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
        case "terbayar":
          valA = getTotalTerbayar(a);
          valB = getTotalTerbayar(b);
          break;
        case "sisa":
          valA = getSisaTagihan(a);
          valB = getSisaTagihan(b);
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

  // Open Edit Modal (hanya status)
  const openEditModal = (c: Contract) => {
    setEditingContract(c);
    const suggestion = getSuggestedProjectStatus(c);
    // Jika proyek memenuhi syarat DONE PROJECT tapi status saat ini belum, otomatis prioritaskan DONE PROJECT
    const initialStatus =
      !suggestion.isMatch && suggestion.status === "DONE PROJECT"
        ? "DONE PROJECT"
        : c.status || "PENAGIHAN";
    setEditStatus(initialStatus);
    const dokVal =
      c.dokSales === "Ditolak"
        ? "Ditolak"
        : c.dokSales === "Proses Verifikasi"
          ? "Proses Verifikasi"
          : "Disetujui";
    setEditDokSales(dokVal);
    setEditAlasanPenolakan(c.alasanPenolakan || c.dokVerifikasi?.alasanPenolakan || "");
    setModalError("");
    setModalSuccess("");
  };

  // Terapkan usulan status otomatis langsung (one-click)
  const handleApplySuggestedStatus = async (contract: Contract, targetStatus: string) => {
    try {
      const res = await fetch(
        `/api/contracts/${encodeURIComponent(contract.nomorKontrak)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui status");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === contract.nomorKontrak ? { ...c, status: targetStatus } : c
        )
      );
      if (selectedDetail && selectedDetail.nomorKontrak === contract.nomorKontrak) {
        setSelectedDetail((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }
      if (editingContract && editingContract.nomorKontrak === contract.nomorKontrak) {
        setEditStatus(targetStatus);
      }
    } catch (err: any) {
      alert(err.message || "Gagal menerapkan usulan status");
    }
  };

  // Save Modal (hanya update status)
  const handleSaveModal = async () => {
    if (!editingContract) return;
    setSavingEdit(true);
    setModalError("");
    setModalSuccess("");

    try {
      const payload: Record<string, string> = {
        status: editStatus,
      };
      // Status dokumen hanya bisa diubah jika dokumen sudah diupload
      if (editingContract.dokSales !== "Belum Upload") {
        payload.dokSales = editDokSales;
        if (editDokSales === "Ditolak") {
          if (!editAlasanPenolakan.trim()) {
            setModalError("Alasan penolakan wajib diisi ketika menolak dokumentasi");
            setSavingEdit(false);
            return;
          }
          payload.alasanPenolakan = editAlasanPenolakan.trim();
        }
      }

      const res = await fetch(
        `/api/contracts/${encodeURIComponent(editingContract.nomorKontrak)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan status");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === editingContract.nomorKontrak
            ? {
                ...c,
                status: editStatus,
                ...(payload.dokSales ? { dokSales: payload.dokSales } : {}),
                ...(payload.dokSales === "Ditolak"
                  ? { alasanPenolakan: payload.alasanPenolakan }
                  : { alasanPenolakan: "" }),
                ...json.data,
              }
            : c
        )
      );

      if (selectedDetail && selectedDetail.nomorKontrak === editingContract.nomorKontrak) {
        setSelectedDetail((prev) =>
          prev
            ? {
                ...prev,
                status: editStatus,
                ...(payload.dokSales ? { dokSales: payload.dokSales } : {}),
                ...(payload.dokSales === "Ditolak"
                  ? { alasanPenolakan: payload.alasanPenolakan }
                  : { alasanPenolakan: "" }),
                ...json.data,
              }
            : prev
        );
      }

      setModalSuccess("Status berhasil diperbarui!");
      setTimeout(() => {
        setEditingContract(null);
      }, 800);
    } catch (err: any) {
      setModalError(err.message || "Gagal menyimpan status");
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Actions verifikasi dari Modal Detail Project
  const handleQuickApprove = async (nk: string) => {
    setVerifyingDok(true);
    try {
      // Periksa apakah proyek sudah lunas sehingga bisa langsung menjadi DONE PROJECT
      const currentContract = contracts.find((c) => c.nomorKontrak === nk);
      const totalBayar = (currentContract?.pembayaran || []).reduce(
        (s, p) => s + (Number(p.jumlah) || 0),
        0
      );
      const sisa = Math.max(0, (currentContract?.nominalKontrak || 0) - totalBayar);
      const isLunas = (currentContract?.nominalKontrak || 0) > 0 && sisa <= 0;
      const shouldAutoDone = isLunas && currentContract?.status !== "DONE PROJECT";

      const payload: any = { dokSales: "Disetujui" };
      if (shouldAutoDone) {
        payload.status = "DONE PROJECT";
      }

      const res = await fetch(`/api/contracts/${encodeURIComponent(nk)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyetujui dokumentasi");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === nk
            ? {
                ...c,
                dokSales: "Disetujui",
                ...(shouldAutoDone ? { status: "DONE PROJECT" } : {}),
                alasanPenolakan: "",
                dokVerifikasi: {
                  ...(c.dokVerifikasi || {}),
                  status: "DISETUJUI",
                  verifiedBy: user?.fullName || user?.username || "Admin",
                  verifiedAt: new Date().toISOString(),
                },
              }
            : c
        )
      );
      setSelectedDetail((prev) =>
        prev && prev.nomorKontrak === nk
          ? {
              ...prev,
              dokSales: "Disetujui",
              ...(shouldAutoDone ? { status: "DONE PROJECT" } : {}),
              alasanPenolakan: "",
              dokVerifikasi: {
                ...(prev.dokVerifikasi || {}),
                status: "DISETUJUI",
                verifiedBy: user?.fullName || user?.username || "Admin",
                verifiedAt: new Date().toISOString(),
              },
            }
          : prev
      );
    } catch (e: any) {
      alert(e?.message || "Gagal menyetujui dokumentasi");
    } finally {
      setVerifyingDok(false);
    }
  };

  const handleQuickReject = async (nk: string) => {
    if (!tolakReason.trim()) return;
    setVerifyingDok(true);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(nk)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dokSales: "Ditolak", alasanPenolakan: tolakReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menolak dokumentasi");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === nk
            ? {
                ...c,
                dokSales: "Ditolak",
                alasanPenolakan: tolakReason.trim(),
                dokVerifikasi: {
                  ...(c.dokVerifikasi || {}),
                  status: "DITOLAK",
                  alasanPenolakan: tolakReason.trim(),
                  verifiedBy: user?.fullName || user?.username || "Admin",
                  verifiedAt: new Date().toISOString(),
                },
              }
            : c
        )
      );
      setSelectedDetail((prev) =>
        prev && prev.nomorKontrak === nk
          ? {
              ...prev,
              dokSales: "Ditolak",
              alasanPenolakan: tolakReason.trim(),
              dokVerifikasi: {
                ...(prev.dokVerifikasi || {}),
                status: "DITOLAK",
                alasanPenolakan: tolakReason.trim(),
                verifiedBy: user?.fullName || user?.username || "Admin",
                verifiedAt: new Date().toISOString(),
              },
            }
          : prev
      );
      setShowTolakPrompt(false);
    } catch (e: any) {
      alert(e?.message || "Gagal menolak dokumentasi");
    } finally {
      setVerifyingDok(false);
    }
  };

  // Payment Modal & Form State
  const [paymentContract, setPaymentContract] = useState<Contract | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const openPaymentModal = (c: Contract) => {
    setPaymentContract(c);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentAmount(0);
    setPaymentNote("");
    setPaymentError("");
    setPaymentSuccess("");
  };

  const handleAddPayment = async (targetContract: Contract) => {
    if (!paymentDate) {
      setPaymentError("Tanggal pembayaran wajib diisi");
      return;
    }
    if (!paymentAmount || paymentAmount <= 0) {
      setPaymentError("Jumlah pembayaran harus lebih dari Rp 0");
      return;
    }

    setSavingPayment(true);
    setPaymentError("");
    setPaymentSuccess("");

    try {
      const existingPayments = targetContract.pembayaran || [];
      const paymentItem: PembayaranItem = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tanggal: paymentDate,
        jumlah: paymentAmount,
        keterangan: paymentNote.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user?.fullName || user?.username || "Admin",
      };

      const updatedPayments = [...existingPayments, paymentItem];

      // Periksa apakah pembayaran ini membuat kontrak lunas & memenuhi syarat DONE PROJECT
      const totalBayar = updatedPayments.reduce((s, p) => s + (Number(p.jumlah) || 0), 0);
      const sisa = Math.max(0, (targetContract.nominalKontrak || 0) - totalBayar);
      const isLunas = (targetContract.nominalKontrak || 0) > 0 && sisa <= 0;
      const dokApproved =
        targetContract.dokSales === "Disetujui" ||
        targetContract.dokSales === "Sudah Upload" ||
        targetContract.dokSales === "Proses Verifikasi";

      const shouldAutoDone = isLunas && dokApproved && targetContract.status !== "DONE PROJECT";

      const payload: any = {
        pembayaran: updatedPayments,
      };
      if (shouldAutoDone) {
        payload.status = "DONE PROJECT";
      }

      const res = await fetch(
        `/api/contracts/${encodeURIComponent(targetContract.nomorKontrak)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan pembayaran");

      // Update state in contracts, selectedDetail, and paymentContract
      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === targetContract.nomorKontrak
            ? {
                ...c,
                pembayaran: updatedPayments,
                ...(shouldAutoDone ? { status: "DONE PROJECT" } : {}),
              }
            : c
        )
      );

      if (selectedDetail && selectedDetail.nomorKontrak === targetContract.nomorKontrak) {
        setSelectedDetail((prev) =>
          prev
            ? {
                ...prev,
                pembayaran: updatedPayments,
                ...(shouldAutoDone ? { status: "DONE PROJECT" } : {}),
              }
            : null
        );
      }
      if (paymentContract && paymentContract.nomorKontrak === targetContract.nomorKontrak) {
        setPaymentContract((prev) =>
          prev
            ? {
                ...prev,
                pembayaran: updatedPayments,
                ...(shouldAutoDone ? { status: "DONE PROJECT" } : {}),
              }
            : null
        );
      }

      setPaymentSuccess(
        shouldAutoDone
          ? "Pembayaran berhasil dicatat! Status project otomatis diperbarui menjadi DONE PROJECT (Lunas & Dokumentasi Lengkap)."
          : "Pembayaran berhasil dicatat!"
      );
      setPaymentAmount(0);
      setPaymentNote("");
    } catch (err: any) {
      setPaymentError(err.message || "Gagal menyimpan pembayaran");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (targetContract: Contract, paymentId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan pembayaran ini?")) return;

    try {
      const updatedPayments = (targetContract.pembayaran || []).filter(
        (p) => p.id !== paymentId
      );

      const res = await fetch(
        `/api/contracts/${encodeURIComponent(targetContract.nomorKontrak)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pembayaran: updatedPayments,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus pembayaran");

      setContracts((prev) =>
        prev.map((c) =>
          c.nomorKontrak === targetContract.nomorKontrak
            ? { ...c, pembayaran: updatedPayments }
            : c
        )
      );

      if (selectedDetail && selectedDetail.nomorKontrak === targetContract.nomorKontrak) {
        setSelectedDetail((prev) =>
          prev ? { ...prev, pembayaran: updatedPayments } : null
        );
      }
      if (paymentContract && paymentContract.nomorKontrak === targetContract.nomorKontrak) {
        setPaymentContract((prev) =>
          prev ? { ...prev, pembayaran: updatedPayments } : null
        );
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghapus pembayaran");
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting || sortedContracts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ekspor ke Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? "Mengekspor..." : "Ekspor Excel"}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Segarkan Data"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
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
                  onClick={() => handleSort("terbayar")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>TERBAYAR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sisa")}
                  className="py-3.5 px-3.5 font-bold text-[11px] tracking-wider uppercase cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>SISA TAGIHAN</span>
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
                <th className="py-3.5 px-3 text-center font-bold text-[11px] tracking-wider uppercase w-20 text-slate-400 whitespace-nowrap">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
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
                  const totalTerbayar = getTotalTerbayar(c);
                  const sisa = getSisaTagihan(c);

                  return (
                    <tr
                      key={c.nomorKontrak || idx}
                      onClick={() => setSelectedDetail(c)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors group"
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

                      {/* TERBAYAR */}
                      <td className="py-4 px-3.5 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-700">
                          {fmtCurrency(totalTerbayar)}
                        </div>
                        {c.pembayaran && c.pembayaran.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {c.pembayaran.length}x bayar
                          </span>
                        )}
                      </td>

                      {/* SISA TAGIHAN */}
                      <td className="py-4 px-3.5 text-right whitespace-nowrap">
                        {sisa <= 0 && (c.nominalKontrak || 0) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Lunas
                          </span>
                        ) : (
                          <div className={`font-bold ${sisa > 0 ? "text-rose-600" : "text-slate-700"}`}>
                            {fmtCurrency(sisa)}
                          </div>
                        )}
                      </td>

                      {/* PIC */}
                      <td className="py-4 px-3.5 text-slate-700 uppercase font-semibold text-xs">
                        {c.pic || "—"}
                      </td>

                      {/* DOK. SALES */}
                      <td className="py-4 px-3.5 whitespace-nowrap">
                        {dokVal === "Disetujui" || dokVal === "Sudah Upload" ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {dokVal === "Disetujui" ? "Disetujui" : "Sudah Upload"}
                          </span>
                        ) : dokVal === "Ditolak" ? (
                          <span
                            className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-help"
                            title={c.alasanPenolakan || c.dokVerifikasi?.alasanPenolakan ? `Alasan: ${c.alasanPenolakan || c.dokVerifikasi?.alasanPenolakan}` : "Dokumentasi ditolak"}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Ditolak
                          </span>
                        ) : dokVal === "Proses Verifikasi" ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Proses Verifikasi
                          </span>
                        ) : (
                          <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Belum Upload
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
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

                          {/* Usulan Otomatis jika status saat ini berbeda dengan rekomendasi sistem */}
                          {(() => {
                            const suggestion = getSuggestedProjectStatus(c);
                            if (suggestion.isMatch) return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplySuggestedStatus(c, suggestion.status);
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-all inline-flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95 ${
                                  suggestion.status === "DONE PROJECT"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                    : suggestion.status === "PENDING"
                                      ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                      : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                                }`}
                                title={`Usulan Otomatis: ${suggestion.status} (${suggestion.reason}) — Klik untuk terapkan langsung`}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Saran: {suggestion.status}</span>
                              </button>
                            );
                          })()}
                        </div>
                      </td>

                      {/* AKSI BUTTONS */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentModal(c);
                            }}
                            className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs active:scale-90"
                            title="Catat & Lihat Pembayaran"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(c);
                            }}
                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-2xs active:scale-90"
                            title="Ubah Status Project"
                          >
                            <Pencil className="w-3.5 h-3.5" />
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

      {/* ─── Modal Edit Status ─── */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Ubah Status
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
              {/* Instansi Info Summary */}
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 space-y-1">
                <div className="font-bold text-blue-900 text-xs">
                  {editingContract.instansi || "—"}
                </div>
                <div className="text-slate-600 text-xs truncate">
                  {editingContract.namaPengadaan || "—"}
                </div>
                <div className="text-slate-700 font-bold text-xs pt-0.5">
                  Nilai: {fmtCurrency(editingContract.nominalKontrak)}
                </div>
              </div>

              {/* Usulan Otomatis Status Sistem */}
              {(() => {
                const suggestion = getSuggestedProjectStatus(editingContract);
                const isSelected = editStatus === suggestion.status;
                return (
                  <div
                    className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                      suggestion.status === "DONE PROJECT"
                        ? "bg-emerald-50/90 border-emerald-200"
                        : suggestion.status === "PENDING"
                          ? "bg-amber-50/90 border-amber-200"
                          : "bg-blue-50/90 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Sparkles
                          className={`w-3.5 h-3.5 ${
                            suggestion.status === "DONE PROJECT"
                              ? "text-emerald-600"
                              : suggestion.status === "PENDING"
                                ? "text-amber-600"
                                : "text-blue-600"
                          }`}
                        />
                        <span>Usulan Otomatis Sistem</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                          suggestion.status === "DONE PROJECT"
                            ? "bg-emerald-600 text-white"
                            : suggestion.status === "PENDING"
                              ? "bg-amber-500 text-white"
                              : "bg-blue-600 text-white"
                        }`}
                      >
                        {suggestion.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      {suggestion.reason}
                    </p>

                    {!isSelected ? (
                      <button
                        type="button"
                        onClick={() => setEditStatus(suggestion.status)}
                        className="mt-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg px-2.5 py-1 transition-all inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Terapkan Usulan ({suggestion.status})</span>
                      </button>
                    ) : (
                      <div className="mt-1 text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Status yang dipilih sudah sesuai usulan sistem</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilih Status Project Baru
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="PENAGIHAN">PENAGIHAN</option>
                  <option value="DONE PROJECT">DONE PROJECT</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              {/* Status Dokumen Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status Dokumen
                </label>
                {editingContract.dokSales === "Belum Upload" ? (
                  <p className="text-xs text-slate-500 italic px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    Belum Upload — status dokumen dapat diubah setelah sales mengunggah dokumentasi project.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <select
                      value={editDokSales}
                      onChange={(e) => setEditDokSales(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="Proses Verifikasi">Proses Verifikasi</option>
                      <option value="Disetujui">Disetujui</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>

                    {editDokSales === "Ditolak" && (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-rose-700">
                          Alasan Penolakan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={editAlasanPenolakan}
                          onChange={(e) => setEditAlasanPenolakan(e.target.value)}
                          placeholder="Tuliskan alasan penolakan dokumentasi (wajib diisi)..."
                          className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}
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
                {savingEdit ? "Menyimpan..." : "Simpan Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Detail Project ─── */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Detail Data Project
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedDetail.nomorKontrak}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-sm">
              {/* Ringkasan Utama Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 border border-blue-100 shadow-2xs space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                    Instansi & Pengadaan
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedDetail.instansi || "—"}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1">
                    {selectedDetail.namaPengadaan || "—"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-200/50">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Nilai Pengadaan / Kontrak
                    </span>
                    <span className="text-lg font-black text-blue-900">
                      {fmtCurrency(selectedDetail.nominalKontrak)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Project */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedDetail.status === "DONE PROJECT"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedDetail.status === "DONE PROJECT" ? "bg-emerald-500" : "bg-slate-400"
                      }`} />
                      {selectedDetail.status || "PENAGIHAN"}
                    </span>

                    {/* Dok Sales */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${
                        selectedDetail.dokSales === "Disetujui" || selectedDetail.dokSales === "Sudah Upload"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : selectedDetail.dokSales === "Ditolak"
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : selectedDetail.dokSales === "Proses Verifikasi"
                              ? "text-amber-700 bg-amber-50 border-amber-200"
                              : "text-slate-600 bg-slate-100 border-slate-200"
                      }`}
                    >
                      {selectedDetail.dokSales === "Disetujui" || selectedDetail.dokSales === "Sudah Upload" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Dok: {selectedDetail.dokSales === "Disetujui" ? "Disetujui" : "Sudah Upload"}
                        </>
                      ) : selectedDetail.dokSales === "Ditolak" ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Dok: Ditolak
                        </>
                      ) : selectedDetail.dokSales === "Proses Verifikasi" ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Dok: Proses Verifikasi
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Dok: Belum Upload
                        </>
                      )}
                    </span>

                    {/* Usulan Status Otomatis jika status saat ini belum sesuai rekomendasi */}
                    {(() => {
                      const suggestion = getSuggestedProjectStatus(selectedDetail);
                      if (suggestion.isMatch) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestedStatus(selectedDetail, suggestion.status)}
                          className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all inline-flex items-center gap-1.5 animate-pulse"
                          title={suggestion.reason}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Terapkan Usulan: {suggestion.status}</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {selectedDetail.dokSales === "Ditolak" && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-sm">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Dokumentasi Ditolak oleh Admin</span>
                  </div>
                  <div className="text-rose-700 pl-5.5">
                    <strong>Alasan Penolakan:</strong>{" "}
                    {selectedDetail.alasanPenolakan || selectedDetail.dokVerifikasi?.alasanPenolakan || "Tidak ada keterangan."}
                  </div>
                  {selectedDetail.dokVerifikasi?.verifiedBy && (
                    <div className="text-[11px] text-rose-500 pl-5.5">
                      Ditolak oleh {selectedDetail.dokVerifikasi.verifiedBy}
                      {selectedDetail.dokVerifikasi.verifiedAt ? ` (${fmtDate(selectedDetail.dokVerifikasi.verifiedAt)})` : ""}
                    </div>
                  )}
                </div>
              )}

              {(selectedDetail.dokSales === "Disetujui" || selectedDetail.dokSales === "Sudah Upload") && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 block">Dokumentasi Disetujui Admin</span>
                      <span className="text-[11px] text-emerald-700">
                        {selectedDetail.dokVerifikasi?.verifiedBy
                          ? `Disetujui oleh ${selectedDetail.dokVerifikasi.verifiedBy}${selectedDetail.dokVerifikasi.verifiedAt ? ` pada ${fmtDate(selectedDetail.dokVerifikasi.verifiedAt)}` : ""}`
                          : "Dokumentasi telah diverifikasi dan disetujui."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedDetail.dokSales === "Proses Verifikasi" && selectedDetail.dokVerifikasi?.issues?.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] block">
                    Hasil verifikasi otomatis — perlu diperiksa
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {selectedDetail.dokVerifikasi.issues.map((msg: string, i: number) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grid Informasi Detail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bendera */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Bendera Perusahaan
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetail.bendera || selectedDetail.perusahaan || "—"}
                  </span>
                </div>

                {/* No Kontrak */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Nomor Kontrak / SPK
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {selectedDetail.nomorKontrak || "—"}
                  </span>
                </div>

                {/* Marketing */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Marketing / Sales
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetail.marketing || "—"}
                  </span>
                </div>

                {/* PIC */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    PIC Admin
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetail.pic || "—"}
                  </span>
                </div>

                {/* Tanggal Kontrak */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Tanggal Kontrak
                  </span>
                  <span className="font-medium text-slate-800">
                    {fmtDate(selectedDetail.tanggalKontrak)}
                  </span>
                </div>

                {/* Tanggal Berakhir */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Tanggal Berakhir Kontrak
                  </span>
                  <span className="font-medium text-slate-800">
                    {fmtDate(selectedDetail.tanggalBerakhirKontrak)}
                  </span>
                </div>

                {/* Tanggal Penyerahan */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Tanggal Penyerahan
                  </span>
                  <span className="font-medium text-slate-800">
                    {fmtDate(selectedDetail.tanggalPenyerahan)}
                  </span>
                </div>
              </div>

              {/* ─── Pencatatan Pembayaran & Sisa Tagihan ─── */}
              {(() => {
                const totalTerbayar = getTotalTerbayar(selectedDetail);
                const sisa = getSisaTagihan(selectedDetail);
                const nominal = selectedDetail.nominalKontrak || 0;
                const pct = nominal > 0 ? Math.min(100, Math.max(0, Math.round((totalTerbayar / nominal) * 100))) : 0;
                const isLunas = sisa <= 0 && nominal > 0;

                return (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Pencatatan Pembayaran & Sisa Tagihan
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Status pembayaran masuk dan sisa tagihan kontrak
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openPaymentModal(selectedDetail)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Pembayaran</span>
                      </button>
                    </div>

                    {/* Ringkasan Finansial 3 Kartu */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                          Nominal Kontrak
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {fmtCurrencyWithZero(nominal)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                            Total Terbayar
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            {pct}%
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-700">
                          {fmtCurrencyWithZero(totalTerbayar)}
                        </span>
                      </div>

                      <div className={`p-3 rounded-xl border ${isLunas ? "bg-emerald-50/50 border-emerald-200" : sisa > 0 ? "bg-rose-50/70 border-rose-100" : "bg-slate-50 border-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${isLunas ? "text-emerald-700" : sisa > 0 ? "text-rose-700" : "text-slate-500"}`}>
                            Sisa Tagihan
                          </span>
                          {isLunas && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Lunas
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-extrabold ${isLunas ? "text-emerald-700" : sisa > 0 ? "text-rose-600" : "text-slate-900"}`}>
                          {fmtCurrencyWithZero(sisa)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>Realisasi Pembayaran</span>
                        <span>{pct}% Terbayar</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full transition-all duration-300 ${isLunas ? "bg-emerald-500" : "bg-blue-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Riwayat Pembayaran Masuk */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                        Riwayat Pembayaran Masuk ({selectedDetail.pembayaran?.length || 0})
                      </span>

                      {!selectedDetail.pembayaran || selectedDetail.pembayaran.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-xs font-medium text-slate-600">Belum ada pembayaran yang dicatat</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Klik tombol &quot;Catat Pembayaran&quot; untuk menambahkan termin pembayaran masuk.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="py-2 px-3">Tanggal</th>
                                <th className="py-2 px-3 text-right">Jumlah (Rp)</th>
                                <th className="py-2 px-3">Keterangan / Termin</th>
                                <th className="py-2 px-3">Dicatat Oleh</th>
                                <th className="py-2 px-2 text-center w-10">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedDetail.pembayaran.map((p, idx) => (
                                <tr key={p.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                    {fmtDate(p.tanggal)}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-emerald-700 text-right whitespace-nowrap">
                                    {fmtCurrencyWithZero(p.jumlah)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {p.keterangan || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                    {p.createdBy || "Admin"}
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(selectedDetail, p.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Hapus pembayaran"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Dokumentasi Project (Foto & Video) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Dokumentasi Project
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Foto serah terima, foto produk, dan video dokumentasi yang diunggah
                      </p>
                    </div>
                  </div>
                  {dokDetail && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                      Oleh: <strong className="text-slate-800">{dokDetail.namaSales || "Sales"}</strong>
                      {dokDetail.tanggalReport ? ` (${fmtDate(dokDetail.tanggalReport)})` : ""}
                    </div>
                  )}
                </div>

                {dokRiwayat.length > 0 && (
                  <details className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-bold text-amber-800">
                      Versi sebelumnya ({dokRiwayat.length}) — diarsipkan, tidak dihapus
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {dokRiwayat.map((v, i) => (
                        <li
                          key={`${v.createdAt}-${i}`}
                          className="rounded-lg bg-white border border-amber-100 p-2.5 text-[11px] text-slate-600"
                        >
                          <div className="font-semibold text-slate-800">
                            Versi {v.version ?? 1}
                            <span className="font-normal text-slate-500">
                              {" "}· oleh {v.namaSales || "Sales"}
                              {v.tanggalReport ? ` (${fmtDate(v.tanggalReport)})` : ""}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            Diarsipkan {fmtDate(v.archivedAt)}
                            {v.archivedBy ? ` oleh ${v.archivedBy}` : ""}
                          </div>
                          <ul className="mt-1.5 space-y-1">
                            {(v.barang || []).map((b, bi) => (
                              <li key={bi} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="font-medium text-slate-700">
                                  {b.unitProduk || `Barang ${bi + 1}`}
                                </span>
                                {[
                                  { label: "Foto Serah Terima", url: b.fotoSerahTerima },
                                  { label: "Foto Barang", url: b.fotoBarang },
                                  { label: "Video", url: b.videoBarang },
                                ]
                                  .filter((m) => m.url)
                                  .map((m) => (
                                    <a
                                      key={m.label}
                                      href={m.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {m.label}
                                    </a>
                                  ))}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Panel Aksi Verifikasi Admin */}
                {selectedDetail.dokSales !== "Belum Upload" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Tindakan Verifikasi Admin
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {selectedDetail.dokSales === "Disetujui" || selectedDetail.dokSales === "Sudah Upload" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                            </span>
                          ) : selectedDetail.dokSales === "Ditolak" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Ditolak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickApprove(selectedDetail.nomorKontrak)}
                          disabled={verifyingDok || selectedDetail.dokSales === "Disetujui"}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 active:scale-95 inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{selectedDetail.dokSales === "Disetujui" ? "Sudah Disetujui" : "Setujui Dokumentasi"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTolakPrompt((prev) => !prev);
                            setTolakReason(selectedDetail.alasanPenolakan || selectedDetail.dokVerifikasi?.alasanPenolakan || "");
                          }}
                          disabled={verifyingDok}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-50 active:scale-95 inline-flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak...</span>
                        </button>
                      </div>
                    </div>

                    {showTolakPrompt && (
                      <div className="pt-2.5 border-t border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-rose-700">
                          Alasan Penolakan Dokumentasi <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={tolakReason}
                          onChange={(e) => setTolakReason(e.target.value)}
                          placeholder="Jelaskan alasan penolakan dokumentasi (wajib diisi, mis. foto barang tidak sesuai)..."
                          className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none text-slate-800 placeholder-slate-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowTolakPrompt(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickReject(selectedDetail.nomorKontrak)}
                            disabled={verifyingDok || !tolakReason.trim()}
                            className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 transition-all shadow-xs"
                          >
                            {verifyingDok ? "Menyimpan..." : "Konfirmasi Tolak"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {loadingDok ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-xs font-medium">Memuat dokumentasi project...</span>
                  </div>
                ) : !dokDetail || !dokDetail.barang || dokDetail.barang.length === 0 ? (
                  <div className="py-6 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">Belum Ada Dokumentasi Project</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Foto dan video dokumentasi belum diunggah oleh sales untuk kontrak ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {dokDetail.barang.map((b: any, idx: number) => {
                      const hasSerahTerima = !!b.fotoSerahTerima;
                      const hasFotoBarang = !!b.fotoBarang;
                      const hasVideo = !!b.videoBarang;
                      const hasAnyMedia = hasSerahTerima || hasFotoBarang || hasVideo;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3"
                        >
                          {/* Info Barang */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                            <div>
                              <span className="text-xs font-bold text-slate-800">
                                Barang #{idx + 1}: {b.unitProduk || "Produk"}
                              </span>
                              <span className="text-xs text-slate-500 ml-1.5">
                                ({b.merekBarang || "-"} {b.tipeBarang ? `• ${b.tipeBarang}` : ""})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-slate-700 rounded-md border border-slate-200">
                                {b.jumlahUnit || 0} Unit
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${
                                  b.kondisiBarang === "BARU"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {b.kondisiBarang || "—"}
                              </span>
                            </div>
                          </div>

                          {b.kendala && (
                            <div className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg">
                              <strong>Kendala:</strong> {b.kendala}
                            </div>
                          )}

                          {/* Grid Media Upload */}
                          {hasAnyMedia ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Foto Serah Terima */}
                              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                                    Foto Serah Terima
                                  </span>
                                  {hasSerahTerima ? (
                                    <div
                                      onClick={() =>
                                        setPreviewMedia({
                                          url: b.fotoSerahTerima,
                                          title: `Foto Serah Terima - ${b.unitProduk || "Barang"}`,
                                        })
                                      }
                                      className="relative group overflow-hidden rounded-lg aspect-video bg-slate-100 flex items-center justify-center border border-slate-100 cursor-pointer"
                                    >
                                      <img
                                        src={b.fotoSerahTerima}
                                        alt="Foto Serah Terima"
                                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Lihat</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-video rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                      Tidak ada foto
                                    </div>
                                  )}
                                </div>
                                {hasSerahTerima && (
                                  <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-100 mt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewMedia({
                                          url: b.fotoSerahTerima,
                                          title: `Foto Serah Terima - ${b.unitProduk || "Barang"}`,
                                        })
                                      }
                                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Preview</span>
                                    </button>
                                    <a
                                      href={b.fotoSerahTerima}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Buka Link</span>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Foto Barang */}
                              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                                    Foto Barang
                                  </span>
                                  {hasFotoBarang ? (
                                    <div
                                      onClick={() =>
                                        setPreviewMedia({
                                          url: b.fotoBarang,
                                          title: `Foto Barang - ${b.unitProduk || "Barang"}`,
                                        })
                                      }
                                      className="relative group overflow-hidden rounded-lg aspect-video bg-slate-100 flex items-center justify-center border border-slate-100 cursor-pointer"
                                    >
                                      <img
                                        src={b.fotoBarang}
                                        alt="Foto Barang"
                                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Lihat</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-video rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                      Tidak ada foto
                                    </div>
                                  )}
                                </div>
                                {hasFotoBarang && (
                                  <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-100 mt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewMedia({
                                          url: b.fotoBarang,
                                          title: `Foto Barang - ${b.unitProduk || "Barang"}`,
                                        })
                                      }
                                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Preview</span>
                                    </button>
                                    <a
                                      href={b.fotoBarang}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Buka Link</span>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Video Barang */}
                              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                                    Video Barang
                                  </span>
                                  {hasVideo ? (
                                    <div className="relative overflow-hidden rounded-lg aspect-video bg-black flex items-center justify-center">
                                      <video
                                        src={b.videoBarang}
                                        controls
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="aspect-video rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                      Tidak ada video
                                    </div>
                                  )}
                                </div>
                                {hasVideo && (
                                  <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-100 mt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewMedia({
                                          url: b.videoBarang,
                                          title: `Video Barang - ${b.unitProduk || "Barang"}`,
                                          isVideo: true,
                                        })
                                      }
                                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <Video className="w-3 h-3" />
                                      <span>Putar Penuh</span>
                                    </button>
                                    <a
                                      href={b.videoBarang}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Buka Link</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Tidak ada berkas foto maupun video yang dilampirkan untuk barang ini.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Request IDs */}
              {selectedDetail.requestIds && selectedDetail.requestIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                    Request ID Terkait (E-Procurement)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetail.requestIds.map((id: string) => (
                      <span key={id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200">
                        <Tag className="w-3 h-3" />
                        <span>{id}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keterangan & Catatan */}
              {(selectedDetail.keterangan || selectedDetail.catatan) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {selectedDetail.keterangan && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Keterangan
                      </span>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedDetail.keterangan}</p>
                    </div>
                  )}
                  {selectedDetail.catatan && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Catatan
                      </span>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedDetail.catatan}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = selectedDetail;
                  setSelectedDetail(null);
                  openEditModal(target);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Ubah Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Pencatatan Pembayaran & Sisa Tagihan ─── */}
      {paymentContract && (() => {
        const totalTerbayar = getTotalTerbayar(paymentContract);
        const sisa = getSisaTagihan(paymentContract);
        const nominal = paymentContract.nominalKontrak || 0;
        const pct = nominal > 0 ? Math.min(100, Math.max(0, Math.round((totalTerbayar / nominal) * 100))) : 0;
        const isLunas = sisa <= 0 && nominal > 0;

        return (
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20 flex-shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Pencatatan Pembayaran
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                      {paymentContract.nomorKontrak} {paymentContract.instansi ? `• ${paymentContract.instansi}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentContract(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-5 text-xs sm:text-sm">
                {/* Ringkasan Finansial 3 Kartu */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Nominal Kontrak
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {fmtCurrencyWithZero(nominal)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                        Total Terbayar
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {pct}%
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-emerald-700">
                      {fmtCurrencyWithZero(totalTerbayar)}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isLunas ? "bg-emerald-50 border-emerald-200" : sisa > 0 ? "bg-rose-50/70 border-rose-100" : "bg-slate-50 border-slate-100"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${isLunas ? "text-emerald-700" : sisa > 0 ? "text-rose-700" : "text-slate-500"}`}>
                        Sisa Tagihan
                      </span>
                      {isLunas && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Lunas
                        </span>
                      )}
                    </div>
                    <span className={`text-base font-extrabold ${isLunas ? "text-emerald-700" : sisa > 0 ? "text-rose-600" : "text-slate-900"}`}>
                      {fmtCurrencyWithZero(sisa)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Realisasi Pembayaran</span>
                    <span className="font-bold text-slate-700">{pct}% ({fmtCurrencyWithZero(totalTerbayar)} / {fmtCurrencyWithZero(nominal)})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                    <div
                      className={`h-full transition-all duration-300 ${isLunas ? "bg-emerald-500" : "bg-emerald-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Form Input Pembayaran Masuk */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Tambah Pembayaran Masuk
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tanggal Pembayaran */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Tanggal Pembayaran <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Jumlah Pembayaran */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Jumlah Pembayaran (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={paymentAmount || ""}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        placeholder="Contoh: 15000000"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                      />
                      {paymentAmount > 0 && (
                        <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                          {fmtCurrencyWithZero(paymentAmount)}
                        </span>
                      )}
                    </div>

                    {/* Keterangan / Termin */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Keterangan / Termin
                      </label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Contoh: DP 30%, Termin 2 (40%), Pelunasan, No Rekening BNI..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Sisa setelah pembayaran ini */}
                  {paymentAmount > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
                      <span className="text-blue-700 font-medium">Estimasi Sisa Tagihan Setelah Ini:</span>
                      <span className={`font-bold ${sisa - paymentAmount <= 0 ? "text-emerald-700" : "text-blue-900"}`}>
                        {sisa - paymentAmount <= 0 ? "Rp 0 (Lunas)" : fmtCurrencyWithZero(sisa - paymentAmount)}
                      </span>
                    </div>
                  )}

                  {paymentError && (
                    <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 text-xs font-semibold border border-rose-200">
                      {paymentError}
                    </div>
                  )}

                  {paymentSuccess && (
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{paymentSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={savingPayment}
                      onClick={() => handleAddPayment(paymentContract)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                    >
                      {savingPayment ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Simpan Pembayaran</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tabel Riwayat Pembayaran */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Riwayat Pembayaran ({paymentContract.pembayaran?.length || 0})
                    </span>
                  </div>

                  {!paymentContract.pembayaran || paymentContract.pembayaran.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                      <p className="text-xs font-medium text-slate-600">Belum ada riwayat pembayaran</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gunakan formulir di atas untuk mencatat pembayaran pertama.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3 text-right">Jumlah Masuk</th>
                            <th className="py-2.5 px-3">Keterangan</th>
                            <th className="py-2.5 px-3">Dicatat Oleh</th>
                            <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentContract.pembayaran.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                {fmtDate(p.tanggal)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-700 text-right whitespace-nowrap">
                                {fmtCurrencyWithZero(p.jumlah)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {p.keterangan || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                {p.createdBy || "Admin"}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(paymentContract, p.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Hapus pembayaran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentContract(null)}
                  className="px-5 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-white/10 text-white">
              <span className="text-xs font-bold truncate pr-2">{previewMedia.title}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded bg-white/10 transition-colors"
                >
                  Buka Asli ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-black/40">
              {previewMedia.isVideo ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[75vh] rounded-lg shadow-md"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
                />
              )}
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
