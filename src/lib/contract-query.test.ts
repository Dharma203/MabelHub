/* eslint-disable @typescript-eslint/no-explicit-any -- pencocok mini ini meniru dokumen Mongo yang berskema bebas */
import {
  CONTRACT_SORT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  buildContractFilter,
  clampPage,
  contractQueryToParams,
  describeActiveFilters,
  escapeRegex,
  expiryStatusFilter,
  normalizeFacetValues,
  parseContractQuery,
  parsePagination,
  totalPagesOf,
} from "./contract-query";
import { CONTRACT_EXPIRY_LABEL, getContractExpiryStatus } from "./contract-status";

const TODAY = "2026-10-26";
const sp = (s: string) => new URLSearchParams(s);
const parse = (s: string) => parseContractQuery(sp(s));

/**
 * Pencocok mini bergaya Mongo — hanya operator yang dipakai modul ini.
 * Meniru aturan penting Mongo: operator perbandingan hanya cocok dengan nilai bertipe sama
 * (string vs string), $regex hanya cocok dengan string, dan $nin cocok untuk field yang tidak ada.
 */
function matches(doc: Record<string, any>, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$and") return (cond as any[]).every((c) => matches(doc, c));
    if (key === "$or") return (cond as any[]).some((c) => matches(doc, c));
    if (key === "$nor") return !(cond as any[]).some((c) => matches(doc, c));

    const val = doc[key];
    if (cond === null || typeof cond !== "object") return val === cond;

    return Object.entries(cond as Record<string, any>).every(([op, arg]) => {
      switch (op) {
        case "$options":
          return true;
        case "$regex": {
          const flags = (cond as any).$options ?? "";
          return typeof val === "string" && new RegExp(arg, flags).test(val);
        }
        case "$lt": return typeof val === "string" && val < arg;
        case "$lte": return typeof val === "string" && val <= arg;
        case "$gt": return typeof val === "string" && val > arg;
        case "$gte": return typeof val === "string" && val >= arg;
        case "$nin": return !(arg as any[]).includes(val);
        default: throw new Error(`operator tidak didukung di tes: ${op}`);
      }
    });
  });
}

describe("filter status di server SETARA dengan getContractExpiryStatus di browser", () => {
  const endDates: (string | undefined)[] = [
    "2025-01-01", "2026-10-24", "2026-10-25", "2026-10-25T23:59:00Z",
    "2026-10-26", "2026-10-26T08:00:00Z", "2026-10-27", "2026-11-02",
    "2026-11-02T10:00:00Z", "2026-11-03", "2026-11-03T00:00:00Z", "2027-06-01",
    "", undefined, "bukan-tanggal", "abc-2026-10-25",
  ];

  for (const status of ["AKTIF", "SEGERA_BERAKHIR", "KEDALUWARSA"] as const) {
    it(`status ${status}`, () => {
      const filter = expiryStatusFilter(status, TODAY);
      for (const end of endDates) {
        const doc = end === undefined ? {} : { tanggalBerakhirKontrak: end };
        expect({ end, cocok: matches(doc, filter) }).toEqual({
          end,
          cocok: getContractExpiryStatus(end, TODAY) === status,
        });
      }
    });
  }

  it("setiap kontrak jatuh ke TEPAT satu status", () => {
    for (const end of endDates) {
      const doc = end === undefined ? {} : { tanggalBerakhirKontrak: end };
      const hits = (["AKTIF", "SEGERA_BERAKHIR", "KEDALUWARSA"] as const).filter((s) =>
        matches(doc, expiryStatusFilter(s, TODAY)),
      );
      expect(hits).toHaveLength(1);
    }
  });
});

describe("parseContractQuery", () => {
  it("kosong / 'Semua' berarti tanpa filter", () => {
    expect(parse("")).toEqual({
      perusahaan: "", q: "", dateFrom: "", dateTo: "",
      marketing: "", bendera: "", pic: "", status: null,
    });
    expect(parse("marketing=Semua&pic=Semua&status=Semua").marketing).toBe("");
    expect(parse("status=Semua").status).toBeNull();
  });

  it("menerima kode status maupun label UI", () => {
    expect(parse("status=KEDALUWARSA").status).toBe("KEDALUWARSA");
    expect(parse("status=Segera%20Berakhir").status).toBe("SEGERA_BERAKHIR");
    expect(parse("status=ngawur").status).toBeNull();
  });

  it("tanggal tidak valid diabaikan, bukan menyebabkan error", () => {
    const q = parse("dateFrom=2026-02-31&dateTo=bukan");
    expect(q.dateFrom).toBe("");
    expect(q.dateTo).toBe("");
    expect(parse("dateFrom=2026-01-01").dateFrom).toBe("2026-01-01");
  });

  it("pencarian dipotong ke batas panjang", () => {
    expect(parse(`q=${"a".repeat(500)}`).q).toHaveLength(MAX_SEARCH_LENGTH);
  });
});

