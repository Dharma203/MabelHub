import {
  contractStatusFromLabel,
  daysUntil,
  getContractExpiryStatus,
  isValidDateString,
  shiftDate,
  todayString,
} from "./contract-status";

const TODAY = "2026-10-26";

describe("getContractExpiryStatus", () => {
  it("kontrak yang sudah lewat = KEDALUWARSA (bug lama: dianggap Aktif)", () => {
    expect(getContractExpiryStatus("2026-10-25", TODAY)).toBe("KEDALUWARSA");
    expect(getContractExpiryStatus("2025-01-01", TODAY)).toBe("KEDALUWARSA");
  });

  it("berakhir hari ini masih berlaku -> SEGERA_BERAKHIR, bukan kedaluwarsa", () => {
    expect(getContractExpiryStatus("2026-10-26", TODAY)).toBe("SEGERA_BERAKHIR");
  });

  it("batas 7 hari: hari ke-7 segera berakhir, hari ke-8 aktif", () => {
    expect(getContractExpiryStatus("2026-11-02", TODAY)).toBe("SEGERA_BERAKHIR");
    expect(getContractExpiryStatus("2026-11-03", TODAY)).toBe("AKTIF");
  });

  it("tanpa tanggal berakhir atau tidak valid dianggap AKTIF", () => {
    expect(getContractExpiryStatus("", TODAY)).toBe("AKTIF");
    expect(getContractExpiryStatus(undefined, TODAY)).toBe("AKTIF");
    expect(getContractExpiryStatus(null, TODAY)).toBe("AKTIF");
    expect(getContractExpiryStatus("bukan-tanggal", TODAY)).toBe("AKTIF");
    expect(getContractExpiryStatus("2026-02-31", TODAY)).toBe("AKTIF");
  });

  it("menerima ISO datetime (hanya bagian tanggal yang dipakai)", () => {
    expect(getContractExpiryStatus("2026-10-20T00:00:00.000Z", TODAY)).toBe("KEDALUWARSA");
  });

  it("lintas bulan dan tahun", () => {
    expect(getContractExpiryStatus("2027-01-01", "2026-12-28")).toBe("SEGERA_BERAKHIR");
    expect(getContractExpiryStatus("2026-12-31", "2027-01-01")).toBe("KEDALUWARSA");
  });
});

describe("daysUntil", () => {
  it("menghitung selisih hari kalender", () => {
    expect(daysUntil("2026-10-29", TODAY)).toBe(3);
    expect(daysUntil("2026-10-26", TODAY)).toBe(0);
    expect(daysUntil("2026-10-20", TODAY)).toBe(-6);
  });
  it("null jika tidak valid", () => {
    expect(daysUntil("", TODAY)).toBeNull();
    expect(daysUntil("xx", TODAY)).toBeNull();
  });
});

describe("shiftDate", () => {
  it("menggeser tanggal maju dan mundur melewati batas bulan", () => {
    expect(shiftDate("2026-10-26", 7)).toBe("2026-11-02");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("melempar error untuk tanggal tidak valid", () => {
    expect(() => shiftDate("nope", 1)).toThrow();
  });
});

describe("todayString", () => {
  it("memakai zona waktu Asia/Jakarta, bukan UTC", () => {
    // 20:00 UTC tanggal 25 = 03:00 WIB tanggal 26
    expect(todayString(new Date("2026-10-25T20:00:00Z"))).toBe("2026-10-26");
    // 16:59 UTC = 23:59 WIB, masih tanggal yang sama
    expect(todayString(new Date("2026-10-25T16:59:00Z"))).toBe("2026-10-25");
  });
});

describe("isValidDateString", () => {
  it("hanya menerima YYYY-MM-DD yang benar-benar ada di kalender", () => {
    expect(isValidDateString("2026-10-26")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true); // kabisat
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("26-10-2026")).toBe(false);
    expect(isValidDateString("2026-10-26T00:00:00Z")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });
});

describe("contractStatusFromLabel", () => {
  it("memetakan label UI ke kode status", () => {
    expect(contractStatusFromLabel("Aktif")).toBe("AKTIF");
    expect(contractStatusFromLabel("Segera Berakhir")).toBe("SEGERA_BERAKHIR");
    expect(contractStatusFromLabel("Kedaluwarsa")).toBe("KEDALUWARSA");
    expect(contractStatusFromLabel("Semua")).toBeNull();
  });
});
