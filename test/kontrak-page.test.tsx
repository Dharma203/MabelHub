/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, screen, waitFor, within, configure } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { matches } from "./helpers/fake-mongo";
import {
  CONTRACT_SORT,
  buildContractFilter,
  clampPage,
  normalizeFacetValues,
  parseContractQuery,
  parsePagination,
  totalPagesOf,
} from "../src/lib/contract-query";
import { shiftDate, todayString } from "../src/lib/contract-status";

// ─── Mock dependensi ────────────────────────────────────────────────────────
// Objek yang SAMA di setiap render, seperti aslinya (state React / router Next yang stabil).
// Objek baru per render akan memicu efek pemuatan data berulang-ulang dan membuat tes tidak stabil.
const mockRouter = { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() };
const mockSearchParams = new URLSearchParams("");
const mockSession = { user: { role: "ADMIN", fullName: "Admin Test" }, loading: false };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));
jest.mock("@/components/session/SessionProvider", () => ({
  useSession: () => mockSession,
}));
jest.mock("@/components/modals/NotificationMenu", () => {
  const NotificationMenu = () => <div data-testid="notif" />;
  return NotificationMenu;
});
jest.mock("@/components/ui/SearchableSelect", () => ({
  __esModule: true,
  default: ({ value, onChange, options, placeholder }: any) => (
    <select aria-label={placeholder} value={value || ""} onChange={(e) => onChange?.(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));
jest.mock("lucide-react", () =>
  new Proxy({}, {
    get: (_t, name) => {
      const Icon = () => <span data-testid={`icon-${String(name)}`} />;
      Icon.displayName = String(name);
      return Icon;
    },
  }),
);

import KontrakPage from "@/app/kontrak/page";

// Render pertama komponen besar ini bisa lambat di mesin CI yang "dingin"; batas 1 dtk bawaan terlalu ketat.
configure({ asyncUtilTimeout: 4000 });

// ─── Data & simulator server ────────────────────────────────────────────────
const today = todayString();
const day = (n: number) => shiftDate(today, n);

const USERS = [
  { _id: "u1", fullName: "Budi", role: "ADMIN" },
  { _id: "u2", fullName: "Andi", role: "ADMIN" },
  { _id: "u3", fullName: "Sari", role: "SALES" },
  { _id: "u4", fullName: "Rina", role: "LEADER" },
];

/** Field yang SELALU ada pada dokumen kontrak sungguhan (diisi server saat dibuat). */
const FULL_SHAPE = {
  requestIds: [] as string[], link: "", namaFolder: "", fisik: "TIDAK", scan: "TIDAK", keterangan: "",
  tanggalPenyerahan: "", catatan: "", penagihan: { tanggalMulai: "", tanggalBerakhir: "", nominalPenagihan: 0 },
};

function makeData() {
  const base = Array.from({ length: 60 }, (_, i) => ({
    ...FULL_SHAPE,
    nomorKontrak: `K-${String(i + 1).padStart(3, "0")}`,
    instansi: i % 2 === 0 ? "Dinas Kesehatan" : "Dinas Pendidikan",
    namaPengadaan: "Laptop",
    marketing: i % 3 === 0 ? "Sari" : "Budi",
    pic: "Andi",
    bendera: "PT A",
    perusahaan: "PT A",
    nominalKontrak: i * 1000,
    tanggalKontrak: "2026-01-15",
    // K-001..K-010 sudah kedaluwarsa, sisanya aktif
    tanggalBerakhirKontrak: i < 10 ? day(-3) : day(200),
    createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    history: [],
  }));
  // K-060 (terbaru) berakhir 5 hari lagi
  base[59] = {
    ...base[59],
    tanggalBerakhirKontrak: day(5),
  };
  return base;
}

type Call = { path: string; method: string; body?: any; url: URL };
let calls: Call[] = [];
let overrides: ((url: URL, init: any) => any | undefined)[] = [];
let DATA: any[] = [];

function serverList(url: URL) {
  const sp = url.searchParams;
  const filter = buildContractFilter(parseContractQuery(sp), todayString());
  let rows = DATA.filter((d) => matches(d, filter));
  const keys = Object.entries(CONTRACT_SORT);
  rows = [...rows].sort((a, b) => {
    for (const [k, dir] of keys) {
      const x = a[k], y = b[k];
      if (x !== y) return (x < y ? -1 : 1) * (dir as number);
    }
    return 0;
  });
  const paging = parsePagination(sp)!;
  const page = clampPage(paging.page, rows.length, paging.pageSize);
  const body: any = {
    data: rows.slice((page - 1) * paging.pageSize, page * paging.pageSize),
    pagination: { page, pageSize: paging.pageSize, total: rows.length, totalPages: totalPagesOf(rows.length, paging.pageSize) },
  };
  if (sp.get("facets") === "1") {
    const f = (k: string) => normalizeFacetValues(DATA.map((d) => d[k]));
    body.facets = { marketing: f("marketing"), bendera: f("bendera"), pic: f("pic"), instansi: f("instansi") };
    body.totalAll = DATA.length;
  }
  return { status: 200, body };
}

function defaultServer(url: URL, init: any) {
  const p = url.pathname;
  const method = init?.method || "GET";
  if (p === "/api/users") return { status: 200, body: { data: USERS } };
  if (p === "/api/parameters") return { status: 200, body: { data: { perusahaan: ["PT A"] } } };
  if (p === "/api/companies") return { status: 200, body: [] };
  if (p === "/api/e-procurement/requests") return { status: 200, body: { data: [] } };
  if (p === "/api/contracts/export") {
    return {
      status: 200, body: {}, blob: new Blob(["xlsx"]),
      headers: { "Content-Disposition": `attachment; filename="kontrak_${today}.xlsx"` },
    };
  }
  if (p === "/api/contracts/bulk" && method === "POST") {
    const b = JSON.parse(init.body);
    return { status: 200, body: { ok: true, requested: b.nomorKontrak.length, modified: b.nomorKontrak.length, unchanged: 0, notFound: [] } };
  }
  if (/^\/api\/contracts\/[^/]+$/.test(p) && method === "DELETE") return { status: 200, body: { ok: true } };
  if (p === "/api/contracts" && method === "GET") return serverList(url);
  throw new Error(`fetch tidak dikenal di tes: ${method} ${p}`);
}

const abortError = () => Object.assign(new Error("aborted"), { name: "AbortError" });

function installFetch() {
  (global as any).fetch = jest.fn((input: any, init: any = {}) => {
    const url = new URL(String(input), "http://localhost");
    calls.push({
      path: url.pathname + url.search,
      method: init.method || "GET",
      body: init.body ? JSON.parse(init.body) : undefined,
      url,
    });
    const signal: AbortSignal | undefined = init.signal;
    let result: any;
    for (const o of overrides) {
      result = o(url, init);
      if (result !== undefined) break;
    }
    if (result === undefined) result = defaultServer(url, init);

    // `{ late: Promise }` = jawaban yang TETAP tiba walau permintaannya sudah dibatalkan
    // (mensimulasikan respons yang sudah terlanjur diterima saat abort terjadi).
    const late = result && typeof result === "object" && "late" in result;
    if (late) result = result.late;

    return new Promise((resolve, reject) => {
      if (!late) {
        if (signal?.aborted) return reject(abortError());
        signal?.addEventListener("abort", () => reject(abortError()));
      }
      Promise.resolve(result).then((r: any) => {
        const headers = r.headers || {};
        resolve({
          ok: r.status < 400,
          status: r.status,
          json: async () => r.body,
          blob: async () => r.blob ?? new Blob([]),
          headers: { get: (k: string) => headers[k] ?? null },
        });
      }, reject);
    });
  });
}

const listCalls = () => calls.filter((c) => c.url.pathname === "/api/contracts" && c.method === "GET");
const lastList = () => listCalls()[listCalls().length - 1];

async function renderPage() {
  const user = userEvent.setup();
  render(<KontrakPage />);
  await screen.findByText("K-060");
  return user;
}

const dataRows = () => within(screen.getAllByRole("table")[0]).getAllByRole("row").slice(1);
const rowOf = (nomor: string) => screen.getByText(nomor).closest("tr") as HTMLElement;

let downloads: { download: string; href: string }[] = [];

beforeEach(() => {
  calls = [];
  overrides = [];
  downloads = [];
  DATA = makeData();
  installFetch();
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();
  (URL as any).createObjectURL = jest.fn(() => "blob:fake");
  (URL as any).revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ download: this.download, href: this.href });
  });
});
afterEach(() => jest.restoreAllMocks());

