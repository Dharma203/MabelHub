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

  // Auth check
  useEffect(() => {
    if (!sessionLoading) {
      if (!user) {
        router.replace("/");
      } else if (user.role !== "SUPERADMIN" && user.role !== "ADMIN") {
        router.replace("/dashboard-response");
      }
    }
  }, [user, sessionLoading, router]);

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
        json.verifikasi?.verified === false
          ? `Dokumentasi tersimpan, namun perlu diverifikasi admin: ${json.verifikasi.issues.join("; ")}`
          : "Dokumentasi berhasil dikirim dan terverifikasi otomatis!"
      );
      if (json.replaced) {
        setSubmitSuccess((prev) => `${prev} (menggantikan dokumentasi sebelumnya untuk kontrak ini)`);
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

      {/* ─── Stats Cards Grid ─── */}
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

      {/* ─── Alerts ─── */}
      {submitError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-600 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-600 text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* ─── Form Container ─── */}
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
                    />
                    <FileUploadBox
                      label="Foto Barang"
                      icon={<ImageIcon className="w-6 h-6 text-blue-500" />}
                      accept="image/*"
                      file={item.fotoBarangFile}
                      onChange={(f) => updateBarang(idx, "fotoBarangFile", f)}
                    />
                    <FileUploadBox
                      label="Video Barang"
                      icon={<Video className="w-6 h-6 text-violet-500" />}
                      accept="video/*"
                      file={item.videoBarangFile}
                      onChange={(f) => updateBarang(idx, "videoBarangFile", f)}
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

      <ConfirmModal
        open={showReplaceConfirm}
        title="Timpa Dokumentasi Lama?"
        message={
          <>
            Kontrak <strong>{nomorKontrak}</strong> sudah memiliki dokumentasi project.
            Jika dilanjutkan, dokumentasi lama beserta foto dan videonya akan{" "}
            <strong>dihapus permanen</strong> dan diganti dengan yang baru.
          </>
        }
        confirmText="TIMPA"
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

/* ─── File Upload Box Component ─── */
function FileUploadBox({
  label,
  icon,
  accept,
  file,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
        {label}
      </span>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 rounded-xl p-4 cursor-pointer transition-all min-h-[110px] group">
        {file ? (
          <div className="text-center w-full px-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-800 font-bold truncate max-w-[180px] mx-auto">
              {file.name}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
              className="mt-2 text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline"
            >
              Hapus / Ganti File
            </button>
          </div>
        ) : (
          <>
            <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-50 group-hover:scale-105 transition-all">
              {icon}
            </div>
            <span className="text-xs font-semibold text-slate-600 mt-2">
              Pilih file
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              Klik atau drag file ke sini
            </span>
          </>
        )}
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
