"use client";

import React, { useEffect, useMemo, useState } from "react";

import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx-js-style";
import ExportExcelModal, {
  ExportColumn,
  ExportScope,
} from "@/components/modals/ExportExcelModal";

type ProductItem = {
  id: string;
  merek: string;
  subKategori: string;
  qty: number;
  spesifikasi: string;
  paguPerItem: number | "";
  hargaTayang: number | "";
  linkInaproc: string;
  linkEcom: string;

  statusBarangAdmin?: string;
  tayangInaprocAdmin?: string;
  catatanAdminItem?: string;
  perusahaanAdminItem?: string;
};

type EProcRow = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  segmen: string;
  deadlineUsulan: string | Date;
  tanggalSubmit: string | Date;
  catatan?: string;

  items?: ProductItem[]; // ✅ newly added

  takenByAdminId?: string | null;
  takenByAdminName?: string | null;
  takenAt?: string | Date | null;

  // ✅ admin response fields
  perusahaan?: string;
  statusBarang?: string;
  catatanAdmin?: string;
  tayangInaproc?: string;
  statusAkhir?: string;
  statusUsulan?: string;

  tanggalKontrak?: string;
  nominalKontrak?: number;

  tanggalPembayaran?: string;
  nominalPembayaran?: number;

  history?: {
    action: string;
    actor: string;
    timestamp: string | Date;
    details: string[];
  }[];
};

