"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmModal from "@/components/modals/ConfirmModal";
import {
  FileText,
  ClipboardList,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  Users,
  Plus,
  X,
  Upload,
  Send,
  Package,
  Image as ImageIcon,
  Video,
  RotateCw,
  Building2,
  Hash,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Search,
  Filter,
  ExternalLink,
  Maximize2,
  LayoutGrid,
  XCircle,
} from "lucide-react";

/* ─── Types ─── */
type Contract = {
  nomorKontrak: string;
  perusahaan: string;
  bendera: string;
  tanggalKontrak: string;
  instansi: string;
  namaPengadaan: string;
  nominalKontrak: number;
  pic: string;
  marketing?: string;
  [key: string]: any;
};

type UserOption = { _id: string; fullName: string; role: string };

type BarangItem = {
  unitProduk: string;
  merekBarang: string;
  tipeBarang: string;
  jumlahUnit: number;
  kondisiBarang: "BARU" | "ADA KENDALA" | "";
  kendala?: string;
  fotoSerahTerimaFile: File | null;
  fotoBarangFile: File | null;
  videoBarangFile: File | null;
};

type Stats = {
  totalKontrak: number;
  belumDireport: number;
  sudahDireport: number;
  salesCount: number;
};

const emptyBarang = (): BarangItem => ({
  unitProduk: "",
  merekBarang: "",
  tipeBarang: "",
  jumlahUnit: 0,
  kondisiBarang: "",
  kendala: "",
  fotoSerahTerimaFile: null,
  fotoBarangFile: null,
  videoBarangFile: null,
});

