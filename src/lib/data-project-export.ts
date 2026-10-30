import * as XLSX from "xlsx-js-style";
import { getSuggestedProjectStatus } from "./project-status-helper";

export type ProjectContractExportItem = {
  nomorKontrak: string;
  perusahaan?: string;
  bendera?: string;
  instansi?: string;
  namaPengadaan?: string;
  tanggalKontrak?: string;
  tanggalBerakhirKontrak?: string;
  nominalKontrak?: number;
  marketing?: string;
  pic?: string;
  status?: string;
  dokSales?: string;
  alasanPenolakan?: string;
  pembayaran?: Array<{
    tanggal: string;
    jumlah: number;
    keterangan?: string;
    createdBy?: string;
  }>;
  dokVerifikasi?: {
    status?: string;
    alasanPenolakan?: string;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  [key: string]: any;
};

export type DataProjectExportMeta = {
  today: string;
  exportedBy: string;
  exportedAt: Date;
  filters: { label: string; value: string }[];
};

const BORDER_THIN = { style: "thin", color: { rgb: "CBD5E1" } };
const BORDERS = {
  top: BORDER_THIN,
  bottom: BORDER_THIN,
  left: BORDER_THIN,
  right: BORDER_THIN,
};

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { patternType: "solid", fgColor: { rgb: "1E40AF" } }, // Dark Blue
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

const EXCEL_EPOCH_OFFSET = 25_569;

function toExcelSerial(dateStr: string): number | null {
  if (!dateStr || dateStr.length < 10) return null;
  const t = new Date(dateStr.slice(0, 10)).getTime();
  if (isNaN(t)) return null;
  const days = Math.floor(t / 86_400_000);
  return days + EXCEL_EPOCH_OFFSET;
}

type ColumnDef = {
  header: string;
  width: number;
  kind: "text" | "number" | "money" | "date" | "center" | "wrap";
  getValue: (item: ProjectContractExportItem, no: number) => string | number | null;
  getStyle?: (item: ProjectContractExportItem) => object | undefined;
};

export const DATA_PROJECT_COLUMNS: ColumnDef[] = [
  {
    header: "No",
    width: 6,
    kind: "center",
    getValue: (_item, no) => no,
  },
  {
    header: "No. Kontrak",
    width: 26,
    kind: "text",
    getValue: (item) => item.nomorKontrak || "-",
  },
  {
    header: "Sales / Marketing",
    width: 20,
    kind: "text",
    getValue: (item) => item.marketing || "-",
  },
  {
    header: "Bendera / PT",
    width: 22,
    kind: "text",
    getValue: (item) => item.bendera || item.perusahaan || "-",
  },
  {
    header: "Instansi",
    width: 30,
    kind: "wrap",
    getValue: (item) => item.instansi || "-",
  },
  {
    header: "Nama Pengadaan",
    width: 36,
    kind: "wrap",
    getValue: (item) => item.namaPengadaan || "-",
  },
  {
    header: "Tgl Kontrak",
    width: 15,
    kind: "date",
    getValue: (item) => item.tanggalKontrak || null,
  },
  {
    header: "Tgl Berakhir",
    width: 15,
    kind: "date",
    getValue: (item) => item.tanggalBerakhirKontrak || null,
  },
  {
    header: "Nilai Kontrak (Rp)",
    width: 22,
    kind: "money",
    getValue: (item) => Number(item.nominalKontrak) || 0,
  },
  {
    header: "Total Terbayar (Rp)",
    width: 22,
    kind: "money",
    getValue: (item) => {
      const pays = item.pembayaran || [];
      return pays.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
    },
  },
  {
    header: "Sisa Tagihan (Rp)",
    width: 22,
    kind: "money",
    getValue: (item) => {
      const nominal = Number(item.nominalKontrak) || 0;
      const pays = item.pembayaran || [];
      const totalBayar = pays.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
      return Math.max(0, nominal - totalBayar);
    },
  },
  {
    header: "Status Pembayaran",
    width: 18,
    kind: "center",
    getValue: (item) => {
      const nominal = Number(item.nominalKontrak) || 0;
      const pays = item.pembayaran || [];
      const totalBayar = pays.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
      const isLunas = nominal > 0 && totalBayar >= nominal;
      return isLunas ? "LUNAS" : "BELUM LUNAS";
    },
    getStyle: (item) => {
      const nominal = Number(item.nominalKontrak) || 0;
      const pays = item.pembayaran || [];
      const totalBayar = pays.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
      const isLunas = nominal > 0 && totalBayar >= nominal;
      return isLunas
        ? { font: { bold: true, color: { rgb: "047857" } }, fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } } }
        : { font: { color: { rgb: "B91C1C" } }, fill: { patternType: "solid", fgColor: { rgb: "FEE2E2" } } };
    },
  },
  {
    header: "Jumlah Termin",
    width: 14,
    kind: "center",
    getValue: (item) => (item.pembayaran || []).length,
  },
  {
    header: "Rincian Pembayaran Masuk",
    width: 44,
    kind: "wrap",
    getValue: (item) => {
      const pays = item.pembayaran || [];
      if (pays.length === 0) return "-";
      return pays
        .map((p, idx) => {
          const tgl = p.tanggal || "-";
          const nom = (Number(p.jumlah) || 0).toLocaleString("id-ID");
          const ket = p.keterangan ? ` (${p.keterangan})` : "";
          return `Termin ${idx + 1}: ${tgl} Rp ${nom}${ket}`;
        })
        .join(";\n");
    },
  },
  {
    header: "PIC Admin",
    width: 18,
    kind: "text",
    getValue: (item) => item.pic || "-",
  },
  {
    header: "Dokumen Sales",
    width: 18,
    kind: "center",
    getValue: (item) => item.dokSales || "Belum Upload",
    getStyle: (item) => {
      const ds = item.dokSales;
      if (ds === "Disetujui" || ds === "Sudah Upload") {
        return { font: { bold: true, color: { rgb: "047857" } }, fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } } };
      }
      if (ds === "Ditolak") {
        return { font: { bold: true, color: { rgb: "B91C1C" } }, fill: { patternType: "solid", fgColor: { rgb: "FEE2E2" } } };
      }
      if (ds === "Proses Verifikasi") {
        return { font: { bold: true, color: { rgb: "B45309" } }, fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } } };
      }
      return { font: { color: { rgb: "64748B" } } };
    },
  },
  {
    header: "Alasan Penolakan Dok.",
    width: 32,
    kind: "wrap",
    getValue: (item) => item.alasanPenolakan || item.dokVerifikasi?.alasanPenolakan || "-",
  },
  {
    header: "Status Project",
    width: 18,
    kind: "center",
    getValue: (item) => item.status || "PENAGIHAN",
    getStyle: (item) => {
      const st = (item.status || "PENAGIHAN").toUpperCase();
      if (st === "DONE PROJECT") {
        return { font: { bold: true, color: { rgb: "047857" } }, fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } } };
      }
      if (st === "PENDING") {
        return { font: { bold: true, color: { rgb: "B45309" } }, fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } } };
      }
      return { font: { bold: true, color: { rgb: "1D4ED8" } }, fill: { patternType: "solid", fgColor: { rgb: "DBEAFE" } } };
    },
  },
  {
    header: "Usulan Status Sistem",
    width: 22,
    kind: "center",
    getValue: (item) => {
      const sug = getSuggestedProjectStatus(item);
      return sug.status;
    },
  },
  {
    header: "Alasan Usulan Status",
    width: 38,
    kind: "wrap",
    getValue: (item) => {
      const sug = getSuggestedProjectStatus(item);
      return sug.reason;
    },
  },
];