describe("buildContractFilter", () => {
  const f = (s: string) => buildContractFilter(parse(s), TODAY);

  it("tanpa filter = {} (semua kontrak)", () => {
    expect(f("")).toEqual({});
  });

  it("satu filter tidak dibungkus $and; banyak filter digabung dengan $and", () => {
    expect(f("pic=Budi")).toEqual({ pic: "Budi" });
    expect(f("pic=Budi&marketing=Sari")).toEqual({ $and: [{ marketing: "Sari" }, { pic: "Budi" }] });
  });

  it("pencarian mencari di enam kolom, tanpa membedakan huruf besar/kecil", () => {
    const filter = f("q=dinas") as any;
    expect(filter.$or).toHaveLength(6);
    expect(filter.$or[0]).toEqual({ nomorKontrak: { $regex: "dinas", $options: "i" } });
    expect(matches({ instansi: "DINAS Pendidikan" }, filter)).toBe(true);
    expect(matches({ instansi: "Kementerian" }, filter)).toBe(false);
  });

  it("karakter spesial regex di pencarian dicari apa adanya (tidak error, tidak jadi wildcard)", () => {
    for (const nasty of ["(", "[a", "a**", ".*", "\\", "a|b", "^$", "(?:x+)+$"]) {
      const filter = buildContractFilter(parse(`q=${encodeURIComponent(nasty)}`), TODAY);
      expect(() => matches({ instansi: "x" }, filter)).not.toThrow();
    }
    const dot = f(`q=${encodeURIComponent("PT.A")}`);
    expect(matches({ instansi: "PT.A" }, dot)).toBe(true);
    expect(matches({ instansi: "PTxA" }, dot)).toBe(false); // titik BUKAN wildcard
    expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
  });

  it("rentang tanggal kontrak: inklusif di kedua ujung, kontrak tanpa tanggal tidak ikut", () => {
    const filter = f("dateFrom=2026-01-01&dateTo=2026-01-31");
    expect(matches({ tanggalKontrak: "2026-01-01" }, filter)).toBe(true);
    expect(matches({ tanggalKontrak: "2026-01-31" }, filter)).toBe(true);
    expect(matches({ tanggalKontrak: "2026-01-31T10:00:00Z" }, filter)).toBe(true);
    expect(matches({ tanggalKontrak: "2025-12-31" }, filter)).toBe(false);
    expect(matches({ tanggalKontrak: "2026-02-01" }, filter)).toBe(false);
    expect(matches({ tanggalKontrak: "" }, filter)).toBe(false);
    expect(matches({}, filter)).toBe(false);
  });

  it("hanya dateFrom atau hanya dateTo", () => {
    expect(matches({ tanggalKontrak: "2030-01-01" }, f("dateFrom=2026-01-01"))).toBe(true);
    expect(matches({ tanggalKontrak: "2020-01-01" }, f("dateTo=2026-01-01"))).toBe(true);
    expect(matches({ tanggalKontrak: "" }, f("dateTo=2026-01-01"))).toBe(false);
  });

  it("gabungan filter bersifat AND", () => {
    const filter = f("marketing=Sari&status=KEDALUWARSA&q=dinas");
    const base = { marketing: "Sari", instansi: "Dinas A", tanggalBerakhirKontrak: "2026-01-01" };
    expect(matches(base, filter)).toBe(true);
    expect(matches({ ...base, marketing: "Budi" }, filter)).toBe(false);
    expect(matches({ ...base, tanggalBerakhirKontrak: "2027-01-01" }, filter)).toBe(false);
    expect(matches({ ...base, instansi: "Lain" }, filter)).toBe(false);
  });
});

describe("contractQueryToParams (klien) <-> parseContractQuery (server)", () => {
  it("round-trip tanpa kehilangan filter", () => {
    const original = {
      perusahaan: "PT A", q: "dinas", dateFrom: "2026-01-01", dateTo: "2026-12-31",
      marketing: "Sari", bendera: "X", pic: "Budi", status: "SEGERA_BERAKHIR" as const,
    };
    expect(parseContractQuery(contractQueryToParams(original))).toEqual(original);
  });
  it("filter kosong tidak ikut dikirim", () => {
    expect(contractQueryToParams({ q: "", pic: "" }).toString()).toBe("");
  });
});

describe("paginasi", () => {
  it("tanpa page/pageSize = mode lama (null)", () => {
    expect(parsePagination(sp(""))).toBeNull();
    expect(parsePagination(sp("perusahaan=X"))).toBeNull();
  });
  it("default, batas atas, dan input ngawur", () => {
    expect(parsePagination(sp("page=1"))).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePagination(sp("page=3&pageSize=50"))).toEqual({ page: 3, pageSize: 50 });
    expect(parsePagination(sp("page=1&pageSize=99999"))?.pageSize).toBe(MAX_PAGE_SIZE);
    expect(parsePagination(sp("page=-4&pageSize=0"))).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePagination(sp("page=abc&pageSize=xyz"))).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePagination(sp("pageSize=10"))).toEqual({ page: 1, pageSize: 10 });
  });
  it("totalPagesOf / clampPage", () => {
    expect(totalPagesOf(0, 25)).toBe(1);
    expect(totalPagesOf(25, 25)).toBe(1);
    expect(totalPagesOf(26, 25)).toBe(2);
    expect(clampPage(9, 26, 25)).toBe(2);
    expect(clampPage(0, 26, 25)).toBe(1);
    expect(clampPage(5, 0, 25)).toBe(1);
  });
});

describe("util lain", () => {
  it("urutan stabil dengan pemecah seri", () => {
    expect(CONTRACT_SORT).toEqual({ createdAt: -1, nomorKontrak: 1 });
  });
  it("normalizeFacetValues membuang nilai kosong/bukan string, unik, terurut", () => {
    expect(normalizeFacetValues(["b", " a ", "", null, 5, "a", undefined, "B"])).toEqual(["a", "b", "B"]);
  });
  it("describeActiveFilters merangkum filter untuk sheet Excel", () => {
    const rows = describeActiveFilters(parse("pic=Budi&status=KEDALUWARSA"), CONTRACT_EXPIRY_LABEL);
    expect(rows.find((r) => r.label === "PIC")?.value).toBe("Budi");
    expect(rows.find((r) => r.label === "Status Masa Berlaku")?.value).toBe("Kedaluwarsa");
    expect(rows.find((r) => r.label === "Marketing")?.value).toBe("Semua");
  });
});
