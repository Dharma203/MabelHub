/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx-js-style";
import { createFakeDb, type FakeDb } from "./helpers/fake-mongo";
import { shiftDate, todayString } from "../src/lib/contract-status";
import { MAX_EXPORT_ROWS } from "../src/lib/contract-query";

let mockGate: any;
jest.mock("@/lib/auth-server", () => ({
  assertAdminOrSuperadmin: () => mockGate,
}));

const mockHolder: { client: any } = { client: undefined };
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: {
    then(res: any, rej?: any) {
      return Promise.resolve(mockHolder.client).then(res, rej);
    },
  },
  getDbName: () => "test",
}));

import * as listRoute from "../src/app/api/contracts/route";
import * as exportRoute from "../src/app/api/contracts/export/route";
import * as bulkRoute from "../src/app/api/contracts/bulk/route";
import * as singleRoute from "../src/app/api/contracts/[nomorKontrak]/route";
import * as remindersRoute from "../src/app/api/contracts/reminders/route";

const ADMIN = { ok: true, session: { role: "ADMIN", fullName: "Admin Test", username: "admin" } };
const today = todayString();
const day = (n: number) => shiftDate(today, n);

let fake: FakeDb;
function useDb(seed: Record<string, any[]>) {
  fake = createFakeDb(seed);
  mockHolder.client = { db: fake.db };
}
beforeEach(() => {
  mockGate = ADMIN;
});

const get = (handler: any, url: string) => handler(new Request(`http://localhost${url}`));
const post = (handler: any, url: string, body: unknown, ctx?: any) =>
  handler(new Request(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body) }), ctx);
const params = (nomorKontrak: string) => ({ params: Promise.resolve({ nomorKontrak }) });

/** 60 kontrak; K-060 paling baru. Genap=Dinas Kesehatan, ganjil=Dinas Pendidikan; kelipatan 3 (dari 0) = Sari. */
function seed60() {
  return Array.from({ length: 60 }, (_, i) => ({
    nomorKontrak: `K-${String(i + 1).padStart(3, "0")}`,
    instansi: i % 2 === 0 ? "Dinas Kesehatan" : "Dinas Pendidikan",
    marketing: i % 3 === 0 ? "Sari" : "Budi",
    pic: "Andi",
    bendera: "PT A",
    perusahaan: "PT A",
    nominalKontrak: i * 1000,
    tanggalKontrak: "2026-01-15",
    tanggalBerakhirKontrak: day(100),
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
  }));
}
const ids = (rows: any[]) => rows.map((r) => r.nomorKontrak);

/* ───────────────────────── GET /api/contracts ───────────────────────── */
describe("GET /api/contracts — mode lama (tanpa page) tetap sama untuk halaman lain", () => {
  it("mengembalikan { data } tanpa pagination, terbaru dulu, dengan dokSales", async () => {
    useDb({ contracts: seed60() });
    const body = await (await get(listRoute.GET, "/api/contracts")).json();
    expect(body.pagination).toBeUndefined();
    expect(body.data).toHaveLength(60);
    expect(body.data[0].nomorKontrak).toBe("K-060");
    expect(body.data[0].dokSales).toBe("Belum Upload");
    expect(body.data[0]._id).toBeUndefined();
  });

  it("parameter perusahaan lama tetap bekerja", async () => {
    useDb({ contracts: [...seed60(), { nomorKontrak: "X-1", perusahaan: "PT B", createdAt: new Date() }] });
    const body = await (await get(listRoute.GET, "/api/contracts?perusahaan=PT%20B")).json();
    expect(ids(body.data)).toEqual(["X-1"]);
  });
});

