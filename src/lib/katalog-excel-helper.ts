import * as XLSX from "xlsx-js-style";
import { PRODUCT_SPEC_REGISTRY } from "./katalog-specs";

// ─── Header Styling ────────────────────────────────────────────────────────
const BORDER_THIN = { style: "thin", color: { rgb: "CBD5E1" } };
const BORDERS = {
  top: BORDER_THIN,
  bottom: BORDER_THIN,
  left: BORDER_THIN,
  right: BORDER_THIN,
};

const HEADER_PRIMARY_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "1D4ED8" } }, // Blue 700
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

const HEADER_REQUIRED_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "B91C1C" } }, // Red 700 for required
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDERS,
};

const DATA_CELL_STYLE = {
  font: { sz: 10, name: "Calibri", color: { rgb: "1E293B" } },
  alignment: { vertical: "center" },
  border: BORDERS,
};

const DATA_CELL_NUMBER_STYLE = {
  font: { sz: 10, name: "Calibri", color: { rgb: "1E293B" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: BORDERS,
};

const DATA_CELL_CENTER_STYLE = {
  font: { sz: 10, name: "Calibri", color: { rgb: "1E293B" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: BORDERS,
};

// ─── Column Definition for Excel Template ─────────────────────────────────
export interface ExcelKatalogColumn {
  key: string;
  header: string;
  width: number;
  required?: boolean;
  type?: "text" | "number" | "center";
  sample1: string | number;
  sample2: string | number;
}

export const EXCEL_KATALOG_COLUMNS: ExcelKatalogColumn[] = [
  {
    key: "namaProduk",
    header: "Nama Produk*",
    width: 36,
    required: true,
    sample1: "Monitor LED Dell 24 Inch Full HD IPS S2421HN",
    sample2: "Kursi Kerja Kantor Ergonomis Mesh Hitam MBL-02",
  },
  {
    key: "kategori",
    header: "Kategori*",
    width: 22,
    required: true,
    sample1: "Elektronik",
    sample2: "Perabot & Furnitur",
  },
  {
    key: "subKategori",
    header: "Sub Kategori",
    width: 22,
    sample1: "Monitor PC",
    sample2: "Kursi",
  },
  {
    key: "merek",
    header: "Merek",
    width: 18,
    sample1: "Dell",
    sample2: "Mabel Living",
  },
  {
    key: "sku",
    header: "SKU",
    width: 18,
    sample1: "MBL-DEL-2401",
    sample2: "MBL-CHR-002",
  },
  {
    key: "hargaProduk",
    header: "Harga Produk (Rp)*",
    width: 20,
    required: true,
    type: "number",
    sample1: 1850000,
    sample2: 950000,
  },
  {
    key: "persenPajak",
    header: "PPN (%)",
    width: 12,
    type: "number",
    sample1: 11,
    sample2: 11,
  },
  {
    key: "jumlahStok",
    header: "Jumlah Stok*",
    width: 14,
    required: true,
    type: "number",
    sample1: 25,
    sample2: 50,
  },
  {
    key: "satuanProduk",
    header: "Satuan Produk",
    width: 14,
    type: "center",
    sample1: "Unit",
    sample2: "Unit",
  },
  {
    key: "nilaiTkdn",
    header: "Nilai TKDN (%)",
    width: 15,
    type: "number",
    sample1: 28.5,
    sample2: 45.0,
  },
  {
    key: "nilaiBmp",
    header: "Nilai BMP (%)",
    width: 15,
    type: "number",
    sample1: 5.0,
    sample2: 10.0,
  },
  {
    key: "namaPenyedia",
    header: "Nama Penyedia",
    width: 22,
    sample1: "MabelHub Store",
    sample2: "MabelHub Store",
  },
  {
    key: "namaPic",
    header: "Nama PIC",
    width: 20,
    sample1: "Budi Santoso",
    sample2: "Dewi Lestari",
  },
  {
    key: "noHpPic",
    header: "No HP PIC",
    width: 18,
    sample1: "081234567890",
    sample2: "081987654321",
  },
  {
    key: "jenisPenyedia",
    header: "Jenis Penyedia",
    width: 16,
    type: "center",
    sample1: "UMKK",
    sample2: "UMKK",
  },
  {
    key: "lokasiPenyedia",
    header: "Lokasi Penyedia",
    width: 20,
    sample1: "DKI Jakarta",
    sample2: "Kota Tangerang",
  },
  {
    key: "dikirimDari",
    header: "Dikirim Dari",
    width: 20,
    sample1: "Jakarta Pusat",
    sample2: "Kota Tangerang",
  },
  {
    key: "beratProduk",
    header: "Berat Produk",
    width: 16,
    sample1: "3.5 kg",
    sample2: "12 kg",
  },
  {
    key: "dimensiProduk",
    header: "Dimensi Produk",
    width: 20,
    sample1: "54 x 18 x 41 cm",
    sample2: "60 x 60 x 115 cm",
  },
  {
    key: "garansi",
    header: "Garansi",
    width: 24,
    sample1: "3 Tahun Resmi Dell",
    sample2: "1 Tahun Rangka & Hidrolik",
  },
  {
    key: "kelengkapanProduk",
    header: "Kelengkapan Produk",
    width: 28,
    sample1: "Unit Monitor, Stand, Kabel Power, Kabel HDMI",
    sample2: "Komponen Kursi, Toolkit, Panduan Rakit",
  },
  {
    key: "deskripsi",
    header: "Deskripsi",
    width: 40,
    sample1: "Monitor kantor & komersial dengan panel IPS jernih dan hemat energi.",
    sample2: "Kursi kantor ergonomis dengan sandaran jaring breathable dan lumbar support.",
  },
  {
    key: "kodeKbki",
    header: "Kode KBKI",
    width: 16,
    sample1: "4528100001",
    sample2: "-",
  },
  {
    key: "fotoUtama",
    header: "URL Foto Utama",
    width: 32,
    sample1: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
    sample2: "",
  },
  {
    key: "sertifikatSni",
    header: "Sertifikat SNI",
    width: 16,
    type: "center",
    sample1: "Ada",
    sample2: "Tidak ada",
  },
  {
    key: "nomorSni",
    header: "Nomor SNI",
    width: 20,
    sample1: "SNI 04-6253-2003",
    sample2: "",
  },
  {
    key: "statusDraf",
    header: "Status Draf (Ya/Tidak)",
    width: 22,
    type: "center",
    sample1: "Tidak",
    sample2: "Tidak",
  },
];

// ─── Generate Template Workbook ───────────────────────────────────────────
export function createKatalogExcelWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Template Produk
  const wsProduk: XLSX.WorkSheet = {};
  const totalCols = EXCEL_KATALOG_COLUMNS.length;

  // Header row (Row 0)
  EXCEL_KATALOG_COLUMNS.forEach((col, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    wsProduk[cellAddr] = {
      t: "s",
      v: col.header,
      s: col.required ? HEADER_REQUIRED_STYLE : HEADER_PRIMARY_STYLE,
    };
  });

  // Sample Row 1 (Row 1)
  EXCEL_KATALOG_COLUMNS.forEach((col, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 1, c: colIdx });
    const val = col.sample1;
    const isNum = typeof val === "number";
    wsProduk[cellAddr] = {
      t: isNum ? "n" : "s",
      v: val,
      s: isNum ? DATA_CELL_NUMBER_STYLE : col.type === "center" ? DATA_CELL_CENTER_STYLE : DATA_CELL_STYLE,
    };
  });

  // Sample Row 2 (Row 2)
  EXCEL_KATALOG_COLUMNS.forEach((col, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 2, c: colIdx });
    const val = col.sample2;
    const isNum = typeof val === "number";
    wsProduk[cellAddr] = {
      t: isNum ? "n" : "s",
      v: val,
      s: isNum ? DATA_CELL_NUMBER_STYLE : col.type === "center" ? DATA_CELL_CENTER_STYLE : DATA_CELL_STYLE,
    };
  });

  wsProduk["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: 2, c: totalCols - 1 },
  });
  wsProduk["!cols"] = EXCEL_KATALOG_COLUMNS.map((c) => ({ wch: c.width }));
  wsProduk["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 20 }];

  XLSX.utils.book_append_sheet(wb, wsProduk, "Template Produk");

  // 2. Sheet 2: Panduan & Kategori
  const guideData: (string | number)[][] = [
    ["PANDUAN PENGISIAN TEMPLATE EXCEL KATALOG PRODUK MABELHUB"],
    [""],
    ["1. Kolom dengan tanda (*) berwarna MERAH adalah kolom WAJIB diisi (Nama Produk, Kategori, Harga Produk, Jumlah Stok)."],
    ["2. Baris 2 dan 3 pada 'Template Produk' merupakan CONTOH. Anda dapat menghapus atau menggantinya dengan produk Anda."],
    ["3. Kolom 'Harga Produk' dan 'Jumlah Stok' hanya diisi angka murni tanpa tanda titik, koma, atau simbol 'Rp'."],
    ["4. Kolom 'PPN (%)' diisi angka (misal: 11 atau 12, atau 0 jika tidak dikenakan PPN)."],
    ["5. Kolom 'Nilai TKDN (%)' dan 'Nilai BMP (%)' diisi angka desimal (contoh: 25.5 atau 0 jika belum ada)."],
    ["6. Kolom 'Status Draf' diisi 'Ya' jika masih draf, atau 'Tidak' jika ingin langsung tayang di katalog."],
    ["7. File ini dapat langsung diunggah pada halaman Tambah Produk untuk diimpor secara massal atau diisikan ke form."],
    [""],
    ["DAFTAR KATEGORI & SUB KATEGORI YANG TERSEDIA DI MABELHUB:"],
    ["Kategori", "Sub Kategori", "Kode KBKI Rekomendasi"],
  ];

  PRODUCT_SPEC_REGISTRY.forEach((cat) => {
    cat.subcategories.forEach((sub) => {
      guideData.push([cat.name, sub.name, sub.kbkiDefault || "-"]);
    });
  });

  guideData.push([""], ["PILIHAN SATUAN PRODUK UMUM:"], ["Unit", "Buah", "Set", "Pcs", "Paket", "Box", "Roll", "Meter", "Rim"]);

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 25 }];

  // Styling for guide header
  if (wsGuide["A1"]) {
    wsGuide["A1"].s = {
      font: { bold: true, sz: 12, color: { rgb: "1D4ED8" }, name: "Calibri" },
    };
  }
  if (wsGuide["A11"]) {
    wsGuide["A11"].s = {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" }, name: "Calibri" },
    };
  }
  if (wsGuide["A12"]) {
    wsGuide["A12"].s = HEADER_PRIMARY_STYLE;
  }
  if (wsGuide["B12"]) {
    wsGuide["B12"].s = HEADER_PRIMARY_STYLE;
  }
  if (wsGuide["C12"]) {
    wsGuide["C12"].s = HEADER_PRIMARY_STYLE;
  }

  XLSX.utils.book_append_sheet(wb, wsGuide, "Panduan & Daftar Kategori");

  return wb;
}

