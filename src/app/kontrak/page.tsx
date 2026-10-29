"use client";

import { useEffect, useState, useMemo, useRef, Fragment, Suspense } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { useSearchParams, useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import NotificationMenu from "@/components/modals/NotificationMenu";
import {
  CONTRACT_EXPIRY_LABEL,
  contractStatusFromLabel,
  daysUntil,
  getContractExpiryStatus,
  todayString,
  type ContractExpiryStatus,
} from "@/lib/contract-status";
import { contractQueryToParams, type ContractQuery } from "@/lib/contract-query";
import { BULK_FIELD_LABEL, MAX_BULK, type BulkChanges } from "@/lib/contract-bulk";
import {
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  History,
  Clock,
  ArrowRight,
  Download,
  Users,
} from "lucide-react";

export type ContractHistoryEntry = {
  id?: string;
  at: string | Date;
  by: string;
  role?: string;
  action?: "CREATE" | "UPDATE" | string;
  changes?: {
    field: string;
    label: string;
    oldValue: any;
    newValue: any;
  }[];
};

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
  history?: ContractHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

type Facets = { marketing: string[]; bendera: string[]; pic: string[]; instansi: string[] };
const EMPTY_FACETS: Facets = { marketing: [], bendera: [], pic: [], instansi: [] };

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
  history: [],
});