describe("GET /api/contracts — paginasi di server", () => {
  beforeEach(() => useDb({ contracts: seed60() }));

  it("halaman 1 dan 2: urutan terbaru dulu, tanpa tumpang tindih, metadata benar", async () => {
    const p1 = await (await get(listRoute.GET, "/api/contracts?page=1&pageSize=25")).json();
    const p2 = await (await get(listRoute.GET, "/api/contracts?page=2&pageSize=25")).json();
    expect(p1.pagination).toEqual({ page: 1, pageSize: 25, total: 60, totalPages: 3 });
    expect(ids(p1.data)[0]).toBe("K-060");
    expect(ids(p1.data)[24]).toBe("K-036");
    expect(ids(p2.data)[0]).toBe("K-035");
    expect(ids(p2.data)).toHaveLength(25);
    expect(new Set([...ids(p1.data), ...ids(p2.data)]).size).toBe(50);
  });

  it("halaman di luar jangkauan dikembalikan ke halaman terakhir (bukan kosong)", async () => {
    const body = await (await get(listRoute.GET, "/api/contracts?page=99&pageSize=25")).json();
    expect(body.pagination.page).toBe(3);
    expect(ids(body.data)).toHaveLength(10);
    expect(ids(body.data)[9]).toBe("K-001");
  });

  it("pageSize dibatasi 100", async () => {
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&pageSize=100000")).json();
    expect(body.pagination.pageSize).toBe(100);
    expect(body.data).toHaveLength(60);
  });

  it("database kosong: halaman 1 dari 1, tanpa error", async () => {
    useDb({ contracts: [] });
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&pageSize=25")).json();
    expect(body.pagination).toEqual({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
    expect(body.data).toEqual([]);
  });

  it("hanya mengambil sebagian data dari database (skip/limit), bukan semuanya", async () => {
    await get(listRoute.GET, "/api/contracts?page=2&pageSize=10");
    const body = await (await get(listRoute.GET, "/api/contracts?page=2&pageSize=10")).json();
    expect(body.data).toHaveLength(10); // bukan 60
  });
});

describe("GET /api/contracts — filter & pencarian di server", () => {
  beforeEach(() => useDb({ contracts: seed60() }));
  const total = async (qs: string) =>
    (await (await get(listRoute.GET, `/api/contracts?page=1&pageSize=100&${qs}`)).json()).pagination.total;

  it("pencarian teks (tanpa membedakan huruf besar/kecil)", async () => {
    expect(await total("q=KESEHATAN")).toBe(30);
    expect(await total("q=K-05")).toBe(10); // K-050..K-059
    expect(await total("q=tidak-ada-yang-cocok")).toBe(0);
  });

  it("karakter spesial di pencarian tidak membuat server error", async () => {
    for (const q of ["(", "[", "a**", ".*", "\\"]) {
      const res = await get(listRoute.GET, `/api/contracts?page=1&q=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
    }
    expect(await total(`q=${encodeURIComponent(".*")}`)).toBe(0); // bukan wildcard
  });

  it("filter dropdown digabung dengan AND", async () => {
    expect(await total("marketing=Sari")).toBe(20);
    expect(await total("marketing=Sari&q=kesehatan")).toBe(10);
    expect(await total("marketing=Sari&pic=Tidak%20Ada")).toBe(0);
    expect(await total("marketing=Semua")).toBe(60);
  });

  it("status masa berlaku", async () => {
    useDb({
      contracts: [
        { nomorKontrak: "EXP", tanggalBerakhirKontrak: day(-5), createdAt: new Date(1) },
        { nomorKontrak: "YESTERDAY", tanggalBerakhirKontrak: day(-1), createdAt: new Date(2) },
        { nomorKontrak: "TODAY", tanggalBerakhirKontrak: day(0), createdAt: new Date(3) },
        { nomorKontrak: "SOON", tanggalBerakhirKontrak: day(7), createdAt: new Date(4) },
        { nomorKontrak: "EDGE8", tanggalBerakhirKontrak: day(8), createdAt: new Date(5) },
        { nomorKontrak: "FAR", tanggalBerakhirKontrak: day(300), createdAt: new Date(6) },
        { nomorKontrak: "NODATE", tanggalBerakhirKontrak: "", createdAt: new Date(7) },
        { nomorKontrak: "MISSING", createdAt: new Date(8) },
      ],
    });
    const idsOf = async (s: string) =>
      ids((await (await get(listRoute.GET, `/api/contracts?page=1&status=${s}`)).json()).data).sort();

    expect(await idsOf("KEDALUWARSA")).toEqual(["EXP", "YESTERDAY"]);
    expect(await idsOf("SEGERA_BERAKHIR")).toEqual(["SOON", "TODAY"]);
    expect(await idsOf("AKTIF")).toEqual(["EDGE8", "FAR", "MISSING", "NODATE"]);
    // label UI juga diterima
    expect(await idsOf("Kedaluwarsa")).toEqual(["EXP", "YESTERDAY"]);
  });

  it("rentang tanggal kontrak; kontrak tanpa tanggal tidak ikut", async () => {
    useDb({
      contracts: [
        { nomorKontrak: "A", tanggalKontrak: "2026-01-01", createdAt: new Date(1) },
        { nomorKontrak: "B", tanggalKontrak: "2026-01-31", createdAt: new Date(2) },
        { nomorKontrak: "C", tanggalKontrak: "2026-02-01", createdAt: new Date(3) },
        { nomorKontrak: "D", tanggalKontrak: "", createdAt: new Date(4) },
      ],
    });
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&dateFrom=2026-01-01&dateTo=2026-01-31")).json();
    expect(ids(body.data).sort()).toEqual(["A", "B"]);
  });
});

describe("GET /api/contracts — facets (opsi dropdown)", () => {
  beforeEach(() => useDb({ contracts: seed60() }));

  it("tidak dikirim kecuali diminta", async () => {
    const body = await (await get(listRoute.GET, "/api/contracts?page=1")).json();
    expect(body.facets).toBeUndefined();
  });

  it("facets=1: nilai unik terurut + totalAll", async () => {
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&facets=1")).json();
    expect(body.facets.marketing).toEqual(["Budi", "Sari"]);
    expect(body.facets.pic).toEqual(["Andi"]);
    expect(body.facets.instansi).toEqual(["Dinas Kesehatan", "Dinas Pendidikan"]);
    expect(body.totalAll).toBe(60);
  });

  it("opsi dropdown TIDAK menyusut mengikuti filter (dihitung dari seluruh kontrak)", async () => {
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&facets=1&marketing=Sari&q=kesehatan")).json();
    expect(body.pagination.total).toBe(10);
    expect(body.totalAll).toBe(60);
    expect(body.facets.marketing).toEqual(["Budi", "Sari"]);
  });
});

describe("GET /api/contracts — pengayaan data per halaman", () => {
  it("dokSales dihitung hanya untuk kontrak di halaman itu, dan arsip tidak dihitung", async () => {
    useDb({
      contracts: seed60(),
      dokumentasi_project: [
        { nomorKontrak: "K-060" }, // aktif
        { nomorKontrak: "K-059", archived: true }, // hanya arsip -> belum upload
        { nomorKontrak: "K-001" }, // bukan di halaman 1
      ],
    });
    const body = await (await get(listRoute.GET, "/api/contracts?page=1&pageSize=5")).json();
    const byId = Object.fromEntries(body.data.map((r: any) => [r.nomorKontrak, r.dokSales]));
    expect(byId["K-060"]).toBe("Sudah Upload");
    expect(byId["K-059"]).toBe("Belum Upload");

    const distinctCall = fake.calls.find((c) => c.collection === "dokumentasi_project" && c.method === "distinct")!;
    expect(distinctCall.args[1].nomorKontrak.$in).toHaveLength(5); // bukan 60
  });
});

describe("autentikasi", () => {
  it("semua endpoint baru menolak pengguna tanpa hak akses", async () => {
    useDb({ contracts: seed60() });
    mockGate = { ok: false, status: 401, error: "UNAUTHORIZED" };
    expect((await get(listRoute.GET, "/api/contracts?page=1")).status).toBe(401);
    expect((await get(exportRoute.GET, "/api/contracts/export")).status).toBe(401);
    expect((await post(bulkRoute.POST, "/api/contracts/bulk", { nomorKontrak: ["K-001"], changes: { pic: "Budi" } })).status).toBe(401);
    expect(fake.calls.filter((c) => ["insertOne", "updateOne", "bulkWrite"].includes(c.method))).toHaveLength(0);
  });
});

/* ───────────────────────── Ekspor Excel ───────────────────────── */
async function readExport(qs: string) {
  const res = await get(exportRoute.GET, `/api/contracts/export${qs}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets["Kontrak"], { defval: "" });
  return { res, wb, rows };
}

describe("GET /api/contracts/export", () => {
  beforeEach(() => useDb({ contracts: seed60() }));

  it("mengunduh file xlsx dengan nama bertanggal", async () => {
    const { res } = await readExport("");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toBe(`attachment; filename="kontrak_${today}.xlsx"`);
  });

  it("mengekspor SEMUA yang cocok filter, bukan hanya satu halaman, dan mengabaikan page/pageSize", async () => {
    const { rows, res } = await readExport("?marketing=Sari&page=2&pageSize=5");
    expect(rows).toHaveLength(20);
    expect(res.headers.get("X-Export-Rows")).toBe("20");
    expect(rows.every((r) => r["Marketing"] === "Sari")).toBe(true);
  });

  it("isi Excel PERSIS sama dengan isi tabel untuk filter yang sama", async () => {
    for (const qs of ["", "marketing=Sari", "q=kesehatan", "q=kesehatan&marketing=Sari", "q=zzz"]) {
      const list = await (await get(listRoute.GET, `/api/contracts?page=1&pageSize=100&${qs}`)).json();
      const { rows } = await readExport(`?${qs}`);
      expect(rows.map((r) => r["No. Kontrak"])).toEqual(ids(list.data));
    }
  });

  it("sheet 'Filter Aktif' mencatat filter yang dipakai", async () => {
    const { wb } = await readExport("?marketing=Sari&status=KEDALUWARSA");
    const info = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["Filter Aktif"], { header: 1, defval: "" });
    const val = (k: string) => info.find((r) => r[0] === k)?.[1];
    expect(val("Marketing")).toBe("Sari");
    expect(val("Status Masa Berlaku")).toBe("Kedaluwarsa");
    expect(val("Diekspor oleh")).toBe("Admin Test");
  });

  it("tanpa hasil: tetap file valid berisi header", async () => {
    const { rows, wb } = await readExport("?q=tidak-ada");
    expect(rows).toHaveLength(0);
    expect(wb.SheetNames).toContain("Kontrak");
  });

  it(`menolak dengan 413 bila lebih dari ${MAX_EXPORT_ROWS} baris`, async () => {
    useDb({
      contracts: Array.from({ length: MAX_EXPORT_ROWS + 1 }, (_, i) => ({ nomorKontrak: `B-${i}`, createdAt: new Date(i) })),
    });
    const res = await get(exportRoute.GET, "/api/contracts/export");
    expect(res.status).toBe(413);
    expect((await res.json()).error).toContain("Persempit filter");
  });

  it("riwayat & pembayaran tidak ikut dimuat (hemat memori)", async () => {
    await get(exportRoute.GET, "/api/contracts/export");
    const find = fake.calls.find((c) => c.collection === "contracts" && c.method === "find")!;
    expect(find.args[1].projection).toMatchObject({ history: 0, pembayaran: 0 });
  });
});

/* ───────────────────────── Aksi massal ───────────────────────── */
describe("POST /api/contracts/bulk", () => {
  const users = [
    { fullName: "Budi", role: "ADMIN" },
    { fullName: "Andi", role: "ADMIN" },
    { fullName: "Sari", role: "SALES" },
    { fullName: "Rina", role: "LEADER" },
  ];
  const contracts = () => [
    { nomorKontrak: "K-1", pic: "Andi", marketing: "Sari", history: [{ id: "old" }] },
    { nomorKontrak: "K-2", pic: "Budi", marketing: "Sari", history: [] },
    { nomorKontrak: "K-3", history: [] },
  ];
  const bulk = (body: unknown) => post(bulkRoute.POST, "/api/contracts/bulk", body);
  const doc = (nk: string) => fake.data.contracts.find((c) => c.nomorKontrak === nk);
  const wrote = () => fake.calls.some((c) => c.method === "bulkWrite");

  beforeEach(() => useDb({ contracts: contracts(), users }));

  it("mengubah PIC: yang berbeda ditulis, yang sudah sama dilewati, yang tak ada dilaporkan", async () => {
    const res = await bulk({ nomorKontrak: ["K-1", "K-2", "K-3", "K-XXX"], changes: { pic: "Budi" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, requested: 4, modified: 2, unchanged: 1, notFound: ["K-XXX"] });
    expect(doc("K-1").pic).toBe("Budi");
    expect(doc("K-3").pic).toBe("Budi");
    expect(doc("K-2").history).toHaveLength(0); // tidak disentuh sama sekali
    expect(doc("K-2").updatedAt).toBeUndefined();
  });

  it("setiap kontrak yang berubah mendapat riwayat BULK_UPDATE di posisi teratas", async () => {
    await bulk({ nomorKontrak: ["K-1"], changes: { pic: "Budi" } });
    const h = doc("K-1").history;
    expect(h).toHaveLength(2);
    expect(h[0]).toMatchObject({
      action: "BULK_UPDATE", by: "Admin Test", role: "ADMIN",
      changes: [{ field: "pic", label: "PIC", oldValue: "Andi", newValue: "Budi" }],
    });
    expect(h[1].id).toBe("old"); // riwayat lama tetap
    // (bukan instanceof: structuredClone di fake-DB menghasilkan Date dari realm Node yang berbeda dengan sandbox Jest)
    expect(Object.prototype.toString.call(doc("K-1").updatedAt)).toBe("[object Date]");
  });

  it("mengubah PIC dan Marketing sekaligus; hanya kolom yang berbeda tercatat", async () => {
    await bulk({ nomorKontrak: ["K-1"], changes: { pic: "Budi", marketing: "Rina" } });
    expect(doc("K-1")).toMatchObject({ pic: "Budi", marketing: "Rina" });
    expect(doc("K-1").history[0].changes.map((c: any) => c.field)).toEqual(["pic", "marketing"]);
  });

  it("kolom lain pada kontrak tidak ikut berubah", async () => {
    const before = structuredClone(doc("K-1"));
    await bulk({ nomorKontrak: ["K-1"], changes: { pic: "Budi" } });
    const after = doc("K-1");
    expect(after.marketing).toBe(before.marketing);
    expect(after.nomorKontrak).toBe("K-1");
  });

  it("menolak pengguna yang tidak ada, atau yang perannya tidak sesuai kolom — tanpa menulis apa pun", async () => {
    for (const changes of [
      { pic: "Hantu" },
      { pic: "Sari" }, // SALES tidak boleh jadi PIC
      { marketing: "Budi" }, // ADMIN tidak boleh jadi Marketing
    ]) {
      const res = await bulk({ nomorKontrak: ["K-1"], changes });
      expect(res.status).toBe(400);
    }
    expect(wrote()).toBe(false);
    expect(doc("K-1").pic).toBe("Andi");
  });

  it("menolak kolom selain PIC/Marketing dan nilai kosong — tanpa menulis apa pun", async () => {
    for (const changes of [{ nominalKontrak: 1 }, { status: "X" }, { pic: "" }, {}, { pic: "Budi", history: [] }]) {
      expect((await bulk({ nomorKontrak: ["K-1"], changes })).status).toBe(400);
    }
    expect(wrote()).toBe(false);
  });

  it("menolak daftar kosong dan lebih dari 200 kontrak", async () => {
    expect((await bulk({ nomorKontrak: [], changes: { pic: "Budi" } })).status).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => `K-${i}`);
    expect((await bulk({ nomorKontrak: many, changes: { pic: "Budi" } })).status).toBe(400);
    expect(wrote()).toBe(false);
  });

  it("body bukan JSON tidak membuat server crash", async () => {
    const res = await bulkRoute.POST(new Request("http://localhost/api/contracts/bulk", { method: "POST", body: "bukan json" }));
    expect(res.status).toBe(400);
  });

  it("jika tidak ada yang berubah, tidak ada penulisan", async () => {
    const res = await bulk({ nomorKontrak: ["K-2"], changes: { pic: "Budi" } });
    expect((await res.json()).modified).toBe(0);
    expect(wrote()).toBe(false);
  });
});

describe("DELETE /api/contracts/[nomorKontrak]", () => {
  const del = (nk: string) =>
    singleRoute.DELETE(new Request(`http://localhost/api/contracts/${nk}`, { method: "DELETE" }), params(nk));

  it("menghapus kontrak yang ada", async () => {
    useDb({
      contracts: [
        { nomorKontrak: "K-1", createdAt: new Date(1) },
        { nomorKontrak: "K-2", createdAt: new Date(2) },
      ],
    });
    const res = await del("K-1");
    expect(res.status).toBe(200);
    expect(ids(fake.data.contracts)).toEqual(["K-2"]);
  });

  it("kontrak tidak ditemukan = 404", async () => {
    useDb({ contracts: [] });
    expect((await del("K-999")).status).toBe(404);
  });
});

/* ───────────────────────── Reminders ───────────────────────── */
describe("GET /api/contracts/reminders", () => {
  it("mengambil kontrak yang segera berakhir (≤ 7 hari)", async () => {
    useDb({
      contracts: [
        { nomorKontrak: "SEGERA", tanggalBerakhirKontrak: day(3), createdAt: new Date(1) },
        { nomorKontrak: "JAUH", tanggalBerakhirKontrak: day(30), createdAt: new Date(2) },
        { nomorKontrak: "LEWAT", tanggalBerakhirKontrak: day(-2), createdAt: new Date(3) },
      ],
    });
    const body = await (await get(remindersRoute.GET, "/api/contracts/reminders")).json();
    expect(ids(body.data)).toEqual(["SEGERA"]);
    expect(body.data[0]).toMatchObject({ daysLeft: 3, expiryStatus: "SEGERA_BERAKHIR" });
    expect(body.count).toBe(1);
  });
});
