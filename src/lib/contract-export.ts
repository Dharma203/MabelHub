/**
 * Ekspor Excel daftar kontrak.
 *
 * Fungsi di sini murni (menerima baris kontrak, mengembalikan workbook) sehingga bisa dites
 * dengan membaca kembali file hasilnya. Pengambilan data dan pembatasan akses ada di route.
 *
 * Catatan keamanan: semua teks ditulis sebagai sel bertipe string. Excel tidak mengeksekusi
 * isi sel string, jadi nilai seperti "=HYPERLINK(...)" dari data kontrak tampil sebagai teks.
 */
import * as XLSX from "xlsx-js-style";
import {
  CONTRACT_EXPIRY_LABEL,
  daysUntil,
  getContractExpiryStatus,
  type ContractExpiryStatus,
} from "./contract-status";

export const SHEET_KONTRAK = "Kontrak";
export const SHEET_FILTER = "Filter Aktif";

/** Excel menolak sel > 32.767 karakter; potong dengan margin. */
const MAX_CELL_CHARS = 32_000;
/** Selisih hari antara epoch Excel (1899-12-30) dan epoch Unix (1970-01-01). */
const EXCEL_EPOCH_OFFSET = 25_569;

type Contract = Record<string, unknown>;
type Kind = "text" | "date" | "money" | "int" | "wrap";

type Column = {
  header: string;
  width: number;
  kind: Kind;
  value: (c: Contract, ctx: { today: string; no: number }) => string | number | null;
};

const text = (v: unknown) => (v == null ? "" : String(v));

function expiryOf(c: Contract, today: string): ContractExpiryStatus {
  return getContractExpiryStatus(text(c.tanggalBerakhirKontrak), today);
}

export const EXPORT_COLUMNS: Column[] = [
  { header: "No", width: 6, kind: "int", value: (_c, { no }) => no },
  { header: "No. Kontrak", width: 26, kind: "text", value: (c) => text(c.nomorKontrak) },
  { header: "Perusahaan", width: 22, kind: "text", value: (c) => text(c.perusahaan) },
  { header: "Bendera", width: 22, kind: "text", value: (c) => text(c.bendera) },
  { header: "Instansi", width: 30, kind: "wrap", value: (c) => text(c.instansi) },
  { header: "Nama Pengadaan", width: 34, kind: "wrap", value: (c) => text(c.namaPengadaan) },
  { header: "Tgl Kontrak", width: 14, kind: "date", value: (c) => text(c.tanggalKontrak) },
  { header: "Tgl Berakhir", width: 14, kind: "date", value: (c) => text(c.tanggalBerakhirKontrak) },
  {
    header: "Status Masa Berlaku",
    width: 20,
    kind: "text",
    value: (c, { today }) => CONTRACT_EXPIRY_LABEL[expiryOf(c, today)],
  },
  {
    header: "Sisa Hari",
    width: 11,
    kind: "int",
    // Negatif = sudah lewat. Kosong bila tanggal berakhir tidak ada/tidak valid.
    value: (c, { today }) => daysUntil(text(c.tanggalBerakhirKontrak), today),
  },
  { header: "Nominal Kontrak (Rp)", width: 20, kind: "money", value: (c) => Number(c.nominalKontrak) || 0 },
  { header: "Marketing", width: 20, kind: "text", value: (c) => text(c.marketing) },
  { header: "PIC", width: 20, kind: "text", value: (c) => text(c.pic) },
  { header: "Fisik", width: 8, kind: "text", value: (c) => text(c.fisik) },
  { header: "Scan", width: 8, kind: "text", value: (c) => text(c.scan) },
  { header: "Status Penagihan", width: 18, kind: "text", value: (c) => text(c.status) },
  { header: "Dokumen Sales", width: 18, kind: "text", value: (c) => text(c.dokSales) },
  { header: "Keterangan", width: 36, kind: "wrap", value: (c) => text(c.keterangan) },
  { header: "Catatan", width: 36, kind: "wrap", value: (c) => text(c.catatan) },
  { header: "Link GDrive", width: 40, kind: "text", value: (c) => text(c.link) },
];

/** "YYYY-MM-DD" -> nomor seri tanggal Excel; null bila bukan tanggal valid. */
export function toExcelSerial(date: string): number | null {
  const d = daysUntil(String(date).slice(0, 10), "1970-01-01");
  return d === null ? null : d + EXCEL_EPOCH_OFFSET;
}

