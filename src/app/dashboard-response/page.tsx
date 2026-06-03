"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import NotificationMenu from "@/components/modals/NotificationMenu";
import ConfirmModal from "@/components/modals/ConfirmModal";
import {
  Search,
  ClipboardList,
  Building2,
  CheckCircle2,
  PackageOpen,
  Users,
  Clock,
  Timer,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Sector,
  Rectangle,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

type EProcRow = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  segmen: string;
  deadlineUsulan: string | Date;
  tanggalSubmit: string | Date;
  catatan?: string;

  takenByAdminId?: string | null;
  takenByAdminName?: string | null;
  takenAt?: string | Date | null;

  perusahaan?: string;
  statusUsulan?: string;
  statusAkhir?: string;

  statusUsulanResolvedAt?: string | Date | null;

  tanggalKontrak?: string;
  nominalKontrak?: number | string;
  tanggalPembayaran?: string;
  nominalPembayaran?: number | string;
};

type ChartFilter = {
  company: string | null;
  segment: string | null;
  status: string | null;
  admin: string | null;
};

type AdminAvgTime = {
  adminName: string;
  avgDays: number;
  resolvedCount: number;
  totalCount: number;
};

type Summary = {
  total: number;
  bySegment: Array<{ label: string; value: number }>;
  byCompany: Array<{ label: string; value: number }>;
  byStatus: Array<{ label: string; value: number }>;
  byAdmin: Array<{ label: string; value: number }>;
  avgTimeByAdmin: AdminAvgTime[];
};

