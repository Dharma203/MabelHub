"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/SessionProvider";
import EditVisitModal from "@/components/modals/EditVisitModal";
import {Pen, ChevronRight} from "lucide-react";

type VisitRow = {
  _id: string;
  visit_date?: string; // "3-Dec-2025"
  created_at?: string; // "2025-12-03 16:15:30" (string)
  city?: string;
  klpd?: string;
  institusi_kerja?: string;
  satuan_kerja?: string;
  status_visit?: string; // "Visited"
  visit_image?: string;
  reschedule_date?: string;
};

type PlanRow = {
  id: string; // _id
  tanggal: string; // visit_date
  kota: string;
  klpd: string;
  institusi_kerja: string;
  satuan_kerja: string;
  status: string;
  visit_image: string;
  reschedule_date: string;
  _sortTs: number; // untuk sorting (baru -> besar)
};

function monthIndex(mon: string) {
  const m = mon.toLowerCase();
  const map: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    mei: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    agu: 7,
    sep: 8,
    oct: 9,
    okt: 9,
    nov: 10,
    dec: 11,
    des: 11,
  };
  return map[m] ?? -1;
}

// parse "3-Dec-2025" -> timestamp
function parseVisitDateToTs(v?: string) {
  if (!v) return 0;
  const parts = v.split("-");
  if (parts.length !== 3) return 0;

  const day = Number(parts[0]);
  const mon = monthIndex(parts[1]);
  const year = Number(parts[2]);
  if (!day || mon < 0 || !year) return 0;

  const d = new Date(year, mon, day, 12, 0, 0); // jam 12 biar aman timezone
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

// parse "2025-12-03 16:15:30" -> timestamp
function parseCreatedAtToTs(v?: string) {
  if (!v) return 0;
  // ubah "YYYY-MM-DD HH:mm:ss" jadi ISO "YYYY-MM-DDTHH:mm:ss"
  const iso = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatTanggalHeader(dateStr: string) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parts[0];
    const month = String(parts[1] || "").toUpperCase();
    return `${day} ${month}`;
  }
  return dateStr;
}

