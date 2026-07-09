"use client";

import React, { useEffect, useState, useCallback } from "react";

import NotificationMenu from "@/components/modals/NotificationMenu";
import SalesMap, { SalesVisit } from "@/components/modals/SalesMap";
import { Search, X, Filter, MapPin } from "lucide-react";
import { useSession } from "@/components/session/SessionProvider";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Label,
  Sector,
} from "recharts";

// ── Lookup koordinat kota-kota Indonesia ─────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  "jakarta": [-6.2088, 106.8456],
  "surabaya": [-7.2575, 112.7521],
  "bandung": [-6.9175, 107.6191],
  "medan": [3.5952, 98.6722],
  "semarang": [-6.9666, 110.4196],
  "makassar": [-5.1477, 119.4327],
  "palembang": [-2.9761, 104.7754],
  "tangerang": [-6.1783, 106.63],
  "depok": [-6.4025, 106.7942],
  "bekasi": [-6.2383, 106.9756],
  "bogor": [-6.5971, 106.806],
  "malang": [-7.9666, 112.6326],
  "yogyakarta": [-7.7956, 110.3695],
  "solo": [-7.5755, 110.8243],
  "balikpapan": [-1.2379, 116.8529],
  "samarinda": [-0.4948, 117.1436],
  "pontianak": [-0.0263, 109.3425],
  "banjarmasin": [-3.3186, 114.5944],
  "manado": [1.4748, 124.8421],
  "denpasar": [-8.6705, 115.2126],
  "bali": [-8.3405, 115.092],
  "mataram": [-8.5833, 116.1167],
  "kupang": [-10.1772, 123.607],
  "ambon": [-3.6954, 128.1814],
  "jayapura": [-2.5333, 140.7167],
  "padang": [-0.9471, 100.4172],
  "pekanbaru": [0.5071, 101.4478],
  "jambi": [-1.6101, 103.6131],
  "bengkulu": [-3.8004, 102.2655],
  "lampung": [-5.45, 105.2667],
  "kota bandar lampung": [-5.45, 105.2667],
  "serang": [-6.1103, 106.1504],
  "cilegon": [-6.0023, 106.0519],
  "cirebon": [-6.7063, 108.557],
  "tasikmalaya": [-7.3274, 108.2208],
  "sukabumi": [-6.9277, 106.9300],
  "purwokerto": [-7.4281, 109.2340],
  "tegal": [-6.8797, 109.1426],
  "pekalongan": [-6.8886, 109.6753],
  "surakarta": [-7.5755, 110.8243],
  "madiun": [-7.6298, 111.5230],
  "kediri": [-7.8480, 112.0178],
  "jember": [-8.1845, 113.6681],
  "banyuwangi": [-8.2193, 114.3691],
  "sidoarjo": [-7.4478, 112.7183],
  "gresik": [-7.1615, 112.6513],
  "mojokerto": [-7.4721, 112.4341],
  "probolinggo": [-7.7543, 113.2159],
  "pasuruan": [-7.6461, 112.9075],
  "blitar": [-8.0983, 112.1681],
  "magelang": [-7.4797, 110.2177],
  "salatiga": [-7.3305, 110.5084],
  "kendari": [-3.9985, 122.5130],
  "palu": [-0.9003, 119.8779],
  "gorontalo": [0.5435, 123.0568],
  "ternate": [0.7736, 127.3749],
  "sorong": [-0.8761, 131.2558],
  "manokwari": [-0.8615, 134.0620],
  "pangkal pinang": [-2.1311, 106.1137],
  "tanjung pinang": [0.9188, 104.4462],
  "batam": [1.0456, 104.0305],
  "banda aceh": [5.5483, 95.3238],
  "aceh": [5.5483, 95.3238],
  "binjai": [3.6001, 98.4854],
  "karawang": [-6.3231, 107.3376],
  "subang": [-6.5686, 107.7527],
  "garut": [-7.2094, 107.8903],
  "cianjur": [-6.8204, 107.1432],
  "indramayu": [-6.3361, 108.3233],
  "purwakarta": [-6.5560, 107.4316],
  "kabupaten purwakarta": [-6.5386, 107.4436],
  "kuningan": [-6.9758, 108.4838],
  "majalengka": [-6.8367, 108.2278],
  "sumedang": [-6.8553, 107.9208],
  "bandung barat": [-6.8486, 107.5212],
  "jakarta pusat": [-6.1805, 106.828],
  "jakarta utara": [-6.1481, 106.8998],
  "jakarta barat": [-6.1674, 106.7637],
  "jakarta selatan": [-6.2474, 106.8061],
  "jakarta timur": [-6.2126, 106.9434],
  "tangerang selatan": [-6.2835, 106.7113],
  "kabupaten bandung": [-7.0614, 107.5946],
};

