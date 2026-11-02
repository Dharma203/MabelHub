/**
 * @jest-environment node
 */
import * as XLSX from "xlsx-js-style";
import {
  EXPORT_COLUMNS,
  SHEET_FILTER,
  SHEET_KONTRAK,
  buildContractsWorkbook,
  exportFileName,
  toExcelSerial,
  workbookToBuffer,
} from "./contract-export";

const TODAY = "2026-10-26";
const meta = {
  today: TODAY,
  filters: [{ label: "PIC", value: "Budi" }, { label: "Status Masa Berlaku", value: "Kedaluwarsa" }],
  exportedBy: "Admin Test",
  exportedAt: new Date("2026-10-26T03:30:00Z"), // 10:30 WIB
};

const rows = [
  {
    nomorKontrak: "K-001", perusahaan: "PT A", bendera: "PT A", instansi: "Dinas X", namaPengadaan: "Laptop",
    tanggalKontrak: "2026-01-15", tanggalBerakhirKontrak: "2026-10-20", nominalKontrak: 125000000,
    marketing: "Sari", pic: "Budi", fisik: "YA", scan: "TIDAK", status: "PENAGIHAN", dokSales: "Sudah Upload",
    keterangan: "ket", catatan: "cat", link: "https://drive.example/k001",
  },
  {
    nomorKontrak: "P-001", jenisKontrak: "PERPANJANGAN", parentNomorKontrak: "K-001", nominalKontrak: 5,
    tanggalBerakhirKontrak: "2026-10-30",
  },
  { nomorKontrak: "K-003", tanggalBerakhirKontrak: "", nominalKontrak: 0 },
];

// Baca balik dari bytes asli, seperti yang akan dibuka pengguna di Excel.
function roundTrip(data = rows, m = meta) {
  const buf = workbookToBuffer(buildContractsWorkbook(data, m));
  return { buf, wb: XLSX.read(buf, { type: "buffer" }) };
}
const header = EXPORT_COLUMNS.map((c) => c.header);
const col = (name: string) => header.indexOf(name);
const grid = (wb: XLSX.WorkBook, sheet = SHEET_KONTRAK) =>
  XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, defval: "", raw: true });