function formatCell(
  kind: ColumnDef["kind"],
  val: string | number | null,
  extraStyle?: object
): XLSX.CellObject {
  const baseAlign: Record<string, unknown> = { vertical: "top" };
  if (kind === "center") baseAlign.horizontal = "center";
  if (kind === "wrap") baseAlign.wrapText = true;

  const base = {
    border: BORDERS,
    alignment: baseAlign,
    ...(extraStyle || {}),
  };

  if (kind === "money") {
    return {
      t: "n",
      v: Number(val) || 0,
      z: '"Rp "#,##0',
      s: { ...base, alignment: { vertical: "top", horizontal: "right" } },
    };
  }

  if (kind === "number") {
    return {
      t: "n",
      v: Number(val) || 0,
      z: "#,##0",
      s: { ...base, alignment: { vertical: "top", horizontal: "right" } },
    };
  }

  if (kind === "date") {
    if (!val) return { t: "s", v: "-", s: base };
    const serial = toExcelSerial(String(val));
    if (serial !== null) {
      return {
        t: "n",
        v: serial,
        z: "dd-mmm-yyyy",
        s: { ...base, alignment: { vertical: "top", horizontal: "center" } },
      };
    }
    return { t: "s", v: String(val), s: base };
  }

  return {
    t: "s",
    v: String(val ?? "-"),
    s: base,
  };
}

