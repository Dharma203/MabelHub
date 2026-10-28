import {
  DEFAULT_RETENSI_HARI,
  DOK_AKTIF_FILTER,
  getRetensiHari,
  nextVersion,
  retentionCutoff,
} from "./dokumentasi-arsip";

describe("DOK_AKTIF_FILTER", () => {
  it("memakai $ne: true agar dokumen lama tanpa field archived tetap dianggap aktif", () => {
    expect(DOK_AKTIF_FILTER).toEqual({ archived: { $ne: true } });
  });
});

describe("getRetensiHari", () => {
  it("default 90 hari jika env kosong atau tidak valid", () => {
    expect(getRetensiHari(undefined)).toBe(DEFAULT_RETENSI_HARI);
    expect(getRetensiHari("")).toBe(DEFAULT_RETENSI_HARI);
    expect(getRetensiHari("abc")).toBe(DEFAULT_RETENSI_HARI);
  });
  it("membaca angka dari env", () => {
    expect(getRetensiHari("30")).toBe(30);
    expect(getRetensiHari("45.9")).toBe(45);
  });
  it("0 atau negatif = simpan selamanya (0)", () => {
    expect(getRetensiHari("0")).toBe(0);
    expect(getRetensiHari("-5")).toBe(0);
  });
});

describe("retentionCutoff", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  it("menghitung batas waktu penghapusan", () => {
    expect(retentionCutoff(now, 90)?.toISOString()).toBe("2026-07-28T00:00:00.000Z");
  });
  it("null jika retensi dimatikan sehingga tidak ada yang boleh dihapus", () => {
    expect(retentionCutoff(now, 0)).toBeNull();
  });
});

describe("nextVersion", () => {
  it("v1 untuk kontrak yang belum punya dokumentasi", () => {
    expect(nextVersion(null)).toBe(1);
    expect(nextVersion(undefined)).toBe(1);
  });
  it("dokumen lama tanpa version dihitung v1, jadi berikutnya v2", () => {
    expect(nextVersion({})).toBe(2);
  });
  it("menambah dari version terakhir", () => {
    expect(nextVersion({ version: 3 })).toBe(4);
  });
});
