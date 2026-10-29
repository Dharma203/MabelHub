import { MAX_BULK, buildBulkHistoryEntry, parseBulkRequest, planBulkUpdate } from "./contract-bulk";

const valid = (body: unknown) => {
  const r = parseBulkRequest(body);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const err = (body: unknown) => {
  const r = parseBulkRequest(body);
  return r.ok ? null : r.error;
};

describe("parseBulkRequest", () => {
  it("permintaan valid: nomor dirapikan (trim, unik) dan nilai di-trim", () => {
    expect(valid({ nomorKontrak: [" A ", "B", "A", ""], changes: { pic: " Budi ", marketing: "Sari" } })).toEqual({
      nomorKontrak: ["A", "B"],
      changes: { pic: "Budi", marketing: "Sari" },
    });
  });

  it("hanya PIC atau hanya Marketing diperbolehkan", () => {
    expect(valid({ nomorKontrak: ["A"], changes: { pic: "Budi" } }).changes).toEqual({ pic: "Budi" });
    expect(valid({ nomorKontrak: ["A"], changes: { marketing: "Sari" } }).changes).toEqual({ marketing: "Sari" });
  });

  it("menolak daftar kosong, bukan array, atau elemen bukan teks", () => {
    expect(err({ changes: { pic: "x" } })).toMatch(/wajib/);
    expect(err({ nomorKontrak: [], changes: { pic: "x" } })).toMatch(/minimal satu/);
    expect(err({ nomorKontrak: ["", "  "], changes: { pic: "x" } })).toMatch(/minimal satu/);
    expect(err({ nomorKontrak: [1, 2], changes: { pic: "x" } })).toMatch(/teks/);
    expect(err(null)).toBeTruthy();
  });

  it(`menolak lebih dari ${MAX_BULK} kontrak`, () => {
    const many = Array.from({ length: MAX_BULK + 1 }, (_, i) => `K-${i}`);
    expect(err({ nomorKontrak: many, changes: { pic: "x" } })).toMatch(/Maksimal/);
    expect(err({ nomorKontrak: many.slice(0, MAX_BULK), changes: { pic: "x" } })).toBeNull();
  });

  it("menolak kolom selain PIC/Marketing (mis. nominal, status, nomorKontrak)", () => {
    for (const field of ["nominalKontrak", "status", "nomorKontrak", "history", "$set"]) {
      expect(err({ nomorKontrak: ["A"], changes: { [field]: "x" } })).toMatch(/tidak dapat diubah/);
    }
    // satu kolom ilegal membatalkan seluruh permintaan, walau kolom lain sah
    expect(err({ nomorKontrak: ["A"], changes: { pic: "Budi", status: "X" } })).toMatch(/tidak dapat diubah/);
  });

  it("menolak nilai kosong/bukan teks: tidak ada pengosongan massal", () => {
    expect(err({ nomorKontrak: ["A"], changes: { pic: "" } })).toMatch(/tidak boleh dikosongkan/);
    expect(err({ nomorKontrak: ["A"], changes: { pic: "   " } })).toMatch(/tidak boleh dikosongkan/);
    expect(err({ nomorKontrak: ["A"], changes: { pic: null } })).toMatch(/tidak boleh dikosongkan/);
    expect(err({ nomorKontrak: ["A"], changes: { pic: { $ne: "" } } })).toMatch(/tidak boleh dikosongkan/); // injeksi operator
    expect(err({ nomorKontrak: ["A"], changes: { pic: "x".repeat(101) } })).toMatch(/terlalu panjang/);
  });

  it("menolak perubahan kosong / bukan objek", () => {
    expect(err({ nomorKontrak: ["A"], changes: {} })).toMatch(/Pilih PIC atau Marketing/);
    expect(err({ nomorKontrak: ["A"] })).toMatch(/Perubahan wajib/);
    expect(err({ nomorKontrak: ["A"], changes: [] })).toMatch(/Perubahan wajib/);
  });
});

describe("planBulkUpdate", () => {
  const docs = [
    { nomorKontrak: "A", pic: "Andi", marketing: "Sari" },
    { nomorKontrak: "B", pic: "Budi", marketing: "Sari" },
    { nomorKontrak: "C" }, // kontrak lama tanpa PIC/Marketing
  ];

  it("mengubah hanya yang berbeda dan melewati yang sudah sama", () => {
    const { updates, unchanged } = planBulkUpdate(docs, { pic: "Budi" });
    expect(unchanged).toEqual(["B"]);
    expect(updates.map((u) => u.nomorKontrak)).toEqual(["A", "C"]);
    expect(updates[0]).toEqual({
      nomorKontrak: "A",
      set: { pic: "Budi" },
      changes: [{ field: "pic", label: "PIC", oldValue: "Andi", newValue: "Budi" }],
    });
  });

  it("nilai lama kosong ditulis '-' di riwayat", () => {
    const { updates } = planBulkUpdate(docs, { pic: "Budi" });
    expect(updates[1].changes[0].oldValue).toBe("-");
  });

  it("dua kolom sekaligus: hanya kolom yang berbeda yang tercatat per kontrak", () => {
    const { updates, unchanged } = planBulkUpdate(docs, { pic: "Budi", marketing: "Sari" });
    expect(unchanged).toEqual(["B"]); // B sudah Budi + Sari -> tidak perlu ditulis
    expect(updates.map((u) => u.nomorKontrak)).toEqual(["A", "C"]);
    const a = updates.find((u) => u.nomorKontrak === "A")!;
    expect(a.set).toEqual({ pic: "Budi" }); // marketing sudah Sari -> tidak disentuh
    const c = updates.find((u) => u.nomorKontrak === "C")!;
    expect(c.changes.map((x) => x.field)).toEqual(["pic", "marketing"]);
  });

  it("perbedaan spasi saja tidak dianggap perubahan", () => {
    const { unchanged } = planBulkUpdate([{ nomorKontrak: "A", pic: " Budi " }], { pic: "Budi" });
    expect(unchanged).toEqual(["A"]);
  });
});

describe("buildBulkHistoryEntry", () => {
  it("aksi BULK_UPDATE dengan pelaku dan perubahan", () => {
    const e = buildBulkHistoryEntry(
      [{ field: "pic", label: "PIC", oldValue: "A", newValue: "B" }],
      { now: new Date("2026-10-26T00:00:00Z"), by: "Admin", role: "ADMIN" },
    );
    expect(e).toMatchObject({ action: "BULK_UPDATE", by: "Admin", role: "ADMIN" });
    expect(e.changes).toHaveLength(1);
  });
});
