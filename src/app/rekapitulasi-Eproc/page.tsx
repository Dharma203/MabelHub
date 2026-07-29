"use client";

import { useEffect, useMemo, useState, Fragment, useCallback } from "react";

import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import HistoryEprocModal, {
  EProcHistoryItem,
} from "@/components/modals/HistoryEprocModal";
import { useSession } from "@/components/session/SessionProvider";
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
  tanggalProses?: string | Date;
  tanggalDone?: string | Date;
};

type EProcDoc = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  segmen: string;
  deadlineUsulan: string;
  tanggalSubmit: string;
  catatan?: string;

  items: ProductItem[];

  takenByAdminId: string | null;
  takenByAdminName: string | null;
  takenAt?: string | null;

  statusAkhir?: string;
  statusUsulan?: string;
  perusahaan?: string;
  tindakLanjut?: string;
  statusReqSales?: string;
  catatanTindakLanjut?: string; // We map this from 'catatan' field in db just in case, but let's just use it on modal state
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function formatDateTime(iso?: string | Date | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateOnly(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function formatSegmen(raw: string) {
  if (!raw.includes("::")) return raw;
  const [r, s] = raw.split("::");
  return `${s} (${r})`;
}

export default function RekapitulasiEProcurementPage() {
  const router = useRouter();
  const { user } = useSession();

  const [rows, setRows] = useState<EProcDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // filters (sesuai UI gambar)
  const [requestor, setRequestor] = useState("ALL");
  const [pemohon, setPemohon] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [statusAkhir, setStatusAkhir] = useState("ALL");
  const [tindakLanjut, setTindakLanjut] = useState("ALL");

  // mobile filter toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // pagination
  const [segmen, setSegmen] = useState("ALL");

  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd (input date)
  const [endDate, setEndDate] = useState(""); // yyyy-mm-dd
  const [searchId, setSearchId] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // details panel
  const [selected, setSelected] = useState<EProcDoc | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  // modal tindak lanjut
  const [isLaporModalOpen, setIsLaporModalOpen] = useState(false);
  const [laporTargetId, setLaporTargetId] = useState<string | null>(null);
  const [laporSelectedValue, setLaporSelectedValue] = useState<
    "Lanjut" | "Cancel" | ""
  >("");
  const [laporStatusReqSales, setLaporStatusReqSales] = useState("");
  const [laporCatatan, setLaporCatatan] = useState("");
  const [isLaporLoading, setIsLaporLoading] = useState(false);

  // modal export excel
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // modal history
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [paramRing, setParamRing] = useState<string[]>([]);
  const [paramSegmen, setParamSegmen] = useState<string[]>([]);
  const [paramStatusAkhir, setParamStatusAkhir] = useState<string[]>([]);

  // Function to get distinct parameters
  const loadParameters = useCallback(async () => {
    try {
      const res = await fetch("/api/parameters");
      if (!res.ok) return;
      const json = await res.json();
      const doc = json?.data;
      if (doc) {
        setParamRing(doc.ring || []);
        setParamSegmen(doc.segmen || []);
        setParamStatusAkhir(doc.status_akhir || []);
      }
    } catch (e) {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/e-procurement/requests?mode=all");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      setRows(json.data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParameters();
    fetchData();
  }, [loadParameters, fetchData]);

  // derived data (statistics, etc...)
  const stats = useMemo(() => {
    let diajukan = 0;
    let diproses = 0;
    let selesai = 0;
    let cancel = 0;

    let totalBarang = 0;
    let doneBarang = 0;

    for (const r of rows) {
      const sa = r.statusAkhir || "";
      if (sa === "Selesai") selesai++;
      else if (sa === "Cancel") cancel++;
      else if (sa === "Diproses") diproses++;
      else diajukan++; // blank, Todo, etc

      // per item stats
      if (Array.isArray(r.items)) {
        for (const item of r.items) {
          totalBarang++;
          if (item.statusBarangAdmin === "Done") {
            doneBarang++;
          }
        }
      }
    }
    return {
      diajukan,
      diproses,
      selesai,
      cancel,
      totalBarang,
      doneBarang,
    };
  }, [rows]);

  const [selectedRing, setSelectedRing] = useState("ALL");

  const availableSegmen = useMemo(() => {
    if (selectedRing === "ALL") return paramSegmen;
    return paramSegmen.filter((s) => s.startsWith(selectedRing + "::"));
  }, [selectedRing, paramSegmen]);

  // options dropdown (dari database)
  const requestorOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add((r.requestor || "").trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [rows]);

  const pemohonOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add((r.pemohon || "").trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [rows]);

  function getStatusUsulan(r: EProcDoc) {
    return r.statusUsulan || r.statusAkhir || "Masuk";
  }
  function getDisplayStatusAkhir(val?: string) {
    if (!val) return "-";
    const legacy = [
      "Open",
      "Proses",
      "Done",
      "Selesai",
      "Cancel",
      "Hold",
      "Masuk",
      "MASUK",
    ];
    if (legacy.includes(val)) return "-";
    if (paramStatusAkhir.length > 0 && !paramStatusAkhir.includes(val))
      return "-";
    return val;
  }
  function getTindakLanjutValue(r: EProcDoc) {
    if (getStatusUsulan(r) === "Cancel") {
      return "Cancel";
    }

    if (r.tindakLanjut === "Lanjut" || r.tindakLanjut === "Cancel") {
      return r.tindakLanjut;
    }

    const isUsulanDone =
      r.statusUsulan === "Done" ||
      r.statusAkhir === "Done" ||
      r.statusAkhir === "Selesai";

    const hasItems = Array.isArray(r.items) && r.items.length > 0;
    const allDone =
      hasItems && r.items.every((it) => it.statusBarangAdmin === "Done");

    if (allDone || isUsulanDone) {
      return "Lapor";
    }
    return "Proses";
  }

  const filtered = useMemo(() => {
    const q = searchId.trim().toLowerCase();

    return rows
      .slice()
      .sort((a, b) => {
        // newest first: takenAt desc, lalu tanggalSubmit desc
        const ta = a.takenAt ? new Date(a.takenAt).getTime() : 0;
        const tb = b.takenAt ? new Date(b.takenAt).getTime() : 0;
        if (tb !== ta) return tb - ta;

        const sa = a.tanggalSubmit ? new Date(a.tanggalSubmit).getTime() : 0;
        const sb = b.tanggalSubmit ? new Date(b.tanggalSubmit).getTime() : 0;
        return sb - sa;
      })
      .filter((r) => {
        if (requestor !== "ALL" && r.requestor !== requestor) return false;
        if (pemohon !== "ALL" && r.pemohon !== pemohon) return false;

        if (selectedRing !== "ALL") {
          if (!r.segmen || !r.segmen.startsWith(selectedRing + "::"))
            return false;
        }

        if (segmen !== "ALL" && r.segmen !== segmen) return false;

        if (status !== "ALL") {
          const s = getStatusUsulan(r);
          if (s !== status) return false;
        }

        if (statusAkhir !== "ALL") {
          const displayStatusAkhir = getDisplayStatusAkhir(r.statusAkhir);
          if (displayStatusAkhir !== statusAkhir) return false;
        }

        if (tindakLanjut !== "ALL") {
          const t = getTindakLanjutValue(r);
          if (t !== tindakLanjut) return false;
        }

        // filter tanggal (gunakan tanggalSubmit)
        const submit = r.tanggalSubmit ? new Date(r.tanggalSubmit) : null;
        if (submit && startDate) {
          const from = new Date(startDate + "T00:00:00");
          if (submit < from) return false;
        }
        if (submit && endDate) {
          const to = new Date(endDate + "T23:59:59");
          if (submit > to) return false;
        }

        if (q) {
          const blob =
            `${r.requestId} ${r.requestor} ${r.pemohon} ${r.lokasi}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }

        return true;
      });
  }, [
    rows,
    requestor,
    pemohon,
    status,
    statusAkhir,
    tindakLanjut,
    selectedRing,
    segmen,
    startDate,
    endDate,
    searchId,
  ]);

  // pagination derived
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, safePage, limit]);

  const shownFrom = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const shownTo = Math.min(safePage * limit, total);

  function onRowClick(r: EProcDoc) {
    setSelected(r);
    setOpenItemId(null);
  }

  function toggleItem(id: string) {
    setOpenItemId((p) => (p === id ? null : id));
  }

  async function handleLaporSave() {
    if (!laporTargetId) return;

    if (laporSelectedValue === "") {
      if (!laporCatatan.trim()) {
        alert("Catatan wajib diisi!");
        return;
      }
    } else if (!laporSelectedValue) {
      alert("Pilih Tindak Lanjut terlebih dahulu!");
      return;
    }

    if (
      (laporSelectedValue === "Lanjut" || laporSelectedValue === "Cancel") &&
      laporStatusReqSales === "Alasan lainnya" &&
      !laporCatatan.trim()
    ) {
      alert("Catatan wajib diisi jika memilih Alasan lainnya!");
      return;
    }

    setIsLaporLoading(true);
    try {
      const payload = {
        tindakLanjut: laporSelectedValue,
        statusReqSales: laporStatusReqSales,
        catatan: laporCatatan,
      };

      const res = await fetch(
        `/api/e-procurement/requests/${encodeURIComponent(laporTargetId)}/tindak-lanjut`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal update tindak lanjut");

      setIsLaporModalOpen(false);
      setLaporTargetId(null);
      setLaporSelectedValue("");
      setLaporStatusReqSales("");
      setLaporCatatan("");
      fetchData(); // reload data table
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsLaporLoading(false);
    }
    // define export columns inside component body so it's not redefined repeatedly, or outside
    // we'll define it here so it has access to helpers or just as constant
  }

  const exportColumns: ExportColumn[] = [
    { id: "requestId", label: "Request ID" },
    { id: "requestor", label: "Nama Requestor" },
    { id: "pemohon", label: "Pemohon" },
    { id: "lokasi", label: "Lokasi" },
    { id: "segmen", label: "Segmen" },
    { id: "tanggalSubmit", label: "Tanggal Submit" },
    { id: "deadlineUsulan", label: "Deadline Usulan" },
    { id: "statusUsulan", label: "Status Usulan" },
    { id: "statusAkhir", label: "Status Akhir" },
    { id: "perusahaan", label: "Perusahaan" },
    { id: "tindakLanjut", label: "Tindak Lanjut" },
    { id: "catatanPemohon", label: "Catatan Pemohon" },
    { id: "picAdmin", label: "PIC Admin" },
    // List Barang
    { id: "itemMerek", label: "Merek Product" },
    { id: "itemKategori", label: "Sub-Kategori" },
    { id: "itemSpesifikasi", label: "Spesifikasi Barang" },
    { id: "itemQty", label: "Qty" },
    { id: "itemPagu", label: "Pagu Per Item" },
    { id: "itemHargaTayang", label: "Harga Tayang" },
    { id: "itemLinkInaproc", label: "Link Inaproc" },
    { id: "itemLinkEcom", label: "Link E-Commerce" },
    { id: "itemStatusAdmin", label: "Status Barang (Admin)" },
    { id: "itemTayangInaproc", label: "Tayang Inaproc (Admin)" },
    { id: "itemCatatanAdmin", label: "Catatan Admin" },
    // History
    {
      id: "historyTindakLanjut",
      label: "Export Sheet History (Tindak Lanjut & Approval)",
    },
  ];

  const handleExport = async (selectedCols: string[], scope: ExportScope) => {
    setIsExporting(true);
    try {
      const dataToProcess = scope === "page" ? pageItems : filtered;

      const flattenedData: any[] = [];
      const merges: any[] = [];
      let currentRowIndex = 1; // 0 is header row

      const historyData: any[] = [];
      const historyMerges: any[] = [];
      let currentHistoryRowIndex = 1;

      for (const r of dataToProcess) {
        // Fetch History for this specific request if the user selected that column
        if (selectedCols.includes("historyTindakLanjut")) {
          try {
            const histRes = await fetch(
              `/api/e-procurement/requests/${r.requestId}/history`,
            );
            if (histRes.ok) {
              const histJson = await histRes.json();
              if (
                histJson.data &&
                Array.isArray(histJson.data) &&
                histJson.data.length > 0
              ) {
                const logsCount = histJson.data.length;

                histJson.data.forEach((log: any) => {
                  historyData.push({
                    "Request ID": r.requestId,
                    Waktu: formatDateTime(log.at),
                    "Aksi/Status": log.action || log.tindakLanjut || "Update",
                    Oleh: log.by || "System",
                    Catatan: log.catatan || "-",
                  });
                });

                if (logsCount > 1) {
                  historyMerges.push({
                    s: { r: currentHistoryRowIndex, c: 0 }, // c: 0 is Request ID
                    e: { r: currentHistoryRowIndex + logsCount - 1, c: 0 },
                  });
                }
                currentHistoryRowIndex += logsCount;
              }
            }
          } catch (e) {
            console.error("Failed to fetch history for", r.requestId);
          }
        }

        const baseRow: any = {};

        if (selectedCols.includes("requestId"))
          baseRow["Request ID"] = r.requestId;
        if (selectedCols.includes("requestor"))
          baseRow["Nama Requestor"] = r.requestor || "-";
        if (selectedCols.includes("pemohon"))
          baseRow["Pemohon"] = r.pemohon || "-";
        if (selectedCols.includes("lokasi"))
          baseRow["Lokasi"] = r.lokasi || "-";
        if (selectedCols.includes("segmen"))
          baseRow["Segmen"] = r.segmen || "-";
        if (selectedCols.includes("tanggalSubmit"))
          baseRow["Tanggal Submit"] = r.tanggalSubmit
            ? formatDateTime(r.tanggalSubmit)
            : "-";
        if (selectedCols.includes("deadlineUsulan"))
          baseRow["Deadline Usulan"] = r.deadlineUsulan || "-";
        if (selectedCols.includes("statusUsulan"))
          baseRow["Status Usulan"] = getStatusUsulan(r);
        if (selectedCols.includes("statusAkhir"))
          baseRow["Status Akhir"] = getDisplayStatusAkhir(r.statusAkhir);
        if (selectedCols.includes("perusahaan"))
          baseRow["Perusahaan"] = r.perusahaan || "-";
        if (selectedCols.includes("tindakLanjut"))
          baseRow["Tindak Lanjut"] = getTindakLanjutValue(r);
        if (selectedCols.includes("catatanPemohon"))
          baseRow["Catatan Pemohon"] = r.catatan || "-";
        if (selectedCols.includes("picAdmin"))
          baseRow["PIC Admin"] = r.takenByAdminName || "-";

        const hasItemCols = selectedCols.some((c) => c.startsWith("item"));
        const itemCount =
          hasItemCols && Array.isArray(r.items) && r.items.length > 0
            ? r.items.length
            : 1;

        if (hasItemCols && Array.isArray(r.items) && r.items.length > 0) {
          r.items.forEach((item) => {
            const rowWithItem = { ...baseRow };
            if (selectedCols.includes("itemMerek"))
              rowWithItem["Merek Product"] = item.merek || "-";
            if (selectedCols.includes("itemKategori"))
              rowWithItem["Sub-Kategori"] = item.subKategori || "-";
            if (selectedCols.includes("itemSpesifikasi"))
              rowWithItem["Spesifikasi Barang"] = item.spesifikasi || "-";
            if (selectedCols.includes("itemQty"))
              rowWithItem["Qty"] = item.qty || 0;
            if (selectedCols.includes("itemPagu"))
              rowWithItem["Pagu Per Item"] = item.paguPerItem || "-";
            if (selectedCols.includes("itemHargaTayang"))
              rowWithItem["Harga Tayang"] = item.hargaTayang || "-";
            if (selectedCols.includes("itemLinkInaproc"))
              rowWithItem["Link Inaproc"] = item.linkInaproc || "-";
            if (selectedCols.includes("itemLinkEcom"))
              rowWithItem["Link E-Commerce"] = item.linkEcom || "-";
            if (selectedCols.includes("itemStatusAdmin"))
              rowWithItem["Status Barang (Admin)"] =
                item.statusBarangAdmin || "Todo";
            if (selectedCols.includes("itemTayangInaproc"))
              rowWithItem["Tayang Inaproc (Admin)"] =
                item.tayangInaprocAdmin || "-";
            if (selectedCols.includes("itemCatatanAdmin"))
              rowWithItem["Catatan Admin"] = item.catatanAdminItem || "-";
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
      }

      const finalColLabels = exportColumns
        .filter(
          (c) => selectedCols.includes(c.id) && c.id !== "historyTindakLanjut",
        )
        .map((c) => c.label);
      const worksheet = XLSX.utils.json_to_sheet(flattenedData, {
        header: finalColLabels,
      });

      if (merges.length > 0) {
        worksheet["!merges"] = merges;
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap_E-Proc");

      if (
        selectedCols.includes("historyTindakLanjut") &&
        historyData.length > 0
      ) {
        const historyWorksheet = XLSX.utils.json_to_sheet(historyData, {
          header: ["Request ID", "Waktu", "Aksi/Status", "Oleh", "Catatan"],
        });
        if (historyMerges.length > 0) {
          historyWorksheet["!merges"] = historyMerges;
        }
        XLSX.utils.book_append_sheet(workbook, historyWorksheet, "History");
      }

      XLSX.writeFile(
        workbook,
        `Rekapitulasi_E-Proc_${scope === "all" ? "All" : "Page"}.xlsx`,
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
      <div className="flex min-h-screen">
        
        <div className="flex-1  p-6">
          <main className="mx-auto">
            {/* Header */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 pt-2 pb-4">
              <div>
                <h1 className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                  REKAPITULASI E-PROCUREMENT
                </h1>
                <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                  Rekapitulasi seluruh request e-procurement
                </div>
              </div>
              <div className="px-4">
                <button
                  onClick={() => {
                    console.log("EXPORT BUTTON CLICKED");
                    setIsExportModalOpen(true);
                  }}
                  className="z-50 relative rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-green-700 hover:bg-green-700 transition whitespace-nowrap"
                >
                  Export Excel
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
              {/* Mobile Filter Toggle Button */}
              <div
                className="md:hidden flex items-center justify-between cursor-pointer mb-2 bg-blue-50 p-4 rounded-xl border border-blue-100"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <div className="flex items-center gap-2 font-extrabold text-blue-700">
                  <span>{isFilterOpen ? "🔽" : "▶️"}</span>
                  <span>FILTER PENCARIAN</span>
                </div>
                <span className="text-sm font-bold text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                  {isFilterOpen ? "Tutup" : "Buka"}
                </span>
              </div>

              {/* Filter Grid */}
              <div
                className={clsx(
                  "grid grid-cols-1 gap-4 md:grid-cols-6 mt-4 md:mt-0",
                  !isFilterOpen ? "hidden md:grid" : "grid",
                )}
              >
                {/* Requestor */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    REQUESTOR
                  </div>
                  <SearchableSelect
                    value={requestor}
                    onChange={(val: string) => {
                      setRequestor(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Sales" },
                      ...requestorOptions.map((x) => ({ value: x, label: x })),
                    ]}
                    className="mt-1 border-blue-200"
                  />
                </div>

                {/* Tanggal Mulai */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    TANGGAL MULAI
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className="h-10 w-full rounded-xl bg-white px-4 text-sm ring-1 ring-blue-200 outline-blue-300"
                  />
                </div>

                {/* Tanggal Selesai */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    TANGGAL SELESAI
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    onClick={(e) => {
                      if('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker();
                      }
                    }}
                    className="h-10 w-full rounded-xl bg-white px-4 text-sm ring-1 ring-blue-200 outline-blue-300"
                  />
                </div>

                {/* Status */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    STATUS
                  </div>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl bg-white px-4 text-sm ring-1 ring-blue-200 outline-blue-300"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="MASUK">Masuk</option>
                    <option value="DIAMBIL ADMIN">Diambil Admin</option>
                  </select>
                </div>

                {/* Tindak Lanjut */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    TINDAK LANJUT
                  </div>
                  <select
                    value={tindakLanjut}
                    onChange={(e) => {
                      setTindakLanjut(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl bg-white px-4 text-sm ring-1 ring-blue-200 outline-blue-300"
                  >
                    <option value="ALL">Semua Tindakan</option>
                    <option value="Proses">Proses</option>
                    <option value="Lapor">Lapor</option>
                    <option value="Lanjut">Lanjut</option>
                    <option value="Cancel">Cancel</option>
                  </select>
                </div>

                {/* Status Akhir */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    STATUS AKHIR
                  </div>
                  <SearchableSelect
                    value={statusAkhir}
                    onChange={(val: string) => {
                      setStatusAkhir(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Status" },
                      ...paramStatusAkhir.map((x) => ({ value: x, label: x })),
                    ]}
                    className="mt-1 border-blue-200"
                  />
                </div>

                {/* Ring (Parent Segmen) */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    RING
                  </div>
                  <SearchableSelect
                    value={selectedRing}
                    onChange={(val: string) => {
                      setSelectedRing(val);
                      setSegmen("ALL");
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Ring" },
                      ...paramRing.map((x) => ({ value: x, label: x })),
                    ]}
                    className="mt-1 border-blue-200"
                  />
                </div>

                {/* Segmen */}
                <div className="md:col-span-1">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    SEGMEN
                  </div>
                  <SearchableSelect
                    value={segmen}
                    onChange={(val: string) => {
                      setSegmen(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Segmen" },
                      ...availableSegmen.map((x) => ({
                        value: x,
                        label: formatSegmen(x),
                      })),
                    ]}
                    className="mt-1 border-blue-200"
                  />
                </div>
                {/* Pemohon */}
                <div className="md:col-span-2">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    PEMOHON
                  </div>
                  <SearchableSelect
                    value={pemohon}
                    onChange={(val: string) => {
                      setPemohon(val);
                      setPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "Semua Pemohon" },
                      ...pemohonOptions.map((x) => ({ value: x, label: x })),
                    ]}
                    className="mt-1 border-blue-200"
                  />
                </div>

                {/* Search ID */}
                <div className="md:col-span-4">
                  <div className="mb-1 text-sm font-extrabold text-blue-600">
                    SEARCH ID
                  </div>
                  <div className="relative">
                    <input
                      value={searchId}
                      onChange={(e) => {
                        setSearchId(e.target.value);
                        setPage(1);
                      }}
                      className="h-10 w-full rounded-xl bg-white px-4 pr-10 text-sm ring-1 ring-blue-200 outline-blue-300"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-black/10">
                      {[
                        "Tindak Lanjut",
                        "Requestor ID",
                        "Nama Requestor",
                        "Pemohon (Entity)",
                        "Lokasi",
                        "Deadline Usulan",
                        "Status Usulan",
                        "Status Akhir",
                      ].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left text-sm font-bold text-blue-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-10 text-center text-black/60"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : pageItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-10 text-center text-black/60"
                        >
                          Tidak ada data.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((r) => (
                        <tr
                          key={r.requestId}
                          onClick={() => onRowClick(r)}
                          className={clsx(
                            "cursor-pointer border-b border-black/5",
                            selected?.requestId === r.requestId &&
                              "bg-black/10",
                          )}
                        >
                          <td className="px-3 py-2">
                            {(() => {
                              const tVal = getTindakLanjutValue(r);
                              if (getStatusUsulan(r) === "Cancel") {
                                return (
                                  <button
                                    disabled
                                    className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 opacity-60 cursor-not-allowed"
                                  >
                                    Cancel
                                  </button>
                                );
                              }
                              if (tVal === "Lapor") {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLaporTargetId(r.requestId);
                                      setIsLaporModalOpen(true);
                                    }}
                                    className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                                  >
                                    Lapor
                                  </button>
                                );
                              }
                              if (tVal === "Proses") {
                                return (
                                  <button
                                    disabled
                                    className="rounded bg-gray-300 px-3 py-1 text-xs font-bold text-gray-500 cursor-not-allowed"
                                  >
                                    Proses
                                  </button>
                                );
                              }
                              if (tVal === "Lanjut") {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLaporTargetId(r.requestId);
                                      setLaporSelectedValue("Lanjut");
                                      setIsLaporModalOpen(true);
                                    }}
                                    className="rounded bg-green-100 px-3 py-1 text-xs font-bold text-green-700 hover:bg-green-200"
                                  >
                                    Lanjut
                                  </button>
                                );
                              }
                              if (tVal === "Cancel") {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLaporTargetId(r.requestId);
                                      setLaporSelectedValue("Cancel");
                                      setIsLaporModalOpen(true);
                                    }}
                                    className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200"
                                  >
                                    Cancel
                                  </button>
                                );
                              }
                              return <span className="text-gray-500">-</span>;
                            })()}
                          </td>
                          <td className="px-3 py-2">{r.requestId}</td>
                          <td className="px-3 py-2">{r.requestor || "-"}</td>
                          <td className="px-3 py-2">{r.pemohon || "-"}</td>
                          <td className="px-3 py-2">{r.lokasi || "-"}</td>
                          <td className="px-3 py-2">
                            {r.deadlineUsulan || "-"}
                          </td>
                          <td className="px-3 py-2">{getStatusUsulan(r)}</td>
                          <td className="px-3 py-2">
                            {getDisplayStatusAkhir(r.statusAkhir)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex flex-col p-4 bg-gray-50/50">
                {loading ? (
                  <div className="py-10 text-center text-black/60">
                    Loading...
                  </div>
                ) : pageItems.length === 0 ? (
                  <div className="py-10 text-center text-black/60">
                    Tidak ada data.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {pageItems.map((r) => {
                      const isSelected = selected?.requestId === r.requestId;
                      return (
                        <div
                          key={r.requestId}
                          onClick={() => onRowClick(r)}
                          className={clsx(
                            "flex flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-colors cursor-pointer",
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-black/10 bg-white hover:bg-black/5",
                          )}
                        >
                          <div className="flex items-start justify-between border-b border-black/5 pb-3">
                            <div>
                              <div className="text-xs font-medium text-black/50 mb-0.5">
                                Request ID
                              </div>
                              <div className="text-base font-bold text-black">
                                {r.requestId}
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {(() => {
                                const tVal = getTindakLanjutValue(r);
                                if (getStatusUsulan(r) === "Cancel") {
                                  return (
                                    <button
                                      disabled
                                      className="rounded bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200/50 opacity-60 cursor-not-allowed"
                                    >
                                      Cancel
                                    </button>
                                  );
                                }
                                if (tVal === "Lapor") {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLaporTargetId(r.requestId);
                                        setIsLaporModalOpen(true);
                                      }}
                                      className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                                    >
                                      Lapor
                                    </button>
                                  );
                                }
                                if (tVal === "Proses") {
                                  return (
                                    <span className="rounded bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
                                      Proses
                                    </span>
                                  );
                                }
                                if (tVal === "Lanjut") {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLaporTargetId(r.requestId);
                                        setLaporSelectedValue("Lanjut");
                                        setIsLaporModalOpen(true);
                                      }}
                                      className="rounded bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200/50"
                                    >
                                      Lanjut
                                    </button>
                                  );
                                }
                                if (tVal === "Cancel") {
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLaporTargetId(r.requestId);
                                        setLaporSelectedValue("Cancel");
                                        setIsLaporModalOpen(true);
                                      }}
                                      className="rounded bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200/50"
                                    >
                                      Cancel
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs font-medium text-black/50">
                                Pemohon
                              </div>
                              <div className="font-semibold text-black/80">
                                {r.pemohon || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-black/50">
                                Lokasi
                              </div>
                              <div className="font-semibold text-black/80">
                                {r.lokasi || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-black/50">
                                Nama Requestor
                              </div>
                              <div className="font-semibold text-black/80">
                                {r.requestor || "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-black/50">
                                Tgl Submit
                              </div>
                              <div className="font-semibold text-black/80">
                                {r.tanggalSubmit
                                  ? new Date(
                                      r.tanggalSubmit,
                                    ).toLocaleDateString()
                                  : "-"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-100/80 p-3 ring-1 ring-black/5 text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium text-black/50 mb-0.5">
                                Usulan:
                              </span>
                              <span className="font-bold text-black">
                                {getStatusUsulan(r)}
                              </span>
                            </div>
                            <div className="h-6 w-px bg-black/10 mx-2"></div>
                            <div className="flex flex-col items-end">
                              <span className="font-medium text-black/50 mb-0.5">
                                Akhir:
                              </span>
                              <span className="font-bold text-black">
                                {getDisplayStatusAkhir(r.statusAkhir)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination bar (mirip screenshot) */}
              <div className="flex flex-col gap-3 border-t border-black/10 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="text-md text-black">
                  Menampilkan{" "}
                  <b className="text-black">
                    {shownFrom} - {shownTo}
                  </b>{" "}
                  dari <b className="text-black">{total}</b> data
                </div>

                <div className="flex items-center gap-4">
                  <select
                    value={String(limit)}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-10 rounded-xl bg-white px-4 text-sm ring-1 ring-gray-200 outline-none hover:bg-gray-50"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} / Halaman
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={safePage <= 1}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-200 "
                      title="Previous"
                    >
                      ⏮
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-200 disabled:opacity-80"
                      title="Back"
                    >
                      ◀
                    </button>

                    <div className="flex items-center gap-2">
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          const num = i + 1;
                          return (
                            <button
                              key={num}
                              onClick={() => setPage(num)}
                              className={clsx(
                                "h-9 w-9 rounded-lg text-sm font-extrabold ring-1 ring-black/10",
                                safePage === num
                                  ? "bg-white"
                                  : "bg-white hover:bg-gray-200",
                              )}
                            >
                              {num}
                            </button>
                          );
                        },
                      )}
                      {totalPages > 5 ? (
                        <div className="px-1 text-black/60">…</div>
                      ) : null}
                    </div>

                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage >= totalPages}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-200"
                      title="Next"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={safePage >= totalPages}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-white ring-1 ring-gray-200 hover:bg-gray-200"
                      title="Last"
                    >
                      ⏭
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail panels bawah (sesuai screenshot) */}
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-black/10">
              {/* Rincian Informasi Request */}
              <div className="mb-4">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <div className="flex items-center gap-2 font-bold text-black">
                    <span>📖</span>
                    <span>Rincian Informasi Request</span>
                  </div>

                  {selected && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-200"
                      >
                        Lihat History
                      </button>
                      <button
                        onClick={() => setSelected(null)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-white text-lg font-bold ring-1 ring-white hover:bg-red-600"
                        title="Tutup"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>

                {selected ? (
                  <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-black md:grid-cols-6">
                    <div>
                      <div className="text-sm text-black/50">Request ID</div>
                      <div className="font-semibold text-black">
                        {selected.requestId}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">
                        Nama Requestor
                      </div>
                      <div className="font-semibold text-black">
                        {selected.requestor}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">Pemohon</div>
                      <div className="font-semibold text-black">
                        {selected.pemohon}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">Lokasi</div>
                      <div className="font-semibold text-black">
                        {selected.lokasi}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">Status Usulan</div>
                      <div className="font-semibold text-black">
                        {getStatusUsulan(selected)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">Status Akhir</div>
                      <div className="font-semibold text-black">
                        {getDisplayStatusAkhir(selected.statusAkhir)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-black/50">Perusahaan</div>
                      <div className="font-semibold text-black">
                        {selected.perusahaan || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-black/50">
                        Deadline Usulan
                      </div>
                      <div className="font-semibold text-black">
                        {selected.deadlineUsulan || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">
                        Tanggal Submit
                      </div>
                      <div className="font-semibold text-black">
                        {formatDateTime(selected.tanggalSubmit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Segmen</div>
                      <div className="font-semibold">
                        {formatSegmen(selected.segmen || "-")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-black/50">PIC Admin</div>
                      <div className="font-semibold text-black">
                        {selected.takenByAdminName || "-"}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-black/50">
                        Catatan Pemohon
                      </div>
                      <div className="font-semibold text-black">
                        {selected.catatan || "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-black/50">
                    Klik salah satu row untuk melihat rincian.
                  </div>
                )}
              </div>

              {/* List Barang */}
              <div>
                <div className="flex items-center gap-2 border-b border-black/20 pb-2 font-extrabold text-black/70">
                  <span>🗂</span>
                  <span>List Barang</span>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-black/10">
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-md">
                      <thead className="bg-white">
                        <tr className="border-b border-black/10 text-black">
                          {[
                            "Merek Product",
                            "Sub-Kategori",
                            "Qty",
                            "Tanggal Proses",
                            "Tanggal Done",
                            "Status Barang (Admin)",
                            "Tayang Inaproc (Admin)",
                            "Catatan Admin",
                          ].map((h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap px-3 py-3 text-left text-sm font-bold"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {!selected?.items?.length ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-3 py-10 text-center text-black/50"
                            >
                              Pilih request terlebih dahulu.
                            </td>
                          </tr>
                        ) : (
                          selected.items.map((it) => {
                            const isOpen = openItemId === it.id;
                            return (
                              <Fragment key={it.id}>
                                <tr
                                  onClick={() => toggleItem(it.id)}
                                  className="cursor-pointer border-t border-black/5 hover:bg-gray-50"
                                >
                                  <td className="px-3 py-3">
                                    {it.merek || "-"}
                                  </td>
                                  <td className="px-3 py-3">
                                    {it.subKategori || "-"}
                                  </td>
                                  <td className="px-3 py-3">{it.qty ?? "-"}</td>
                                  <td className="px-3 py-3">
                                    {it.tanggalProses
                                      ? formatDateTime(it.tanggalProses)
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-3">
                                    {it.tanggalDone
                                      ? formatDateTime(it.tanggalDone)
                                      : "-"}
                                  </td>
                                  <td className="px-3 py-3">
                                    {it.statusBarangAdmin || "Masuk"}
                                  </td>
                                  <td className="px-3 py-3">
                                    {it.tayangInaprocAdmin || "-"}
                                  </td>
                                  <td
                                    className="px-3 py-3 max-w-[200px] truncate"
                                    title={it.catatanAdminItem}
                                  >
                                    {it.catatanAdminItem || "-"}
                                  </td>
                                </tr>

                                {isOpen ? (
                                  <tr className="border-t border-black/5">
                                    <td
                                      colSpan={9}
                                      className="bg-gray-100 px-4 py-4"
                                    >
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <div>
                                          <div className="text-md font-bold text-blue-500">
                                            Spesifikasi Barang
                                          </div>
                                          <div className="mt-1 pl-2 text-md">
                                            {it.spesifikasi || "-"}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="text-md font-bold text-blue-500">
                                            Link Inaproc
                                          </div>
                                          <div className="mt-1 pl-2 text-md">
                                            {it.linkInaproc ? (
                                              <a
                                                className="text-blue-500 underline"
                                                href={it.linkInaproc}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                {it.linkInaproc}
                                              </a>
                                            ) : (
                                              <span className="text-black">
                                                -
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <div className="text-md font-bold text-blue-500">
                                            Link E-Commerce
                                          </div>
                                          <div className="mt-1 pl-2 text-md">
                                            {it.linkEcom ? (
                                              <a
                                                className="text-blue-500 underline"
                                                href={it.linkEcom}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                {it.linkEcom}
                                              </a>
                                            ) : (
                                              <span className="text-black">
                                                -
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="md:col-span-3 mt-2 border-t border-black/10 pt-3">
                                          <div className="text-md font-bold text-indigo-600 flex items-center gap-1.5">
                                            <svg
                                              className="w-4 h-4"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                              />
                                            </svg>
                                            Catatan Admin
                                          </div>
                                          <div className="mt-1 pl-2 text-sm text-slate-700 italic bg-white p-3 rounded-md border border-slate-200 shadow-sm min-h-[40px]">
                                            {it.catatanAdminItem ? (
                                              it.catatanAdminItem
                                            ) : (
                                              <span className="text-slate-400 not-italic">
                                                Belum ada catatan dari Admin.
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col p-4 bg-gray-50/50 gap-4">
                    {!selected?.items?.length ? (
                      <div className="py-10 text-center text-sm text-black/50">
                        Pilih request terlebih dahulu.
                      </div>
                    ) : (
                      selected.items.map((it) => {
                        const isOpen = openItemId === it.id;
                        return (
                          <div
                            key={it.id}
                            className="bg-white border flex flex-col border-black/10 rounded-xl overflow-hidden shadow-sm"
                          >
                            <div
                              onClick={() => toggleItem(it.id)}
                              className="p-4 cursor-pointer hover:bg-gray-50 flex items-start justify-between"
                            >
                              <div className="pr-2">
                                <div className="text-xs font-bold text-blue-600 mb-1">
                                  {it.subKategori || "-"}
                                </div>
                                <div className="text-base font-extrabold text-black leading-snug">
                                  {it.merek || "-"}
                                </div>
                                <div className="mt-2 text-xs font-medium text-black/60">
                                  Qty:{" "}
                                  <span className="font-bold text-black">
                                    {it.qty ?? "-"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <div className="text-[10px] font-bold uppercase text-black/40 mb-1">
                                  Status Admin
                                </div>
                                <div
                                  className={clsx(
                                    "text-xs px-2 py-1 rounded font-bold",
                                    it.statusBarangAdmin === "Done"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-700",
                                  )}
                                >
                                  {it.statusBarangAdmin || "Masuk"}
                                </div>
                                <div className="mt-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                  {isOpen ? "Tutup Detail ▲" : "Lihat Detail ▼"}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Details */}
                            {isOpen && (
                              <div className="bg-gray-50 border-t border-black/5 p-4 text-xs space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-black/50 font-semibold mb-0.5">
                                      Tgl Proses
                                    </div>
                                    <div className="font-bold text-black">
                                      {it.tanggalProses
                                        ? formatDateTime(it.tanggalProses)
                                        : "-"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-black/50 font-semibold mb-0.5">
                                      Tgl Done
                                    </div>
                                    <div className="font-bold text-black">
                                      {it.tanggalDone
                                        ? formatDateTime(it.tanggalDone)
                                        : "-"}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-black/50 font-semibold mb-0.5">
                                    Tayang Inaproc
                                  </div>
                                  <div className="font-bold text-black">
                                    {it.tayangInaprocAdmin || "-"}
                                  </div>
                                </div>

                                <div className="border-t border-black/10 pt-3">
                                  <div className="font-bold text-blue-600 mb-1">
                                    Spesifikasi Barang
                                  </div>
                                  <div className="text-black text-sm whitespace-pre-wrap">
                                    {it.spesifikasi || "-"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 border-t border-black/10 pt-3">
                                  <div>
                                    <div className="font-bold text-blue-600 mb-1">
                                      Link Inaproc
                                    </div>
                                    {it.linkInaproc ? (
                                      <a
                                        href={it.linkInaproc}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-500 underline break-all"
                                      >
                                        {it.linkInaproc}
                                      </a>
                                    ) : (
                                      <span className="text-black/50">-</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-blue-600 mb-1">
                                      Link E-Commerce
                                    </div>
                                    {it.linkEcom ? (
                                      <a
                                        href={it.linkEcom}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-500 underline break-all"
                                      >
                                        {it.linkEcom}
                                      </a>
                                    ) : (
                                      <span className="text-black/50">-</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm text-black/50">
                  Klik baris barang untuk membuka detail (slide down).
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* MODAL LAPOR (TINDAK LANJUT) */}
      {isLaporModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsLaporModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 shadow-sm z-10">
              <h3 className="font-extrabold text-blue-900 text-xl flex items-center gap-2">
                <span>📝</span> Input Laporan Tindak Lanjut
              </h3>
              <button
                onClick={() => setIsLaporModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-6 text-sm text-gray-800 space-y-5 flex-1">
              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1">
                  Request ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={laporTargetId || ""}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1">
                  Nama Pelapor
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.fullName || ""}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1">
                  Tindak Lanjut
                </label>
                <select
                  value={laporSelectedValue}
                  onChange={(e) => {
                    setLaporSelectedValue(e.target.value as any);
                    setLaporStatusReqSales(""); // reset dependent dropdown
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-blue-500 hover:border-blue-400 transition-colors"
                >
                  <option value="">-- Kembali Menjadi Lapor --</option>
                  <option value="Lanjut">Lanjut</option>
                  <option value="Cancel">Cancel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1">
                  Status Req Sales
                </label>
                <select
                  value={laporStatusReqSales}
                  onChange={(e) => setLaporStatusReqSales(e.target.value)}
                  disabled={!laporSelectedValue}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-blue-500 hover:border-blue-400 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {!laporSelectedValue && (
                    <option value="">
                      -- Pilih Tindak Lanjut Terlebih Dahulu --
                    </option>
                  )}
                  {laporSelectedValue === "Lanjut" && (
                    <>
                      <option value="">-- Pilih Status --</option>
                      <option value="Harga sesuai budget">
                        Harga sesuai budget
                      </option>
                      <option value="Spesifikasi sesuai kebutuhan">
                        Spesifikasi sesuai kebutuhan
                      </option>
                      <option value="Mendapat persetujuan manajemen">
                        Mendapat persetujuan manajemen
                      </option>
                      <option value="Masuk dalam rencana pengadaan">
                        Masuk dalam rencana pengadaan
                      </option>
                      <option value="Timeline pengerjaan sesuai">
                        Timeline pengerjaan sesuai
                      </option>
                      <option value="Vendor memenuhi kualifikasi">
                        Vendor memenuhi kualifikasi
                      </option>
                      <option value="Kualitas produk/layanan sesuai ekspektasi">
                        Kualitas produk/layanan sesuai ekspektasi
                      </option>
                      <option value="Hasil negosiasi disepakati">
                        Hasil negosiasi disepakati
                      </option>
                      <option value="Proyek bersifat prioritas">
                        Proyek bersifat prioritas
                      </option>
                      <option value="Dokumen & data pendukung lengkap">
                        Dokumen & data pendukung lengkap
                      </option>
                      <option value="Potensi kerja sama jangka panjang">
                        Potensi kerja sama jangka panjang
                      </option>
                      <option value="Rekomendasi dari internal">
                        Rekomendasi dari internal
                      </option>
                      <option value="Kebutuhan mendesak">
                        Kebutuhan mendesak
                      </option>
                      <option value="Harga kompetitif dibanding vendor lain">
                        Harga kompetitif dibanding vendor lain
                      </option>
                      <option value="Alasan lainnya">Alasan lainnya</option>
                    </>
                  )}
                  {laporSelectedValue === "Cancel" && (
                    <>
                      <option value="">-- Pilih Status --</option>
                      <option value="Harga tidak sesuai budget">
                        Harga tidak sesuai budget
                      </option>
                      <option value="Kebutuhan dibatalkan oleh requestor">
                        Kebutuhan dibatalkan oleh requestor
                      </option>
                      <option value="Spesifikasi tidak sesuai kebutuhan">
                        Spesifikasi tidak sesuai kebutuhan
                      </option>
                      <option value="Prioritas proyek berubah">
                        Prioritas proyek berubah
                      </option>
                      <option value="Sudah menggunakan vendor lain">
                        Sudah menggunakan vendor lain
                      </option>
                      <option value="Waktu pengerjaan tidak sesuai">
                        Waktu pengerjaan tidak sesuai
                      </option>
                      <option value="Menunggu keputusan manajemen">
                        Menunggu keputusan manajemen
                      </option>
                      <option value="Proyek ditunda">Proyek ditunda</option>
                      <option value="Dokumen pendukung belum lengkap">
                        Dokumen pendukung belum lengkap
                      </option>
                      <option value="Tidak ada respon lanjutan dari requestor">
                        Tidak ada respon lanjutan dari requestor
                      </option>
                      <option value="Negosiasi tidak mencapai kesepakatan">
                        Negosiasi tidak mencapai kesepakatan
                      </option>
                      <option value="Perubahan scope pekerjaan">
                        Perubahan scope pekerjaan
                      </option>
                      <option value="Permintaan hanya untuk pembanding harga">
                        Permintaan hanya untuk pembanding harga
                      </option>
                      <option value="Kendala anggaran internal">
                        Kendala anggaran internal
                      </option>
                      <option value="Alasan lainnya">Alasan lainnya</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-900 mb-1">
                  Catatan {(laporStatusReqSales === "Alasan lainnya" || laporSelectedValue === "") && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={4}
                  placeholder="Masukkan catatan tambahan..."
                  value={laporCatatan}
                  onChange={(e) => setLaporCatatan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-blue-500 hover:border-blue-400 transition-colors resize-y"
                />
              </div>
            </div>

            <div className="flex px-6 py-5 gap-4">
              <button
                onClick={handleLaporSave}
                disabled={isLaporLoading}
                className="flex-1 rounded-lg bg-[#10b981] py-3 text-sm font-extrabold text-white hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                {isLaporLoading ? "MENYIMPAN..." : "SIMPAN LAPORAN"}
              </button>
              <button
                onClick={() => setIsLaporModalOpen(false)}
                className="flex-1 rounded-lg bg-gray-50 border border-gray-200 py-3 text-sm font-extrabold text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={isLaporLoading}
              >
                BATAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT EXCEL */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={exportColumns}
        onExport={handleExport}
        isLoading={isExporting}
      />

      {/* MODAL HISTORY TINDAK LANJUT */}
      <HistoryEprocModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        requestId={selected?.requestId || null}
      />
    </div>
  );
}
