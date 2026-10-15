"use client";

import { useEffect, useState, useMemo, Fragment, Suspense } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { useSearchParams, useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Contract = {
  nomorKontrak: string;
  perusahaan: string;
  requestIds: string[];
  link: string;
  namaFolder: string;
  instansi: string;
  tanggalKontrak: string;
  namaPengadaan: string;
  nominalKontrak: number;
  fisik: "YA" | "TIDAK";
  scan: "YA" | "TIDAK";
  keterangan: string;
  marketing: string;
  bendera: string;
  tanggalPenyerahan: string;
  catatan: string;
  pic: string;
  tanggalBerakhirKontrak: string;
  penagihan: {
    tanggalMulai: string;
    tanggalBerakhir: string;
    nominalPenagihan: number;
  };
  createdAt: string;
  updatedAt: string;
};

type UserOption = { _id: string; fullName: string; role: string };

const emptyForm = (): Omit<Contract, "createdAt" | "updatedAt"> => ({
  nomorKontrak: "",
  perusahaan: "",
  requestIds: [],
  link: "",
  namaFolder: "",
  instansi: "",
  tanggalKontrak: "",
  namaPengadaan: "",
  nominalKontrak: 0,
  fisik: "TIDAK",
  scan: "TIDAK",
  keterangan: "",
  marketing: "",
  bendera: "",
  tanggalPenyerahan: "",
  catatan: "",
  pic: "",
  tanggalBerakhirKontrak: "",
  penagihan: { tanggalMulai: "", tanggalBerakhir: "", nominalPenagihan: 0 },
});

function fmtDate(d: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtCurrency(n: number) {
  if (!n) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ─────────── Contract Form Modal ─────────── */
function ContractFormModal({
  initial,
  isEdit,
  perusahaan,
  marketingUsers,
  adminUsers,
  instansiList,
  perusahaanList,
  eprocList,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Omit<Contract, "createdAt" | "updatedAt">;
  isEdit: boolean;
  perusahaan: string;
  marketingUsers: UserOption[];
  adminUsers: UserOption[];
  instansiList: string[];
  perusahaanList: string[];
  eprocList: { requestId: string; pemohon?: string; requestor?: string; lokasi?: string }[];
  onSave: (data: any) => Promise<void>;
  onDelete?: (nomorKontrak: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...initial, perusahaan: initial.perusahaan || perusahaan });
  const [reqIdInput, setReqIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const addReqId = () => {
    const v = reqIdInput.trim();
    if (v && !form.requestIds.includes(v)) {
      set("requestIds", [...form.requestIds, v]);
      setReqIdInput("");
    }
  };

  const removeReqId = (id: string) =>
    set("requestIds", form.requestIds.filter((r) => r !== id));

  const handleSubmit = async () => {
    if (!form.nomorKontrak.trim()) {
      setError("Nomor Kontrak wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave(form);
    } catch (e: any) {
      setError(e?.message ?? "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 transition-all";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {isEdit ? "Edit Kontrak" : "Tambah Kontrak Baru"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nomor Kontrak *</label>
              <input className={inputCls} value={form.nomorKontrak} disabled={isEdit}
                onChange={(e) => set("nomorKontrak", e.target.value)} placeholder="Masukkan nomor kontrak" />
            </div>
            <div>
              <label className={labelCls}>Nama Pengadaan</label>
              <input className={inputCls} value={form.namaPengadaan}
                onChange={(e) => set("namaPengadaan", e.target.value)} />
            </div>
          </div>

          {/* Row 2 - Instansi + Bendera */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Instansi</label>
              <SearchableSelect
                value={form.instansi}
                onChange={(val: string) => set("instansi", val)}
                options={instansiList.map((ins) => ({ value: ins, label: ins }))}
                placeholder="Pilih atau cari instansi..."
              />
            </div>
            <div>
              <label className={labelCls}>Bendera (Nama Perusahaan)</label>
              <SearchableSelect
                value={form.bendera}
                onChange={(val: string) => {
                  set("bendera", val);
                  if (!form.perusahaan) set("perusahaan", val);
                }}
                options={perusahaanList.map((p) => ({ value: p, label: p }))}
                placeholder="Pilih perusahaan (bendera)..."
              />
            </div>
          </div>

          {/* Row 3 - Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Tanggal Kontrak</label>
              <input type="date" className={inputCls} value={form.tanggalKontrak}
                onChange={(e) => set("tanggalKontrak", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Tanggal Berakhir</label>
              <input type="date" className={inputCls} value={form.tanggalBerakhirKontrak}
                onChange={(e) => set("tanggalBerakhirKontrak", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Tanggal Penyerahan</label>
              <input type="date" className={inputCls} value={form.tanggalPenyerahan}
                onChange={(e) => set("tanggalPenyerahan", e.target.value)} />
            </div>
          </div>

          {/* Row 4 - Nominal + Link GDrive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nominal Kontrak</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 font-bold text-sm pointer-events-none">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${inputCls} pl-10 font-semibold`}
                  value={form.nominalKontrak ? form.nominalKontrak.toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    set("nominalKontrak", raw ? parseInt(raw, 10) : 0);
                  }}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Link GDrive</label>
              <input className={inputCls} value={form.link}
                onChange={(e) => set("link", e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
          </div>

          {/* Row 5 - Folder + Fisik/Scan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Nama Folder</label>
              <input className={inputCls} value={form.namaFolder}
                onChange={(e) => set("namaFolder", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Fisik</label>
              <select className={inputCls} value={form.fisik} onChange={(e) => set("fisik", e.target.value)}>
                <option value="TIDAK">TIDAK</option>
                <option value="YA">YA</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Scan</label>
              <select className={inputCls} value={form.scan} onChange={(e) => set("scan", e.target.value)}>
                <option value="TIDAK">TIDAK</option>
                <option value="YA">YA</option>
              </select>
            </div>
          </div>

          {/* Row 6 - Marketing + PIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Marketing</label>
              <SearchableSelect
                value={form.marketing}
                onChange={(val: string) => set("marketing", val)}
                options={marketingUsers.map((u) => ({ value: u.fullName, label: u.fullName }))}
                placeholder="Pilih Marketing..."
              />
            </div>
            <div>
              <label className={labelCls}>PIC</label>
              <SearchableSelect
                value={form.pic}
                onChange={(val: string) => set("pic", val)}
                options={adminUsers.map((u) => ({ value: u.fullName, label: u.fullName }))}
                placeholder="Pilih PIC..."
              />
            </div>
          </div>

          {/* Row 7 - Request IDs */}
          <div>
            <label className={labelCls}>Request ID Terkait (E-Procurement)</label>
            <div className="mb-2">
              <SearchableSelect
                value=""
                onChange={(val: string) => {
                  if (val && !form.requestIds.includes(val)) {
                    set("requestIds", [...form.requestIds, val]);
                  }
                }}
                options={eprocList
                  .filter((r) => !form.requestIds.includes(r.requestId))
                  .map((r) => ({
                    value: r.requestId,
                    label: `${r.requestId} — ${r.pemohon || r.requestor || "E-Proc"}${r.lokasi ? ` (${r.lokasi})` : ""}`,
                  }))}
                placeholder="Pilih dari Request E-Proc yang ada..."
                isClearable
              />
            </div>

            <div className="flex gap-2 mb-2">
              <input className={`${inputCls} flex-1`} value={reqIdInput}
                onChange={(e) => setReqIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReqId())}
                placeholder="Atau ketik REQ-ID manual lalu Enter / tekan +" />
              <button type="button" onClick={addReqId}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                +
              </button>
            </div>
            {form.requestIds.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.requestIds.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span>{id}</span>
                    <button type="button" onClick={() => removeReqId(id)} className="text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 8 - Keterangan + Catatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Keterangan</label>
              <textarea className={`${inputCls} min-h-[80px]`} value={form.keterangan}
                onChange={(e) => set("keterangan", e.target.value)} rows={3} />
            </div>
            <div>
              <label className={labelCls}>Catatan</label>
              <textarea className={`${inputCls} min-h-[80px]`} value={form.catatan}
                onChange={(e) => set("catatan", e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
          {error && <span className="text-rose-500 text-xs font-bold mr-auto">{error}</span>}
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Apakah Anda yakin ingin menghapus kontrak "${form.nomorKontrak}"? Tindakan ini tidak dapat dibatalkan.`)) {
                  setLoading(true);
                  try {
                    await onDelete(form.nomorKontrak);
                    onClose();
                  } catch (e: any) {
                    setError(e.message);
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
              className={`rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors ${!error ? "mr-auto" : ""}`}
            >
              Hapus Kontrak
            </button>
          )}
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 transition-all active:scale-[0.98]">
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Kontrak"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Main Page Content ─────────── */
function KontrakPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const perusahaanQuery = searchParams.get("perusahaan") || "";
  const { user, loading: sessionLoading } = useSession();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketingUsers, setMarketingUsers] = useState<UserOption[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserOption[]>([]);
  const [instansiList, setInstansiList] = useState<string[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<string[]>([]);
  const [eprocList, setEprocList] = useState<{ requestId: string; pemohon?: string; requestor?: string; lokasi?: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMarketing, setFilterMarketing] = useState("Semua");
  const [filterBendera, setFilterBendera] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const resetFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setFilterMarketing("Semua");
    setFilterBendera("Semua");
    setFilterPic("Semua");
    setFilterStatus("Semua");
    setCurrentPage(1);
  };

  const isExpiring = (d: string) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  // Filtered Contracts
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
        const matchBendera = c.bendera?.toLowerCase().includes(q);
        if (!matchInstansi && !matchKontrak && !matchMarketing && !matchPic && !matchPengadaan && !matchBendera) {
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
      if (filterStatus === "Segera Berakhir" && !isExpiring(c.tanggalBerakhirKontrak)) {
        return false;
      }
      if (filterStatus === "Aktif" && isExpiring(c.tanggalBerakhirKontrak)) {
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
  ]);

  const totalItems = filteredContracts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage, pageSize]);

  const startRecordIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(currentPage * pageSize, totalItems);

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
      const baseContractsUrl = perusahaanQuery
        ? `/api/contracts?perusahaan=${encodeURIComponent(perusahaanQuery)}`
        : "/api/contracts";
      const sep = baseContractsUrl.includes("?") ? "&" : "?";
      const url = `${baseContractsUrl}${sep}_t=${Date.now()}`;

      const [contractsRes, usersRes, paramsRes, companiesRes, eprocRes] = await Promise.all([
        fetch(url, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/users?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/parameters?_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/companies?limit=2000&_t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/e-procurement/requests?_t=${Date.now()}`, { cache: "no-store" }),
      ]);

      const contractsJson = await contractsRes.json();
      const usersJson = await usersRes.json();
      const paramsJson = await paramsRes.json().catch(() => ({}));
      const companiesJson = await companiesRes.json().catch(() => ([]));
      const eprocJson = await eprocRes.json().catch(() => ({}));

      if (!contractsRes.ok) throw new Error(contractsJson.error || "Gagal mengambil data");

      const contractsData: Contract[] = contractsJson.data || [];
      setContracts(contractsData);

      const users = usersJson.data || [];
      setMarketingUsers(
        users.filter(
          (u: any) =>
            u.role === "SALES" || u.role === "LEADER" || u.role === "SUPERADMIN"
        )
      );
      setAdminUsers(
        users.filter((u: any) => u.role === "ADMIN" || u.role === "SUPERADMIN")
      );

      setPerusahaanList(paramsJson.data?.perusahaan || []);

      const compRows: any[] = Array.isArray(companiesJson)
        ? companiesJson
        : companiesJson.items || [];
      const instansiSet = new Set<string>();
      compRows.forEach((c) => {
        if (c.institusi_kerja?.trim()) instansiSet.add(c.institusi_kerja.trim());
        if (c.satuan_kerja?.trim()) instansiSet.add(c.satuan_kerja.trim());
      });
      contractsData.forEach((c) => {
        if (c.instansi?.trim()) instansiSet.add(c.instansi.trim());
      });
      setInstansiList(Array.from(instansiSet).sort());

      const eprocItems = eprocJson.data || [];
      setEprocList(
        eprocItems.map((r: any) => ({
          requestId: r.requestId,
          pemohon: r.pemohon || "",
          requestor: r.requestor || "",
          lokasi: r.lokasi || "",
        }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (data: any) => {
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
    setShowForm(false);
    fetchData();
  };

  const handleUpdate = async (data: any) => {
    const res = await fetch(`/api/contracts/${encodeURIComponent(data.nomorKontrak)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
    setEditTarget(null);
    fetchData();
  };

  const handleDelete = async (nomorKontrak: string) => {
    // 1. Optimistic update: langsung hapus dari list contracts di tampilan
    setContracts((prev) => prev.filter((c) => c.nomorKontrak !== nomorKontrak));
    if (expandedRow === nomorKontrak) setExpandedRow(null);
    if (editTarget?.nomorKontrak === nomorKontrak) setEditTarget(null);

    // 2. Request DELETE ke API
    const res = await fetch(`/api/contracts/${encodeURIComponent(nomorKontrak)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) {
      // Revert bila terjadi kegagalan
      fetchData();
      throw new Error(json.error || "Gagal menghapus kontrak");
    }

    // 3. Sinkronkan ulang data dari server
    await fetchData();
  };

  const confirmAndDelete = async (nomorKontrak: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kontrak "${nomorKontrak}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await handleDelete(nomorKontrak);
    } catch (e: any) {
      alert(e.message || "Gagal menghapus kontrak");
    }
  };



  if (sessionLoading || loading) {
    return (
      <div className="flex w-full mt-12 items-center justify-center p-8 text-slate-500 font-medium animate-pulse">
        <svg className="mr-3 h-6 w-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Memuat data kontrak...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex min-h-screen">
        <div className="flex-1 p-6">
          <main className="mx-auto">
            {/* Header */}
            <div className="px-4 pt-4 space-y-1 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold pl-4 text-black drop-shadow-sm uppercase">
                    {perusahaanQuery ? `MANAJEMEN KONTRAK — ${perusahaanQuery}` : "MANAJEMEN KONTRAK"}
                  </h1>
                  <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                    Kelola data kontrak, dokumen, dan PIC.
                  </div>
                </div>
                <div className="px-4">
                  <button onClick={() => setShowForm(true)}
                    className="rounded-xl bg-[#0B6AA9] px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-blue-700 hover:bg-blue-700 transition">
                    + Tambah Kontrak
                  </button>
                </div>
              </div>
            </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-rose-600 text-sm font-semibold border border-rose-100">{error}</div>
          )}

          {/* ─── Filter Section Card (seperti Data Project) ─── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 md:p-6 space-y-4 mb-6">
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
                    placeholder="Cari instansi, no kontrak, marketing, pengadaan..."
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

              {/* Tanggal Kontrak Dari */}
              <div className="md:col-span-3 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  TGL KONTRAK DARI
                </label>
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

              {/* Tanggal Kontrak Sampai */}
              <div className="md:col-span-3 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  TGL KONTRAK SAMPAI
                </label>
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

            {/* Row 2: Dropdown Filters & Reset */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 items-end">
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

              {/* Status Jatuh Tempo */}
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
                  <option value="Semua">Semua Status</option>
                  <option value="Segera Berakhir">Segera Berakhir (≤ 7 Hari)</option>
                  <option value="Aktif">Aktif</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              <div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50/50 flex items-center justify-between px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Data Kontrak
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                {totalItems} dari {contracts.length} kontrak
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-fit w-full text-sm border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-4 text-left whitespace-nowrap">NO. KONTRAK</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">INSTANSI</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">NAMA PENGADAAN</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">BENDERA</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">MARKETING</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">PIC</th>
                    <th className="px-5 py-4 text-right whitespace-nowrap">NOMINAL</th>
                    <th className="px-5 py-4 text-left whitespace-nowrap">TGL BERAKHIR</th>
                    <th className="px-5 py-4 text-center whitespace-nowrap">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-medium">
                        {contracts.length === 0
                          ? "Belum ada kontrak."
                          : "Tidak ada kontrak yang sesuai dengan filter pencarian."}
                      </td>
                    </tr>
                  ) : (
                    paginatedContracts.map((c) => (
                      <Fragment key={c.nomorKontrak}>
                        <tr className={`border-b border-slate-100/80 hover:bg-slate-50 cursor-pointer transition-colors ${expandedRow === c.nomorKontrak ? "bg-indigo-50/20" : ""} ${isExpiring(c.tanggalBerakhirKontrak) && expandedRow !== c.nomorKontrak ? "bg-amber-50/50" : ""}`}
                          onClick={() => setExpandedRow(expandedRow === c.nomorKontrak ? null : c.nomorKontrak)}>
                          <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {c.nomorKontrak}
                              {isExpiring(c.tanggalBerakhirKontrak) && (
                                <span title="Kontrak segera berakhir!" className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-800">{c.instansi || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.namaPengadaan || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.bendera || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.marketing || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.pic || "-"}</td>
                          <td className="px-5 py-4 text-right text-slate-800 font-medium whitespace-nowrap">{fmtCurrency(c.nominalKontrak)}</td>
                          <td className={`px-5 py-4 whitespace-nowrap ${isExpiring(c.tanggalBerakhirKontrak) ? "text-amber-600 font-semibold" : "text-slate-600 font-medium"}`}>
                            {fmtDate(c.tanggalBerakhirKontrak)}
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={(e) => { e.stopPropagation(); setEditTarget(c); }}
                                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
                                Edit
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); confirmAndDelete(c.nomorKontrak); }}
                                className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors border border-rose-200">
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRow === c.nomorKontrak && (
                          <tr className="border-b border-neutral-100 bg-slate-50/50">
                            <td colSpan={9} className="px-5 py-5 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Link GDrive:</span>{" "}<span className="text-slate-800">{c.link ? <a href={c.link} target="_blank" className="text-blue-600 hover:underline">{c.link}</a> : "-"}</span></div>
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Folder:</span> <span className="text-slate-800">{c.namaFolder || "-"}</span></div>
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Fisik:</span> <span className={`font-bold ${c.fisik === "YA" ? "text-emerald-600" : "text-slate-400"}`}>{c.fisik}</span></div>
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Scan:</span> <span className={`font-bold ${c.scan === "YA" ? "text-emerald-600" : "text-slate-400"}`}>{c.scan}</span></div>
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Tgl Kontrak:</span> <span className="text-slate-800 font-medium">{fmtDate(c.tanggalKontrak)}</span></div>
                                <div><span className="font-semibold text-slate-500 text-xs block mb-1">Tgl Penyerahan:</span> <span className="text-slate-800 font-medium">{fmtDate(c.tanggalPenyerahan)}</span></div>
                                <div className="md:col-span-2"><span className="font-semibold text-slate-500 text-xs block mb-1">Keterangan:</span> <span className="text-slate-800">{c.keterangan || "-"}</span></div>
                                <div className="md:col-span-2"><span className="font-semibold text-slate-500 text-xs block mb-1">Catatan:</span> <span className="text-slate-800">{c.catatan || "-"}</span></div>
                                <div className="md:col-span-2"><span className="font-semibold text-slate-500 text-xs block mb-1">Request IDs:</span> <span className="text-slate-800">{c.requestIds?.length ? c.requestIds.join(", ") : "-"}</span></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris per halaman</span>
              </div>

              <div className="flex items-center gap-4">
                <span>
                  Menampilkan <strong className="text-slate-800">{startRecordIndex}</strong> - <strong className="text-slate-800">{endRecordIndex}</strong> dari <strong className="text-slate-800">{totalItems}</strong> kontrak
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
                            ? "bg-blue-600 text-white shadow-2xs"
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
          </main>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <ContractFormModal
          initial={{ ...emptyForm(), perusahaan: perusahaanQuery }}
          isEdit={false}
          perusahaan={perusahaanQuery}
          marketingUsers={marketingUsers}
          adminUsers={adminUsers}
          instansiList={instansiList}
          perusahaanList={perusahaanList}
          eprocList={eprocList}
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
      {editTarget && (
        <ContractFormModal
          initial={editTarget}
          isEdit={true}
          perusahaan={perusahaanQuery}
          marketingUsers={marketingUsers}
          adminUsers={adminUsers}
          instansiList={instansiList}
          perusahaanList={perusahaanList}
          eprocList={eprocList}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

export default function KontrakPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <KontrakPageContent />
    </Suspense>
  );
}