const BORDER = { style: "thin", color: { rgb: "CBD5E1" } };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "0B6AA9" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

const EXPIRY_STYLE: Partial<Record<ContractExpiryStatus, object>> = {
  KEDALUWARSA: {
    font: { bold: true, color: { rgb: "991B1B" } },
    fill: { patternType: "solid", fgColor: { rgb: "FEE2E2" } },
  },
  SEGERA_BERAKHIR: {
    font: { bold: true, color: { rgb: "92400E" } },
    fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } },
  },
};

function makeCell(kind: Kind, value: string | number | null, extraStyle?: object): XLSX.CellObject {
  const base = { border: BORDERS, alignment: { vertical: "top" } as Record<string, unknown> };

  if (kind === "money") {
    return { t: "n", v: Number(value) || 0, z: "#,##0", s: { ...base } };
  }
  if (kind === "int") {
    if (value === null || value === "") return { t: "s", v: "", s: { ...base } };
    return { t: "n", v: Number(value), z: "0", s: { ...base, alignment: { vertical: "top", horizontal: "center" } } };
  }
  if (kind === "date") {
    const raw = String(value ?? "");
    const serial = raw ? toExcelSerial(raw) : null;
    if (serial !== null) {
      return { t: "n", v: serial, z: "dd-mmm-yyyy", s: { ...base, alignment: { vertical: "top", horizontal: "center" } } };
    }
    // Kosong, atau nilai yang bukan tanggal: tampilkan apa adanya sebagai teks.
    return { t: "s", v: raw.slice(0, MAX_CELL_CHARS), s: { ...base } };
  }

  const str = String(value ?? "").slice(0, MAX_CELL_CHARS);
  const alignment = kind === "wrap" ? { vertical: "top", wrapText: true } : base.alignment;
  return { t: "s", v: str, s: { ...base, alignment, ...(extraStyle ?? {}) } };
}

export type ExportMeta = {
  today: string;
  filters: { label: string; value: string }[];
  exportedBy: string;
  exportedAt: Date;
};

function formatWib(date: Date): string {
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
}

export function buildContractsWorkbook(rows: Contract[], meta: ExportMeta): XLSX.WorkBook {
  const ws: XLSX.WorkSheet = {};
  const lastCol = EXPORT_COLUMNS.length - 1;

  EXPORT_COLUMNS.forEach((col, c) => {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: "s", v: col.header, s: HEADER_STYLE };
  });

  const statusColIndex = EXPORT_COLUMNS.findIndex((c) => c.header === "Status Masa Berlaku");

  rows.forEach((row, i) => {
    EXPORT_COLUMNS.forEach((col, c) => {
      const value = col.value(row, { today: meta.today, no: i + 1 });
      const extra = c === statusColIndex ? EXPIRY_STYLE[expiryOf(row, meta.today)] : undefined;
      ws[XLSX.utils.encode_cell({ r: i + 1, c })] = makeCell(col.kind, value, extra);
    });
  });

  const lastRow = Math.max(rows.length, 0);
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  ws["!cols"] = EXPORT_COLUMNS.map((c) => ({ wch: c.width }));
  ws["!rows"] = [{ hpt: 32 }];
  ws["!autofilter"] = { ref: ws["!ref"] };

  // Sheet 2: filter yang berlaku saat ekspor, agar file bisa dipertanggungjawabkan.
  const info: [string, string | number][] = [
    ["Ekspor Data Kontrak", ""],
    ["Diekspor pada", formatWib(meta.exportedAt)],
    ["Diekspor oleh", meta.exportedBy || "-"],
    ["Jumlah baris", rows.length],
    ["", ""],
    ["Filter yang berlaku", ""],
    ...meta.filters.map((f): [string, string] => [f.label, f.value]),
    ["", ""],
    ["Catatan", "Berisi semua kontrak yang cocok dengan filter di atas, bukan hanya halaman yang sedang tampil."],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo["!cols"] = [{ wch: 26 }, { wch: 70 }];
  ["A1", "A6"].forEach((addr) => {
    if (wsInfo[addr]) wsInfo[addr].s = { font: { bold: true, sz: addr === "A1" ? 14 : 11 } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_KONTRAK);
  XLSX.utils.book_append_sheet(wb, wsInfo, SHEET_FILTER);
  return wb;
}

export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export function exportFileName(today: string): string {
  return `kontrak_${today}.xlsx`;
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