export default function PlanActivityPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [search, setSearch] = useState("");

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const limit = 25;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  // parameter options
  const [posisiOptions, setPosisiOptions] = useState<string[]>([]);
  const [statusKunjunganOptions, setStatusKunjunganOptions] = useState<
    string[]
  >([]);
  const [kegiatanOptions, setKegiatanOptions] = useState<string[]>([]);

  // edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");

  // fetch parameters
  useEffect(() => {
    fetch("/api/parameters")
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data || {};
        setPosisiOptions(data.posisi || []);
        setStatusKunjunganOptions(data.status_kunjungan || []);
        setKegiatanOptions(data.kegiatan || []);
      })
      .catch(console.error);
  }, []);

  function handleOpenEdit(id: string) {
    setEditId(id);
    setEditModalOpen(true);
  }

  function handleEditSuccess() {
    setEditModalOpen(false);
    fetchPlans(page, search);
  }

  function openImageBase64(base64: string) {
    const w = window.open("");
    if (w) {
      w.document.write(
        `<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
      );
    }
  }

  // Guard role
  useEffect(() => {
    if (!sessionLoading && user) {
      const ok =
        user.role === "SALES" ||
        user.role === "LEADER" ||
        user.role === "ADMIN" ||
        user.role === "SUPERADMIN";
      if (!ok) router.replace("/");
    }
  }, [sessionLoading, user, router]);

  function groupByTanggal(rows: PlanRow[]) {
    return rows.reduce<Record<string, PlanRow[]>>((acc, r) => {
      const key = r.tanggal || "UNKNOWN";
      acc[key] = acc[key] || [];
      acc[key].push(r);
      return acc;
    }, {});
  }

  async function fetchPlans(nextPage: number, q: string) {
    try {
      setLoading(true);

      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
      });

      if (q.trim()) qs.set("q", q.trim());

      const res = await fetch(`/api/visits?${qs.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlans([]);
        setTotalPages(1);
        setTotalRows(0);
        setOpenDates({});
        return;
      }

      const items: VisitRow[] = Array.isArray(json?.items) ? json.items : [];

      // map + hitung sortTs (visit_date utama, fallback created_at)
      const mapped: PlanRow[] = items.map((v) => {
        const visitTs = parseVisitDateToTs(v.visit_date);
        const createdTs = parseCreatedAtToTs(v.created_at);
        const sortTs = visitTs || createdTs || 0;

        return {
          id: String(v._id),
          tanggal: v.visit_date || "",
          kota: v.city || "",
          klpd: v.klpd || "",
          institusi_kerja: v.institusi_kerja || "",
          satuan_kerja: v.satuan_kerja || "",
          status: v.status_visit || "",
          visit_image: v.visit_image || "",
          reschedule_date: v.reschedule_date || "",
          _sortTs: sortTs,
        };
      });

      // pastikan urutan terbaru di page ini
      mapped.sort((a, b) => b._sortTs - a._sortTs);

      setPlans(mapped);

      const tp = Number(json?.pagination?.totalPages || 1);
      setTotalPages(tp > 0 ? tp : 1);

      const total = Number(json?.pagination?.total || 0);
      setTotalRows(total > 0 ? total : 0);

      // buka group tanggal paling baru
      const grouped = groupByTanggal(mapped);
      const firstKey = Object.keys(grouped).sort((a, b) => {
        if (a === "UNKNOWN") return 1;
        if (b === "UNKNOWN") return -1;
        return parseVisitDateToTs(b) - parseVisitDateToTs(a);
      })[0];

      if (firstKey) setOpenDates({ [firstKey]: true });
      else setOpenDates({});
    } finally {
      setLoading(false);
    }
  }

  // fetch awal & saat page berubah
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    fetchPlans(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sessionLoading, user]);

  // debounce search + reset page
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;

    const t = setTimeout(() => {
      setPage(1);
      fetchPlans(1, search);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const grouped = useMemo(() => {
    // plans sudah di-sort terbaru, groupnya ikutin
    const g = groupByTanggal(plans);
    const keys = Object.keys(g).sort((a, b) => {
      if (a === "UNKNOWN") return 1;
      if (b === "UNKNOWN") return -1;
      return parseVisitDateToTs(b) - parseVisitDateToTs(a);
    });
    return { keys, map: g };
  }, [plans]);

  function toggleDate(key: string) {
    setOpenDates((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">
        

        <div className="flex-1  p-6">
          <main className="w-full max-w-none">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

  <div className="ml-4 px-4 pt-2 pb-4 space-y-1">
    <h2 className="text-3xl font-extrabold text-black drop-shadow-sm">
      PLAN ACTIVITY
    </h2>
    <p className="text-sm text-neutral-600">
      Monitoring dan Pengelolaan Rencana Kunjungan Lapangan
    </p>
  </div>

  <div className="relative w-full md:w-80">
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search..."
      className="h-11 w-full rounded-full bg-white px-5 pr-11 text-sm outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black/20"
    />
    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M16.5 16.5 21 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  </div>
</div>
            

            {/* ACTIONS */}
            <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm ring-1 ring-black/5">
              <div className="text-sm font-medium text-gray-500">
                {loading
                  ? "Loading..."
                  : `Total ${totalRows || "-"} Data • Page ${page} of ${totalPages}`}
              </div>

              <button
                onClick={() => router.push("/plan-activity/add")}
                className="flex items-center gap-2 h-10 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm ring-1 ring-blue-700 hover:bg-blue-700 hover:shadow transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                ADD PLANS
              </button>
            </div>

            {/* TABLE */}
            <div className="w-full overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5">
              <div className="hidden md:grid grid-cols-8 bg-blue-100 px-4 py-3 text-sm font-semibold text-black uppercase tracking-wider border-b border-gray-200">
                <div>Tanggal</div>
                <div>Kota</div>
                <div>K/L/PD</div>
                <div>Institusi Kerja</div>
                <div>Satuan Kerja</div>
                <div className="text-center">Bukti</div>
                <div className="text-center">Status</div>
                <div className="text-center">Aksi</div>
              </div>

              {grouped.keys.length === 0 ? (
                <div className="px-4 py-16 text-center text-gray-600 bg-gray-50/30">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Memuat data...</span>
                    </div>
                  ) : (
                    "Belum ada data plan activity."
                  )}
                </div>
              ) : (
                grouped.keys.map((dateKey) => {
                  const rows = grouped.map[dateKey] || [];
                  const isOpen = !!openDates[dateKey];

                  return (
                    <div
                      key={dateKey}
                      className="group border-b border-gray-100 last:border-none"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDate(dateKey)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors ${
                          isOpen
                            ? "bg-blue-50/50 text-blue-800"
                            : "bg-white text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90 text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                          />
                          {dateKey === "UNKNOWN"
                            ? "-"
                            : formatTanggalHeader(dateKey)}
                        </span>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {rows.length} {rows.length > 1 ? "Plans" : "Plan"}
                        </span>
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen
                            ? "max-h-[5000px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="bg-gray-50/30">
                          {rows.map((r, index) => (
                            <div
                              key={r.id}
                              className={`flex flex-col md:grid md:grid-cols-8 md:items-center px-4 py-4 md:py-3 text-sm text-gray-700 transition-colors hover:bg-blue-50/50 gap-3 md:gap-0 ${
                                index !== rows.length - 1
                                  ? "border-b border-gray-100"
                                  : ""
                              }`}
                            >
                              <div className="hidden md:block opacity-0 select-none">
                                {r.tanggal}
                              </div>

                              <div className="flex md:block flex-col">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Kota</span>
                                <div
                                  className="uppercase text-xs font-medium truncate pr-2"
                                  title={r.kota || "-"}
                                >
                                  {r.kota || "-"}
                                </div>
                              </div>
                              <div className="flex md:block flex-col">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">K/L/PD</span>
                                <div
                                  className="uppercase text-xs font-medium truncate pr-2"
                                  title={r.klpd || "-"}
                                >
                                  {r.klpd || "-"}
                                </div>
                              </div>
                              <div className="flex md:block flex-col">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Institusi Kerja</span>
                                <div
                                  className="uppercase text-xs font-medium truncate pr-2"
                                  title={r.institusi_kerja || "-"}
                                >
                                  {r.institusi_kerja || "-"}
                                </div>
                              </div>
                              <div className="flex md:block flex-col">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase mb-1">Satuan Kerja</span>
                                <div
                                  className="uppercase text-xs font-medium truncate pr-2"
                                  title={r.satuan_kerja || "-"}
                                >
                                  {r.satuan_kerja || "-"}
                                </div>
                              </div>
                              <div className="flex justify-between items-center md:justify-center lg:table-cell">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase">Bukti</span>
                                {r.visit_image ? (
                                  <div
                                    className="w-10 h-10 rounded-lg cursor-pointer ring-1 ring-gray-200 hover:ring-blue-400 hover:shadow-md transition-all flex-shrink-0 bg-cover bg-center"
                                    style={{
                                      backgroundImage: `url(${r.visit_image})`,
                                    }}
                                    onClick={() =>
                                      openImageBase64(r.visit_image!)
                                    }
                                    title="Lihat foto bukti"
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                                    N/A
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between items-center md:justify-center lg:table-cell">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase">Status</span>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    r.status?.toLowerCase() === "visited"
                                      ? "bg-green-100 text-green-700"
                                      : r.status?.toLowerCase() === "planned"
                                        ? "bg-blue-100 text-blue-700"
                                        : r.status?.toLowerCase() === "reschedule"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {r.status || "-"}
                                </span>
                                {r.status?.toLowerCase() === "reschedule" && r.reschedule_date && (
                                  <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                    📅 {r.reschedule_date}
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between items-center md:justify-center pt-2 md:pt-0 border-t md:border-t-0 border-dashed border-gray-200 lg:table-cell">
                                <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase">Aksi</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(r.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                                  title="Edit Plan"
                                >
                                  <Pen className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PAGINATION */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Menampilkan halaman {page} dari {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                  className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Prev
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={loading || page >= totalPages}
                  className="flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </main>
        </div>

        <EditVisitModal
          isOpen={editModalOpen}
          editId={editId}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          posisiOptions={posisiOptions}
          statusKunjunganOptions={statusKunjunganOptions}
          kegiatanOptions={kegiatanOptions}
          currentUserId={user?.userId}
          currentUserRole={user?.role}
        />
      </div>
    </div>
  );
}