export function buildDataProjectWorkbook(
  items: ProjectContractExportItem[],
  meta: DataProjectExportMeta
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Data Project ───
  const ws: XLSX.WorkSheet = {};
  const lastCol = DATA_PROJECT_COLUMNS.length - 1;

  // Header Row
  DATA_PROJECT_COLUMNS.forEach((col, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = {
      t: "s",
      v: col.header,
      s: HEADER_STYLE,
    };
  });

  // Data Rows
  items.forEach((item, rIdx) => {
    DATA_PROJECT_COLUMNS.forEach((col, cIdx) => {
      const val = col.getValue(item, rIdx + 1);
      const style = col.getStyle ? col.getStyle(item) : undefined;
      ws[XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx })] = formatCell(
        col.kind,
        val,
        style
      );
    });
  });

  const lastRow = Math.max(items.length, 0);
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastCol },
  });
  ws["!cols"] = DATA_PROJECT_COLUMNS.map((c) => ({ wch: c.width }));
  ws["!rows"] = [{ hpt: 30 }]; // header height
  ws["!autofilter"] = { ref: ws["!ref"] };

  XLSX.utils.book_append_sheet(wb, ws, "Data Project");

  // ─── Sheet 2: Ringkasan & Filter ───
  const totalNominal = items.reduce((s, c) => s + (Number(c.nominalKontrak) || 0), 0);
  const totalTerbayar = items.reduce((s, c) => {
    const pays = c.pembayaran || [];
    return s + pays.reduce((pSum, p) => pSum + (Number(p.jumlah) || 0), 0);
  }, 0);
  const totalSisa = Math.max(0, totalNominal - totalTerbayar);
  const countDone = items.filter((c) => (c.status || "").toUpperCase() === "DONE PROJECT").length;
  const countPenagihan = items.filter((c) => (c.status || "").toUpperCase() === "PENAGIHAN").length;
  const countPending = items.filter((c) => (c.status || "").toUpperCase() === "PENDING").length;

  const summaryData: (string | number)[][] = [
    ["Laporan Data Project (MabelHub)", ""],
    ["Waktu Ekspor", meta.today],
    ["Diekspor Oleh", meta.exportedBy || "Admin"],
    ["Total Project", items.length],
    ["", ""],
    ["Ringkasan Keuangan", ""],
    ["Total Nilai Kontrak", `Rp ${totalNominal.toLocaleString("id-ID")}`],
    ["Total Terbayar", `Rp ${totalTerbayar.toLocaleString("id-ID")}`],
    ["Total Sisa Tagihan", `Rp ${totalSisa.toLocaleString("id-ID")}`],
    ["", ""],
    ["Status Project", ""],
    ["DONE PROJECT", `${countDone} project`],
    ["PENAGIHAN", `${countPenagihan} project`],
    ["PENDING", `${countPending} project`],
    ["", ""],
    ["Filter yang Diterapkan", ""],
  ];

  if (meta.filters.length === 0) {
    summaryData.push(["Filter", "Semua Data (Tanpa Filter Khusus)"]);
  } else {
    meta.filters.forEach((f) => {
      summaryData.push([f.label, f.value]);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Filter");

  return wb;
}