// ─── Browser Download Helper ──────────────────────────────────────────────
export function downloadKatalogTemplate(filename = "Template_Tambah_Katalog_Produk.xlsx"): void {
  const wb = createKatalogExcelWorkbook();
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ─── Parser for Uploaded Excel ────────────────────────────────────────────
export interface ParsedProductItem {
  namaProduk: string;
  kategori: string;
  subKategori: string;
  merek: string;
  sku: string;
  hargaProduk: number;
  persenPajak: number;
  hargaSetelahPajak: number;
  jumlahStok: number;
  satuanProduk: string;
  nilaiTkdn: number;
  nilaiBmp: number;
  tkdnBmp: number;
  namaPenyedia: string;
  namaPic: string;
  noHpPic: string;
  jenisPenyedia: string;
  lokasiPenyedia: string;
  dikirimDari: string;
  beratProduk: string;
  dimensiProduk: string;
  garansi: string;
  kelengkapanProduk: string;
  deskripsi: string;
  kodeKbki: string;
  fotoUtama: string;
  sertifikatSni: string;
  nomorSni: string;
  statusDraf: boolean;
  rowNumber: number;
  isValid: boolean;
  errors: string[];
}

export interface ParseExcelResult {
  validItems: ParsedProductItem[];
  invalidItems: ParsedProductItem[];
  totalRows: number;
}

function cleanString(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

// Normalize object keys by removing whitespace, asterisks, and lowercasing
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[()]/g, "")
    .replace(/%/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function parseKatalogExcelFile(file: File): Promise<ParseExcelResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const sheetName =
    wb.SheetNames.find((s) => s.toLowerCase().includes("template") || s.toLowerCase().includes("produk")) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error("Format sheet Excel tidak ditemukan.");
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const validItems: ParsedProductItem[] = [];
  const invalidItems: ParsedProductItem[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Row 1 is header
    const errors: string[] = [];

    // Map keys flexibly
    const rowNormalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      rowNormalized[normalizeKey(k)] = row[k];
    });

    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        const norm = normalizeKey(k);
        if (rowNormalized[norm] !== undefined && rowNormalized[norm] !== "") {
          return rowNormalized[norm];
        }
      }
      return "";
    };

    const namaProduk = cleanString(getVal("namaproduk", "nama", "namabarang", "productname"));
    const kategori = cleanString(getVal("kategori", "kategoriproduk", "category")) || "Umum & Lainnya";
    const subKategori = cleanString(getVal("subkategori", "subkategoriproduk", "subcategory"));
    const merek = cleanString(getVal("merek", "merk", "brand")) || "Tanpa Merek";
    const sku = cleanString(getVal("sku", "kodeproduk", "kodesku"));
    const hargaProduk = parseNumber(getVal("hargaprodukrp", "hargaproduk", "harga", "price"));
    const persenPajak = parseNumber(getVal("ppn", "persenpajak", "pajak"), 0);
    const jumlahStok = parseNumber(getVal("jumlahstok", "stok", "stock", "qty"), 0);
    const satuanProduk = cleanString(getVal("satuanproduk", "satuan", "unit")) || "Unit";
    const nilaiTkdn = parseNumber(getVal("nilaitkdn", "tkdn"));
    const nilaiBmp = parseNumber(getVal("nilaibmp", "bmp"));
    const tkdnBmp = nilaiTkdn + nilaiBmp;
    const namaPenyedia = cleanString(getVal("namapenyedia", "penyedia", "toko")) || "MabelHub Store";
    const namaPic = cleanString(getVal("namapic", "pic", "namakontak")) || "-";
    const noHpPic = cleanString(getVal("nohppic", "nohp", "nomorhp", "telepon", "whatsapp")) || "-";
    const jenisPenyedia = cleanString(getVal("jenispenyedia", "tipepenyedia")) || "UMKK";
    const lokasiPenyedia = cleanString(getVal("lokasipenyedia", "lokasi")) || "DKI Jakarta";
    const dikirimDari = cleanString(getVal("dikirimdari", "asalpengiriman")) || lokasiPenyedia;
    const beratProduk = cleanString(getVal("beratproduk", "berat", "weight")) || "-";
    const dimensiProduk = cleanString(getVal("dimensiproduk", "dimensi", "ukuran")) || "-";
    const garansi = cleanString(getVal("garansi", "warranty")) || "-";
    const kelengkapanProduk = cleanString(getVal("kelengkapanproduk", "kelengkapan")) || "-";
    const deskripsi = cleanString(getVal("deskripsi", "deskripsiproduk", "keterangan")) || "";
    const kodeKbki = cleanString(getVal("kodekbki", "kbki")) || "-";
    const fotoUtama = cleanString(getVal("urlfotoutama", "fotoutama", "foto", "gambar", "image"));
    const sertifikatSniRaw = cleanString(getVal("sertifikatsni", "sni"));
    const sertifikatSni = sertifikatSniRaw.toLowerCase().includes("ada") ? "Ada" : "Tidak ada";
    const nomorSni = cleanString(getVal("nomorsni", "nosni"));
    const statusDrafRaw = cleanString(getVal("statusdraf", "draf", "draft"));
    const statusDraf =
      statusDrafRaw.toLowerCase() === "ya" ||
      statusDrafRaw.toLowerCase() === "true" ||
      statusDrafRaw.toLowerCase() === "draft";

    // Validate Required Fields
    if (!namaProduk || namaProduk.length < 3) {
      errors.push("Nama Produk minimal 3 karakter");
    }
    if (!kategori) {
      errors.push("Kategori wajib diisi");
    }
    if (hargaProduk <= 0) {
      errors.push("Harga Produk harus lebih dari 0");
    }
    if (jumlahStok < 0) {
      errors.push("Jumlah Stok tidak boleh negatif");
    }

    const hargaSetelahPajak = Math.round(hargaProduk + (hargaProduk * persenPajak) / 100);

    const item: ParsedProductItem = {
      namaProduk,
      kategori,
      subKategori,
      merek,
      sku: sku || `MBL-${Date.now().toString().slice(-6)}-${index + 1}`,
      hargaProduk,
      persenPajak,
      hargaSetelahPajak,
      jumlahStok,
      satuanProduk,
      nilaiTkdn,
      nilaiBmp,
      tkdnBmp,
      namaPenyedia,
      namaPic,
      noHpPic,
      jenisPenyedia,
      lokasiPenyedia,
      dikirimDari,
      beratProduk,
      dimensiProduk,
      garansi,
      kelengkapanProduk,
      deskripsi,
      kodeKbki,
      fotoUtama:
        fotoUtama ||
        "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80",
      sertifikatSni,
      nomorSni,
      statusDraf,
      rowNumber: rowNum,
      isValid: errors.length === 0,
      errors,
    };

    if (item.isValid) {
      validItems.push(item);
    } else {
      invalidItems.push(item);
    }
  });

  return {
    validItems,
    invalidItems,
    totalRows: rawRows.length,
  };
}