function fmtDate(d: string | Date | undefined | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fmtDateTime(d: string | Date | undefined | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
}

/** ✅ Server harus tentukan akses berdasarkan session */
async function apiListTaken(): Promise<EProcRow[]> {
  const res = await fetch(`/api/e-procurement/requests?mode=taken`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? []) as EProcRow[];
}

export default function RekapitulasiResponsePage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin = user?.role === "ADMIN";

  const [rows, setRows] = useState<EProcRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [adminFilter, setAdminFilter] = useState("");
  const [q, setQ] = useState("");

  const [statusKeputusanOpts, setStatusKeputusanOpts] = useState<string[]>([]);

  const [openDetail, setOpenDetail] = useState<string | null>(null);

  // modal export excel
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Guard: halaman ini hanya untuk SUPERADMIN/ADMIN
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!isSuperAdmin && !isAdmin) {
      router.replace("/dashboard-request");
      return;
    }
  }, [sessionLoading, user, isSuperAdmin, isAdmin, router]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (sessionLoading) return; // tunggu session dulu
      if (!user) return;

      setLoading(true);
      const data = await apiListTaken();

      // Fetch parameters untuk status_keputusan
      try {
        const pRes = await fetch("/api/parameters", { cache: "no-store" });
        if (pRes.ok) {
          const pJson = await pRes.json();
          const pData = pJson?.data;
          if (pData?.status_keputusan) {
            setStatusKeputusanOpts(pData.status_keputusan);
          }
        }
      } catch (e) {
        // ignore error fetching parameters
      }

      if (mounted) setRows(data);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [sessionLoading, user]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const af = adminFilter.trim().toLowerCase();

    const res = rows.filter((r) => {
      const matchAdmin =
        !isSuperAdmin ||
        !af ||
        (r.takenByAdminName ?? "").toLowerCase().includes(af);

      const matchQ =
        !qq ||
        [
          r.requestId,
          r.requestor,
          r.pemohon,
          r.lokasi,
          r.segmen,
          r.takenByAdminName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(qq);

      return matchAdmin && matchQ;
    });

    // Urutkan dari yang terbaru di atas (descending)
    return res.sort((a, b) => new Date(b.tanggalSubmit).getTime() - new Date(a.tanggalSubmit).getTime());
  }, [rows, adminFilter, q, isSuperAdmin]);

  const exportColumns: ExportColumn[] = [
    { id: "requestId", label: "Request ID" },
    { id: "requestor", label: "Requestor" },
    { id: "pemohon", label: "Pemohon" },
    { id: "lokasi", label: "Lokasi" },
    { id: "segmen", label: "Segmen" },
    { id: "deadlineUsulan", label: "Deadline Usulan" },
    { id: "tanggalSubmit", label: "Tanggal Submit" },
    { id: "statusAkhir", label: "Status Akhir (Approval)" },
    { id: "takenBy", label: "Taken By" },
    { id: "takenAt", label: "Taken At" },
    { id: "perusahaan", label: "Perusahaan (Penyedia)" },
    { id: "catatanAdmin", label: "Catatan Admin" },
    { id: "nominalKontrak", label: "Nominal Kontrak" },
    { id: "nominalPembayaran", label: "Nominal Pembayaran" },
    { id: "itemMerek", label: "Item: Merek" },
    { id: "itemKategori", label: "Item: Sub Kategori" },
    { id: "itemSpesifikasi", label: "Item: Spesifikasi" },
    { id: "itemQty", label: "Item: Qty" },
    { id: "itemPagu", label: "Item: Pagu Per Item" },
    { id: "itemHargaTayang", label: "Item: Harga Tayang" },
    { id: "itemStatusAdmin", label: "Item: Status Barang (Admin)" },
    { id: "itemTayangInaproc", label: "Item: Tayang Inaproc (Admin)" },
    { id: "itemCatatan", label: "Item: Catatan Admin" },
    { id: "itemPerusahaan", label: "Item: Perusahaan Admin" },
  ];

  const handleExport = async (selectedCols: string[], scope: ExportScope) => {
    setIsExporting(true);
    try {
      // For Response, 'filtered' contains all data since apiListTaken fetches taken mode data.
      const dataToProcess = scope === "page" ? filtered.slice() : filtered;
      // Pagination is not fully implemented on server or client side here yet according to code,
      // 'filtered' effectively works as page & all simultaneously if no real pagination exists,
      // but let's keep scope conceptually correct if pagination is added later.

      const flattenedData: any[] = [];
      const merges: any[] = [];
      let currentRowIndex = 1; // 0 is header row

      dataToProcess.forEach((r) => {
        const baseRow: any = {};

        if (selectedCols.includes("requestId"))
          baseRow["Request ID"] = r.requestId;
        if (selectedCols.includes("requestor"))
          baseRow["Requestor"] = r.requestor || "-";
        if (selectedCols.includes("pemohon"))
          baseRow["Pemohon"] = r.pemohon || "-";
        if (selectedCols.includes("lokasi"))
          baseRow["Lokasi"] = r.lokasi || "-";
        if (selectedCols.includes("segmen"))
          baseRow["Segmen"] = r.segmen || "-";
        if (selectedCols.includes("deadlineUsulan"))
          baseRow["Deadline Usulan"] = fmtDate(r.deadlineUsulan);
        if (selectedCols.includes("tanggalSubmit"))
          baseRow["Tanggal Submit"] = fmtDate(r.tanggalSubmit);
        if (selectedCols.includes("statusAkhir"))
          baseRow["Status Akhir (Approval)"] = r.statusAkhir || "-";
        if (selectedCols.includes("takenBy"))
          baseRow["Taken By"] = r.takenByAdminName || "-";
        if (selectedCols.includes("takenAt"))
          baseRow["Taken At"] = r.takenAt ? fmtDateTime(r.takenAt) : "-";
        if (selectedCols.includes("perusahaan"))
          baseRow["Perusahaan (Penyedia)"] = r.perusahaan || "-";
        if (selectedCols.includes("catatanAdmin"))
          baseRow["Catatan Admin"] = r.catatanAdmin || "-";
        if (selectedCols.includes("nominalKontrak"))
          baseRow["Nominal Kontrak"] = r.nominalKontrak ?? "-";
        if (selectedCols.includes("nominalPembayaran"))
          baseRow["Nominal Pembayaran"] = r.nominalPembayaran ?? "-";

        const hasItemCols = selectedCols.some((c) => c.startsWith("item"));
        const itemCount =
          hasItemCols && Array.isArray(r.items) && r.items.length > 0
            ? r.items.length
            : 1;

        if (hasItemCols && Array.isArray(r.items) && r.items.length > 0) {
          r.items.forEach((item) => {
            const rowWithItem = { ...baseRow };
            if (selectedCols.includes("itemMerek"))
              rowWithItem["Item: Merek"] = item.merek || "-";
            if (selectedCols.includes("itemKategori"))
              rowWithItem["Item: Sub Kategori"] = item.subKategori || "-";
            if (selectedCols.includes("itemSpesifikasi"))
              rowWithItem["Item: Spesifikasi"] = item.spesifikasi || "-";
            if (selectedCols.includes("itemQty"))
              rowWithItem["Item: Qty"] = item.qty || 0;
            if (selectedCols.includes("itemPagu"))
              rowWithItem["Item: Pagu Per Item"] = item.paguPerItem || "-";
            if (selectedCols.includes("itemHargaTayang"))
              rowWithItem["Item: Harga Tayang"] = item.hargaTayang || "-";
            if (selectedCols.includes("itemStatusAdmin"))
              rowWithItem["Item: Status Barang (Admin)"] =
                item.statusBarangAdmin || "Todo";
            if (selectedCols.includes("itemTayangInaproc"))
              rowWithItem["Item: Tayang Inaproc (Admin)"] =
                item.tayangInaprocAdmin || "-";
            if (selectedCols.includes("itemCatatan"))
              rowWithItem["Item: Catatan Admin"] = item.catatanAdminItem || "-";
            if (selectedCols.includes("itemPerusahaan"))
              rowWithItem["Item: Perusahaan Admin"] =
                item.perusahaanAdminItem || "-";
            flattenedData.push(rowWithItem);
          });
        } else {
          flattenedData.push(baseRow);
        }

        // Cell Merging Logic for Request Data spanning multiple items
        if (itemCount > 1) {
          const finalCols = exportColumns.filter((c) =>
            selectedCols.includes(c.id),
          );
          finalCols.forEach((c, cIdx) => {
            if (!c.id.startsWith("item")) {
              merges.push({
                s: { r: currentRowIndex, c: cIdx },
                e: { r: currentRowIndex + itemCount - 1, c: cIdx },
              });
            }
          });
        }

        currentRowIndex += itemCount;
      });

      const finalColLabels = exportColumns
        .filter((c) => selectedCols.includes(c.id))
        .map((c) => c.label);
      const worksheet = XLSX.utils.json_to_sheet(flattenedData, {
        header: finalColLabels,
      });

      if (merges.length > 0) {
        worksheet["!merges"] = merges;
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap_Response");
      XLSX.writeFile(
        workbook,
        `Rekapitulasi_Response_${scope === "all" ? "All" : "Page"}.xlsx`,
      );

      setIsExportModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Gagal export Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex relative z-10">
        

        <div className="flex-1 p-6 ">
          <div className="px-8 pt-4 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold pl-4 text-black drop-shadow-sm">
                  REKAPITULASI RESPONSE
                </h1>
                <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                  Menampilkan request e-procurement yang sudah diambil admin.
                </div>
              </div>
              <div className="px-4">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-green-700 hover:bg-green-700 transition"
                >
                  Export Excel
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="mt-6 rounded-2xl bg-white/70 backdrop-blur-xl p-5 shadow-sm border border-slate-200/60 transition-shadow hover:shadow-md">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari requestId / pemohon / lokasi / segmen..."
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition-all focus:ring-4 focus:border-indigo-400 focus:ring-indigo-400/20"
                />

                {isSuperAdmin ? (
                  <input
                    value={adminFilter}
                    onChange={(e) => setAdminFilter(e.target.value)}
                    placeholder="Filter Admin (nama)..."
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none transition-all focus:ring-4 focus:border-indigo-400 focus:ring-indigo-400/20"
                  />
                ) : null}
              </div>
            </div>

            {/* Table */}
            <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50/50 flex items-center justify-between px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Data Rekapitulasi
                </h3>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                  {filtered.length} requests
                </span>
              </div>

              {sessionLoading || loading ? (
                <div className="p-6 text-sm text-slate-700">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-700">
                  Belum ada request yang diambil (atau filter tidak cocok).
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="min-w-fit w-full text-sm border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                      <tr className="border-b border-slate-100">
                        <th className="px-5 py-4 text-center whitespace-nowrap w-12">
                          No
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Request ID
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Requestor
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Pemohon
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Total Barang
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Total Qty
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Tanggal Masuk
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Deadline
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Taken By
                        </th>
                        <th className="px-5 py-4 text-left whitespace-nowrap">
                          Taken At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, index) => {
                        const isOpen = openDetail === r.requestId;
                        // Penomoran: Karena tabel diurutkan descending (terbaru di atas),
                        // baris terlama (paling bawah) mendapat nomor 1.
                        const rowNumber = filtered.length - index;
                        return (
                          <FragmentRow
                            key={r.requestId}
                            r={r}
                            rowNumber={rowNumber}
                            isOpen={isOpen}
                            onToggle={() =>
                              setOpenDetail(isOpen ? null : r.requestId)
                            }
                            isAdmin={isAdmin}
                            isSuperAdmin={isSuperAdmin}
                            currentUserId={user?.userId ?? ""}
                            statusKeputusanOpts={statusKeputusanOpts}
                            onUpdated={(updatedRow) => {
                              // update lokal di tabel
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.requestId === updatedRow.requestId
                                    ? { ...x, ...updatedRow }
                                    : x,
                                ),
                              );
                            }}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="h-10" />
          </div>
        </div>
      </div>

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={exportColumns}
        onExport={handleExport}
        isLoading={isExporting}
      />
    </div>
  );
}

function FragmentRow({
  r,
  rowNumber,
  isOpen,
  onToggle,
  isAdmin,
  isSuperAdmin,
  currentUserId,
  statusKeputusanOpts,
  onUpdated,
}: {
  r: EProcRow;
  rowNumber: number;
  isOpen: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
  statusKeputusanOpts: string[];
  onUpdated: (r: EProcRow) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<{
    catatanAdmin: string;
    statusAkhir: string;
    items: ProductItem[];
    activeTab?: "items" | "history";
  }>({
    catatanAdmin: r.catatanAdmin ?? "",
    statusAkhir: r.statusAkhir ?? "",
    items: r.items ? JSON.parse(JSON.stringify(r.items)) : [], // deep copy items
    activeTab: "items",
  });

  const [companies, setCompanies] = useState<string[]>([]);
  const [statusAkhirOptions, setStatusAkhirOptions] = useState<string[]>([]);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedIndices(new Set()); // reset on open
      fetch("/api/parameters")
        .then((res) => res.json())
        .then((json) => {
          if (json?.data?.perusahaan) {
            setCompanies(json.data.perusahaan);
          }
          if (json?.data?.status_akhir) {
            setStatusAkhirOptions(json.data.status_akhir);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const toggleSelectAll = () => {
    if (selectedIndices.size === form.items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(form.items.map((_, i) => i)));
    }
  };

  const toggleSelect = (idx: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedIndices(newSelected);
  };

  const applyBulkStatus = (val: string) => {
    if (selectedIndices.size === 0) return;
    const newItems = [...form.items];
    selectedIndices.forEach((idx) => {
      newItems[idx] = { ...newItems[idx], statusBarangAdmin: val };
    });
    setForm({ ...form, items: newItems });
  };

  const applyBulkPerusahaan = (val: string) => {
    if (selectedIndices.size === 0) return;
    const newItems = [...form.items];
    selectedIndices.forEach((idx) => {
      newItems[idx] = { ...newItems[idx], perusahaanAdminItem: val };
    });
    setForm({ ...form, items: newItems });
  };

  const applyBulkInaproc = (val: string) => {
    if (selectedIndices.size === 0) return;
    const newItems = [...form.items];
    selectedIndices.forEach((idx) => {
      newItems[idx] = { ...newItems[idx], tayangInaprocAdmin: val };
    });
    setForm({ ...form, items: newItems });
  };

  const computedStatusUsulan = useMemo(() => {
    const total = form.items.length;
    if (total === 0) return "Masuk";
    let countDone = 0;
    let countHold = 0;
    let countCancel = 0;
    let countProgress = 0;
    for (const it of form.items) {
      const st = (it.statusBarangAdmin || "").toLowerCase();
      if (st === "done") countDone++;
      else if (st === "progress") countProgress++;
      else if (st === "hold") countHold++;
      else if (st === "cancel") countCancel++;
    }

    if (countProgress > 0) return "Proses";
    if (countDone === total) return "Done";
    if (countDone > 0 && countDone + countHold + countCancel === total)
      return "Done";
    if (countCancel === total) return "Cancel";
    if (countHold === total) return "Hold";
    if (countDone > 0 || countHold > 0 || countCancel > 0) return "Proses";
    return "Masuk";
  }, [form.items]);

  const isDone = computedStatusUsulan === "Done";

  useEffect(() => {
    if (!isDone && form.statusAkhir !== "") {
      setForm((prev) => ({
        ...prev,
        statusAkhir: "",
      }));
    }
  }, [isDone, form.statusAkhir]);

  // check if editable
  // only simple ADMIN who acts as the taker can edit, or SUPERADMIN can edit
  const canEdit =
    isSuperAdmin || (isAdmin && r.takenByAdminId === currentUserId);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `/api/e-procurement/requests/${encodeURIComponent(
          r.requestId,
        )}/admin-response`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catatanAdmin: form.catatanAdmin,
            statusAkhir: isDone ? form.statusAkhir : "",
            items: form.items,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Gagal menyimpan data");

      setSuccess("Tersimpan");
      if (json.data) {
        onUpdated(json.data);
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message ?? "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  const isFinalStatus = ["Done", "Cancel", "Hold"].includes(
    computedStatusUsulan,
  );
  const isDelayed =
    !isFinalStatus &&
    Date.now() - new Date(r.tanggalSubmit).getTime() > 3 * 24 * 60 * 60 * 1000;

  return (
    <>
      <tr
        className={`border-b border-slate-100/80 hover:bg-slate-50 cursor-pointer transition-colors ${
          isOpen ? "bg-indigo-50/20" : isDelayed ? "bg-rose-50/40" : ""
        }`}
        onClick={onToggle}
        title="Klik untuk lihat detail"
      >
        <td className="px-5 py-4 font-semibold text-slate-800 text-center">
          {rowNumber}
        </td>
        <td className="px-5 py-4 font-semibold text-slate-800">
          <div className="flex items-center gap-2">
            {r.requestId}
            {isDelayed && (
              <span
                title="Mendesak (>3 hari belum Done)"
                className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"
              />
            )}
          </div>
        </td>
        <td className="px-5 py-4 text-slate-600">
          <span>{r.requestor}</span>
        </td>
        <td className="px-5 py-4 text-slate-800 font-medium">{r.pemohon}</td>
        <td className="px-5 py-4 text-slate-600 font-medium">
          {r.items?.length || 0} Barang
        </td>
        <td className="px-5 py-4">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            {r.items?.reduce((acc, it) => acc + (Number(it.qty) || 0), 0) || 0} Qty
          </span>
        </td>
        <td className="px-5 py-4 text-slate-600">{fmtDate(r.tanggalSubmit)}</td>
        <td
          className={`px-5 py-4 font-medium ${isDelayed ? "text-rose-600" : "text-slate-600"}`}
        >
          {fmtDate(r.deadlineUsulan)}
        </td>
        <td className="px-5 py-4">
          {/* ... status logic ... */}
          {(() => {
            const st = computedStatusUsulan;
            if (st === "Done")
              return (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Done
                </span>
              );
            if (st === "Cancel")
              return (
                <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  Cancel
                </span>
              );
            if (st === "Hold")
              return (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Hold
                </span>
              );
            if (st === "Proses")
              return (
                <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-inset ring-sky-600/20">
                  Proses
                </span>
              );
            return (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                Masuk
              </span>
            );
          })()}
        </td>
        <td className="px-5 py-4 text-slate-800 font-medium">
          {r.takenByAdminName ?? "-"}
        </td>
        <td className="px-5 py-4 text-slate-500 text-xs">
          {r.takenAt ? fmtDateTime(r.takenAt) : "-"}
        </td>
      </tr>

      {isOpen && (
        <tr className="border-b border-neutral-100 bg-slate-50/50">
          <td colSpan={11} className="px-5 py-5 text-sm">
            {/* Rincian Barang */}
            <div className="mb-6">
              {/* Rincian Barang Card */}
              <div className="border border-slate-200 shadow-sm rounded-xl p-6 bg-white w-full mb-6">
                <h4 className="font-semibold text-slate-800 mb-4 inline-flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Rincian Items ({r.items?.length || 0})
                </h4>

                {/* Bulk Action Bar */}
                {selectedIndices.size > 0 && canEdit && (
                  <div className="mb-4 flex flex-wrap items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 pr-4 border-r border-indigo-200">
                      <span className="text-xs font-bold text-indigo-700">
                        {selectedIndices.size} item terpilih
                      </span>
                      <button
                        onClick={() => setSelectedIndices(new Set())}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold underline"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Set Status:
                        </span>
                        <select
                          className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                          onChange={(e) => applyBulkStatus(e.target.value)}
                          value=""
                        >
                          <option value="" disabled>
                            Pilih...
                          </option>
                          {statusKeputusanOpts.map((opt) => {
                            const o = opt.toLowerCase();
                            const isEndState =
                              o.includes("done") ||
                              o.includes("cancel") ||
                              o.includes("hold");

                            // Cek apakah SEMUA yang terpilih sudah progress
                            let allProgressed = true;
                            selectedIndices.forEach((idx) => {
                              const savedStatus = (
                                r.items?.[idx]?.statusBarangAdmin || ""
                              ).toLowerCase();
                              if (
                                savedStatus === "" ||
                                savedStatus === "masuk"
                              ) {
                                allProgressed = false;
                              }
                            });

                            if (isEndState && !allProgressed) return null;

                            return (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Set Penyedia:
                        </span>
                        <select
                          className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[150px]"
                          onChange={(e) => applyBulkPerusahaan(e.target.value)}
                          value=""
                        >
                          <option value="" disabled>
                            Pilih Vendor...
                          </option>
                          {companies.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Set Inaproc:
                        </span>
                        <select
                          className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                          onChange={(e) => applyBulkInaproc(e.target.value)}
                          value=""
                        >
                          <option value="" disabled>
                            Pilih...
                          </option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {r.items && r.items.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 shadow-sm rounded-xl bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="px-3 py-3 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={
                                form.items.length > 0 &&
                                selectedIndices.size === form.items.length
                              }
                              onChange={toggleSelectAll}
                              disabled={!canEdit || loading}
                            />
                          </th>
                          <th className="px-3 py-3">Merek</th>
                          <th className="px-3 py-3">Sub Kategori</th>
                          <th className="px-3 py-3">Spesifikasi</th>
                          <th className="px-3 py-3">Qty</th>
                          <th className="px-3 py-3">Pagu</th>
                          <th className="px-3 py-3">Harga Tayang</th>
                          <th className="px-3 py-3">Link Inaproc</th>
                          <th className="px-3 py-3">Link ECom</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {r.items.map((it, idx) => (
                          <React.Fragment key={it.id || idx}>
                            <tr
                              className={`transition-colors hover:bg-slate-50 ${
                                selectedIndices.has(idx)
                                  ? "bg-indigo-50/30"
                                  : ""
                              }`}
                            >
                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={selectedIndices.has(idx)}
                                  onChange={() => toggleSelect(idx)}
                                  disabled={!canEdit || loading}
                                />
                              </td>
                              <td className="px-3 py-3 font-medium text-slate-800">
                                {it.merek || "-"}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {it.subKategori || "-"}
                              </td>
                              <td
                                className="px-3 py-3 text-slate-600 line-clamp-2"
                                title={it.spesifikasi}
                              >
                                {it.spesifikasi || "-"}
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-700">
                                {it.qty ?? "-"}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {it.paguPerItem || "-"}
                              </td>
                              <td className="px-3 py-3 text-slate-600">
                                {it.hargaTayang || "-"}
                              </td>
                              <td className="px-3 py-3">
                                {it.linkInaproc ? (
                                  <a
                                    href={it.linkInaproc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                  >
                                    Link{" "}
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {it.linkEcom ? (
                                  <a
                                    href={it.linkEcom}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-500 hover:text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                  >
                                    Link{" "}
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                            {/* Baris khusus untuk input admin per-item */}
                            {/* Baris khusus untuk input admin per-item */}
                            <tr className="bg-indigo-50/40 border-b border-indigo-100/50">
                              <td colSpan={9} className="px-5 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                                  {/* Status Keputusan */}
                                  <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Status Barang ({it.merek})
                                    </label>
                                    <select
                                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 font-medium text-slate-700 bg-white transition-all shadow-sm"
                                      value={
                                        form.items[idx]?.statusBarangAdmin || ""
                                      }
                                      onChange={(e) => {
                                        const newItems = [...form.items];
                                        newItems[idx] = {
                                          ...newItems[idx],
                                          statusBarangAdmin: e.target.value,
                                        };
                                        setForm({ ...form, items: newItems });
                                      }}
                                      disabled={!canEdit || loading}
                                    >
                                      <option value="">Masuk</option>
                                      {statusKeputusanOpts.map((opt) => {
                                        const o = opt.toLowerCase();
                                        const isEndState =
                                          o.includes("done") ||
                                          o.includes("cancel") ||
                                          o.includes("hold");

                                        const savedStatus = (
                                          r.items?.[idx]?.statusBarangAdmin ||
                                          ""
                                        ).toLowerCase();
                                        const hasProgressed =
                                          savedStatus !== "" &&
                                          savedStatus !== "masuk";

                                        // Sembunyikan end-state jika belum progress
                                        if (isEndState && !hasProgressed) {
                                          return null;
                                        }

                                        return (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>

                                  {/* Penyedia */}
                                  <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Penyedia / Vendor
                                    </label>
                                    <select
                                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 font-medium text-slate-700 bg-white transition-all shadow-sm"
                                      value={
                                        form.items[idx]?.perusahaanAdminItem ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const newItems = [...form.items];
                                        newItems[idx] = {
                                          ...newItems[idx],
                                          perusahaanAdminItem: e.target.value,
                                        };
                                        setForm({ ...form, items: newItems });
                                      }}
                                      disabled={!canEdit || loading}
                                    >
                                      <option value="">Pilih Vendor...</option>
                                      {companies.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Inaproc */}
                                  <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Tayang Inaproc
                                    </label>
                                    <select
                                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 font-medium text-slate-700 bg-white transition-all shadow-sm"
                                      value={
                                        form.items[idx]?.tayangInaprocAdmin ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const newItems = [...form.items];
                                        newItems[idx] = {
                                          ...newItems[idx],
                                          tayangInaprocAdmin: e.target.value,
                                        };
                                        setForm({ ...form, items: newItems });
                                      }}
                                      disabled={!canEdit || loading}
                                    >
                                      <option value="">Pilih...</option>
                                      <option value="Ya">Ya</option>
                                      <option value="Tidak">Tidak</option>
                                    </select>
                                  </div>

                                  {/* Catatan Area */}
                                  <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Catatan Admin
                                    </label>
                                    <textarea
                                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 font-medium text-slate-700 bg-white transition-all shadow-sm min-h-[38px] max-h-[120px]"
                                      value={
                                        form.items[idx]?.catatanAdminItem || ""
                                      }
                                      onChange={(e) => {
                                        const newItems = [...form.items];
                                        newItems[idx] = {
                                          ...newItems[idx],
                                          catatanAdminItem: e.target.value,
                                        };
                                        setForm({ ...form, items: newItems });
                                      }}
                                      disabled={!canEdit || loading}
                                      placeholder="Catatan..."
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs flex items-center gap-2 p-4 border border-dashed border-slate-200 rounded-lg bg-white">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Tidak ada item rincian
                  </div>
                )}
              </div>
            </div>

            {/* Form Admin Response */}
            <div className="border border-slate-200 shadow-sm rounded-xl p-6 bg-white w-full">
              <h4 className="font-semibold text-slate-800 mb-4 inline-flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                <svg
                  className="w-4 h-4 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Keputusan Status Akhir (Approval)
              </h4>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Status Usulan (Otomatis)
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 text-slate-600 font-bold cursor-not-allowed text-center md:text-left"
                    value={computedStatusUsulan}
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Status Akhir (Manual)
                  </label>
                  <SearchableSelect
                    className="mt-1"
                    value={form.statusAkhir}
                    onChange={(val: string) =>
                      setForm({ ...form, statusAkhir: val })
                    }
                    isDisabled={!canEdit || loading || !isDone}
                    options={statusAkhirOptions
                      .filter((s) => {
                        const low = s.toLowerCase();
                        return (
                          low.includes("rilis kontrak") ||
                          low.includes("barang terkirim ke user") ||
                          low.includes("terbit bast")
                        );
                      })
                      .map((s) => ({
                        value: s,
                        label: s,
                      }))}
                    placeholder={
                      !isDone
                        ? "Terkunci (Belum Done)"
                        : "Pilih Status Akhir..."
                    }
                  />
                  {!isDone && (
                    <span className="text-[10px] items-center text-amber-600/90 font-medium ml-1 mt-1 inline-flex gap-1.5 leading-tight max-w-[90%]">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Status Usulan harus &quot;Done&quot; untuk diedit.
                    </span>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="mt-5 flex items-center justify-end space-x-4 border-t border-slate-100 pt-4">
                  {error && (
                    <span className="text-rose-500 text-xs font-bold flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {error}
                    </span>
                  )}
                  {success && (
                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {success}
                    </span>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:bg-indigo-400 disabled:shadow-none active:scale-95 min-w-[150px] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </button>
                </div>
              )}
              {!canEdit && (
                <div className="mt-3 text-xs text-orange-600 font-medium">
                  Anda tidak berhak mengubah response ini (Hanya taker /
                  Superadmin).
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