function normalizeCityName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// dihitung sekali di module scope, bukan setiap kali fungsi dipanggil
const SORTED_CITY_KEYS = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length);
const LOOSE_CITY_LOOKUP: Record<string, [number, number]> = {};
for (const [k, v] of Object.entries(CITY_COORDS)) {
  LOOSE_CITY_LOOKUP[k.replace(/[^a-z0-9]/g, "")] = v;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCityCoords(cityName: string): [number, number] | null {
  if (!cityName) return null;
  const normalized = normalizeCityName(cityName);
  if (!normalized) return null;

  // 1. Exact match setelah prefix kota/kab dibuang
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];

  // 2. Match tanpa spasi/tanda baca — nutup kasus "Tanjungpinang" vs "tanjung pinang"
  const loose = normalized.replace(/[^a-z0-9]/g, "");
  if (LOOSE_CITY_LOOKUP[loose]) return LOOSE_CITY_LOOKUP[loose];

  // 3. Fallback: cari nama kota sebagai kata utuh di dalam string yang lebih panjang
  // (dipakai untuk extract nama kota dari nama satker yang lebih panjang).
  // Key terpanjang dicek duluan supaya "bandung barat" tidak "ketabrak" oleh "bandung".
  for (const key of SORTED_CITY_KEYS) {
    if (new RegExp(`\\b${escapeRegex(key)}\\b`).test(normalized)) {
      return CITY_COORDS[key];
    }
  }
  return null;
}


const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    midAngle,
    percent,
  } = props;

  // Calculate text position same as renderCustomizedLabel
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // Enlarged "popped out" effect
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: `${cx}px ${cy}px`,
        }}
      />
      {percent > 0 && (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontWeight="bold"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      )}
    </g>
  );
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent === 0) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

type DashboardStats = {
  totalVisits: number;
  visited: number;
  stayOffice: number;
  notVisited: number;
  salesCount: number;
  satkerCount: number;
  cityCount: number;
  ring: {
    ring1: number;
    ring2: number;
    ring3: number;
    ring4: number;
  };
  trend?: { date: string; count: number }[];
  topVisit?: { name: string; count: number }[];
  topSales?: { name: string; count: number }[];
  klpd?: { name: string; count: number }[];
};

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function formatDateID(iso: string | Date | undefined) {
  if (!iso || iso === "-") return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function StatusPill({ value }: { value: string | undefined }) {
  const upper = (value || "-").toUpperCase();
  const isVisited = upper.includes("VISIT") && !upper.includes("NOT");

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-extrabold tracking-wide",
        isVisited
          ? "bg-green-100 text-green-700 ring-1 ring-green-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
      )}
    >
      {upper}
    </span>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-extrabold tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900">
        {value || "-"}
      </div>
    </div>
  );
}

type VisitRow = {
  _id: string;
  nama_sales?: string;
  visit_date?: string | Date;
  status_visit?: string;
  satuan_kerja?: string;
  city?: string;
  pic_name?: string;
  pic_phone?: string;
  status_ring?: string;
  created_at?: string;
  status_market?: string;
  klpd?: string;
  reschedule?: string;
  institusi_kerja?: string;
  pic_position?: string;
  pic_role?: string;
  tindak_lanjut?: string;
  kegiatan_status?: string;
  descriptions?: string;
};