// ─── Tes ────────────────────────────────────────────────────────────────────
describe("pemuatan awal & paginasi di server", () => {
  it("hanya meminta SATU halaman dari server, bukan seluruh kontrak", async () => {
    await renderPage();
    const first = listCalls()[0];
    expect(first.url.searchParams.get("page")).toBe("1");
    expect(first.url.searchParams.get("pageSize")).toBe("25");
    expect(first.url.searchParams.get("facets")).toBe("1"); // opsi dropdown diminta sekali di awal
    expect(dataRows()).toHaveLength(25);
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent("Menampilkan 1 - 25 dari 60 kontrak");
  });

  it("data pendukung (pengguna, parameter, perusahaan) dimuat tepat SEKALI, tidak berulang", async () => {
    await renderPage();
    await new Promise((r) => setTimeout(r, 400)); // beri waktu bila ada loop pemuatan ulang
    const count = (p: string) => calls.filter((c) => c.url.pathname === p).length;
    expect(count("/api/users")).toBe(1);
    expect(count("/api/parameters")).toBe(1);
    expect(count("/api/companies")).toBe(1);
    expect(listCalls()).toHaveLength(1);
  });

  it("pindah halaman memanggil server dengan page berikutnya (tanpa meminta facets lagi)", async () => {
    const user = await renderPage();
    await user.click(screen.getByTitle("Halaman Selanjutnya"));
    await waitFor(() => expect(lastList().url.searchParams.get("page")).toBe("2"));
    expect(lastList().url.searchParams.get("facets")).toBeNull();
    await screen.findByText("K-035");
    expect(screen.queryByText("K-060")).not.toBeInTheDocument();
  });

  it("pindah halaman sebelum debounce awal habis tidak dikembalikan ke halaman 1", async () => {
    // Hanya timer debounce (350 ms) yang diperpanjang jadi 2,5 dtk, sehingga klik "berikutnya"
    // PASTI terjadi sebelum timer awal (dari saat halaman dibuka) terpicu — tidak bergantung kecepatan mesin.
    const realSetTimeout = window.setTimeout.bind(window);
    jest.spyOn(window, "setTimeout").mockImplementation(((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      realSetTimeout(fn, ms === 350 ? 2500 : ms, ...args)) as typeof window.setTimeout);

    const user = await renderPage();
    await user.click(screen.getByTitle("Halaman Selanjutnya"));
    await screen.findByText("K-035");

    await new Promise((r) => realSetTimeout(r, 3000)); // lewati timer debounce yang diperpanjang

    expect(listCalls().map((c) => c.url.searchParams.get("page"))).toEqual(["1", "2"]); // tidak ada page=1 susulan
    expect(screen.getByText("K-035")).toBeInTheDocument();
    expect(screen.queryByText("K-060")).not.toBeInTheDocument();
  }, 20000);

  it("mengganti jumlah baris per halaman kembali ke halaman 1", async () => {
    const user = await renderPage();
    await user.click(screen.getByTitle("Halaman Selanjutnya"));
    await screen.findByText("K-035");
    await user.selectOptions(screen.getByLabelText("Baris per halaman"), "50");
    await waitFor(() => expect(lastList().url.searchParams.get("pageSize")).toBe("50"));
    expect(lastList().url.searchParams.get("page")).toBe("1");
    await waitFor(() => expect(dataRows()).toHaveLength(50));
  });
});

describe("pencarian & filter dikerjakan server", () => {
  it("pencarian ditunda (debounce), lalu satu permintaan dengan q & kembali ke halaman 1", async () => {
    const user = await renderPage();
    await user.click(screen.getByTitle("Halaman Selanjutnya")); // sedang di halaman 2
    await screen.findByText("K-035");
    const before = listCalls().length;

    const box = screen.getByLabelText("Pencarian kontrak");
    await user.type(box, "pendidikan");
    // belum ada permintaan baru saat masih mengetik (debounce)
    expect(listCalls().length).toBe(before);

    await waitFor(() => expect(lastList().url.searchParams.get("q")).toBe("pendidikan"));
    expect(lastList().url.searchParams.get("page")).toBe("1");
    // 'pendidikan' diketik 10 huruf tetapi hanya SATU permintaan baru
    expect(listCalls().length).toBe(before + 1);

    await waitFor(() => expect(dataRows().every((r) => /Dinas Pendidikan/.test(r.textContent || ""))).toBe(true));
  });

  it("kolom pencarian tidak dibongkar saat server dipanggil (kursor/fokus tetap)", async () => {
    const user = await renderPage();
    const box = screen.getByLabelText("Pencarian kontrak");
    await user.type(box, "kes");
    await waitFor(() => expect(lastList().url.searchParams.get("q")).toBe("kes"));
    await waitFor(() => expect(screen.getByLabelText("Pencarian kontrak")).toBe(box)); // elemen yang SAMA
    expect(box).toHaveFocus();
    expect(box).toHaveValue("kes");
  });

  it("filter status mengirim KODE (KEDALUWARSA), bukan label tampilan", async () => {
    const user = await renderPage();
    await user.selectOptions(screen.getByLabelText("Filter Status"), "Kedaluwarsa");
    await waitFor(() => expect(lastList().url.searchParams.get("status")).toBe("KEDALUWARSA"));
    await waitFor(() => expect(screen.getByText(/dari 60 kontrak/)).toBeInTheDocument());
    expect(screen.getByText("10 dari 60 kontrak")).toBeInTheDocument();
    expect(rowOf("K-005")).toBeInTheDocument();
  });

  it("opsi dropdown berasal dari seluruh data dan tidak menyusut setelah memfilter", async () => {
    const user = await renderPage();
    const marketing = screen.getByLabelText("Filter Marketing");
    expect(within(marketing).getAllByRole("option").map((o) => o.textContent)).toEqual(["Semua", "Budi", "Sari"]);
    await user.selectOptions(marketing, "Sari");
    await waitFor(() => expect(lastList().url.searchParams.get("marketing")).toBe("Sari"));
    await screen.findByText("20 dari 60 kontrak");
    expect(within(screen.getByLabelText("Filter Marketing")).getAllByRole("option")).toHaveLength(3);
  });

  it("Reset Filter menghapus semua filter dan memuat ulang", async () => {
    const user = await renderPage();
    await user.selectOptions(screen.getByLabelText("Filter Marketing"), "Sari");
    await screen.findByText("20 dari 60 kontrak");
    await user.click(screen.getByText("Reset Filter"));
    await waitFor(() => expect(lastList().url.searchParams.get("marketing")).toBeNull());
    await waitFor(() => expect(screen.getByText("60 kontrak")).toBeInTheDocument());
  });

  it("pesan kosong membedakan 'belum ada kontrak' dan 'tidak cocok filter'", async () => {
    const user = await renderPage();
    await user.type(screen.getByLabelText("Pencarian kontrak"), "zzzz-tidak-ada");
    await screen.findByText("Tidak ada kontrak yang sesuai dengan filter pencarian.");
  });

  it("jawaban lama yang tetap tiba terlambat (walau sudah dibatalkan) tidak menimpa jawaban terbaru", async () => {
    const user = await renderPage();
    let releaseSlow!: () => void;
    const slow = new Promise<void>((r) => (releaseSlow = r));

    // permintaan pertama (marketing=Sari) lambat DAN tidak bisa dibatalkan di level jaringan
    overrides.push((url) =>
      url.pathname === "/api/contracts" && url.searchParams.get("marketing") === "Sari"
        ? { late: slow.then(() => serverList(url)) }
        : undefined,
    );
    await user.selectOptions(screen.getByLabelText("Filter Marketing"), "Sari");
    await waitFor(() => expect(lastList().url.searchParams.get("marketing")).toBe("Sari"));

    // sebelum yang lambat selesai, pengguna ganti ke Budi (cepat)
    await user.selectOptions(screen.getByLabelText("Filter Marketing"), "Budi");
    await screen.findByText("40 dari 60 kontrak"); // Budi: 60 - 20 Sari

    // jawaban Sari akhirnya tiba SETELAH jawaban Budi
    releaseSlow();
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText("40 dari 60 kontrak")).toBeInTheDocument(); // tetap Budi
    expect(screen.queryByText("20 dari 60 kontrak")).not.toBeInTheDocument();
  });
});