describe("buildContractsWorkbook", () => {
  it("menghasilkan file xlsx valid (ZIP 'PK') dengan dua sheet", () => {
    const { buf, wb } = roundTrip();
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(wb.SheetNames).toEqual([SHEET_KONTRAK, SHEET_FILTER]);
  });

  it("baris pertama = header, lalu satu baris per kontrak", () => {
    const g = grid(roundTrip().wb);
    expect(g[0]).toEqual(header);
    expect(g).toHaveLength(1 + rows.length);
    expect(g[1][col("No. Kontrak")]).toBe("K-001");
    expect(g[2][col("No. Kontrak")]).toBe("P-001");
  });

  it("nominal bertipe angka (bukan teks) sehingga bisa dijumlah di Excel", () => {
    const { wb } = roundTrip();
    const cell = wb.Sheets[SHEET_KONTRAK][XLSX.utils.encode_cell({ r: 1, c: col("Nominal Kontrak (Rp)") })];
    expect(cell.t).toBe("n");
    expect(cell.v).toBe(125000000);
  });

  it("tanggal tersimpan sebagai tanggal Excel asli, bukan teks", () => {
    const { wb } = roundTrip();
    const ws = wb.Sheets[SHEET_KONTRAK];
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: col("Tgl Kontrak") })];
    expect(cell.t).toBe("n");
    expect(cell.v).toBe(toExcelSerial("2026-01-15"));
    // Tanpa tanggal: sel kosong, tidak crash
    const empty = ws[XLSX.utils.encode_cell({ r: 3, c: col("Tgl Kontrak") })];
    expect(empty.v).toBe("");
  });

  it("toExcelSerial akurat (patokan independen: 2000-01-01 = 36526, 1970-01-01 = 25569)", () => {
    expect(toExcelSerial("2000-01-01")).toBe(36526);
    expect(toExcelSerial("1970-01-01")).toBe(25569);
    expect(toExcelSerial("2026-02-31")).toBeNull();
    expect(toExcelSerial("bukan")).toBeNull();
  });

  it("status masa berlaku & sisa hari dihitung dari 'hari ini' yang diberikan", () => {
    const g = grid(roundTrip().wb);
    expect(g[1][col("Status Masa Berlaku")]).toBe("Kedaluwarsa");
    expect(g[1][col("Sisa Hari")]).toBe(-6);
    expect(g[2][col("Status Masa Berlaku")]).toBe("Segera Berakhir");
    expect(g[2][col("Sisa Hari")]).toBe(4);
    expect(g[3][col("Status Masa Berlaku")]).toBe("Aktif");
    expect(g[3][col("Sisa Hari")]).toBe(""); // tanpa tanggal berakhir
  });

  it("nomor urut berjalan 1..n", () => {
    const g = grid(roundTrip().wb);
    expect(g.slice(1).map((r) => r[col("No")])).toEqual([1, 2, 3]);
  });

  it("sheet kedua merangkum filter aktif, pelaku, dan jumlah baris", () => {
    const g = grid(roundTrip().wb, SHEET_FILTER).map((r) => r.slice(0, 2));
    const find = (k: string) => g.find((r) => r[0] === k)?.[1];
    expect(find("Diekspor oleh")).toBe("Admin Test");
    expect(find("Jumlah baris")).toBe(3);
    expect(find("PIC")).toBe("Budi");
    expect(find("Status Masa Berlaku")).toBe("Kedaluwarsa");
    expect(find("Diekspor pada")).toContain("10.30"); // WIB, bukan UTC (03.30)
    expect(String(find("Diekspor pada"))).toContain("WIB");
  });

  it("tanpa data tetap menghasilkan file valid berisi header saja", () => {
    const { wb } = roundTrip([], { ...meta });
    expect(grid(wb)).toHaveLength(1);
    expect(grid(wb, SHEET_FILTER).find((r) => r[0] === "Jumlah baris")?.[1]).toBe(0);
  });

  it("ribuan baris tetap utuh", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ nomorKontrak: `K-${i}`, nominalKontrak: i }));
    const g = grid(roundTrip(many).wb);
    expect(g).toHaveLength(5001);
    expect(g[5000][col("No. Kontrak")]).toBe("K-4999");
  });

  it("autofilter aktif pada seluruh tabel", () => {
    const wb = buildContractsWorkbook(rows, meta);
    expect(wb.Sheets[SHEET_KONTRAK]["!autofilter"]).toEqual({ ref: wb.Sheets[SHEET_KONTRAK]["!ref"] });
  });
});

describe("keamanan & ketahanan data", () => {
  it("teks berawalan '=' tetap disimpan sebagai teks, bukan rumus", () => {
    const evil = [{ nomorKontrak: "=HYPERLINK(\"http://evil\",\"x\")", instansi: "+1+1", link: "@SUM(1)" }];
    const { wb } = roundTrip(evil);
    const ws = wb.Sheets[SHEET_KONTRAK];
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: col("No. Kontrak") })];
    expect(cell.t).toBe("s");
    expect(cell.f).toBeUndefined();
    expect(cell.v).toBe('=HYPERLINK("http://evil","x")');
  });

  it("teks super panjang dipotong agar file tidak rusak/gagal ditulis", () => {
    const huge = [{ nomorKontrak: "K", keterangan: "x".repeat(40_000) }];
    const g = grid(roundTrip(huge).wb);
    expect(String(g[1][col("Keterangan")]).length).toBeLessThanOrEqual(32_000);
  });

  it("nilai nominal ngawur menjadi 0, bukan NaN", () => {
    const g = grid(roundTrip([{ nomorKontrak: "K", nominalKontrak: "abc" }]).wb);
    expect(g[1][col("Nominal Kontrak (Rp)")]).toBe(0);
  });

  it("tanggal yang bukan tanggal ditampilkan apa adanya sebagai teks", () => {
    const g = grid(roundTrip([{ nomorKontrak: "K", tanggalKontrak: "segera" }]).wb);
    expect(g[1][col("Tgl Kontrak")]).toBe("segera");
  });
});

describe("exportFileName", () => {
  it("memakai tanggal hari ini", () => {
    expect(exportFileName("2026-10-26")).toBe("kontrak_2026-10-26.xlsx");
  });
});