const renderActiveShape = (props: any) => {
  if (!props || !props.payload) return null;
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g style={{ cursor: "pointer" }}>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        className="font-bold text-sm"
      >
        {payload.label}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
        className="text-xs font-semibold"
      >
        {`Total: ${value}`}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
        className="text-[10px]"
      >
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

function fmtDate(d: string | Date | undefined | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function apiListTakeable(): Promise<EProcRow[]> {
  const res = await fetch("/api/e-procurement/requests?mode=takeable", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? []) as EProcRow[];
}

async function apiListAll(): Promise<EProcRow[]> {
  const res = await fetch("/api/e-procurement/requests?mode=all", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return (json?.data ?? []) as EProcRow[];
}

async function apiTake(requestId: string) {
  const res = await fetch(`/api/e-procurement/requests/${requestId}/take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // adminId tidak perlu dikirim karena diambil dari session di backend
    body: JSON.stringify({}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Gagal mengambil request");
  return true;
}

export default function DashboardResponsePage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [rows, setRows] = useState<EProcRow[]>([]);
  const [allRows, setAllRows] = useState<EProcRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [confirmTakeId, setConfirmTakeId] = useState<string | null>(null);

  // chart
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const onPieEnter = useCallback((_: any, index: number) => {
    setPieActiveIndex(index);
  }, []);

  const [q, setQ] = useState("");

  const [chartFilter, setChartFilter] = useState<ChartFilter>({
    company: null,
    segment: null,
    status: null,
    admin: null,
  });

  const toggleFilter = (
    type: "company" | "segment" | "status" | "admin",
    value: string,
  ) => {
    setChartFilter((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
  };

  // Guard: dashboard response untuk ADMIN/SUPERADMIN saja (opsional tapi masuk akal)
  useEffect(() => {
    if (!sessionLoading) {
      if (!user) {
        router.replace("/");
      } else if (user.role !== "SUPERADMIN" && user.role !== "ADMIN") {
        router.replace("/dashboard-request");
      }
    }
  }, [sessionLoading, user, router]);

  const getSegmenLabel = (segmen?: string) => {
    if (!segmen) return "Unknown";
    // Menghapus format seperti "ring1:", "Ring 1 -", dsb.
    return segmen.replace(/^ring\s*\d+[\s:\-]*\s*/i, "").trim();
  };

  // Dynamic summary
  const summary: Summary = useMemo(() => {
    // 1. Tdk masukkan yg blm di-take
    const takenRows = allRows.filter((r) => r.takenByAdminId != null);

    const fullyFiltered = takenRows.filter((r) => {
      if (
        chartFilter.company &&
        (r.perusahaan || "Belum Ditentukan") !== chartFilter.company
      )
        return false;
      if (
        chartFilter.segment &&
        getSegmenLabel(r.segmen) !== chartFilter.segment
      )
        return false;
      if (
        chartFilter.status &&
        (r.statusAkhir || r.statusUsulan || "Masuk") !== chartFilter.status
      )
        return false;
      if (
        chartFilter.admin &&
        (r.takenByAdminName || "Unknown Admin") !== chartFilter.admin
      )
        return false;
      return true;
    });

    const countSegmen: Record<string, number> = {};
    const countCompany: Record<string, number> = {};
    const countStatus: Record<string, number> = {};
    const countAdmin: Record<string, number> = {};

    const segmenData = takenRows.filter((r) => {
      if (
        chartFilter.company &&
        (r.perusahaan || "Belum Ditentukan") !== chartFilter.company
      )
        return false;
      if (
        chartFilter.status &&
        (r.statusAkhir || r.statusUsulan || "Masuk") !== chartFilter.status
      )
        return false;
      if (
        chartFilter.admin &&
        (r.takenByAdminName || "Unknown Admin") !== chartFilter.admin
      )
        return false;
      return true;
    });
    segmenData.forEach((r) => {
      const s = getSegmenLabel(r.segmen);
      countSegmen[s] = (countSegmen[s] || 0) + 1;
    });

    const companyData = takenRows.filter((r) => {
      if (
        chartFilter.segment &&
        getSegmenLabel(r.segmen) !== chartFilter.segment
      )
        return false;
      if (
        chartFilter.status &&
        (r.statusAkhir || r.statusUsulan || "Masuk") !== chartFilter.status
      )
        return false;
      if (
        chartFilter.admin &&
        (r.takenByAdminName || "Unknown Admin") !== chartFilter.admin
      )
        return false;
      return true;
    });
    companyData.forEach((r) => {
      const c = r.perusahaan || "Belum Ditentukan";
      countCompany[c] = (countCompany[c] || 0) + 1;
    });

    const statusData = takenRows.filter((r) => {
      if (
        chartFilter.company &&
        (r.perusahaan || "Belum Ditentukan") !== chartFilter.company
      )
        return false;
      if (
        chartFilter.segment &&
        getSegmenLabel(r.segmen) !== chartFilter.segment
      )
        return false;
      if (
        chartFilter.admin &&
        (r.takenByAdminName || "Unknown Admin") !== chartFilter.admin
      )
        return false;
      return true;
    });
    statusData.forEach((r) => {
      const st = r.statusAkhir || r.statusUsulan || "Masuk";
      countStatus[st] = (countStatus[st] || 0) + 1;
    });

    const adminData = takenRows.filter((r) => {
      if (
        chartFilter.company &&
        (r.perusahaan || "Belum Ditentukan") !== chartFilter.company
      )
        return false;
      if (
        chartFilter.segment &&
        getSegmenLabel(r.segmen) !== chartFilter.segment
      )
        return false;
      if (
        chartFilter.status &&
        (r.statusAkhir || r.statusUsulan || "Masuk") !== chartFilter.status
      )
        return false;
      return true;
    });

    adminData.forEach((r) => {
      const adm = r.takenByAdminName || "Unknown Admin";
      countAdmin[adm] = (countAdmin[adm] || 0) + 1;
    });

    const toArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    // Custom Urutan untuk bagian status
    const STATUS_ORDER = [
      "masuk",
      "proses",
      "done",
      "hold",
      "cancel",
      "rilis kontrak",
      "barang terkirim ke user",
      "terbit bast",
      "penagihan",
      "lunas",
      "pengumpulan dokumen",
      "done project",
    ];

    const sortedStatus = Object.entries(countStatus)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const idxA = STATUS_ORDER.indexOf(a.label.toLowerCase());
        const idxB = STATUS_ORDER.indexOf(b.label.toLowerCase());
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        if (orderA !== orderB) return orderA - orderB;
        return b.value - a.value;
      });

    // Calculate average response time per admin (tanggalSubmit → statusUsulanResolvedAt)
    const adminTimeMap: Record<string, { totalMs: number; resolvedCount: number; totalCount: number }> = {};
    for (const r of takenRows) {
      const adm = r.takenByAdminName || "Unknown Admin";
      if (!adminTimeMap[adm]) {
        adminTimeMap[adm] = { totalMs: 0, resolvedCount: 0, totalCount: 0 };
      }
      adminTimeMap[adm].totalCount++;

      if (r.statusUsulanResolvedAt && r.tanggalSubmit) {
        const submitTime = new Date(r.tanggalSubmit).getTime();
        const resolvedTime = new Date(r.statusUsulanResolvedAt).getTime();
        if (!isNaN(submitTime) && !isNaN(resolvedTime) && resolvedTime > submitTime) {
          adminTimeMap[adm].totalMs += (resolvedTime - submitTime);
          adminTimeMap[adm].resolvedCount++;
        }
      }
    }

    const avgTimeByAdmin: AdminAvgTime[] = Object.entries(adminTimeMap)
      .map(([adminName, data]) => ({
        adminName,
        avgDays: data.resolvedCount > 0 ? data.totalMs / data.resolvedCount / (1000 * 60 * 60 * 24) : 0,
        resolvedCount: data.resolvedCount,
        totalCount: data.totalCount,
      }))
      .sort((a, b) => a.avgDays - b.avgDays);

    return {
      total: fullyFiltered.length,
      bySegment: toArr(countSegmen),
      byCompany: toArr(countCompany),
      byStatus: sortedStatus,
      byAdmin: toArr(countAdmin),
      avgTimeByAdmin,
    };
  }, [allRows, chartFilter]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (sessionLoading) return;
      if (!user) {
        if (mounted) setLoadingRows(false);
        return;
      }

      setLoadingRows(true);
      const [takeableData, entireData] = await Promise.all([
        apiListTakeable(),
        apiListAll(),
      ]);
      if (mounted) {
        setRows(takeableData);
        setAllRows(entireData);
        setLoadingRows(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionLoading, user]);

  const filtered = useMemo(() => {
    let base = rows;

    if (chartFilter.company) {
      base = base.filter(
        (r) => (r.perusahaan || "Belum Ditentukan") === chartFilter.company,
      );
    }
    if (chartFilter.segment) {
      base = base.filter(
        (r) => (r.segmen || "Unknown") === chartFilter.segment,
      );
    }
    if (chartFilter.status) {
      base = base.filter(
        (r) =>
          (r.statusAkhir || r.statusUsulan || "Masuk") === chartFilter.status,
      );
    }
    if (chartFilter.admin) {
      base = base.filter(
        (r) => (r.takenByAdminName || "Unknown Admin") === chartFilter.admin,
      );
    }
    const qq = q.trim().toLowerCase();
    const sortedBase = qq
      ? base.filter((r) =>
          [
            r.requestId,
            r.requestor,
            r.pemohon,
            r.lokasi,
            r.segmen,
            fmtDate(r.deadlineUsulan),
          ]
            .join(" ")
            .toLowerCase()
            .includes(qq),
        )
      : base;

    // Prioritaskan yang belum diambil & paling lama di-submit
    return sortedBase.sort((a, b) => {
      const timeA = new Date(a.tanggalSubmit).getTime();
      const timeB = new Date(b.tanggalSubmit).getTime();
      return timeA - timeB; // Ascending: oldest first
    });
  }, [rows, q, chartFilter]);

  const hasOrders = filtered.length > 0;

  function onTake(requestId: string) {
    setConfirmTakeId(requestId);
  }

  async function handleConfirmTake() {
    if (!confirmTakeId) return;
    const reqId = confirmTakeId;

    try {
      setTakingId(reqId);
      await apiTake(reqId);
      // refresh list
      const takeableData = await apiListTakeable();
      setRows(takeableData);

      const allData = await apiListAll();
      setAllRows(allData);
    } catch (e: any) {
      alert(e?.message ?? "Gagal mengambil request");
    } finally {
      setTakingId(null);
      setConfirmTakeId(null);
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex relative z-10">
        {/* Sidebar */}
        

        {/* Content */}
        <div className="flex-1 ">
          <div className="w-full px-5 py-6 flex flex-col">
            <div className="ml-4 pt-2 pb-4  flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                  RESPONSE DASHBOARD
                </div>
                <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                  Analisis data E-Procurement dan ambil request dengan cepat.
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden md:block">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-[360px] rounded-full border border-slate-200 bg-white/80 px-4 py-2 pr-10 text-sm shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20"
                  />
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Bell */}
                <div className="hidden lg:flex">
                  <NotificationMenu />
                </div>
              </div>
            </div>

            {/* Top cards row (warna & feel sama) */}
            <div
              className={`mt-6 grid grid-cols-1 gap-4 ${
                user?.role === "SUPERADMIN"
                  ? "lg:grid-cols-4"
                  : "lg:grid-cols-3"
              }`}
            >
              <TopCard
                title="TOTAL REQUEST"
                icon={<ClipboardList className="h-4 w-4 text-neutral-500" />}
                right={
                  <div className="text-3xl font-bold">{summary.total}</div>
                }
              >
                <MiniTable
                  rows={summary.bySegment}
                  onRowClick={(val) => toggleFilter("segment", val)}
                  activeLabel={chartFilter.segment}
                />
              </TopCard>

              <TopCard
                title="PERUSAHAAN"
                icon={<Building2 className="h-4 w-4 text-neutral-500" />}
              >
                <MiniTable
                  rows={summary.byCompany}
                  onRowClick={(val) => toggleFilter("company", val)}
                  activeLabel={chartFilter.company}
                />
              </TopCard>

              <TopCard
                title="STATUS"
                icon={<CheckCircle2 className="h-4 w-4 text-neutral-500" />}
              >
                <MiniTable
                  rows={summary.byStatus}
                  onRowClick={(val) => toggleFilter("status", val)}
                  activeLabel={chartFilter.status}
                />
              </TopCard>

              {user?.role === "SUPERADMIN" && (
                <TopCard
                  title="ADMIN"
                  icon={<Users className="h-4 w-4 text-neutral-500" />}
                >
                  <MiniTable
                    rows={summary.byAdmin}
                    onRowClick={(val) => toggleFilter("admin", val)}
                    activeLabel={chartFilter.admin}
                  />
                </TopCard>
              )}
            </div>

            {/* PIC Average Response Time — SUPERADMIN ONLY */}
            {user?.role === "SUPERADMIN" && (
              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <div className="p-2 bg-violet-50 rounded-lg text-violet-500">
                    <Timer strokeWidth={2.5} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Statistik PIC — Avg. Waktu Penyelesaian
                    </h3>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Rata-rata waktu dari submit request sampai status usulan selesai (Done / Cancel / Hold).
                    </div>
                  </div>
                </div>
                {summary.avgTimeByAdmin.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Timer className="w-8 h-8 mb-2" />
                    <span className="text-sm">Belum ada data penyelesaian</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {summary.avgTimeByAdmin.map((adm) => {
                      const avgHours = adm.avgDays * 24;
                      let displayTime: string;
                      let timeColor: string;
                      if (adm.resolvedCount === 0) {
                        displayTime = "-";
                        timeColor = "text-slate-400";
                      } else if (avgHours < 24) {
                        displayTime = `${avgHours.toFixed(1)} jam`;
                        timeColor = "text-emerald-600";
                      } else if (adm.avgDays < 7) {
                        displayTime = `${adm.avgDays.toFixed(1)} hari`;
                        timeColor = adm.avgDays <= 3 ? "text-emerald-600" : "text-amber-600";
                      } else {
                        displayTime = `${adm.avgDays.toFixed(1)} hari`;
                        timeColor = "text-rose-600";
                      }
                      return (
                        <div
                          key={adm.adminName}
                          className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                              <span className="text-xs font-bold">
                                {adm.adminName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-800 truncate">
                              {adm.adminName}
                            </div>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                                AVG. RESPONSE TIME
                              </div>
                              <div className={`text-2xl font-extrabold ${timeColor} flex items-center gap-1.5`}>
                                <Clock className="w-4 h-4" />
                                {displayTime}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                SELESAI / TOTAL
                              </div>
                              <div className="text-sm font-bold text-slate-700 mt-1">
                                <span className="text-emerald-600">{adm.resolvedCount}</span>
                                <span className="text-slate-400 mx-0.5">/</span>
                                <span>{adm.totalCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Takeable orders (putih, rounded, shadow) */}
            <div className={`mt-8 rounded-2xl bg-white p-5 shadow-sm border border-slate-200 transition-shadow ${user?.role === "SUPERADMIN" ? "order-4" : "order-3"}`}>
              <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
                    <ClipboardList strokeWidth={2.5} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Request yang bisa diambil
                    </h3>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      Segera klaim permohonan E-Procurement ini.
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-end">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                    {filtered.length} Tersedia
                  </span>
                </div>
              </div>

              {(chartFilter.company ||
                chartFilter.segment ||
                chartFilter.status ||
                chartFilter.admin) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">
                    Active Filters:
                  </span>
                  {chartFilter.company && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
                      <span className="flex items-center gap-1">
                        <span className="text-sky-500">🏢</span>
                        Perusahaan:{" "}
                        <span className="font-bold">{chartFilter.company}</span>
                      </span>
                      <button
                        onClick={() =>
                          toggleFilter("company", chartFilter.company!)
                        }
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-md hover:bg-sky-200/50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {chartFilter.segment && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 ring-1 ring-inset ring-purple-200">
                      <span className="flex items-center gap-1">
                        <span className="text-purple-500">🎯</span>
                        Segmen:{" "}
                        <span className="font-bold">{chartFilter.segment}</span>
                      </span>
                      <button
                        onClick={() =>
                          toggleFilter("segment", chartFilter.segment!)
                        }
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-md hover:bg-purple-200/50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {chartFilter.status && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                      <span className="flex items-center gap-1">
                        <span className="text-emerald-500">✅</span>
                        Status:{" "}
                        <span className="font-bold">{chartFilter.status}</span>
                      </span>
                      <button
                        onClick={() =>
                          toggleFilter("status", chartFilter.status!)
                        }
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-md hover:bg-emerald-200/50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {chartFilter.admin && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-800 ring-1 ring-inset ring-pink-200">
                      <span className="flex items-center gap-1">
                        <span className="text-pink-500">🧑‍💻</span>
                        Admin:{" "}
                        <span className="font-bold">{chartFilter.admin}</span>
                      </span>
                      <button
                        onClick={() =>
                          toggleFilter("admin", chartFilter.admin!)
                        }
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-md hover:bg-pink-200/50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setChartFilter({
                        company: null,
                        segment: null,
                        status: null,
                        admin: null,
                      })
                    }
                    className="text-xs font-semibold text-red-500 hover:text-red-700 underline underline-offset-2 ml-2"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {loadingRows ? (
                  <>
                    <TakeCardSkeleton />
                    <TakeCardSkeleton />
                  </>
                ) : hasOrders ? (
                  filtered
                    .slice(0, 2)
                    .map((r) => (
                      <TakeCard
                        key={r.requestId}
                        row={r}
                        taking={takingId === r.requestId}
                        onTake={() => onTake(r.requestId)}
                      />
                    ))
                ) : (
                  <EmptyTakeState />
                )}
              </div>
            </div>

            {/* Overview (putih + shadow) */}
            <div className={`mt-6 rounded-xl bg-white p-4 shadow-md ${user?.role === "SUPERADMIN" ? "order-3" : "order-4"}`}>
              <div className="text-sm font-semibold text-neutral-900">
                Overview
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <OverviewCard title="PERUSAHAAN" className="lg:col-span-2">
                  <div className="h-[280px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                      <BarChart
                        data={summary.byCompany}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: "#6b7280" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={200}
                          tick={{
                            fontSize: 11,
                            fill: "#374151",
                            fontWeight: 500,
                          }}
                          interval={0}
                        />
                        <Tooltip
                          cursor={{ fill: "#f3f4f6" }}
                          formatter={(value: any) => [value, "Request"]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                          activeBar={
                            <Rectangle
                              fill="#bae6fd"
                              stroke="#3b82f6"
                              strokeWidth={1}
                              radius={[0, 4, 4, 0]}
                            />
                          }
                        >
                          {summary.byCompany.map((entry, index) => {
                            const isSelected =
                              chartFilter.company === entry.label;
                            const isDimmed =
                              chartFilter.company !== null && !isSelected;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                cursor="pointer"
                                fill={isDimmed ? "#93c5fd" : "#3b82f6"}
                                opacity={isDimmed ? 0.35 : 1}
                                onClick={() =>
                                  toggleFilter("company", entry.label)
                                }
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </OverviewCard>

                <OverviewCard title="TOTAL REQUEST" className="lg:row-span-2">
                  <div className="h-[400px] w-full flex justify-center items-center text-xs mt-4">
                    <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                      <RechartsPieChart>
                        <Pie
                          // @ts-ignore
                          activeIndex={pieActiveIndex}
                          activeShape={renderActiveShape}
                          data={summary.bySegment}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          innerRadius={60}
                          dataKey="value"
                          nameKey="label"
                          onMouseEnter={onPieEnter}
                          onClick={(data, index) => {
                            if (summary.bySegment[index]) {
                              toggleFilter(
                                "segment",
                                summary.bySegment[index].label,
                              );
                            }
                          }}
                        >
                          {summary.bySegment.map((entry, index) => {
                            const isSelected =
                              chartFilter.segment === entry.label;
                            const isDimmed =
                              chartFilter.segment !== null && !isSelected;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                cursor="pointer"
                                fill={COLORS[index % COLORS.length]}
                                opacity={isDimmed ? 0.35 : 1}
                                onClick={() =>
                                  toggleFilter("segment", entry.label)
                                }
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [value, "Request"]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: "11px",
                            paddingTop: "20px",
                          }}
                          verticalAlign="bottom"
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </OverviewCard>

                <OverviewCard title="STATUS" className="lg:col-span-2">
                  <div className="h-[280px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                      <BarChart
                        data={summary.byStatus}
                        margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "#374151" }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#6b7280" }}
                        />
                        <Tooltip
                          cursor={{ fill: "#f3f4f6" }}
                          formatter={(value: any) => [value, "Request"]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                          barSize={30}
                          activeBar={
                            <Rectangle
                              fill="#6ee7b7"
                              stroke="#10b981"
                              strokeWidth={1}
                              radius={[4, 4, 0, 0]}
                            />
                          }
                        >
                          {summary.byStatus.map((entry, index) => {
                            const isSelected =
                              chartFilter.status === entry.label;
                            const isDimmed =
                              chartFilter.status !== null && !isSelected;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                cursor="pointer"
                                fill={isDimmed ? "#a7f3d0" : "#10b981"}
                                opacity={isDimmed ? 0.35 : 1}
                                onClick={() =>
                                  toggleFilter("status", entry.label)
                                }
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </OverviewCard>
              </div>

              {user?.role === "SUPERADMIN" && (
                <div className="mt-4">
                  <OverviewCard title="ADMIN PERFORMANCE (SUPERADMIN ONLY)">
                    <div className="h-[280px] w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                        <BarChart
                          data={summary.byAdmin}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "#6b7280" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={150}
                            tick={{
                              fontSize: 11,
                              fill: "#374151",
                              fontWeight: 500,
                            }}
                            interval={0}
                          />
                          <Tooltip
                            cursor={{ fill: "#f3f4f6" }}
                            formatter={(value: any) => [value, "Request"]}
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                            fill="#8b5cf6"
                            activeBar={
                              <Rectangle
                                fill="#c4b5fd"
                                stroke="#8b5cf6"
                                strokeWidth={1}
                                radius={[0, 4, 4, 0]}
                              />
                            }
                          >
                            {summary.byAdmin.map((entry, index) => {
                              const isSelected =
                                chartFilter.admin === entry.label;
                              const isDimmed =
                                chartFilter.admin !== null && !isSelected;
                              return (
                                <Cell
                                  key={`cell-${index}`}
                                  cursor="pointer"
                                  fill={COLORS[index % COLORS.length]}
                                  opacity={isDimmed ? 0.35 : 1}
                                  onClick={() =>
                                    toggleFilter("admin", entry.label)
                                  }
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </OverviewCard>
                </div>
              )}
            </div>

            <div className="h-10 order-last" />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmTakeId}
        loading={takingId === confirmTakeId}
        title="Konfirmasi Pengambilan"
        message={`Apakah Anda yakin ingin TAKE request ${confirmTakeId}?`}
        confirmText="TAKE"
        onConfirm={handleConfirmTake}
        onCancel={() => setConfirmTakeId(null)}
      />
    </div>
  );
}

/* ----------------------------- UI Blocks ----------------------------- */

function TopCard({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-[11px] font-semibold tracking-wider text-neutral-500">
            {title}
          </div>
        </div>
        {right ? <div className="text-neutral-900">{right}</div> : null}
      </div>

      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniTable({
  rows,
  onRowClick,
  activeLabel,
}: {
  rows: Array<{ label: string; value: number }>;
  onRowClick?: (label: string) => void;
  activeLabel?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      {rows.map((r, idx) => {
        const isActive = activeLabel === r.label;
        return (
          <div
            key={r.label}
            onClick={() => onRowClick && onRowClick(r.label)}
            className={`flex items-center justify-between px-3 py-2 text-[11px] ${
              idx !== rows.length - 1 ? "border-b border-neutral-200" : ""
            } ${onRowClick ? "cursor-pointer hover:bg-sky-50 transition-colors" : ""} ${
              isActive ? "bg-sky-100/50" : ""
            }`}
          >
            <div
              className={`font-medium ${isActive ? "text-sky-800 font-bold" : "text-neutral-700"}`}
            >
              {r.label}
            </div>
            <div
              className={`tabular-nums font-semibold ${isActive ? "text-sky-900" : "text-neutral-900"}`}
            >
              {r.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TakeCard({
  row,
  onTake,
  taking,
}: {
  row: EProcRow;
  onTake: () => void;
  taking: boolean;
}) {
  const isDelayed =
    Date.now() - new Date(row.tanggalSubmit).getTime() >
    3 * 24 * 60 * 60 * 1000; // > 3 days

  return (
    <div
      className={`group relative rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
        isDelayed
          ? "border-rose-300 ring-2 ring-rose-500/50 hover:border-rose-400 bg-rose-50/30"
          : "border-slate-200 hover:border-indigo-200 bg-white"
      }`}
    >
      {isDelayed && (
        <div className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-0.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          MENDESAK (&gt;3 HARI)
        </div>
      )}

      <div
        className={`flex items-start justify-between gap-3 ${isDelayed ? "mt-2" : ""}`}
      >
        <div>
          <div className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
            REQUEST ID
          </div>
          <div className="mt-1 text-lg font-bold text-neutral-900">
            {row.requestId}
          </div>
        </div>

        <button
          className={[
            "h-9 rounded-full px-5 text-xs font-bold transition-all flex items-center justify-center shadow-sm",
            taking
              ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-95",
          ].join(" ")}
          onClick={onTake}
          disabled={taking}
        >
          {taking ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              TAKING...
            </>
          ) : (
            "TAKE"
          )}
        </button>
      </div>

      <div className="mt-4 h-px w-full bg-slate-100" />

      <div className="mt-4 grid grid-cols-2 gap-y-5 gap-x-4">
        <Info label="REQUESTOR" value={row.requestor} />
        <Info label="DEADLINE USULAN" value={fmtDate(row.deadlineUsulan)} />

        <Info label="PEMOHON" value={row.pemohon} bold />
        <Info label="TANGGAL MASUK" value={fmtDate(row.tanggalSubmit)} />

        <Info label="SEGMEN" value={row.segmen} />
        <div>
          <div className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
            KOTA/LOKASI
          </div>
          <div className="mt-1.5 inline-flex rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-sm font-bold text-neutral-800">
            {row.lokasi}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
        {label}
      </div>
      <div
        className={`mt-1.5 text-sm text-neutral-800 ${bold ? "font-bold text-base" : "font-medium"}`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyTakeState() {
  return (
    <div className="lg:col-span-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
          <PackageOpen className="h-6 w-6 text-neutral-700" />
        </div>
        <div className="mt-3 text-sm font-semibold text-neutral-900">
          Tidak ada order yang bisa diambil
        </div>
        <div className="mt-1 text-xs text-neutral-600">
          Jika ada request baru dari e-procurement, maka akan muncul di sini.
        </div>
      </div>
    </div>
  );
}

function TakeCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-neutral-200" />
          <div className="h-4 w-40 rounded bg-neutral-200" />
        </div>
        <div className="h-9 w-20 rounded-full bg-neutral-200" />
      </div>
      <div className="mt-3 h-px w-full bg-neutral-200" />
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="h-10 rounded bg-neutral-200" />
        <div className="h-10 rounded bg-neutral-200" />
        <div className="col-span-2 h-10 rounded bg-neutral-200" />
        <div className="h-10 rounded bg-neutral-200" />
        <div className="h-10 rounded bg-neutral-200" />
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="text-[11px] font-semibold tracking-wider text-neutral-500">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChartPlaceholder({
  icon,
  tall,
}: {
  icon: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50",
        tall ? "h-[320px]" : "h-[160px]",
      ].join(" ")}
    >
      <div className="absolute inset-0 opacity-[0.35]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>
      <div className="relative flex h-full items-center justify-center text-neutral-700">
        {icon}
      </div>
    </div>
  );
}