describe("pilih baris & aksi massal", () => {
  it("memilih baris memunculkan bar aksi; pilih semua di halaman memilih 25 baris", async () => {
    const user = await renderPage();
    expect(screen.queryByText(/kontrak dipilih/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Pilih kontrak K-060"));
    expect(screen.getByText("1 kontrak dipilih")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Pilih semua kontrak di halaman ini"));
    expect(screen.getByText("25 kontrak dipilih")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Pilih semua kontrak di halaman ini"));
    expect(screen.queryByText(/kontrak dipilih/)).not.toBeInTheDocument();
  });

  it("klik kotak centang tidak ikut membuka baris", async () => {
    const user = await renderPage();
    await user.click(screen.getByLabelText("Pilih kontrak K-060"));
    expect(screen.queryByText("Link GDrive:")).not.toBeInTheDocument();
  });

  it("pilihan bertahan saat pindah halaman, tetapi dikosongkan saat filter berubah", async () => {
    const user = await renderPage();
    await user.click(screen.getByLabelText("Pilih kontrak K-060"));
    await user.click(screen.getByTitle("Halaman Selanjutnya"));
    await screen.findByText("K-035");
    expect(screen.getByText("1 kontrak dipilih")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter Marketing"), "Sari");
    await waitFor(() => expect(screen.queryByText(/kontrak dipilih/)).not.toBeInTheDocument());
  });

  it("alur lengkap: pilih 2 kontrak -> pilih PIC -> terapkan -> hasil -> muat ulang", async () => {
    const user = await renderPage();
    await user.click(screen.getByLabelText("Pilih kontrak K-060"));
    await user.click(screen.getByLabelText("Pilih kontrak K-059"));
    await user.click(screen.getByText("Ubah PIC / Marketing"));

    const dialog = screen.getByRole("dialog", { name: "Ubah PIC atau Marketing Massal" });
    const apply = within(dialog).getByRole("button", { name: /Terapkan ke 2 kontrak/ });
    expect(apply).toBeDisabled(); // belum memilih apa pun

    await user.selectOptions(within(dialog).getByLabelText(/PIC baru/), "Budi");
    expect(apply).toBeEnabled();
    // hanya admin yang bisa jadi PIC; Sari (SALES) tidak ada di opsi PIC
    expect(within(within(dialog).getByLabelText(/PIC baru/)).queryByText("Sari")).not.toBeInTheDocument();
    expect(within(within(dialog).getByLabelText(/Marketing baru/)).queryByText("Andi")).not.toBeInTheDocument();

    const listsBefore = listCalls().length;
    await user.click(apply);

    const post = calls.find((c) => c.path === "/api/contracts/bulk")!;
    expect(post.method).toBe("POST");
    expect(post.body).toEqual({ nomorKontrak: expect.arrayContaining(["K-060", "K-059"]), changes: { pic: "Budi" } });
    expect(post.body.nomorKontrak).toHaveLength(2);
    expect(post.body.changes).not.toHaveProperty("marketing"); // yang "tidak diubah" tidak dikirim

    await within(dialog).findByText("2 kontrak berhasil diubah.");
    await user.click(within(dialog).getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(listsBefore)); // tabel dimuat ulang
    expect(screen.queryByText(/kontrak dipilih/)).not.toBeInTheDocument();
  });

  it("kegagalan dari server ditampilkan di modal dan pilihan dipertahankan", async () => {
    overrides.push((url) =>
      url.pathname === "/api/contracts/bulk"
        ? { status: 400, body: { error: 'PIC "Budi" tidak ditemukan atau tidak berhak menjadi PIC' } }
        : undefined,
    );
    const user = await renderPage();
    await user.click(screen.getByLabelText("Pilih kontrak K-060"));
    await user.click(screen.getByText("Ubah PIC / Marketing"));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/PIC baru/), "Budi");
    await user.click(within(dialog).getByRole("button", { name: /Terapkan/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("tidak berhak menjadi PIC");
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.getByText("1 kontrak dipilih")).toBeInTheDocument(); // tidak hilang
  });

  it("memilih lebih dari 200 kontrak ditolak dengan pesan", async () => {
    DATA = Array.from({ length: 300 }, (_, i) => ({
      nomorKontrak: `B-${String(i).padStart(3, "0")}`, createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
      instansi: "X", marketing: "Budi", pic: "Andi", bendera: "PT A", history: [],
    }));
    const user = userEvent.setup();
    render(<KontrakPage />);
    await screen.findByText("B-299");
    await user.selectOptions(screen.getByLabelText("Baris per halaman"), "100");
    await waitFor(() => expect(dataRows()).toHaveLength(100));
    // pilih 100 di halaman 1, lalu 100 di halaman 2, lalu 100 di halaman 3 -> batas 200
    for (let page = 1; page <= 3; page++) {
      await user.click(screen.getByLabelText("Pilih semua kontrak di halaman ini"));
      if (page < 3) {
        await user.click(screen.getByTitle("Halaman Selanjutnya"));
        await waitFor(() => expect(lastList().url.searchParams.get("page")).toBe(String(page + 1)));
        await waitFor(() => expect(dataRows()).toHaveLength(100));
      }
    }
    expect(screen.getByText("200 kontrak dipilih")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Maksimal 200 kontrak");
  }, 15000);
});

describe("ekspor Excel sesuai filter aktif", () => {
  it("mengirim filter yang SAMA dengan tabel, tanpa parameter halaman, lalu mengunduh file", async () => {
    const user = await renderPage();
    await user.selectOptions(screen.getByLabelText("Filter Marketing"), "Sari");
    await user.selectOptions(screen.getByLabelText("Filter Status"), "Kedaluwarsa");
    await screen.findByText(/dari 60 kontrak/);

    await user.click(screen.getByRole("button", { name: /Ekspor Excel/ }));
    await waitFor(() => expect(downloads).toHaveLength(1));

    const exp = calls.find((c) => c.url.pathname === "/api/contracts/export")!;
    expect(exp.url.searchParams.get("marketing")).toBe("Sari");
    expect(exp.url.searchParams.get("status")).toBe("KEDALUWARSA");
    expect(exp.url.searchParams.has("page")).toBe(false); // semua baris, bukan satu halaman
    expect(exp.url.searchParams.has("pageSize")).toBe(false);
    // parameter filter ekspor == parameter filter tabel
    const tableParams = new URLSearchParams(lastList().url.search);
    tableParams.delete("page"); tableParams.delete("pageSize"); tableParams.delete("facets");
    expect(Array.from(exp.url.searchParams.entries()).sort()).toEqual(Array.from(tableParams.entries()).sort());

    expect(downloads[0].download).toBe(`kontrak_${today}.xlsx`);
    expect((URL as any).revokeObjectURL).toHaveBeenCalled();
  });

  it("tanpa filter: mengekspor semua kontrak", async () => {
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: /Ekspor Excel/ }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    const exp = calls.find((c) => c.url.pathname === "/api/contracts/export")!;
    expect(exp.url.search).toBe("");
  });

  it("error dari server (mis. terlalu banyak data) ditampilkan, tidak ada file terunduh", async () => {
    overrides.push((url) =>
      url.pathname === "/api/contracts/export"
        ? { status: 413, body: { error: "Data terlalu banyak untuk diekspor sekaligus. Persempit filter lalu coba lagi." } }
        : undefined,
    );
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: /Ekspor Excel/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Persempit filter");
    expect(downloads).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Ekspor Excel/ })).toBeEnabled(); // bisa dicoba lagi
  });

  it("tombol nonaktif saat tidak ada hasil", async () => {
    const user = await renderPage();
    await user.type(screen.getByLabelText("Pencarian kontrak"), "zzzz-tidak-ada");
    await screen.findByText("Tidak ada kontrak yang sesuai dengan filter pencarian.");
    expect(screen.getByRole("button", { name: /Ekspor Excel/ })).toBeDisabled();
  });
});

describe("hapus kontrak", () => {
  it("penolakan server tetap terlihat di modal Edit dan kontrak tidak hilang", async () => {
    overrides.push((url, init) =>
      url.pathname === "/api/contracts/K-060" && init?.method === "DELETE"
        ? { status: 500, body: { error: 'Database gagal memproses penghapusan.' } }
        : undefined,
    );
    const user = await renderPage();
    await user.click(within(rowOf("K-060")).getByRole("button", { name: "Edit" }));
    await user.click(await screen.findByRole("button", { name: "Hapus Kontrak" }));

    const messages = await screen.findAllByText(/Database gagal memproses penghapusan/);
    expect(messages.length).toBeGreaterThan(0);
    expect(screen.getByText("Edit Kontrak")).toBeInTheDocument(); // modal tidak tertutup
    expect(screen.getByText("K-060")).toBeInTheDocument(); // baris tidak hilang
  });

  it("hapus dari baris: pesan penolakan ditampilkan lewat alert dan baris tetap ada", async () => {
    overrides.push((url, init) =>
      url.pathname === "/api/contracts/K-060" && init?.method === "DELETE"
        ? { status: 500, body: { error: "Terjadi kesalahan server" } }
        : undefined,
    );
    const user = await renderPage();
    await user.click(within(rowOf("K-060")).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Terjadi kesalahan server"));
    expect(screen.getByText("K-060")).toBeInTheDocument();
  });

  it("hapus berhasil: baris hilang dan data dimuat ulang", async () => {
    const user = await renderPage();
    const before = listCalls().length;
    await user.click(within(rowOf("K-059")).getByRole("button", { name: "Hapus" }));
    await waitFor(() => expect(screen.queryByText("K-059")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
  });
});

describe("badge masa berlaku (keputusan branch Kiki: hanya 'Segera Berakhir' yang diberi badge)", () => {
  it("kontrak kedaluwarsa tidak diberi badge, tetapi tetap bisa disaring dan dihitung lewat filter Status", async () => {
    const user = await renderPage();
    await user.selectOptions(screen.getByLabelText("Filter Status"), "Kedaluwarsa");
    await screen.findByText("10 dari 60 kontrak");
    expect(rowOf("K-005")).toBeInTheDocument();
    expect(within(rowOf("K-005")).queryByText(/Kedaluwarsa/)).not.toBeInTheDocument();
  });

  it("kontrak yang segera berakhir diberi badge beserta sisa harinya", async () => {
    await renderPage();
    // K-060 berakhir 5 hari lagi
    expect(within(rowOf("K-060")).getByText("Segera Berakhir · 5 hari lagi")).toBeInTheDocument();
  });
});