/* ─── Helpers ─── */
function fmtCurrency(n: number) {
  if (!n) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileExt(file: File): string {
  const name = file.name;
  const ext = name.split(".").pop();
  return ext || "bin";
}

export type LightboxMedia = {
  url: string;
  type: "image" | "video";
  title: string;
  subtitle?: string;
  category?: string;
  kondisi?: string;
  kendala?: string;
};

function fmtDate(d?: string | Date) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function extractMediaFromDoc(doc: any): LightboxMedia[] {
  const list: LightboxMedia[] = [];
  (doc.barang || []).forEach((b: any, i: number) => {
    const barangTitle = `${b.unitProduk || `Barang #${i + 1}`} ${b.merekBarang ? `(${b.merekBarang} ${b.tipeBarang || ""})` : ""}`.trim();
    const subtitle = `Kontrak: ${doc.nomorKontrak} • Sales: ${doc.namaSales || "—"}`;

    if (b.fotoSerahTerima) {
      list.push({
        url: b.fotoSerahTerima,
        type: "image",
        title: `Foto Serah Terima — ${barangTitle}`,
        subtitle,
        category: "Foto Serah Terima",
        kondisi: b.kondisiBarang,
        kendala: b.kendala,
      });
    }
    if (b.fotoBarang) {
      list.push({
        url: b.fotoBarang,
        type: "image",
        title: `Foto Barang — ${barangTitle}`,
        subtitle,
        category: "Foto Produk / Barang",
        kondisi: b.kondisiBarang,
        kendala: b.kendala,
      });
    }
    if (b.videoBarang) {
      list.push({
        url: b.videoBarang,
        type: "video",
        title: `Video Dokumentasi — ${barangTitle}`,
        subtitle,
        category: "Video Dokumentasi",
        kondisi: b.kondisiBarang,
        kendala: b.kendala,
      });
    }
  });
  return list;
}

/* ─── Main Content ─── */
function DokumentasiProjectContent() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalKontrak: 0,
    belumDireport: 0,
    sudahDireport: 0,
    salesCount: 0,
  });

  // Data for dropdowns
  const [salesUsers, setSalesUsers] = useState<UserOption[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [kotaList, setKotaList] = useState<string[]>([]);

  // Form state
  const [namaSales, setNamaSales] = useState("");
  const [tanggalReport, setTanggalReport] = useState("");
  const [kotaKabupaten, setKotaKabupaten] = useState("");
  const [nomorKontrak, setNomorKontrak] = useState("");

  // Auto-filled from contract
  const [bendera, setBendera] = useState("");
  const [tanggalKontrak, setTanggalKontrak] = useState("");
  const [entityProject, setEntityProject] = useState("");
  const [nilaiPengadaan, setNilaiPengadaan] = useState(0);
  const [picAdmin, setPicAdmin] = useState("");

  // Request ID SPH
  const [requestIdSph, setRequestIdSph] = useState<string[]>([""]);

  // Daftar Barang
  const [barangList, setBarangList] = useState<BarangItem[]>([emptyBarang()]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Tab Navigation: "upload" (default di depan) vs "galeri" (hanya admin/superadmin)
  const [activeTab, setActiveTab] = useState<"upload" | "galeri">("upload");

  // Dokumentasi List for Galeri
  const [dokumentasiList, setDokumentasiList] = useState<any[]>([]);

  // Galeri Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterSales, setFilterSales] = useState("Semua");
  const [filterMediaType, setFilterMediaType] = useState<"semua" | "foto" | "video">("semua");

  // Lightbox Modal
  const [lightboxData, setLightboxData] = useState<{
    items: LightboxMedia[];
    initialIndex: number;
  } | null>(null);

  // Role check: hanya role ADMIN dan SUPERADMIN yang bisa melihat galeri & pratinjau
  const isAdminOrSuperadmin =
    user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  // Auth check: semua role yang login dapat mengakses form pengiriman dokumentasi
  useEffect(() => {
    if (!sessionLoading) {
      if (!user) {
        router.replace("/");
      }
    }
  }, [user, sessionLoading, router]);

  // Enforce role: user non-admin tidak dapat mengakses tab galeri
  useEffect(() => {
    if (!isAdminOrSuperadmin && activeTab === "galeri") {
      setActiveTab("upload");
    }
  }, [isAdminOrSuperadmin, activeTab]);

  // Auto-select nama sales jika user login adalah sales
  useEffect(() => {
    if (user?.role === "SALES" && user.fullName && !namaSales) {
      setNamaSales(user.fullName);
    }
  }, [user, namaSales]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      const [usersRes, contractsRes, paramsRes, statsRes] = await Promise.all([
        fetch(`/api/users?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/contracts?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/parameters?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/dokumentasi-project?_t=${Date.now()}`, { cache: "no-store" }),
      ]);

      const usersJson = await usersRes.json().catch(() => ({}));
      const contractsJson = await contractsRes.json().catch(() => ({}));
      const paramsJson = await paramsRes.json().catch(() => ({}));
      const statsJson = await statsRes.json().catch(() => ({}));

      if (usersJson.data) {
        setSalesUsers(usersJson.data);
      }

      if (contractsJson.data) {
        setContracts(contractsJson.data);
      }

      if (paramsJson.data?.kota_kabupaten) {
        setKotaList(paramsJson.data.kota_kabupaten);
      }

      if (statsJson.stats) {
        setStats(statsJson.stats);
      }

      if (Array.isArray(statsJson.data)) {
        setDokumentasiList(statsJson.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
  };

  const handleOpenDocMedia = (doc: any, mediaUrl?: string) => {
    const list = extractMediaFromDoc(doc);
    if (list.length === 0) return;
    const foundIdx = mediaUrl ? list.findIndex((m) => m.url === mediaUrl) : 0;
    setLightboxData({
      items: list,
      initialIndex: foundIdx >= 0 ? foundIdx : 0,
    });
  };

  const handleReviseContract = (item: any) => {
    setNamaSales(item.namaSales || "");
    setNomorKontrak(item.nomorKontrak || "");
    setActiveTab("upload");
  };

  const handlePreviewLocalFile = (media: LightboxMedia) => {
    setLightboxData({
      items: [media],
      initialIndex: 0,
    });
  };

  const salesListInDok = useMemo(() => {
    const set = new Set<string>();
    dokumentasiList.forEach((d) => {
      if (d.namaSales) set.add(d.namaSales);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [dokumentasiList]);

  const filteredDokList = useMemo(() => {
    return dokumentasiList.filter((item) => {
      const contract = contracts.find((c) => c.nomorKontrak === item.nomorKontrak);
      const dokStatus =
        contract?.dokSales ||
        (item.verifikasi?.status === "DISETUJUI"
          ? "Disetujui"
          : item.verifikasi?.status === "DITOLAK"
            ? "Ditolak"
            : "Proses Verifikasi");

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKontrak = item.nomorKontrak?.toLowerCase().includes(q);
        const matchSales = item.namaSales?.toLowerCase().includes(q);
        const matchPengadaan = (item.entityProject || contract?.namaPengadaan || "").toLowerCase().includes(q);
        const matchInstansi = (contract?.instansi || "").toLowerCase().includes(q);
        const matchBarang = (item.barang || []).some((b: any) =>
          b.unitProduk?.toLowerCase().includes(q) ||
          b.merekBarang?.toLowerCase().includes(q) ||
          b.tipeBarang?.toLowerCase().includes(q)
        );
        if (!matchKontrak && !matchSales && !matchPengadaan && !matchInstansi && !matchBarang) {
          return false;
        }
      }

      if (filterStatus !== "Semua") {
        if (filterStatus === "Disetujui") {
          if (dokStatus !== "Disetujui" && dokStatus !== "Sudah Upload") return false;
        } else {
          if (dokStatus !== filterStatus) return false;
        }
      }

      if (filterSales !== "Semua") {
        if (item.namaSales?.toLowerCase() !== filterSales.toLowerCase()) return false;
      }

      if (filterMediaType === "video") {
        const hasVideo = (item.barang || []).some((b: any) => !!b.videoBarang);
        if (!hasVideo) return false;
      } else if (filterMediaType === "foto") {
        const hasPhoto = (item.barang || []).some((b: any) => !!b.fotoSerahTerima || !!b.fotoBarang);
        if (!hasPhoto) return false;
      }

      return true;
    });
  }, [dokumentasiList, contracts, searchQuery, filterStatus, filterSales, filterMediaType]);

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user, fetchInitialData]);

  // Dropdown options: Tampilkan semua user (tanpa filter role & tanpa harus sudah punya kontrak)
  const salesOptions = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Masukkan semua user yang terdaftar di sistem
    salesUsers.forEach((u) => {
      const name = (u.fullName || "").trim();
      if (name) map.set(name.toLowerCase(), name);
    });

    // 2. Masukkan juga nama marketing dari kontrak jika ada yang belum terdaftar di users
    contracts.forEach((c) => {
      const m = (c.marketing || "").trim();
      if (m && !map.has(m.toLowerCase())) {
        map.set(m.toLowerCase(), m);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.localeCompare(b, "id-ID"))
      .map((name) => ({
        value: name,
        label: name,
      }));
  }, [salesUsers, contracts]);

  // Kontrak yang tersedia hanya yang diajukan oleh sales yang dipilih
  const availableContracts = useMemo(() => {
    if (!namaSales) return [];
    const target = namaSales.trim().toLowerCase();
    return contracts.filter((c) => {
      const marketing = (c.marketing || "").trim().toLowerCase();
      return marketing === target;
    });
  }, [contracts, namaSales]);

  const contractOptions = useMemo(
    () =>
      availableContracts.map((c) => ({
        value: c.nomorKontrak,
        label: `${c.nomorKontrak}${c.namaPengadaan ? ` — ${c.namaPengadaan}` : ""}${c.instansi ? ` (${c.instansi})` : ""}`,
      })),
    [availableContracts]
  );

  const kotaOptions = useMemo(
    () => kotaList.map((k) => ({ value: k, label: k })),
    [kotaList]
  );

  // Ketika nama sales berubah, reset nomor kontrak jika kontrak lama bukan milik sales tersebut
  useEffect(() => {
    if (nomorKontrak) {
      const existsInAvailable = availableContracts.some(
        (c) => c.nomorKontrak === nomorKontrak
      );
      if (!existsInAvailable) {
        setNomorKontrak("");
      }
    }
  }, [namaSales, availableContracts, nomorKontrak]);

  // When contract is selected, auto-fill fields
  useEffect(() => {
    if (!nomorKontrak) {
      setBendera("");
      setTanggalKontrak("");
      setEntityProject("");
      setNilaiPengadaan(0);
      setPicAdmin("");
      return;
    }
    const contract = contracts.find((c) => c.nomorKontrak === nomorKontrak);
    if (contract) {
      setBendera(contract.bendera || "");
      setTanggalKontrak(contract.tanggalKontrak || "");
      setEntityProject(contract.namaPengadaan || "");
      setNilaiPengadaan(contract.nominalKontrak || 0);
      setPicAdmin(contract.pic || "");
    }
  }, [nomorKontrak, contracts]);

  // Request ID SPH handlers
  const addRequestIdSph = () => setRequestIdSph((prev) => [...prev, ""]);
  const removeRequestIdSph = (idx: number) =>
    setRequestIdSph((prev) => prev.filter((_, i) => i !== idx));
  const updateRequestIdSph = (idx: number, val: string) =>
    setRequestIdSph((prev) => prev.map((v, i) => (i === idx ? val : v)));

  // Barang handlers
  const addBarang = () => setBarangList((prev) => [...prev, emptyBarang()]);
  const removeBarang = (idx: number) =>
    setBarangList((prev) => prev.filter((_, i) => i !== idx));
  const updateBarang = (
    idx: number,
    field: keyof BarangItem,
    value: any
  ) =>
    setBarangList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );

  // Submit
  const handleSubmit = async (confirmedReplace = false) => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!namaSales) {
      setSubmitError("Nama Sales wajib dipilih");
      return;
    }
    if (!tanggalReport) {
      setSubmitError("Tanggal Report wajib diisi");
      return;
    }
    if (!nomorKontrak) {
      setSubmitError("Nomor Kontrak/SPK wajib dipilih");
      return;
    }

    for (let i = 0; i < barangList.length; i++) {
      const item = barangList[i];
      if (item.kondisiBarang === "ADA KENDALA" && !item.kendala?.trim()) {
        setSubmitError(`Keterangan kendala pada Barang #${i + 1} wajib diisi`);
        return;
      }
    }

    // Satu kontrak = satu dokumentasi: minta konfirmasi jika akan menimpa yang lama
    const hasExisting = contracts.some(
      (c) =>
        c.nomorKontrak === nomorKontrak &&
        c.dokSales &&
        c.dokSales !== "Belum Upload"
    );
    if (hasExisting && !confirmedReplace) {
      setShowReplaceConfirm(true);
      return;
    }

    setSubmitting(true);

    try {
      // Process barang files to base64
      const processedBarang = [];
      for (const item of barangList) {
        const processed: any = {
          unitProduk: item.unitProduk,
          merekBarang: item.merekBarang,
          tipeBarang: item.tipeBarang,
          jumlahUnit: item.jumlahUnit,
          kondisiBarang: item.kondisiBarang,
          kendala: item.kondisiBarang === "ADA KENDALA" ? (item.kendala || "").trim() : "",
        };

        if (item.fotoSerahTerimaFile) {
          processed.fotoSerahTerimaBase64 = await fileToBase64(
            item.fotoSerahTerimaFile
          );
          processed.fotoSerahTerimaExt = getFileExt(item.fotoSerahTerimaFile);
        }
        if (item.fotoBarangFile) {
          processed.fotoBarangBase64 = await fileToBase64(item.fotoBarangFile);
          processed.fotoBarangExt = getFileExt(item.fotoBarangFile);
        }
        if (item.videoBarangFile) {
          processed.videoBarangBase64 = await fileToBase64(
            item.videoBarangFile
          );
          processed.videoBarangExt = getFileExt(item.videoBarangFile);
        }

        processedBarang.push(processed);
      }

      const payload = {
        namaSales,
        tanggalReport,
        kotaKabupaten,
        nomorKontrak,
        bendera,
        tanggalKontrak,
        entityProject,
        nilaiPengadaan,
        picAdmin,
        requestIdSph: requestIdSph.filter(Boolean),
        barang: processedBarang,
      };

      const res = await fetch("/api/dokumentasi-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim dokumentasi");

      setSubmitSuccess(
        json.verifikasi?.issues?.length > 0
          ? `Dokumentasi berhasil dikirim. Catatan verifikasi: ${json.verifikasi.issues.join("; ")} (Menunggu persetujuan admin)`
          : "Dokumentasi berhasil dikirim! Status saat ini: Proses Verifikasi (menunggu persetujuan admin)."
      );
      if (json.replaced) {
        setSubmitSuccess((prev) => `${prev} (menggantikan dokumentasi sebelumnya; versi lama diarsipkan)`);
      }

      // Reset form
      setNamaSales("");
      setTanggalReport("");
      setKotaKabupaten("");
      setNomorKontrak("");
      setBendera("");
      setTanggalKontrak("");
      setEntityProject("");
      setNilaiPengadaan(0);
      setPicAdmin("");
      setRequestIdSph([""]);
      setBarangList([emptyBarang()]);

      // Refresh stats
      fetchInitialData();

      setTimeout(() => setSubmitSuccess(""), 12000);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Gagal mengirim dokumentasi");
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex w-full min-h-[400px] items-center justify-center p-8 text-slate-500 font-medium">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-xs border border-slate-200">
          <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Memuat data dokumentasi project...</span>
        </div>
      </div>
    );
  }

  const labelCls =
    "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5";
  const inputCls =
    "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400";
  const readOnlyCls =
    "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed";

  return (
    <div className="min-h-screen bg-blue-50/50 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ─── Top Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dokumentasi Project
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Form pelaporan & dokumentasi serah terima barang atau project
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{user?.role}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-900">{user?.fullName}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Segarkan Data"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Stats Cards Grid (Khusus Admin & Superadmin) ─── */}
      {isAdminOrSuperadmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Kontrak
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.totalKontrak}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Belum Direport
              </div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">
                {stats.belumDireport}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sudah Direport
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">
                {stats.sudahDireport}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Sales
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {stats.salesCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation Tabs: Form Upload (di depan) vs Galeri & Pratinjau ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Tab 1: Form Pengiriman / Upload (di posisi depan/pertama) */}
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Form Pengiriman / Upload</span>
          </button>

          {/* Tab 2: Galeri & Pratinjau (Hanya bisa dilihat oleh role ADMIN & SUPERADMIN) */}
          {isAdminOrSuperadmin && (
            <button
              type="button"
              onClick={() => setActiveTab("galeri")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
                activeTab === "galeri"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Galeri & Pratinjau</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  activeTab === "galeri"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {dokumentasiList.length}
              </span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium px-2 hidden sm:block">
          {activeTab === "galeri" && isAdminOrSuperadmin
            ? `Menampilkan ${filteredDokList.length} dari ${dokumentasiList.length} project`
            : "Form upload bukti fisik serah terima barang"}
        </div>
      </div>

      {activeTab === "galeri" && isAdminOrSuperadmin ? (
        /* ─── Galeri Dokumentasi Tab Content ─── */
        <div className="space-y-5">
          {/* Controls Bar: Search & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari no. kontrak, sales, instansi, produk..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              >
                <option value="Semua">Semua Status</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Proses Verifikasi">Proses Verifikasi</option>
                <option value="Ditolak">Ditolak</option>
              </select>

              {/* Sales Filter */}
              {salesListInDok.length > 0 && (
                <select
                  value={filterSales}
                  onChange={(e) => setFilterSales(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white max-w-[160px] truncate"
                >
                  <option value="Semua">Semua Sales</option>
                  {salesListInDok.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}

              {/* Media Type Filter */}
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMediaType("semua")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMediaType === "semua"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMediaType("foto")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMediaType === "foto"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Foto
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMediaType("video")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterMediaType === "video"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Baru</span>
            </button>
          </div>

          {/* Cards Grid */}
          {filteredDokList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {dokumentasiList.length === 0
                    ? "Belum Ada Dokumentasi Project"
                    : "Tidak Ditemukan Dokumentasi yang Cocok"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dokumentasiList.length === 0
                    ? "Sales belum mengunggah foto atau video serah terima untuk kontrak manapun."
                    : "Coba ubah kata kunci pencarian atau sesuaikan filter status dan sales."}
                </p>
              </div>
              <div className="pt-2">
                {dokumentasiList.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Dokumentasi Pertama</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("Semua");
                      setFilterSales("Semua");
                      setFilterMediaType("semua");
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredDokList.map((doc, docIdx) => {
                const contract = contracts.find((c) => c.nomorKontrak === doc.nomorKontrak);
                const dokStatus =
                  contract?.dokSales ||
                  (doc.verifikasi?.status === "DISETUJUI"
                    ? "Disetujui"
                    : doc.verifikasi?.status === "DITOLAK"
                      ? "Ditolak"
                      : "Proses Verifikasi");
                const allMedia = extractMediaFromDoc(doc);
                const hasRejection =
                  dokStatus === "Ditolak" ||
                  doc.verifikasi?.status === "DITOLAK" ||
                  contract?.alasanPenolakan ||
                  doc.verifikasi?.alasanPenolakan;
                const rejectionReason =
                  contract?.alasanPenolakan || doc.verifikasi?.alasanPenolakan || "Perlu revisi dokumentasi";

                return (
                  <div
                    key={`${doc.nomorKontrak}-${docIdx}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                            Nomor Kontrak
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {doc.nomorKontrak}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                            dokStatus === "Disetujui" || dokStatus === "Sudah Upload"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : dokStatus === "Ditolak"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {dokStatus === "Disetujui" || dokStatus === "Sudah Upload" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Disetujui</span>
                            </>
                          ) : dokStatus === "Ditolak" ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Ditolak</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Proses Verifikasi</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {doc.namaSales || "Sales"}
                        </span>
                        {doc.tanggalReport && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {fmtDate(doc.tanggalReport)}
                          </span>
                        )}
                        {(doc.entityProject || contract?.namaPengadaan) && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[220px]" title={doc.entityProject || contract?.namaPengadaan}>
                            • {doc.entityProject || contract?.namaPengadaan}
                          </span>
                        )}
                      </div>

                      {/* Rejection Alert if Ditolak */}
                      {hasRejection && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-rose-900">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span>Alasan Penolakan:</span>
                          </div>
                          <p className="text-[11px] text-rose-700 pl-4">{rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Card Body: Barang & Media Gallery */}
                    <div className="p-4 space-y-4 flex-1">
                      {(doc.barang || []).map((b: any, bIdx: number) => {
                        const hasSerah = !!b.fotoSerahTerima;
                        const hasBarang = !!b.fotoBarang;
                        const hasVideo = !!b.videoBarang;
                        const mediaCount = (hasSerah ? 1 : 0) + (hasBarang ? 1 : 0) + (hasVideo ? 1 : 0);

                        return (
                          <div
                            key={bIdx}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {b.unitProduk || `Barang #${bIdx + 1}`}
                                {b.merekBarang ? ` (${b.merekBarang} ${b.tipeBarang || ""})` : ""}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-slate-700 rounded border border-slate-200">
                                  {b.jumlahUnit || 0} Unit
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase border ${
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
                              <p className="text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                                <strong>Kendala:</strong> {b.kendala}
                              </p>
                            )}

                            {/* Media Grid */}
                            {mediaCount > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {/* Foto Serah Terima */}
                                {hasSerah && (
                                  <div
                                    onClick={() => handleOpenDocMedia(doc, b.fotoSerahTerima)}
                                    className="relative group/thumb aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-2xs hover:shadow-xs transition-all"
                                  >
                                    <img
                                      src={b.fotoSerahTerima}
                                      alt="Serah Terima"
                                      className="w-full h-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                      <Eye className="w-3 h-3" />
                                      <span>Lihat</span>
                                    </div>
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                                      Serah Terima
                                    </span>
                                  </div>
                                )}

                                {/* Foto Barang */}
                                {hasBarang && (
                                  <div
                                    onClick={() => handleOpenDocMedia(doc, b.fotoBarang)}
                                    className="relative group/thumb aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-2xs hover:shadow-xs transition-all"
                                  >
                                    <img
                                      src={b.fotoBarang}
                                      alt="Foto Barang"
                                      className="w-full h-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                      <Eye className="w-3 h-3" />
                                      <span>Lihat</span>
                                    </div>
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                                      Barang
                                    </span>
                                  </div>
                                )}

                                {/* Video Barang */}
                                {hasVideo && (
                                  <div
                                    onClick={() => handleOpenDocMedia(doc, b.videoBarang)}
                                    className="relative group/thumb aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer shadow-2xs hover:shadow-xs transition-all flex items-center justify-center"
                                  >
                                    <video
                                      src={b.videoBarang}
                                      className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100"
                                    />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover/thumb:scale-110 transition-transform">
                                        <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
                                      </div>
                                    </div>
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs">
                                      Video
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                Belum ada berkas media dilampirkan.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {allMedia.length} berkas media
                      </span>

                      <div className="flex items-center gap-1.5">
                        {hasRejection && (
                          <button
                            type="button"
                            onClick={() => handleReviseContract(doc)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                          >
                            Unggah Revisi
                          </button>
                        )}
                        {allMedia.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenDocMedia(doc)}
                            className="px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>Buka Galeri</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── Upload Form Tab Content ─── */
        <>
          {/* Alerts */}
          {submitError && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-600 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-600 text-sm font-semibold flex items-center justify-between gap-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{submitSuccess}</span>
              </div>
              {isAdminOrSuperadmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("galeri")}
                  className="text-xs font-bold underline hover:text-emerald-800 flex-shrink-0"
                >
                  Lihat di Galeri &rarr;
                </button>
              )}
            </div>
          )}

          {/* Form Container */}
          <div className="space-y-6">
        {/* ─ Section 1: INFO LAPORAN ─ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                1. Info Laporan
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Bagian 1 dari 4
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Nama Sales <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={[
                    { value: "", label: "— Pilih Sales —" },
                    ...salesOptions,
                  ]}
                  value={namaSales}
                  onChange={(val) => setNamaSales(val)}
                  placeholder="— Pilih Sales —"
                  isClearable
                />
              </div>

              <div>
                <label className={labelCls}>
                  Tanggal Report <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={tanggalReport}
                  onChange={(e) => setTanggalReport(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Kota / Kabupaten</label>
              <SearchableSelect
                options={kotaOptions}
                value={kotaKabupaten}
                onChange={(val) => setKotaKabupaten(val)}
                placeholder="Cari atau ketik kota/kabupaten..."
                isClearable
              />
            </div>
          </div>
        </div>

        {/* ─ Section 2: KONTRAK / SPK ─ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                2. Data Kontrak / SPK
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Bagian 2 dari 4
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>
                  No Kontrak / SPK <span className="text-rose-500">*</span>
                </label>
                {namaSales && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {availableContracts.length} kontrak tersedia ({namaSales})
                  </span>
                )}
              </div>

              <SearchableSelect
                options={[
                  { value: "", label: "— Pilih No Kontrak/SPK —" },
                  ...contractOptions,
                ]}
                value={nomorKontrak}
                onChange={(val) => setNomorKontrak(val)}
                placeholder={
                  !namaSales
                    ? "Pilih Nama Sales terlebih dahulu..."
                    : availableContracts.length === 0
                      ? `Tidak ada kontrak untuk ${namaSales}`
                      : "— Pilih No Kontrak/SPK —"
                }
                isDisabled={!namaSales || availableContracts.length === 0}
                isClearable
              />

              {!namaSales ? (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span>
                    Silakan pilih <strong>Nama Sales</strong> pada bagian <strong>1. Info Laporan</strong> terlebih dahulu untuk memunculkan kontrak yang diajukan sales terkait.
                  </span>
                </div>
              ) : availableContracts.length === 0 ? (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-slate-400" />
                  <span>
                    Tidak ditemukan data kontrak yang diajukan oleh sales <strong>{namaSales}</strong>.
                  </span>
                </div>
              ) : null}

              {nomorKontrak && (() => {
                const c = contracts.find((item) => item.nomorKontrak === nomorKontrak);
                if (c?.dokSales === "Ditolak") {
                  return (
                    <div className="flex items-start gap-2 mt-2.5 text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <strong className="block text-rose-900 font-bold">Dokumentasi Sebelumnya Ditolak Admin</strong>
                        <span>Alasan penolakan: {c.alasanPenolakan || c.dokVerifikasi?.alasanPenolakan || "Perlu revisi dokumentasi"}.</span>
                        <p className="text-[11px] text-rose-600 mt-1">Mengirim formulir ini akan mengunggah versi revisi baru untuk diverifikasi kembali oleh admin.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Bendera (Perusahaan)</label>
                <input
                  type="text"
                  className={readOnlyCls}
                  value={bendera}
                  readOnly
                  placeholder="Otomatis terisi dari data kontrak..."
                />
              </div>
              <div>
                <label className={labelCls}>Tanggal Kontrak</label>
                <input
                  type="text"
                  className={readOnlyCls}
                  value={tanggalKontrak}
                  readOnly
                  placeholder="Otomatis terisi dari data kontrak..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Entity Project (Pengadaan)</label>
                <input
                  type="text"
                  className={readOnlyCls}
                  value={entityProject}
                  readOnly
                  placeholder="Otomatis terisi dari data kontrak..."
                />
              </div>
              <div>
                <label className={labelCls}>Nilai Pengadaan</label>
                <input
                  type="text"
                  className={readOnlyCls}
                  value={nilaiPengadaan ? fmtCurrency(nilaiPengadaan) : ""}
                  readOnly
                  placeholder="Rp Otomatis terisi..."
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>PIC Admin</label>
              <input
                type="text"
                className={readOnlyCls}
                value={picAdmin}
                readOnly
                placeholder="Otomatis terisi dari data kontrak..."
              />
            </div>
          </div>
        </div>

        {/* ─ Section 3: REQUEST ID SPH ─ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100/70 text-rose-600 flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                3. Request ID SPH
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Bagian 3 dari 4
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-3">
            {requestIdSph.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-xs pointer-events-none">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    className={`${inputCls} pl-9`}
                    value={val}
                    onChange={(e) => updateRequestIdSph(idx, e.target.value)}
                    placeholder="Input manual Request ID SPH..."
                  />
                </div>
                {requestIdSph.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRequestIdSph(idx)}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors flex-shrink-0"
                    title="Hapus ID"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <div className="pt-1">
              <button
                type="button"
                onClick={addRequestIdSph}
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-4 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Tambah Request ID SPH
              </button>
            </div>
          </div>
        </div>

        {/* ─ Section 4: DAFTAR BARANG ─ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                4. Daftar Barang & Dokumentasi Fisik
              </h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {barangList.length} Barang
            </span>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            {barangList.map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/40 relative shadow-2xs"
              >
                {/* Header item */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold tracking-wider">
                      <Package className="w-3.5 h-3.5" />
                      BARANG #{idx + 1}
                    </span>
                    {item.unitProduk && (
                      <span className="text-xs font-semibold text-slate-600">
                        {item.unitProduk}
                      </span>
                    )}
                  </div>
                  {barangList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBarang(idx)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/60 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Hapus Barang
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Unit Produk</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={item.unitProduk}
                      onChange={(e) =>
                        updateBarang(idx, "unitProduk", e.target.value)
                      }
                      placeholder="Contoh: Laptop, Meja, Kursi..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Merek Barang</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={item.merekBarang}
                      onChange={(e) =>
                        updateBarang(idx, "merekBarang", e.target.value)
                      }
                      placeholder="Contoh: Dell, HP, Informa..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tipe Barang</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={item.tipeBarang}
                      onChange={(e) =>
                        updateBarang(idx, "tipeBarang", e.target.value)
                      }
                      placeholder="Contoh: Latitude 3420..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Jumlah Unit</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={item.jumlahUnit || ""}
                      onChange={(e) =>
                        updateBarang(
                          idx,
                          "jumlahUnit",
                          Number(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kondisi Barang</label>
                    <select
                      className={inputCls}
                      value={item.kondisiBarang}
                      onChange={(e) => {
                        const val = e.target.value as "BARU" | "ADA KENDALA" | "";
                        setBarangList((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  kondisiBarang: val,
                                  kendala: val === "ADA KENDALA" ? it.kendala : "",
                                }
                              : it
                          )
                        );
                      }}
                    >
                      <option value="">— Pilih Kondisi —</option>
                      <option value="BARU">BARU</option>
                      <option value="ADA KENDALA">ADA KENDALA</option>
                    </select>
                  </div>
                </div>

                {/* Input Manual Kendala jika kondisiBarang === 'ADA KENDALA' */}
                {item.kondisiBarang === "ADA KENDALA" && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1.5 transition-all">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Keterangan Kendala Barang <span className="text-rose-500">*</span>
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
                      value={item.kendala || ""}
                      onChange={(e) => updateBarang(idx, "kendala", e.target.value)}
                      placeholder="Jelaskan kendala atau kerusakan pada barang ini secara rinci..."
                    />
                  </div>
                )}

                {/* File Uploads */}
                <div>
                  <label className={labelCls}>Upload Bukti & Dokumentasi</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FileUploadBox
                      label="Foto Serah Terima"
                      icon={<ImageIcon className="w-6 h-6 text-emerald-500" />}
                      accept="image/*"
                      file={item.fotoSerahTerimaFile}
                      onChange={(f) =>
                        updateBarang(idx, "fotoSerahTerimaFile", f)
                      }
                      onPreview={handlePreviewLocalFile}
                    />
                    <FileUploadBox
                      label="Foto Barang"
                      icon={<ImageIcon className="w-6 h-6 text-blue-500" />}
                      accept="image/*"
                      file={item.fotoBarangFile}
                      onChange={(f) => updateBarang(idx, "fotoBarangFile", f)}
                      onPreview={handlePreviewLocalFile}
                    />
                    <FileUploadBox
                      label="Video Barang"
                      icon={<Video className="w-6 h-6 text-violet-500" />}
                      accept="video/*"
                      file={item.videoBarangFile}
                      onChange={(f) => updateBarang(idx, "videoBarangFile", f)}
                      onPreview={handlePreviewLocalFile}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button
                type="button"
                onClick={addBarang}
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-4 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Tambah Barang Lainnya
              </button>
            </div>
          </div>
        </div>

        {/* ─── Submit Bottom Bar ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Pastikan seluruh data yang dimasukkan telah sesuai dan valid sebelum mengirim dokumentasi.
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 ml-auto"
          >
            {submitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Mengirim Dokumentasi...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Dokumentasi</span>
              </>
            )}
          </button>
        </div>
      </div>
      </>
      )}

      {/* Lightbox Modal */}
      {lightboxData && (
        <LightboxModal
          items={lightboxData.items}
          initialIndex={lightboxData.initialIndex}
          onClose={() => setLightboxData(null)}
        />
      )}

      <ConfirmModal
        open={showReplaceConfirm}
        title="Ganti Dokumentasi Lama?"
        message={
          <>
            Kontrak <strong>{nomorKontrak}</strong> sudah memiliki dokumentasi project.
            Jika dilanjutkan, dokumentasi baru akan menjadi yang aktif, sedangkan
            dokumentasi lama <strong>diarsipkan</strong> (foto dan videonya tidak dihapus)
            dan masih bisa dilihat sebagai versi sebelumnya.
          </>
        }
        confirmText="GANTI"
        cancelText="BATAL"
        onCancel={() => setShowReplaceConfirm(false)}
        onConfirm={() => {
          setShowReplaceConfirm(false);
          handleSubmit(true);
        }}
      />
    </div>
  );
}

/* ─── Lightbox Modal Component ─── */
function LightboxModal({
  items,
  initialIndex = 0,
  onClose,
}: {
  items: LightboxMedia[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const current = items[index];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      }
      if (e.key === "ArrowRight") {
        setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-white/10 text-white z-10 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-3">
          {current.category && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600/90 text-white flex-shrink-0">
              {current.category}
            </span>
          )}
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold truncate text-white">
              {current.title}
            </h4>
            {current.subtitle && (
              <p className="text-[11px] text-slate-400 truncate">
                {current.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-300 px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">
            {index + 1} / {items.length}
          </span>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-all inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka Asli</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        className="relative flex-1 flex items-center justify-center p-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))}
            className="absolute left-4 z-20 w-11 h-11 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl"
            title="Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Content */}
        <div className="max-w-5xl max-h-[75vh] w-full flex items-center justify-center">
          {current.type === "video" ? (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl bg-black"
            />
          ) : (
            <img
              key={current.url}
              src={current.url}
              alt={current.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            />
          )}
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))}
            className="absolute right-4 z-20 w-11 h-11 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl"
            title="Berikutnya (Panah Kanan)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Footer Info & Thumbnails */}
      <div
        className="px-4 py-3 bg-slate-900/90 border-t border-white/10 z-10 flex-shrink-0 space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {(current.kondisi || current.kendala) && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {current.kondisi && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  current.kondisi === "BARU"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                Kondisi: {current.kondisi}
              </span>
            )}
            {current.kendala && (
              <span className="text-rose-300 text-xs font-medium">
                Kendala: {current.kendala}
              </span>
            )}
          </div>
        )}

        {/* Thumbnails strip */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-2xl mx-auto scrollbar-thin">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`relative w-12 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  i === index
                    ? "border-blue-500 scale-105 shadow-md"
                    : "border-white/20 opacity-50 hover:opacity-100"
                }`}
              >
                {it.type === "video" ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                    <Video className="w-4 h-4 text-violet-400" />
                  </div>
                ) : (
                  <img
                    src={it.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── File Upload Box Component ─── */
function FileUploadBox({
  label,
  icon,
  accept,
  file,
  onChange,
  onPreview,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  onPreview?: (media: LightboxMedia) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isVideo = accept.includes("video") || (file && file.type.startsWith("video/"));

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
        {label}
      </span>

      {file && previewUrl ? (
        <div className="border border-slate-200 rounded-xl p-2.5 bg-white space-y-2 shadow-2xs">
          <div
            onClick={() => {
              if (onPreview) {
                onPreview({
                  url: previewUrl,
                  type: isVideo ? "video" : "image",
                  title: `${label}: ${file.name}`,
                  subtitle: `Ukuran: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
                  category: label,
                });
              }
            }}
            className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 group cursor-pointer flex items-center justify-center border border-slate-100"
            title="Klik untuk membuka pratinjau (Lightbox)"
          >
            {isVideo ? (
              <video src={previewUrl} className="w-full h-full object-cover" />
            ) : (
              <img
                src={previewUrl}
                alt={file.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
              <Eye className="w-4 h-4" />
              <span>Pratinjau Lightbox</span>
            </div>
            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
              {isVideo ? <Video className="w-3 h-3 text-violet-400" /> : <ImageIcon className="w-3 h-3 text-emerald-400" />}
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-slate-800 truncate" title={file.name}>
              {file.name}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer hover:underline">
                Ganti
                <input
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f) onChange(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] text-rose-500 hover:text-rose-700 font-bold hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 rounded-xl p-4 cursor-pointer transition-all min-h-[110px] group">
          <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-50 group-hover:scale-105 transition-all">
            {icon}
          </div>
          <span className="text-xs font-semibold text-slate-600 mt-2">
            Pilih file
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Klik atau drag file ke sini
          </span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              onChange(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

/* ─── Page Export ─── */
export default function DokumentasiProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-blue-50/50">
          <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-xs border border-slate-200 text-slate-600 font-medium">
            <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Memuat halaman Dokumentasi Project...</span>
          </div>
        </div>
      }
    >
      <DokumentasiProjectContent />
    </Suspense>
  );
}
