"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/menu";
import PendingRequestsModal from "@/components/modals/PendingRequestsModal";
import HistoryInstansiModal from "@/components/modals/HistoryInstansiModal";
import EditInstansiModal from "@/components/modals/EditInstansiModal";
import { Search, Clock, Building2, Pen, Trash2, 
ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight} from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmModal from "@/components/modals/ConfirmModal";

type Company = {
  _id: string;
  kota_kab?: string;
  klpd?: string;
  institusi_kerja?: string;
  satuan_kerja?: string;
  kode_dinas?: string;
  status_ring?: string;
  pic_default?: {
    nama?: string;
    no_telp?: string;
    jabatan?: string;
    role?: string;
  };
};

type CompanyRequest = Company & {
  requested_at?: string;
  requested_by?: string;
};

type ApiResp = {
  items: Company[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  options: {
    kota: string[];
    klpd: string[];
    segmen: string[];
  };
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "max-w-5xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
        aria-label="Close modal"
      />
      <div
        className={clsx(
          "relative mt-16 w-[94%] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10",
          widthClass,
        )}
      >
        <div className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <h2 className="text-base font-extrabold tracking-wide text-black">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-xs text-black/60">{subtitle}</p>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/5 text-xl font-black text-black hover:bg-black/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold tracking-wide text-blue-500 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all",
        props.className || "",
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg px-4 py-2 text-black text-sm shadow-sm border border-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none ",
        props.className || "",
      )}
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors",
        "disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed",
        className || "",
      )}
    >
      {children}
    </button>
  );
}

function SolidButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-blue-700 hover:bg-blue-700 hover:shadow transition-all",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className || "",
      )}
    >
      {children}
    </button>
  );
}

function StatusPill({ value }: { value?: string }) {
  const v = (value || "-").toUpperCase();
  const isB2G =
    v.includes("RING 1") || v.includes("RING 2") || v.includes("RING 3");
  const isB2B = v.includes("RING 4");
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold",
        "ring-1 ring-black/10",
        isB2G && "bg-blue-50 text-blue-700",
        isB2B && "bg-emerald-50 text-emerald-700",
        !isB2G && !isB2B && "bg-gray-50 text-gray-700",
      )}
    >
      {v}
    </span>
  );
}