function fmtDate(d: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/** Pesan galat yang aman untuk ditampilkan dari nilai `catch` bertipe unknown. */
function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function fmtDateTime(d: string | Date | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCurrency(n: number) {
  if (!n) return "-";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ─────────── Badge Masa Berlaku ─────────── */
const EXPIRY_BADGE_STYLE: Record<ContractExpiryStatus, string> = {
  AKTIF: "",
  SEGERA_BERAKHIR: "bg-amber-50 text-amber-700 border-amber-200",
  KEDALUWARSA: "bg-rose-50 text-rose-700 border-rose-200",
};

function ExpiryBadge({ endDate, today }: { endDate: string; today: string }) {
  const status = getContractExpiryStatus(endDate, today);
  if (status !== "SEGERA_BERAKHIR") return null; // hanya tampilkan badge jika segera berakhir

  const days = daysUntil(endDate, today) ?? 0;
  const detail = days === 0 ? "hari ini" : `${days} hari lagi`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${EXPIRY_BADGE_STYLE[status]}`}
      title={`${CONTRACT_EXPIRY_LABEL[status]} — ${detail}`}
    >
      {CONTRACT_EXPIRY_LABEL[status]} · {detail}
    </span>
  );
}

/* ─────────── Label jenis aksi pada riwayat ─────────── */
const HISTORY_ACTION_META: Record<string, { label: string; cls: string }> = {
  CREATE: { label: "Kontrak Dibuat", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  UPDATE: { label: "Perubahan Data", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  BULK_UPDATE: { label: "Perubahan Massal", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
};

/* ─────────── Contract History Modal ─────────── */
function HistoryContractModal({
  contract,
  onClose,
}: {
  contract: Contract | null;
  onClose: () => void;
}) {
  if (!contract) return null;

  const historyList = contract.history || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#0B6AA9] flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Riwayat Perubahan Kontrak
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {contract.nomorKontrak} {contract.namaPengadaan ? `• ${contract.namaPengadaan}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {historyList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Belum Ada Riwayat Perubahan</p>
              <p className="text-xs text-slate-400 mt-1">
                Setiap kali data kontrak ini diperbarui, catatan perubahannya akan otomatis terekam di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyList.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Entry Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {entry.by ? entry.by.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          {entry.by || "Admin"}
                        </span>
                        {entry.role && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {entry.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (HISTORY_ACTION_META[entry.action ?? ""] ?? HISTORY_ACTION_META.UPDATE).cls
                      }`}>
                        {(HISTORY_ACTION_META[entry.action ?? ""] ?? HISTORY_ACTION_META.UPDATE).label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {fmtDateTime(entry.at)}
                      </span>
                    </div>
                  </div>

                  {/* Changes List */}
                  {entry.changes && entry.changes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {entry.changes.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="bg-slate-50/70 rounded-lg p-2.5 text-xs grid grid-cols-1 sm:grid-cols-[140px_1fr_auto_1fr] gap-2 items-center border border-slate-100"
                        >
                          <span className="font-bold text-slate-700">
                            {c.label || c.field}
                          </span>
                          <span className="text-rose-600 line-through bg-rose-50/70 px-2 py-1 rounded border border-rose-100 truncate" title={c.oldValue}>
                            {c.oldValue || "-"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block mx-auto" />
                          <span className="text-emerald-700 font-semibold bg-emerald-50/70 px-2 py-1 rounded border border-emerald-100 truncate" title={c.newValue}>
                            {c.newValue || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total {historyList.length} aktivitas tercatat
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
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

  const isDateInvalid = Boolean(
    form.tanggalKontrak &&
    form.tanggalBerakhirKontrak &&
    form.tanggalBerakhirKontrak < form.tanggalKontrak
  );
  const isNominalInvalid = Number(form.nominalKontrak) < 0;

  const handleSubmit = async () => {
    if (!form.nomorKontrak.trim()) {
      setError("Nomor Kontrak wajib diisi");
      return;
    }
    if (form.tanggalKontrak && form.tanggalBerakhirKontrak && form.tanggalBerakhirKontrak < form.tanggalKontrak) {
      setError("Tanggal Berakhir harus lebih besar atau sama dengan Tanggal Kontrak");
      return;
    }
    if (Number(form.nominalKontrak) < 0) {
      setError("Nominal Kontrak tidak boleh bernilai negatif");
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
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-rose-600 text-xs font-semibold flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 font-bold ml-2">✕</button>
            </div>
          )}

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
              <input
                type="date"
                className={inputCls}
                value={form.tanggalKontrak}
                onChange={(e) => {
                  set("tanggalKontrak", e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Tanggal Berakhir</label>
              <input
                type="date"
                className={`${inputCls} ${isDateInvalid ? "!border-rose-400 focus:!ring-rose-500/20" : ""}`}
                value={form.tanggalBerakhirKontrak}
                min={form.tanggalKontrak || undefined}
                onChange={(e) => {
                  set("tanggalBerakhirKontrak", e.target.value);
                  if (error) setError("");
                }}
              />
              {isDateInvalid && (
                <p className="mt-1 text-[11px] font-semibold text-rose-500">
                  Tanggal Berakhir harus ≥ Tanggal Kontrak
                </p>
              )}
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
                  className={`${inputCls} pl-10 font-semibold ${isNominalInvalid ? "!border-rose-400 focus:!ring-rose-500/20" : ""}`}
                  value={
                    form.nominalKontrak !== undefined && form.nominalKontrak !== null
                      ? form.nominalKontrak < 0
                        ? `-${Math.abs(form.nominalKontrak).toLocaleString("id-ID")}`
                        : form.nominalKontrak > 0
                          ? form.nominalKontrak.toLocaleString("id-ID")
                          : ""
                      : ""
                  }
                  onChange={(e) => {
                    const text = e.target.value;
                    if (!text.trim()) {
                      set("nominalKontrak", 0);
                      return;
                    }
                    const isNegative = text.includes("-");
                    const digits = text.replace(/\D/g, "");
                    const num = digits ? parseInt(digits, 10) : 0;
                    set("nominalKontrak", isNegative ? -num : num);
                    if (error) setError("");
                  }}
                  placeholder="0"
                />
              </div>
              {isNominalInvalid && (
                <p className="mt-1 text-[11px] font-semibold text-rose-500">
                  Nominal tidak boleh bernilai negatif
                </p>
              )}
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

          {/* Riwayat Perubahan Section in Edit Modal */}
          {isEdit && form.history && form.history.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#0B6AA9]" />
                  Riwayat Perubahan Terakhir ({form.history.length})
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Terakhir: {fmtDateTime(form.history[0]?.at)} oleh {form.history[0]?.by || "Admin"}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {form.history.slice(0, 3).map((h, i) => (
                  <div key={i} className="text-xs bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="font-bold text-slate-800">{h.by} {h.role ? `(${h.role})` : ""}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{fmtDateTime(h.at)}</span>
                    </div>
                    {h.changes && h.changes.length > 0 ? (
                      <div className="space-y-1">
                        {h.changes.map((c, ci) => (
                          <div key={ci} className="grid grid-cols-[100px_1fr_auto_1fr] gap-1.5 items-center text-[11px]">
                            <span className="text-slate-600 font-semibold">{c.label || c.field}:</span>
                            <span className="text-rose-600 line-through truncate">{c.oldValue || "-"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-emerald-700 font-bold truncate">{c.newValue || "-"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">{h.action}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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

/* ─────────── Modal Aksi Massal ─────────── */
const modalLabelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";
const modalInputCls =
  "w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

type BulkResult = { requested: number; modified: number; unchanged: number; notFound: string[] };

function BulkUpdateModal({
  count,
  adminUsers,
  marketingUsers,
  onSubmit,
  onClose,
}: {
  count: number;
  adminUsers: UserOption[];
  marketingUsers: UserOption[];
  onSubmit: (changes: BulkChanges) => Promise<BulkResult>;
  onClose: (done: boolean) => void;
}) {
  const [pic, setPic] = useState("");
  const [marketing, setMarketing] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);

  const changes: BulkChanges = {};
  if (pic) changes.pic = pic;
  if (marketing) changes.marketing = marketing;
  const hasChange = Object.keys(changes).length > 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await onSubmit(changes));
    } catch (e) {
      setError(errMsg(e, "Gagal mengubah kontrak"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8" role="dialog" aria-label="Ubah PIC atau Marketing Massal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-auto">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Ubah PIC / Marketing Massal</h3>
          <button onClick={() => onClose(!!result)} aria-label="Tutup" className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>

        {result ? (
          <div className="px-6 py-5 space-y-3 text-sm" role="status">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 font-semibold">
              {result.modified} kontrak berhasil diubah.
            </div>
            {result.unchanged > 0 && (
              <div className="text-slate-600">{result.unchanged} kontrak dilewati karena nilainya sudah sama.</div>
            )}
            {result.notFound.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-xs">
                {result.notFound.length} kontrak tidak ditemukan (mungkin sudah dihapus): {result.notFound.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-rose-600 text-xs font-semibold">
                {error}
              </div>
            )}
            <p className="text-sm text-slate-600">
              Perubahan diterapkan ke <strong>{count} kontrak</strong> terpilih dan dicatat di riwayat masing-masing.
              Biarkan kolom sebagai &quot;Tidak diubah&quot; bila tidak ingin mengubahnya.
            </p>
            <div>
              <label htmlFor="bulk-pic" className={modalLabelCls}>{BULK_FIELD_LABEL.pic} baru</label>
              <select id="bulk-pic" className={modalInputCls} value={pic} onChange={(e) => setPic(e.target.value)}>
                <option value="">— Tidak diubah —</option>
                {adminUsers.map((u) => (
                  <option key={u._id} value={u.fullName}>{u.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bulk-marketing" className={modalLabelCls}>{BULK_FIELD_LABEL.marketing} baru</label>
              <select id="bulk-marketing" className={modalInputCls} value={marketing} onChange={(e) => setMarketing(e.target.value)}>
                <option value="">— Tidak diubah —</option>
                {marketingUsers.map((u) => (
                  <option key={u._id} value={u.fullName}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
          {result ? (
            <button onClick={() => onClose(true)} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition">
              Selesai
            </button>
          ) : (
            <>
              <button onClick={() => onClose(false)} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={!hasChange || loading} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 transition-all active:scale-[0.98]">
                {loading ? "Menerapkan..." : `Terapkan ke ${count} kontrak`}
              </button>
            </>
          )}
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

  // Data tabel berasal dari server per halaman (bukan seluruh kontrak sekaligus).
  const [rows, setRows] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [companyInstansi, setCompanyInstansi] = useState<string[]>([]);
  // lookupsLoading hanya menahan layar saat pertama dibuka; rowsLoading hanya meredupkan tabel
  // agar kolom pencarian tidak ikut hilang (kursor tetap) setiap kali server dipanggil.
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const needFacetsRef = useRef(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [marketingUsers, setMarketingUsers] = useState<UserOption[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserOption[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<string[]>([]);
  const [eprocList, setEprocList] = useState<{ requestId: string; pemohon?: string; requestor?: string; lokasi?: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Contract | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMarketing, setFilterMarketing] = useState("Semua");
  const [filterBendera, setFilterBendera] = useState("Semua");
  const [filterPic, setFilterPic] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Opsi dropdown berasal dari SELURUH kontrak (facets server), bukan dari halaman yang tampil.
  const uniqueMarketing = facets.marketing;
  const uniqueBendera = facets.bendera;
  const uniquePic = facets.pic;

  const resetFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setFilterMarketing("Semua");
    setFilterBendera("Semua");
    setFilterPic("Semua");
    setFilterStatus("Semua");
    committedSearchRef.current = "";
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  // "Hari ini" (WIB). Berubah hanya saat tanggal berganti.
  const today = todayString();

  const authorized =
    !sessionLoading && !!user && (user.role === "SUPERADMIN" || user.role === "ADMIN");

  // Pencarian ditunda 350 ms agar server tidak dipanggil di setiap ketikan. Halaman di-reset
  // bersamaan dengan nilai pencarian supaya hanya terjadi SATU permintaan, bukan dua.
  // Hanya berjalan bila nilainya benar-benar berbeda dari yang sudah diterapkan; kalau tidak,
  // timer saat halaman pertama dibuka akan mengembalikan pengguna ke halaman 1 secara tiba-tiba.
  const committedSearchRef = useRef("");
  useEffect(() => {
    const next = searchTerm.trim();
    if (next === committedSearchRef.current) return;
    const t = setTimeout(() => {
      committedSearchRef.current = next;
      setDebouncedSearch(next);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Semua filter yang dikirim ke server. Bentuk & nama parameter dibuat oleh modul bersama
  // yang sama dengan yang dibaca server, sehingga tabel dan ekspor Excel selalu sepakat.
  const query = useMemo<Partial<ContractQuery>>(
    () => ({
      perusahaan: perusahaanQuery,
      q: debouncedSearch,
      dateFrom,
      dateTo,
      marketing: filterMarketing === "Semua" ? "" : filterMarketing,
      bendera: filterBendera === "Semua" ? "" : filterBendera,
      pic: filterPic === "Semua" ? "" : filterPic,
      status: contractStatusFromLabel(filterStatus),
    }),
    [perusahaanQuery, debouncedSearch, dateFrom, dateTo, filterMarketing, filterBendera, filterPic, filterStatus],
  );

  const hasActiveFilters = useMemo(
    () => Array.from(contractQueryToParams(query).keys()).some((k) => k !== "perusahaan"),
    [query],
  );

  // Pilihan baris dikosongkan saat filter berubah, agar tidak ada kontrak "tersembunyi" yang ikut terubah.
  // Memakai pola "sesuaikan state saat render" (bukan efek) agar tidak ada render sia-sia.
  const queryKey = contractQueryToParams(query).toString();
  const [selectionKey, setSelectionKey] = useState(queryKey);
  if (selectionKey !== queryKey) {
    setSelectionKey(queryKey);
    setSelected(new Set());
  }

  const totalItems = total;
  const startRecordIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(currentPage * pageSize, total);

  const instansiList = useMemo(
    () => Array.from(new Set([...companyInstansi, ...facets.instansi])).sort(),
    [companyInstansi, facets.instansi],
  );

  const refresh = () => {
    needFacetsRef.current = true; // opsi dropdown bisa berubah setelah data berubah
    setReloadKey((k) => k + 1);
  };

  // Data pendukung (tidak bergantung filter): sekali saat halaman dibuka.
  // Bergantung pada PERAN (nilai primitif), bukan objek user, agar tidak dimuat ulang
  // hanya karena objek sesi dibuat ulang dengan isi yang sama.
  const userRole = user?.role;
  useEffect(() => {
    if (sessionLoading) return;
    if (!userRole) {
      router.replace("/");
      return;
    }
    if (userRole !== "SUPERADMIN" && userRole !== "ADMIN") {
      router.replace("/dashboard-response");
      return;
    }

    let active = true;
    (async () => {
      try {
        const [usersRes, paramsRes, companiesRes, eprocRes] = await Promise.all([
          fetch(`/api/users?_t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/parameters?_t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/companies?limit=2000&_t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/e-procurement/requests?_t=${Date.now()}`, { cache: "no-store" }),
        ]);

        const usersJson = await usersRes.json();
        const paramsJson = await paramsRes.json().catch(() => ({}));
        const companiesJson = await companiesRes.json().catch(() => ([]));
        const eprocJson = await eprocRes.json().catch(() => ({}));
        if (!active) return;

        const users = usersJson.data || [];
        setMarketingUsers(
          users.filter((u: any) => u.role === "SALES" || u.role === "LEADER" || u.role === "SUPERADMIN")
        );
        setAdminUsers(users.filter((u: any) => u.role === "ADMIN" || u.role === "SUPERADMIN"));
        setPerusahaanList(paramsJson.data?.perusahaan || []);

        const compRows: any[] = Array.isArray(companiesJson) ? companiesJson : companiesJson.items || [];
        const instansiSet = new Set<string>();
        compRows.forEach((c) => {
          if (c.institusi_kerja?.trim()) instansiSet.add(c.institusi_kerja.trim());
          if (c.satuan_kerja?.trim()) instansiSet.add(c.satuan_kerja.trim());
        });
        setCompanyInstansi(Array.from(instansiSet));

        const eprocItems = eprocJson.data || [];
        setEprocList(
          eprocItems.map((r: any) => ({
            requestId: r.requestId,
            pemohon: r.pemohon || "",
            requestor: r.requestor || "",
            lokasi: r.lokasi || "",
          }))
        );
      } catch (e) {
        if (active) setError(errMsg(e, "Gagal memuat data pendukung"));
      } finally {
        if (active) setLookupsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userRole, sessionLoading, router]);

  // Setiap kali permintaan baru akan dikirim (filter/halaman/muat ulang berubah), tandai sedang
  // memuat dan bersihkan galat lama — dilakukan saat render, bukan di dalam efek.
  const requestKey = `${queryKey}|${currentPage}|${pageSize}|${reloadKey}`;
  const [loadingKey, setLoadingKey] = useState(requestKey);
  if (loadingKey !== requestKey) {
    setLoadingKey(requestKey);
    setRowsLoading(true);
    setError("");
  }

  // Daftar kontrak: filter, pencarian, dan paginasi dikerjakan di server.
  // Permintaan yang sudah usang dibatalkan agar jawaban lama tidak menimpa yang baru.
  useEffect(() => {
    if (!authorized) return;
    const controller = new AbortController();

    const params = contractQueryToParams(query);
    params.set("page", String(currentPage));
    params.set("pageSize", String(pageSize));
    const wantFacets = needFacetsRef.current;
    if (wantFacets) params.set("facets", "1");

    (async () => {
      try {
        const res = await fetch(`/api/contracts?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        // Jawaban sudah usang (filter/halaman berubah saat menunggu): buang, jangan timpa yang terbaru.
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error(json.error || "Gagal mengambil data");

        setRows(json.data || []);
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
        // Server mengembalikan halaman terakhir bila yang diminta di luar jangkauan
        if (json.pagination.page !== currentPage) setCurrentPage(json.pagination.page);
        if (json.facets) {
          setFacets(json.facets);
          setTotalAll(json.totalAll ?? 0);
          needFacetsRef.current = false;
        }
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) setError(errMsg(e, "Gagal mengambil data"));
      } finally {
        if (!controller.signal.aborted) setRowsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [authorized, query, currentPage, pageSize, reloadKey]);

  const handleCreate = async (data: any) => {
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
    setShowForm(false);
    refresh();
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
    refresh();
  };

  const handleDelete = async (nomorKontrak: string) => {
    // Tunggu jawaban server dulu sebelum menutup apa pun: bila ditolak (mis. kontrak masih punya
    // turunan), pesannya harus tetap terlihat di modal/dialog yang sedang terbuka.
    const res = await fetch(`/api/contracts/${encodeURIComponent(nomorKontrak)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Gagal menghapus kontrak");

    setRows((prev) => prev.filter((c) => c.nomorKontrak !== nomorKontrak));
    if (expandedRow === nomorKontrak) setExpandedRow(null);
    if (editTarget?.nomorKontrak === nomorKontrak) setEditTarget(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(nomorKontrak);
      return next;
    });
    refresh();
  };

  const confirmAndDelete = async (nomorKontrak: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kontrak "${nomorKontrak}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await handleDelete(nomorKontrak);
    } catch (e) {
      alert(errMsg(e, "Gagal menghapus kontrak"));
    }
  };

  /* ── Pilih baris & aksi massal ── */
  const pageIds = rows.map((r) => r.nomorKontrak);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= MAX_BULK) {
        setError(`Maksimal ${MAX_BULK} kontrak dapat dipilih sekaligus.`);
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const toggleAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      for (const id of pageIds) {
        if (next.size >= MAX_BULK) {
          setError(`Maksimal ${MAX_BULK} kontrak dapat dipilih sekaligus.`);
          break;
        }
        next.add(id);
      }
    }
    setSelected(next);
  };

  const handleBulk = async (changes: BulkChanges): Promise<BulkResult> => {
    const res = await fetch("/api/contracts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomorKontrak: Array.from(selected), changes }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Gagal mengubah kontrak");
    return json as BulkResult;
  };

  const closeBulk = (done: boolean) => {
    setBulkOpen(false);
    if (done) {
      setSelected(new Set());
      refresh();
    }
  };

  /* ── Ekspor Excel sesuai filter aktif ── */
  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`/api/contracts/export?${contractQueryToParams(query).toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Gagal mengekspor data");
      }
      const blob = await res.blob();
      const fileName =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] ||
        `kontrak_${todayString()}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errMsg(e, "Gagal mengekspor data"));
    } finally {
      setExporting(false);
    }
  };

  if (sessionLoading || lookupsLoading) {
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
                <div className="flex items-center gap-3 px-4">
                  <button onClick={() => setShowForm(true)}
                    className="rounded-xl bg-[#0B6AA9] px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-blue-700 hover:bg-blue-700 transition">
                    + Tambah Kontrak
                  </button>
                  <div className="hidden lg:flex">
                    <NotificationMenu />
                  </div>
                </div>
              </div>
            </div>

          {error && (
            <div role="alert" className="mb-6 rounded-2xl bg-rose-50 p-4 text-rose-600 text-sm font-semibold border border-rose-100">{error}</div>
          )}
          {notice && (
            <div role="status" className="mb-6 rounded-2xl bg-emerald-50 p-4 text-emerald-700 text-sm font-semibold border border-emerald-100 flex items-center justify-between gap-3">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} aria-label="Tutup pemberitahuan" className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
            </div>
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
                    aria-label="Pencarian kontrak"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                  aria-label="Tanggal kontrak dari"
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
                  aria-label="Tanggal kontrak sampai"
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
                  aria-label="Filter Marketing"
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
                  aria-label="Filter Bendera"
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
                  aria-label="Filter PIC"
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
                  aria-label="Filter Status"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Segera Berakhir">Segera Berakhir (≤ 7 Hari)</option>
                  <option value="Kedaluwarsa">Kedaluwarsa</option>
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
              <div className="flex items-center gap-3">
                {rowsLoading && <span className="text-xs font-medium text-slate-400 animate-pulse">Memuat...</span>}
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  {totalAll > 0 && totalAll !== totalItems ? `${totalItems} dari ${totalAll} kontrak` : `${totalItems} kontrak`}
                </span>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || totalItems === 0}
                  title={hasActiveFilters ? "Ekspor semua kontrak yang cocok dengan filter aktif" : "Ekspor semua kontrak"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exporting ? "Mengekspor..." : "Ekspor Excel"}</span>
                </button>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-indigo-50 border-b border-indigo-100 text-xs font-semibold text-indigo-800">
                <span>{selected.size} kontrak dipilih</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-700 transition"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Ubah PIC / Marketing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>
            )}

            <div className={`w-full overflow-x-auto transition-opacity ${rowsLoading ? "opacity-50" : ""}`} aria-busy={rowsLoading}>
              <table className="min-w-fit w-full text-sm border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua kontrak di halaman ini"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        disabled={rows.length === 0}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                      />
                    </th>
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
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-slate-400 font-medium">
                        {rowsLoading
                          ? "Memuat kontrak..."
                          : hasActiveFilters
                            ? "Tidak ada kontrak yang sesuai dengan filter pencarian."
                            : "Belum ada kontrak."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((c) => (
                      <Fragment key={c.nomorKontrak}>
                        <tr className={`border-b border-slate-100/80 hover:bg-slate-50 cursor-pointer transition-colors ${expandedRow === c.nomorKontrak ? "bg-indigo-50/20" : ""}`}
                          onClick={() => setExpandedRow(expandedRow === c.nomorKontrak ? null : c.nomorKontrak)}>
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Pilih kontrak ${c.nomorKontrak}`}
                              checked={selected.has(c.nomorKontrak)}
                              onChange={() => toggleOne(c.nomorKontrak)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">
                            {c.nomorKontrak}
                          </td>
                          <td className="px-5 py-4 text-slate-800">{c.instansi || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.namaPengadaan || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.bendera || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.marketing || "-"}</td>
                          <td className="px-5 py-4 text-slate-800">{c.pic || "-"}</td>
                          <td className="px-5 py-4 text-right text-slate-800 font-medium whitespace-nowrap">{fmtCurrency(c.nominalKontrak)}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                            <div className="flex flex-col items-start gap-1">
                              <span>{fmtDate(c.tanggalBerakhirKontrak)}</span>
                              <ExpiryBadge endDate={c.tanggalBerakhirKontrak} today={today} />
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHistory(c);
                                }}
                                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-1"
                                title="Lihat Riwayat Perubahan"
                              >
                                <History className="w-3.5 h-3.5 text-slate-600" />
                                <span>Riwayat</span>
                                {c.history && c.history.length > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                                    {c.history.length}
                                  </span>
                                )}
                              </button>
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
                            <td colSpan={10} className="px-5 py-5 text-sm">
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
                                <div className="md:col-span-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                    <History className="w-4 h-4 text-blue-600" />
                                    <span>
                                      {c.history && c.history.length > 0
                                        ? `Riwayat: ${c.history.length} aktivitas tercatat (terakhir ${fmtDateTime(c.history[0]?.at)} oleh ${c.history[0]?.by || "Admin"})`
                                        : "Belum ada riwayat perubahan yang tercatat."}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedHistory(c);
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline underline-offset-2"
                                  >
                                    <span>Lihat Detail Riwayat</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                  aria-label="Baris per halaman"
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
      {bulkOpen && (
        <BulkUpdateModal
          count={selected.size}
          adminUsers={adminUsers}
          marketingUsers={marketingUsers}
          onSubmit={handleBulk}
          onClose={closeBulk}
        />
      )}
      {selectedHistory && (
        <HistoryContractModal
          contract={selectedHistory}
          onClose={() => setSelectedHistory(null)}
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