export default function DashboardRequestPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [selected, setSelected] = useState<VisitRow | null>(null);
  const [search, setSearch] = useState("");
  const [klpdActiveIndex, setKlpdActiveIndex] = useState<number | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ── Map Modal state ────────────────────────────────────────────
  const [mapModal, setMapModal] = useState<{
    open: boolean;
    title: string;
    mapVisits: SalesVisit[];
    unmatched: { name: string; count: number }[];
  }>({ open: false, title: "", mapVisits: [], unmatched: [] });

  const [mapLoading, setMapLoading] = useState(false);

  const [activeFilters, setActiveFilters] = useState<{
    ring: string | null;
    statusGroup: string | null;
    city: string | null;
    satker: string | null;
    sales: string | null;
    klpd: string | null;
    date: string | null;
  }>({
    ring: null,
    statusGroup: null,
    city: null,
    satker: null,
    sales: null,
    klpd: null,
    date: null,
  });

  const openMapForCategory = useCallback(
    async (category: "City" | "Satker") => {
      const groupField = category === "City" ? "city" : "satuan_kerja";

      // Fetch SEMUA visit data dari API (bukan hanya 5 row dari tabel)
      try {
        setMapLoading(true);
        const params = new URLSearchParams({ limit: "100000", page: "1" });
        if (activeFilters.ring) params.set("ring", activeFilters.ring);
        if (activeFilters.statusGroup) params.set("statusGroup", activeFilters.statusGroup);
        if (activeFilters.city) params.set("city", activeFilters.city);
        if (activeFilters.satker) params.set("satker", activeFilters.satker);
        if (activeFilters.sales) params.set("sales", activeFilters.sales);
        if (activeFilters.klpd) params.set("klpd", activeFilters.klpd);
        if (activeFilters.date) params.set("date", activeFilters.date);
        if (startDate) params.set("start", startDate);
        if (endDate) params.set("end", endDate);

        const res = await fetch(`/api/visits?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to fetch visits for map");

        const allVisits: VisitRow[] = data.items ?? [];

        const grouped = new Map<
          string,
          { count: number; sales: Set<string>; dates: string[] }
        >();

        allVisits.forEach((v) => {
          const key = (v[groupField as keyof VisitRow] as string) || "";
          if (!key || key === "-") return;
          if (!grouped.has(key)) {
            grouped.set(key, { count: 0, sales: new Set(), dates: [] });
          }
          const g = grouped.get(key)!;
          g.count++;
          if (v.nama_sales) g.sales.add(v.nama_sales);
          if (v.visit_date) g.dates.push(String(v.visit_date));
        });

        const mapVisits: SalesVisit[] = [];
        const unmatched: { name: string; count: number }[] = [];
        let idx = 0;

        grouped.forEach((data, name) => {
          const coords = getCityCoords(name);
          if (!coords && category !== "City") {
            unmatched.push({ name, count: data.count });
            // For Satker without coords, we skip drawing it on the map entirely
            return;
          }
          if (!coords && category === "City") {
             // For City, we still pass it because GeoJSON will match the name!
             // We put it in unmatched list just for info, but don't return.
             unmatched.push({ name, count: data.count });
          }

          mapVisits.push({
            id: `${category}-${idx++}`,
            city: name,
            lat: coords ? coords[0] : 0,
            lng: coords ? coords[1] : 0,
            nama_sales: Array.from(data.sales).join(", "),
            sales_name: Array.from(data.sales).join(", "),
            visit_date: data.dates[0] || "-",
            customerCount: data.count,
          });
        });

        setMapModal({
          open: true,
          title: category === "City" ? "📍 Map by City" : "🏛️ Map by Satuan Kerja",
          mapVisits,
          unmatched,
        });
      } catch (e) {
        console.error("Failed to load map data:", e);
      } finally {
        setMapLoading(false);
      }
    },
    [activeFilters, startDate, endDate],
  );



  useEffect(() => {
    if (!sessionLoading && user) {
      if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
      }
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (sessionLoading) return;
      if (!user) return; // middleware seharusnya redirect

      try {
        setLoadingStats(true);
        const params = new URLSearchParams();
        if (activeFilters.ring) params.set("ring", activeFilters.ring);
        if (activeFilters.statusGroup)
          params.set("statusGroup", activeFilters.statusGroup);
        if (activeFilters.city) params.set("city", activeFilters.city);
        if (activeFilters.satker) params.set("satker", activeFilters.satker);
        if (activeFilters.sales) params.set("sales", activeFilters.sales);
        if (activeFilters.klpd) params.set("klpd", activeFilters.klpd);
        if (activeFilters.date) params.set("date", activeFilters.date);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/dashboard-request?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to fetch stats");
        if (mounted) setStats(json as DashboardStats);
      } catch (e) {
        console.error(e);
        if (mounted) setStats(null);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionLoading, user, activeFilters, startDate, endDate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (sessionLoading) return;
      if (!user) return;

      try {
        setLoadingTable(true);
        const params = new URLSearchParams({ limit: "5", page: "1" });
        if (activeFilters.ring) params.set("ring", activeFilters.ring);
        if (activeFilters.statusGroup)
          params.set("statusGroup", activeFilters.statusGroup);
        if (activeFilters.city) params.set("city", activeFilters.city);
        if (activeFilters.satker) params.set("satker", activeFilters.satker);
        if (activeFilters.sales) params.set("sales", activeFilters.sales);
        if (activeFilters.klpd) params.set("klpd", activeFilters.klpd);
        if (activeFilters.date) params.set("date", activeFilters.date);
        if (startDate) params.set("start", startDate);
        if (endDate) params.set("end", endDate);

        const res = await fetch(`/api/visits?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to fetch visits");
        if (mounted) setVisits(data.items ?? []);
      } catch (e) {
        console.error(e);
        if (mounted) setVisits([]);
      } finally {
        if (mounted) setLoadingTable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionLoading, user, activeFilters, startDate, endDate]);

  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (v.nama_sales || "").toLowerCase().includes(q) ||
      (v.satuan_kerja || "").toLowerCase().includes(q) ||
      (v.city || "").toLowerCase().includes(q) ||
      (v.pic_name || "").toLowerCase().includes(q) ||
      (v.status_visit || "").toLowerCase().includes(q) ||
      (v.status_ring || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="flex">


        {/* CONTENT */}
        <div className="flex-1 p-3 sm:p-6">
          {/* TOP BAR */}
          <div className="mb-4 px-4 pt-2 pb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl pl-4 font-extrabold text-black drop-shadow-sm">
                VISIT DASHBOARD
              </h2>
              <div className="text-sm ml-4 mt-2 text-slate-500 font-medium">
                Monitoring dan Analisis Aktivitas Visit Lapangan
              </div>
              {/* Active Filters Indicator */}
              {(activeFilters.ring ||
                activeFilters.statusGroup ||
                activeFilters.city ||
                activeFilters.satker ||
                activeFilters.sales ||
                activeFilters.klpd ||
                activeFilters.date ||
                startDate ||
                endDate) && (
                  <div className="pl-4 mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filters:
                    </span>
                    {activeFilters.statusGroup && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                        {activeFilters.statusGroup}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, statusGroup: null }))
                          }
                          className="hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.ring && (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                        {activeFilters.ring}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, ring: null }))
                          }
                          className="hover:text-orange-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.city && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                        City: {activeFilters.city}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, city: null }))
                          }
                          className="hover:text-emerald-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.satker && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">
                        Satker: {activeFilters.satker}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, satker: null }))
                          }
                          className="hover:text-purple-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.sales && (
                      <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-bold">
                        Sales: {activeFilters.sales}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, sales: null }))
                          }
                          className="hover:text-sky-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.klpd && (
                      <span className="inline-flex items-center gap-1 bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded-full text-xs font-bold">
                        KLPD: {activeFilters.klpd}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, klpd: null }))
                          }
                          className="hover:text-fuchsia-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {activeFilters.date && (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold">
                        Date: {activeFilters.date}
                        <button
                          onClick={() =>
                            setActiveFilters((p) => ({ ...p, date: null }))
                          }
                          className="hover:text-rose-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {startDate && (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold">
                        Start Date: {startDate}
                        <button
                          onClick={() => setStartDate("")}
                          className="hover:text-rose-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {endDate && (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold">
                        End Date: {endDate}
                        <button
                          onClick={() => setEndDate("")}
                          className="hover:text-rose-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setActiveFilters({
                          ring: null,
                          statusGroup: null,
                          city: null,
                          satker: null,
                          sales: null,
                          klpd: null,
                          date: null,
                        });
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="text-xs text-gray-500 hover:text-red-500 underline ml-2 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter Capsule */}
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  className="bg-transparent text-xs text-gray-700 outline-none cursor-pointer"
                  title="Start Date"
                />
                <span className="text-gray-300">|</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      e.currentTarget.showPicker();
                    }
                  }}
                  className="bg-transparent text-xs text-gray-700 outline-none cursor-pointer"
                  title="End Date"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Clear Dates"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Searchbar */}
              <div className="relative w-full md:w-60">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-full bg-white px-4 pr-10 text-xs shadow-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-blue-300"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
                </span>
              </div>

              {/* Bell is available on desktop, hidden on mobile to avoid duplicate */}
              <div className="hidden lg:flex">
                <NotificationMenu />
              </div>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <StatCard
              title="TOTAL VISITS"
              value={loadingStats ? undefined : stats?.totalVisits}
            />
            <StatCard
              title="STAY OFFICE"
              value={loadingStats ? undefined : stats?.stayOffice}
            />
            <StatCard
              title="NOT VISITED"
              value={loadingStats ? undefined : stats?.notVisited}
            />

            <div className="rounded-xl bg-white p-4 shadow">
              <p className="mb-3 text-xs text-gray-500">MARKET COVERAGE</p>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold">
                    {loadingStats ? "-" : (stats?.salesCount ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Sales</p>
                </div>

                <div>
                  <p className="text-2xl font-semibold">
                    {loadingStats ? "-" : (stats?.satkerCount ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Satker</p>
                </div>

                <div>
                  <p className="text-2xl font-semibold">
                    {loadingStats ? "-" : (stats?.cityCount ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">City</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
              <p className="mb-3 text-xs text-gray-500">RING DISTRIBUTION</p>
              <div className="grid grid-cols-4 gap-4 text-center">
                {(["ring1", "ring2", "ring3", "ring4"] as const).map(
                  (ring, i) => (
                    <div key={ring}>
                      <p className="text-2xl font-semibold">
                        {loadingStats ? "-" : (stats?.ring?.[ring] ?? "-")}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Ring {i + 1}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:auto-rows-fr">
            <div className="rounded-xl bg-white p-6 shadow lg:row-span-2 lg:col-span-1">
              <h3 className="mb-4 text-md font-semibold text-black">
                VISITS OVERVIEW
              </h3>

              <div className="h-[420px] w-full">
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Visits", value: stats?.visited || 0 }, // Changed from totalVisits
                          {
                            name: "Stay Office",
                            value: stats?.stayOffice || 0,
                          },
                          {
                            name: "Not Visited",
                            value: stats?.notVisited || 0,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        paddingAngle={3}
                        dataKey="value"
                        label
                        onClick={(data: any) => {
                          const name = data?.name;
                          if (typeof name === "string") {
                            setActiveFilters((p) => ({
                              ...p,
                              statusGroup: p.statusGroup === name ? null : name,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer", transition: "all 0.3s" }}
                      >
                        <Cell
                          fill="#3b82f6"
                          className="hover:opacity-80 drop-shadow-sm"
                        />
                        <Cell
                          fill="#10b981"
                          className="hover:opacity-80 drop-shadow-sm"
                        />
                        <Cell
                          fill="#ef4444"
                          className="hover:opacity-80 drop-shadow-sm"
                        />
                      </Pie>

                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend verticalAlign="bottom" height={50} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Market Coverage Chart (KANAN ATAS) */}
            <div className="rounded-xl bg-white p-5 shadow lg:col-span-2">
              <h3 className="mb-4 text-md font-bold text-black">
                MARKET COVERAGE
              </h3>
              <div className="h-64 w-full">
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <BarChart
                      data={[
                        { name: "Sales", count: stats?.salesCount || 0 },
                        { name: "Satker", count: stats?.satkerCount || 0 },
                        { name: "City", count: stats?.cityCount || 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E5E7EB"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "black" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "gray" }}
                      />
                      <Tooltip cursor={{ fill: "transparent" }} />
                      <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                        style={{ cursor: "pointer" }}
                        className="hover:opacity-80 transition-opacity"
                        onClick={(data: any) => {
                          const name = data?.name;
                          if (name === "City") {
                            openMapForCategory("City");
                          } else if (name === "Satker") {
                            openMapForCategory("Satker");
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Ring Distribution Chart */}
            <div className="rounded-xl bg-white p-5 shadow lg:col-span-2">
              <h3 className="mb-4 text-md font-bold text-black">
                RING DISTRIBUTION
              </h3>
              <div className="h-64 w-full">
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <BarChart
                      data={[
                        { name: "Ring 1", count: stats?.ring?.ring1 || 0 },
                        { name: "Ring 2", count: stats?.ring?.ring2 || 0 },
                        { name: "Ring 3", count: stats?.ring?.ring3 || 0 },
                        { name: "Ring 4", count: stats?.ring?.ring4 || 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#E5E7EB"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6B7280" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "black" }}
                        width={65}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#f59e0b"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        onClick={(data: any) => {
                          const name = data?.name;
                          if (typeof name === "string") {
                            const upperName = name.toUpperCase();
                            setActiveFilters((p) => ({
                              ...p,
                              ring: p.ring === upperName ? null : upperName,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                        className="hover:opacity-80 transition-opacity"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* EXTENDED ANALYTICS SECTION */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Trend Visits (Area Chart) */}
            <div className="rounded-xl bg-white p-5 shadow lg:col-span-2">
              <h3 className="mb-4 text-md font-bold text-black">
                VISITS TREND (14 DAYS)
              </h3>
              <div className="h-64 w-full">
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <AreaChart
                      data={stats?.trend || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTrend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#E5E7EB"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "gray" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "gray" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTrend)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        onClick={(data: any) => {
                          const dateVal =
                            data?.activePayload?.[0]?.payload?.date ||
                            data?.payload?.date ||
                            data?.date;
                          if (dateVal) {
                            setActiveFilters((p) => ({
                              ...p,
                              date: p.date === dateVal ? null : dateVal,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Visit Performance (Horizontal Bar Chart) */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 flex flex-col pt-7 pb-6 h-full">
              <h3 className="mb-2 text-sm font-bold tracking-wider text-gray-800">
                TOP VISIT PERFORMANCE
              </h3>
              <p className="mb-6 text-xs text-gray-400">
                Peringkat jumlah visit terbanyak
              </p>
              <div className="flex-1 w-full" style={{ minHeight: `${Math.max(250, ((stats?.topVisit || stats?.topSales || []).length) * 40)}px` }}>
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <BarChart
                      data={stats?.topVisit || stats?.topSales || []}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 12,
                          fill: "#334155",
                          fontWeight: 500,
                        }}
                        width={120}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontWeight: 600, color: "#0f172a" }}
                        formatter={(value) => [`${value} Visits`, "Total"]}
                      />
                      <Bar
                        dataKey="count"
                        fill="#0ea5e9"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                        activeBar={{ stroke: "#0284c7", strokeWidth: 2 }}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={(data: any) => {
                          const name = data?.name;
                          if (typeof name === "string") {
                            setActiveFilters((p) => ({
                              ...p,
                              sales: p.sales === name ? null : name,
                            }));
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* KLPD Distribution (Donut / Pie) */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 flex flex-col pt-7 pb-6 h-full">
              <h3 className="mb-2 text-sm font-bold tracking-wider text-gray-800">
                KLPD DISTRIBUTION
              </h3>
              <p className="mb-6 text-xs text-gray-400">
                Sebaran kategori intitusi
              </p>
              <div className="flex-1 w-full min-h-[250px]">
                {loadingStats ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Pie
                        data={stats?.klpd || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={2}
                        dataKey="count"
                        stroke="none"
                        {...({
                          activeIndex: klpdActiveIndex,
                          activeShape: renderActiveShape,
                        } as any)}
                        onMouseEnter={(_, index) => setKlpdActiveIndex(index)}
                        onMouseLeave={() => setKlpdActiveIndex(undefined)}
                        labelLine={false}
                        label={renderCustomizedLabel}
                        onClick={(data: any) => {
                          const name = data?.name;
                          if (typeof name === "string") {
                            setActiveFilters((p) => ({
                              ...p,
                              klpd: p.klpd === name ? null : name,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {(stats?.klpd || []).map((entry, index) => {
                          // Candy colors mimicking the user's reference image
                          const COLORS = [
                            "#06b6d4", // Cyan
                            "#ec4899", // Pink
                            "#6366f1", // Indigo
                            "#d946ef", // Fuchsia
                            "#8b5cf6", // Purple
                            "#3b82f6", // Blue
                          ];
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              className="outline-none"
                              style={{
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                cursor: "pointer",
                              }}
                            />
                          );
                        })}
                        <Label
                          value={(stats?.klpd || []).reduce(
                            (acc, curr) => acc + curr.count,
                            0,
                          )}
                          position="center"
                          dy={-8}
                          className="text-4xl font-extrabold fill-gray-800"
                        />
                        <Label
                          value="IN TOTAL"
                          position="center"
                          dy={18}
                          className="text-[10px] font-bold tracking-widest fill-gray-400"
                        />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontWeight: 600, color: "#0f172a" }}
                      />
                      <Legend
                        verticalAlign="top"
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: "11px",
                          fontWeight: 700,
                          paddingBottom: "10px",
                          color: "#64748b",
                        }}
                        onClick={(data: any) => {
                          const name = data?.value;
                          if (typeof name === "string") {
                            setActiveFilters((p) => ({
                              ...p,
                              klpd: p.klpd === name ? null : name,
                            }));
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* RECENT VISITS TABLE */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-md font-bold text-black">RECENT VISITS</h3>
              <button
                onClick={() => router.push("/rekapitulasi-visit")}
                className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors"
              >
                See All
              </button>
            </div>
            <div className="overflow-x-hidden sm:overflow-x-auto">
              <table className="w-full text-sm block lg:table">
                <thead className="bg-white hidden lg:table-header-group">
                  <tr className="border-b border-black/10">
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      Nama Sales
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      Satuan Kerja
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      City
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      Ring
                    </th>
                    <th className="px-3 py-2 text-left font-bold text-blue-600">
                      Visit Date
                    </th>
                  </tr>
                </thead>
                <tbody className="block lg:table-row-group">
                  {loadingTable ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-black/60"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredVisits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-black/60"
                      >
                        Tidak ada data visit.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.slice(0, 5).map((v) => {
                      const active = selected?._id === v._id;
                      return (
                        <React.Fragment key={v._id}>
                          <tr
                            onClick={() => setSelected(active ? null : v)}
                            className={cn(
                              "cursor-pointer border border-slate-200 lg:border-0 border-b border-black/5 transition-colors block lg:table-row p-4 lg:p-0 mb-4 lg:mb-0 rounded-xl lg:rounded-none shadow-sm lg:shadow-none bg-white",
                              active ? "bg-blue-50/60" : "hover:bg-gray-50",
                            )}
                          >
                            <td
                              className={cn(
                                "flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 text-black font-medium border-b border-dashed border-gray-100 lg:border-0",
                                active
                                  ? "sm:border-l-[4px] lg:border-blue-600 sm:pl-2"
                                  : "sm:border-l-[4px] sm:border-transparent sm:pl-2",
                              )}
                            >
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">NAMA SALES</span>
                              <span className="text-right lg:text-left">{v.nama_sales || "-"}</span>
                            </td>
                            <td className="flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 text-black border-b border-dashed border-gray-100 lg:border-0">
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">SATUAN KERJA</span>
                              <span className="text-right lg:text-left">{v.satuan_kerja || "-"}</span>
                            </td>
                            <td className="flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 text-black border-b border-dashed border-gray-100 lg:border-0">
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">CITY</span>
                              <span className="text-right lg:text-left">{v.city || "-"}</span>
                            </td>
                            <td className="flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 text-black border-b border-dashed border-gray-100 lg:border-0">
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">STATUS</span>
                              <StatusPill value={v.status_visit} />
                            </td>
                            <td className="flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 font-bold text-[#0B6AA9] border-b border-dashed border-gray-100 lg:border-0">
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">RING</span>
                              <span className="text-right lg:text-left">{v.status_ring || "-"}</span>
                            </td>
                            <td className="flex justify-between items-center lg:table-cell px-1 py-1.5 sm:px-3 lg:py-3 text-black border-b border-dashed border-gray-100 lg:border-0">
                              <span className="lg:hidden font-bold text-[10px] text-gray-400">VISIT DATE</span>
                              <span className="text-right lg:text-left">{formatDateID(v.visit_date)}</span>
                            </td>
                          </tr>
                          {active && (
                            <tr className="bg-blue-50/30 flex lg:table-row -mt-6 lg:mt-0 pt-4 sm:pt-0 relative z-0 lg:z-auto rounded-b-xl lg:rounded-none border lg:border-0 border-t-0 border-slate-200">
                              <td
                                colSpan={6}
                                className="border-b border-blue-100 border-l-0 sm:border-l-[4px] border-blue-600 px-3 py-4 w-full"
                              >
                                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-blue-100">
                                  <div className="mb-4 flex items-center gap-3 text-lg font-extrabold text-gray-900">
                                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600">
                                      📖
                                    </span>
                                    Detail Kunjungan
                                  </div>
                                  <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-4 md:grid-cols-4 lg:grid-cols-5">
                                    <DetailItem
                                      label="Created At"
                                      value={formatDateID(v.created_at)}
                                    />
                                    <DetailItem
                                      label="Market Status"
                                      value={v.status_market}
                                    />
                                    <DetailItem label="KLPD" value={v.klpd} />
                                    <DetailItem
                                      label="Reschedule"
                                      value={
                                        v.reschedule && v.reschedule !== "-"
                                          ? formatDateID(v.reschedule)
                                          : "-"
                                      }
                                    />
                                    <DetailItem
                                      label="Institusi Kerja"
                                      value={v.institusi_kerja}
                                    />
                                    <DetailItem
                                      label="PIC Name"
                                      value={v.pic_name}
                                    />
                                    <DetailItem
                                      label="PIC Phone"
                                      value={v.pic_phone}
                                    />
                                    <DetailItem
                                      label="PIC Position"
                                      value={v.pic_position}
                                    />
                                    <DetailItem
                                      label="PIC Role"
                                      value={v.pic_role}
                                    />
                                    <DetailItem
                                      label="Tindak Lanjut"
                                      value={v.tindak_lanjut}
                                    />
                                    <DetailItem
                                      label="Kegiatan Status"
                                      value={v.kegiatan_status}
                                    />
                                  </div>

                                  <div className="mt-6 border-t border-gray-100 pt-4">
                                    <div className="text-xs font-extrabold tracking-wider text-gray-500">
                                      DESKRIPSI
                                    </div>
                                    <div className="mt-2 whitespace-pre-line text-sm text-gray-700">
                                      {v.descriptions || "-"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map Modal (City / Satker) ────────────────────────── */}
      {mapModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setMapModal({ open: false, title: "", mapVisits: [], unmatched: [] })}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {mapModal.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {mapModal.mapVisits.length} lokasi ditemukan
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setMapModal({ open: false, title: "", mapVisits: [], unmatched: [] })
                }
                className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Map */}
            <div className="p-4">
              {mapLoading ? (
                <div className="flex h-[450px] flex-col items-center justify-center gap-3 text-gray-400">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                  <p className="text-sm font-medium">Memuat data peta...</p>
                </div>
              ) : mapModal.mapVisits.length === 0 ? (
                <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-gray-400">
                  <MapPin className="h-12 w-12 opacity-30" />
                  <p className="text-sm font-medium">
                    Tidak ada data koordinat untuk ditampilkan
                  </p>
                  <p className="text-xs text-gray-400">
                    Kota/satker belum tersedia dalam database koordinat
                  </p>
                </div>
              ) : (
                <SalesMap
                  visits={mapModal.mapVisits}
                  height="450px"
                  defaultZoom={6}
                  defaultCenter={[-2.5, 118.0]}
                />
              )}
            </div>

            {mapModal.unmatched.length > 0 && (
              <div className="border-t border-amber-100 bg-amber-50 px-6 py-3">
                <p className="text-xs font-medium text-amber-800">
                  ⚠️ {mapModal.unmatched.length} dari{" "}
                  {mapModal.mapVisits.length + mapModal.unmatched.length} lokasi belum ada koordinatnya:
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  {mapModal.unmatched.map((u) => `${u.name} (${u.count})`).join(", ")}
                </p>
              </div>
            )}

            {/* Legend */}
            {mapModal.mapVisits.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-3">
                <div className="flex flex-wrap gap-3">
                  {mapModal.mapVisits.map((v, i) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: [
                            "#ef4444",
                            "#f97316",
                            "#8b5cf6",
                            "#3b82f6",
                            "#22c55e",
                            "#ec4899",
                          ][i % 6],
                        }}
                      />
                      {v.city}
                      {v.customerCount
                        ? ` (${v.customerCount})`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value?: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value ?? "-"}</p>
    </div>
  );
}
