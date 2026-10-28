/**
 * @jest-environment node
 */
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();
jest.mock("fs/promises", () => ({
  writeFile: (...a: any[]) => mockWriteFile(...a),
  mkdir: (...a: any[]) => mockMkdir(...a),
  unlink: (...a: any[]) => mockUnlink(...a),
}));

jest.mock("@/lib/auth-server", () => ({
  assertAdminOrSuperadmin: () => ({
    ok: true,
    session: { role: "ADMIN", fullName: "Admin Test", username: "admin" },
  }),
}));

const mockClientHolder: { client: any } = { client: undefined };
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: {
    then(res: any, rej?: any) {
      return Promise.resolve(mockClientHolder.client).then(res, rej);
    },
  },
  getDbName: () => "test",
}));

const { GET, POST } = require("../src/app/api/dokumentasi-project/route");

const OLD_ACTIVE = {
  _id: "OLD",
  nomorKontrak: "K-1",
  version: 2,
  barang: [{ fotoSerahTerima: "/uploads/old_serah.png", fotoBarang: "/uploads/old_barang.png" }],
};
const EXPIRED_ARCHIVE = {
  _id: "EXPIRED",
  nomorKontrak: "K-9",
  archived: true,
  barang: [{ fotoSerahTerima: "/uploads/exp_serah.png", videoBarang: "/uploads/exp_video.mp4" }],
};

function setup(opts: { expired?: any[]; purgeThrows?: boolean; riwayat?: any[] } = {}) {
  const dok: any = {
    createIndex: jest.fn(),
    insertOne: jest.fn().mockResolvedValue({ insertedId: "NEW" }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    findOne: jest.fn().mockResolvedValue({ nomorKontrak: "K-1", version: 3 }),
    distinct: jest.fn().mockResolvedValue([]),
    find: jest.fn((filter: any) => {
      // query pembersihan arsip kedaluwarsa
      if (filter?.archived === true && filter?.archivedAt) {
        return {
          toArray: opts.purgeThrows
            ? jest.fn().mockRejectedValue(new Error("db down"))
            : jest.fn().mockResolvedValue(opts.expired ?? []),
        };
      }
      // query riwayat versi sebelumnya untuk satu kontrak
      if (filter?.archived === true) {
        return { sort: () => ({ toArray: jest.fn().mockResolvedValue(opts.riwayat ?? []) }) };
      }
      // query dokumentasi terbaru (untuk nomor versi)
      return { sort: () => ({ limit: () => ({ next: jest.fn().mockResolvedValue(OLD_ACTIVE) }) }) };
    }),
  };
  const contracts: any = {
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  mockClientHolder.client = {
    db: () => ({
      collection: (name: string) => (name === "dokumentasi_project" ? dok : contracts),
    }),
  };
  return { dok, contracts };
}

const postReq = () =>
  new Request("http://localhost/api/dokumentasi-project", {
    method: "POST",
    body: JSON.stringify({
      namaSales: "Budi",
      tanggalReport: "2026-10-26",
      nomorKontrak: "K-1",
      barang: [{ unitProduk: "Laptop", merekBarang: "X", tipeBarang: "Y", jumlahUnit: 1 }],
    }),
  });

describe("POST /api/dokumentasi-project — mengganti dokumentasi lama", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DOKUMENTASI_ARSIP_RETENSI_HARI;
  });

  it("mengarsipkan dokumentasi lama, TIDAK menghapus dokumen maupun file-nya", async () => {
    const { dok } = setup();
    const res = await POST(postReq());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.replaced).toBe(true);
    expect(json.archivedCount).toBe(1);
    expect(json.data.version).toBe(3); // lanjutan dari v2

    // yang lama ditandai arsip, hanya yang aktif dan bukan yang baru
    const [filter, update] = dok.updateMany.mock.calls[0];
    expect(filter).toMatchObject({
      nomorKontrak: "K-1",
      _id: { $ne: "NEW" },
      archived: { $ne: true },
    });
    expect(update.$set).toMatchObject({
      archived: true,
      archivedBy: "Admin Test",
      replacedBy: "NEW",
    });
    expect(update.$set.archivedAt).toBeInstanceOf(Date);

    // inti perbaikan: tidak ada penghapusan sama sekali
    expect(dok.deleteMany).not.toHaveBeenCalled();
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("menghapus permanen HANYA arsip yang sudah lewat masa retensi", async () => {
    const { dok } = setup({ expired: [EXPIRED_ARCHIVE] });
    const res = await POST(postReq());
    expect(res.status).toBe(201);

    // query pembersihan memakai batas waktu retensi (default 90 hari)
    const purgeFilter = dok.find.mock.calls.map((c: any[]) => c[0]).find((f: any) => f.archivedAt);
    expect(purgeFilter.archived).toBe(true);
    const ageDays = (Date.now() - purgeFilter.archivedAt.$lt.getTime()) / 86_400_000;
    expect(Math.round(ageDays)).toBe(90);

    expect(dok.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["EXPIRED"] } });
    const unlinked = mockUnlink.mock.calls.map((c) => String(c[0]));
    expect(unlinked.some((p) => p.endsWith("exp_serah.png"))).toBe(true);
    expect(unlinked.some((p) => p.endsWith("exp_video.mp4"))).toBe(true);
    // file milik dokumentasi yang BARU diganti tetap aman
    expect(unlinked.some((p) => p.includes("old_"))).toBe(false);
  });

  it("retensi 0 = arsip disimpan selamanya, pembersihan tidak dijalankan", async () => {
    process.env.DOKUMENTASI_ARSIP_RETENSI_HARI = "0";
    const { dok } = setup({ expired: [EXPIRED_ARCHIVE] });
    await POST(postReq());

    expect(dok.deleteMany).not.toHaveBeenCalled();
    expect(mockUnlink).not.toHaveBeenCalled();
    expect(dok.find.mock.calls.some((c: any[]) => c[0]?.archivedAt)).toBe(false);
  });

  it("kegagalan pembersihan tidak menggagalkan pengiriman dokumentasi", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    setup({ purgeThrows: true });
    const res = await POST(postReq());
    expect(res.status).toBe(201);
    spy.mockRestore();
  });
});

describe("GET /api/dokumentasi-project", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hanya mengembalikan dokumentasi aktif (bukan arsip)", async () => {
    const { dok } = setup();
    const req = new Request("http://localhost/api/dokumentasi-project?nomorKontrak=K-1");
    const json = await (await GET(req)).json();

    expect(dok.findOne.mock.calls[0][0]).toMatchObject({
      nomorKontrak: "K-1",
      archived: { $ne: true },
    });
    expect(json.riwayat).toBeUndefined();
  });

  it("?riwayat=1 menyertakan versi sebelumnya", async () => {
    const archived = [{ nomorKontrak: "K-1", version: 1, archived: true }];
    setup({ riwayat: archived });
    const req = new Request("http://localhost/api/dokumentasi-project?nomorKontrak=K-1&riwayat=1");
    const json = await (await GET(req)).json();

    expect(json.riwayat).toEqual(archived);
    expect(json.data).toBeTruthy();
  });
});