// ─── Export Products to Excel ─────────────────────────────────────────────
export interface ExportFilterMeta {
  statusTab?: string;
  categoryFilter?: string;
  brandFilter?: string;
  search?: string;
  minHarga?: string;
  maxHarga?: string;
  minTkdn?: string;
  sortFilter?: string;
}

export function exportKatalogToExcel(
  items: any[],
  meta?: ExportFilterMeta
): void {
  const wb = XLSX.utils.book_new();

  // Column definitions for export
  const EXPORT_COLUMNS = [
    { header: "No", width: 6, key: "no", align: "center", isMoney: false },
    { header: "Nama Produk", width: 36, key: "namaProduk", align: "left", isMoney: false },
    { header: "SKU", width: 18, key: "sku", align: "left", isMoney: false },
    { header: "Kategori", width: 22, key: "kategori", align: "left", isMoney: false },
    { header: "Sub Kategori", width: 20, key: "subKategori", align: "left", isMoney: false },
    { header: "Merek", width: 18, key: "merek", align: "left", isMoney: false },
    { header: "Jenis Produk", width: 14, key: "jenisProduk", align: "center", isMoney: false },
    { header: "Harga Dasar (Rp)", width: 18, key: "hargaProduk", align: "right", isMoney: true },
    { header: "PPN (%)", width: 10, key: "persenPajak", align: "right", isMoney: false },
    { header: "Harga Tayang (Rp)", width: 20, key: "hargaSetelahPajak", align: "right", isMoney: true },
    { header: "Stok", width: 10, key: "jumlahStok", align: "right", isMoney: false },
    { header: "Satuan", width: 12, key: "satuanProduk", align: "center", isMoney: false },
    { header: "Status Publikasi", width: 18, key: "statusDraf", align: "center", isMoney: false },
    { header: "Nilai TKDN (%)", width: 14, key: "nilaiTkdn", align: "right", isMoney: false },
    { header: "Nilai BMP (%)", width: 14, key: "nilaiBmp", align: "right", isMoney: false },
    { header: "Total TKDN+BMP (%)", width: 18, key: "tkdnBmp", align: "right", isMoney: false },
    { header: "Status Pre-Order", width: 18, key: "statusPreOrder", align: "center", isMoney: false },
    { header: "Nama Penyedia", width: 22, key: "namaPenyedia", align: "left", isMoney: false },
    { header: "Nama PIC", width: 18, key: "namaPic", align: "left", isMoney: false },
    { header: "No HP PIC", width: 18, key: "noHpPic", align: "left", isMoney: false },
    { header: "Lokasi Penyedia", width: 20, key: "lokasiPenyedia", align: "left", isMoney: false },
    { header: "Dikirim Dari", width: 20, key: "dikirimDari", align: "left", isMoney: false },
    { header: "Tanggal Masuk", width: 16, key: "tanggalMasukKatalog", align: "center", isMoney: false },
  ];

  const ws: XLSX.WorkSheet = {};
  const totalCols = EXPORT_COLUMNS.length;

  // Header Row
  EXPORT_COLUMNS.forEach((col, cIdx) => {
    ws[XLSX.utils.encode_cell({ r: 0, c: cIdx })] = {
      t: "s",
      v: col.header,
      s: HEADER_PRIMARY_STYLE,
    };
  });

  // Data Rows
  items.forEach((item, rIdx) => {
    const rowNum = rIdx + 1;
    const isDraft = Boolean(item.statusDraf);
    const statusText = isDraft ? "Draf (Belum Tayang)" : "Aktif (Tayang)";

    EXPORT_COLUMNS.forEach((col, cIdx) => {
      let val: any = "";
      if (col.key === "no") val = rIdx + 1;
      else if (col.key === "statusDraf") val = statusText;
      else if (col.key === "hargaSetelahPajak") {
        val = item.hargaSetelahPajak !== undefined
          ? Number(item.hargaSetelahPajak)
          : Math.round((Number(item.hargaProduk) || 0) * (1 + (Number(item.persenPajak) || 0) / 100));
      } else if (col.key === "namaPic") {
        val = item.namaPic || item.namaPicPenyedia || "-";
      } else if (col.key === "noHpPic") {
        val = item.noHpPic || item.noHpPicPenyedia || "-";
      } else if (col.key === "hargaProduk") {
        val = Number(item.hargaProduk) || 0;
      } else if (col.key === "persenPajak") {
        val = Number(item.persenPajak) || 0;
      } else if (col.key === "jumlahStok") {
        val = Number(item.jumlahStok) || 0;
      } else if (col.key === "nilaiTkdn") {
        val = Number(item.nilaiTkdn) || 0;
      } else if (col.key === "nilaiBmp") {
        val = Number(item.nilaiBmp) || 0;
      } else if (col.key === "tkdnBmp") {
        val = (Number(item.nilaiTkdn) || 0) + (Number(item.nilaiBmp) || 0) || Number(item.tkdnBmp) || 0;
      } else {
        val = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : "-";
      }

      const isNum = typeof val === "number";
      let cellStyle: any = DATA_CELL_STYLE;
      if (col.align === "center") cellStyle = DATA_CELL_CENTER_STYLE;
      else if (col.align === "right" || isNum) cellStyle = DATA_CELL_NUMBER_STYLE;

      if (col.key === "statusDraf") {
        cellStyle = {
          ...cellStyle,
          font: {
            ...cellStyle.font,
            bold: true,
            color: { rgb: isDraft ? "B45309" : "15803D" },
          },
        };
      }

      const cellObj: XLSX.CellObject = {
        t: isNum ? "n" : "s",
        v: val,
        s: cellStyle,
      };

      if (isNum && col.isMoney) {
        cellObj.z = "#,##0";
      }

      ws[XLSX.utils.encode_cell({ r: rowNum, c: cIdx })] = cellObj;
    });
  });

  const lastRow = Math.max(items.length, 0);
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: totalCols - 1 },
  });
  ws["!cols"] = EXPORT_COLUMNS.map((c) => ({ wch: c.width }));
  ws["!rows"] = [{ hpt: 28 }];
  ws["!autofilter"] = { ref: ws["!ref"] };

  XLSX.utils.book_append_sheet(wb, ws, "Katalog Produk");

  // Sheet 2: Ringkasan Ekspor
  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalProduk = items.length;
  const totalAktif = items.filter((i) => !i.statusDraf).length;
  const totalDraf = items.filter((i) => i.statusDraf).length;
  const totalNilaiStok = items.reduce((sum, i) => {
    const harga = Number(i.hargaProduk) || 0;
    const stok = Number(i.jumlahStok) || 0;
    return sum + harga * stok;
  }, 0);

  const summaryData: (string | number)[][] = [
    ["LAPORAN EKSPOR KATALOG PRODUK MABELHUB"],
    [""],
    ["Tanggal Unduh", todayStr],
    ["Waktu Unduh", new Date().toLocaleTimeString("id-ID")],
    ["Total Produk Diekspor", totalProduk],
    ["Produk Aktif (Tayang)", totalAktif],
    ["Produk Draf", totalDraf],
    ["Total Estimasi Nilai Stok (Rp)", totalNilaiStok],
    [""],
    ["PARAMETER FILTER YANG DIGUNAKAN:"],
    [
      "Filter Status Tab",
      meta?.statusTab === "published"
        ? "Aktif (Tayang)"
        : meta?.statusTab === "draft"
        ? "Draf"
        : "Semua Produk",
    ],
    ["Kata Kunci Pencarian", meta?.search ? meta.search : "Semua"],
    [
      "Kategori",
      meta?.categoryFilter && meta.categoryFilter !== "all"
        ? meta.categoryFilter
        : "Semua Kategori",
    ],
    [
      "Merek",
      meta?.brandFilter && meta.brandFilter !== "all"
        ? meta.brandFilter
        : "Semua Merek",
    ],
    [
      "Filter Harga",
      meta?.minHarga || meta?.maxHarga
        ? `Rp ${meta.minHarga || "0"} s/d Rp ${meta.maxHarga || "Tak Terhingga"}`
        : "Semua Harga",
    ],
    ["Filter Min. TKDN", meta?.minTkdn ? `${meta.minTkdn}%` : "Semua"],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 45 }];

  if (wsSummary["A1"]) {
    wsSummary["A1"].s = {
      font: { bold: true, sz: 14, color: { rgb: "1D4ED8" }, name: "Calibri" },
    };
  }
  if (wsSummary["A10"]) {
    wsSummary["A10"].s = {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" }, name: "Calibri" },
    };
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Ekspor");

  // Trigger browser download
  const dateSuffix = new Date().toISOString().split("T")[0];
  const filename = `Katalog_Produk_MabelHub_${dateSuffix}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