export default function InstansiPage() {
  const router = useRouter();
  const role: Role = "SUPERADMIN";
  const [pendingCount, setPendingCount] = useState(0);

  // filters
  const [search, setSearch] = useState("");
  const [kota, setKota] = useState("ALL");
  const [klpd, setKlpd] = useState("ALL");
  const [segmen, setSegmen] = useState("ALL");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // data
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const totalPages = resp?.totalPages ?? 1;

  // modals
  const [openAdd, setOpenAdd] = useState(false);
  const [openPending, setOpenPending] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  // add form
  const [form, setForm] = useState({
    institusi_kerja: "",
    kota_kab: "",
    klpd: "",
    satuan_kerja: "",
    status_ring: "",
    kode_dinas: "",
    pic_nama: "",
    pic_telp: "",
    pic_jabatan: "",
    pic_role: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // pending
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pending, setPending] = useState<CompanyRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchPendingCount() {
    try {
      const res = await fetch("/api/company-requests?status=PENDING", {
        cache: "no-store",
      });
      if (!res.ok) return setPendingCount(0);

      const data = await res.json();
      setPendingCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setPendingCount(0);
    }
  }

  async function loadApproved() {
    setLoading(true);
    const qs = new URLSearchParams({
      q: search,
      kota,
      klpd,
      segmen,
      page: String(page),
      limit: String(limit),
    });

    const res = await fetch(`/api/instansi?${qs.toString()}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as ApiResp;
    setResp(data);
    setLoading(false);
  }

  useEffect(() => {
    loadApproved();
    fetchPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, kota, klpd, segmen]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadApproved();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const kotaOptions = useMemo(() => resp?.options.kota ?? [], [resp]);
  const klpdOptions = useMemo(() => resp?.options.klpd ?? [], [resp]);
  const segmenOptions = useMemo(() => resp?.options.segmen ?? [], [resp]);

  async function submitAddInstansi() {
    if (role !== "SUPERADMIN") return;

    if (
      !form.institusi_kerja ||
      !form.kota_kab ||
      !form.klpd ||
      !form.satuan_kerja ||
      !form.status_ring
    ) {
      alert(
        "Lengkapi: Nama Institusi, Kota/Kabupaten, KLPD, Satuan Kerja, Status Segmen.",
      );
      return;
    }

    setSavingAdd(true);
    const payload = {
      institusi_kerja: form.institusi_kerja,
      kota_kab: form.kota_kab,
      klpd: form.klpd,
      satuan_kerja: form.satuan_kerja,
      status_ring: form.status_ring,
      kode_dinas: form.kode_dinas,
      pic_default: {
        nama: form.pic_nama,
        no_telp: form.pic_telp,
        jabatan: form.pic_jabatan,
        role: form.pic_role,
      },
    };

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingAdd(false);

    if (!res.ok) {
      alert("Gagal menambah instansi.");
      return;
    }

    setOpenAdd(false);
    setForm({
      institusi_kerja: "",
      kota_kab: "",
      klpd: "",
      satuan_kerja: "",
      status_ring: "",
      kode_dinas: "",
      pic_nama: "",
      pic_telp: "",
      pic_jabatan: "",
      pic_role: "",
    });

    await loadApproved();
  }

  async function confirmDelete() {
    if (!activeCompany?._id) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${activeCompany._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Gagal menghapus instansi.");
        return;
      }

      await loadApproved();
      setOpenDelete(false);
    } catch (e: any) {
      alert("Gagal menghapus instansi.");
    } finally {
      setDeleting(false);
    }
  }

  async function loadPending() {
    setPendingLoading(true);
    const res = await fetch("/api/company-requests?status=PENDING", {
      cache: "no-store",
    });
    const data = await res.json();
    setPending(Array.isArray(data) ? data : []);
    setPendingLoading(false);
  }

  async function openPendingModal() {
    setOpenPending(true);
    await loadPending();
    await fetchPendingCount();
  }

  async function approveRequest(id: string) {
    if (!confirm("Approve instansi ini?")) return;
    setBusyId(id);

    try {
      const res = await fetch(`/api/company-requests/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(
          `Gagal approve: ${errorData.message || "Terjadi kesalahan pada server"}`,
        );
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan jaringan: ${e.message}`);
    }

    setBusyId(null);
    await loadPending();
    await loadApproved();
    await fetchPendingCount();
  }

  async function rejectRequest(id: string) {
    const reason = prompt("Alasan reject:");
    if (!reason) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/company-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject_reason: reason }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(
          `Gagal reject: ${errorData.message || "Terjadi kesalahan pada server"}`,
        );
      }
    } catch (e: any) {
      alert(`Terjadi kesalahan jaringan: ${e.message}`);
    }

    setBusyId(null);
    await loadPending();
    await fetchPendingCount();
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">
        

        <div className="flex-1 p-6 ">
          <main className="mx-auto pt-4 max-w-none">

            {/* Top */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col">
                <h1 className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                  DAFTAR INSTANSI
                </h1>
                <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                  Rekap data instansi yang sudah <b>APPROVED</b>
                </div>
              </div>

              {role === "SUPERADMIN" ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push("/tambah-instansi")}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-blue-700 hover:bg-blue-700 hover:shadow transition-all"
                  >
                    <Building2 className="w-5 h-4" />
                    TAMBAH INSTANSI
                  </button>
                  <button
                    onClick={openPendingModal}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-orange-600 shadow-sm ring-1 ring-gray-300 hover:bg-gray-100"
                  >
                    <Clock className="w-5 h-4" />
                    REQUEST PENDING
                    {pendingCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-gray-200 mb-6">
              <div className="grid gap-6 md:grid-cols-4 md:items-end">
                <Field label="PENCARIAN">
                  <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-gray-600" />
                    </div>

                    <input
                      type="text"
                      className="w-full rounded-lg px-4 py-2 pl-10 text-black text-sm shadow-sm border border-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none "
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari institusi / satuan kerja / PIC..."
                    />
                  </div>
                </Field>

                <Field label="KOTA/KABUPATEN">
                  <SearchableSelect
                    value={kota}
                    onChange={(val: string) => {
                      setKota(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Kota" },
                      ...kotaOptions.map((x) => ({ value: x, label: x })),
                    ]}
                    className="h-11 border-0"
                  />
                </Field>

                <Field label="KLPD">
                  <SearchableSelect
                    value={klpd}
                    onChange={(val: string) => {
                      setKlpd(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua KLPD" },
                      ...klpdOptions.map((x) => ({ value: x, label: x })),
                    ]}
                    className="h-11 border-0"
                  />
                </Field>

                <Field label="RING">
                  <SearchableSelect
                    value={segmen}
                    onChange={(val: string) => {
                      setSegmen(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Ring" },
                      ...segmenOptions.map((x) => ({ value: x, label: x })),
                    ]}
                    className="h-11 border-0"
                  />
                </Field>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left block lg:table">
                  <thead className="bg-blue-100 border-b border-gray-200 hidden lg:table-header-group">
                    <tr>
                      {[
                        "Kota/Kab",
                        "KLPD",
                        "Institusi Kerja",
                        "Satuan Kerja",
                        "Kode Dinas",
                        "Nama PIC",
                        "No. HP PIC",
                        "Jabatan PIC",
                        "Role PIC",
                        "Status Ring",
                        "Aksi",
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-6 py-4 text-sm font-bold text-black uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y-0 lg:divide-y lg:divide-gray-300 block lg:table-row-group">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-12 text-center text-sm text-gray-700"
                        >
                          <div className="flex justify-center items-center gap-2">
                            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                            Loading data instansi...
                          </div>
                        </td>
                      </tr>
                    ) : resp?.items?.length ? (
                      resp.items.map((c) => (
                        <tr
                          key={c._id}
                          className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 mb-5 block lg:table-row hover:bg-gray-50/50 transition-colors lg:border-0 lg:border-b lg:border-gray-200 lg:rounded-none lg:shadow-none lg:p-0 lg:mb-0"
                        >
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Kota/Kab</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.kota_kab ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">KLPD</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.klpd ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 font-bold flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px] font-normal">Institusi Kerja</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.institusi_kerja ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Satuan Kerja</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.satuan_kerja ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Kode Dinas</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.kode_dinas ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Nama PIC</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.pic_default?.nama ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">No. HP PIC</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.pic_default?.no_telp ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Jabatan PIC</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.pic_default?.jabatan ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 flex justify-between lg:table-cell border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Role PIC</span>
                            <span className="truncate max-w-[200px] lg:max-w-none text-right lg:text-left">{c.pic_default?.role ?? "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 text-center flex justify-between lg:table-cell items-center border-b border-dashed border-gray-200 lg:border-0">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Status Ring</span>
                            <StatusPill value={c.status_ring} />
                          </td>

                          <td className="whitespace-nowrap px-0 py-2.5 lg:px-6 lg:py-4 text-center flex justify-between lg:table-cell items-center">
                            <span className="lg:hidden font-bold text-gray-500 uppercase text-[10px]">Aksi</span>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-black/70 hover:text-blue-600 hover:bg-blue-50 transition-all mx-auto"
                                title="History"
                                onClick={() => {
                                  setActiveCompany(c);
                                  setOpenHistory(true);
                                }}
                              >
                                <Clock className="w-5 h-4" />
                              </button>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 ring-1 ring-inset ring-transparent hover:ring-blue-100"
                                title="Edit"
                                onClick={() => {
                                  setActiveCompany(c);
                                  setOpenEdit(true);
                                }}
                              >
                                <Pen className="w-4 h-4" />
                              </button>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 ring-1 ring-inset ring-transparent hover:ring-red-100"
                                title="Delete"
                                onClick={() => {
                                  setActiveCompany(c);
                                  setOpenDelete(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-12 text-center text-sm text-gray-500"
                        >
                          Tidak ada data instansi yang sesuai.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="mt-4 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 md:mt-0 md:rounded-none md:border-0 md:border-t md:border-gray-100 md:bg-gray-50/50 md:px-6 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-gray-500">
                  Menampilkan{" "}
                  <b className="text-gray-900">{(page - 1) * limit + 1}</b> -{" "}
                  <b className="text-gray-900">
                    {Math.min(page * limit, resp?.total ?? 0)}
                  </b>{" "}
                  dari <b className="text-gray-900">{resp?.total ?? 0}</b> data
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Tampilkan
                    </span>
                    <Select
                      value={String(limit)}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="py-1.5! h-auto text-sm"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n} / halaman
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="First"
                    >
                    <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Prev"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="px-3 text-sm text-gray-800 whitespace-nowrap">
                      Hal 
                      <b className="text-black"> {page}{" "}
                      </b>
                      <span className="text-gray-600 ">
                        dari 
                        <b className="text-black"> {totalPages}
                        </b>
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Last"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ================= MODAL: REQUEST PENDING ================= */}
      <PendingRequestsModal
        open={openPending}
        onClose={() => setOpenPending(false)}
        pending={pending}
        pendingLoading={pendingLoading}
        busyId={busyId}
        approveRequest={approveRequest}
        rejectRequest={rejectRequest}
      />
      <HistoryInstansiModal
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        companyId={activeCompany?._id ?? null}
      />

      <EditInstansiModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        company={activeCompany}
        onSaved={loadApproved}
      />

      <ConfirmModal
        open={openDelete}
        loading={deleting}
        title="Hapus Instansi"
        message={
          <>
            Anda yakin ingin menghapus:
            <br />
            <span className="font-bold">
              {activeCompany?.institusi_kerja ?? "-"}
            </span>
            ?
          </>
        }
        confirmText="HAPUS"
        onConfirm={confirmDelete}
        onCancel={() => setOpenDelete(false)}
      />
    </div>
  );
}
