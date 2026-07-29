"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session/SessionProvider";
import EditVisitModal from "@/components/modals/EditVisitModal";
import { Pen, ChevronLeft, ChevronRight, X, Eye, Calendar, Clock, MapPin, Building2, Briefcase, ImageIcon, User, Copy, Check } from "lucide-react";
import Image from "next/image";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type VisitRow = {
  _id: string;
  visit_date?: string; // "3-Dec-2025"
  created_at?: string; // "2025-12-03 16:15:30" (string)
  city?: string;
  klpd?: string;
  nama_sales?: string;
  institusi_kerja?: string;
  satuan_kerja?: string;
  status_visit?: string; // "Visited"
  visit_image?: string;
  has_visit_image?: boolean;
  reschedule_date?: string;
  status_ring?: string;
  pic_name?: string;
  pic_phone?: string;
  pic_role?: string;
  pic_position?: string;
  kegiatan_status?: string;
  descriptions?: string;
  tindak_lanjut?: string;
};

type PlanRow = {
  id: string; // _id
  nama_sales: string;
  tanggal: string; // visit_date
  kota: string;
  klpd: string;
  institusi_kerja: string;
  satuan_kerja: string;
  status: string;
  visit_image: string;
  reschedule_date: string;
  status_ring: string;
  pic_name: string;
  pic_phone: string;
  pic_role: string;
  pic_position: string;
  kegiatan_status: string;
  descriptions: string;
  tindak_lanjut: string;
  _sortTs: number; // untuk sorting (baru -> besar)
  _date: Date | null; // parsed Date object for calendar placement
};

type CalendarView = "month" | "week" | "day" | "reschedule";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function monthIndex(mon: string) {
  const m = mon.toLowerCase();
  const map: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4,
    jun: 5, jul: 6, aug: 7, agu: 7, sep: 8,
    oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
  };
  return map[m] ?? -1;
}

// parse visit_date in multiple formats -> timestamp
function parseVisitDateToTs(v?: string) {
  if (!v) return 0;

  // Try "3-Dec-2025" or "3-Des-2025" format (d-Mon-YYYY)
  const parts = v.split("-");
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const mon = monthIndex(parts[1]);
    let year = Number(parts[2]);
    if (day && mon >= 0 && year) {
      if (year < 100) year += 2000;
      const d = new Date(year, mon, day, 12, 0, 0);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }

  // Try ISO "YYYY-MM-DD" format (manual parse to avoid timezone issues)
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const isoYear = Number(v.substring(0, 4));
    const isoMonth = Number(v.substring(5, 7)) - 1;
    const isoDay = Number(v.substring(8, 10));
    if (isoYear && isoMonth >= 0 && isoMonth <= 11 && isoDay >= 1 && isoDay <= 31) {
      const d = new Date(isoYear, isoMonth, isoDay, 12, 0, 0);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }

  // Try "DD/MM/YYYY" format
  const slashParts = v.split("/");
  if (slashParts.length === 3) {
    const sDay = Number(slashParts[0]);
    const sMonth = Number(slashParts[1]) - 1;
    const sYear = Number(slashParts[2]);
    if (sDay >= 1 && sDay <= 31 && sMonth >= 0 && sMonth <= 11 && sYear) {
      const d = new Date(sYear, sMonth, sDay, 12, 0, 0);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }

  // Generic Date.parse fallback
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

// parse visit_date in multiple formats -> Date object
function parseVisitDateToDate(v?: string): Date | null {
  if (!v) return null;

  // Try "3-Dec-2025" or "3-Des-2025" format (d-Mon-YYYY)
  const parts = v.split("-");
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const mon = monthIndex(parts[1]);
    let year = Number(parts[2]);
    if (day && mon >= 0 && year) {
      if (year < 100) year += 2000;
      const d = new Date(year, mon, day);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Try ISO "YYYY-MM-DD" format (manual parse to avoid timezone issues)
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const isoYear = Number(v.substring(0, 4));
    const isoMonth = Number(v.substring(5, 7)) - 1;
    const isoDay = Number(v.substring(8, 10));
    if (isoYear && isoMonth >= 0 && isoMonth <= 11 && isoDay >= 1 && isoDay <= 31) {
      const d = new Date(isoYear, isoMonth, isoDay);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Try "DD/MM/YYYY" format
  const slashParts = v.split("/");
  if (slashParts.length === 3) {
    const sDay = Number(slashParts[0]);
    const sMonth = Number(slashParts[1]) - 1;
    const sYear = Number(slashParts[2]);
    if (sDay >= 1 && sDay <= 31 && sMonth >= 0 && sMonth <= 11 && sYear) {
      const d = new Date(sYear, sMonth, sDay);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Generic Date.parse fallback
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// parse "2025-12-03 16:15:30" -> timestamp
function parseCreatedAtToTs(v?: string) {
  if (!v) return 0;
  const iso = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

// "YYYY-MM-DD" for consistent date keys
function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// Format: "Juni 2026"
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const DAY_NAMES_FULL = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function formatMonthYear(d: Date): string {
  return `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFullDate(d: Date): string {
  const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
  return `${DAY_NAMES_FULL[dayIdx]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

// Get calendar grid days for a month (includes padding from prev/next months)
function getMonthGridDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0

  const days: Date[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Next month padding (fill to 42 = 6 rows, or 35 = 5 rows)
  const totalCells = days.length <= 35 ? 35 : 42;
  while (days.length < totalCells) {
    days.push(new Date(year, month + 1, days.length - startDow - daysInMonth + 1));
  }

  return days;
}

// Get the week (Mon-Sun) that contains the given date
function getWeekDays(d: Date): Date[] {
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

// date range for fetching
function getViewDateRange(view: CalendarView, d: Date): { start: string; end: string } {
  if (view === "day") {
    const key = dateToKey(d);
    return { start: key, end: key };
  }
  if (view === "week") {
    const weekDays = getWeekDays(d);
    return { start: dateToKey(weekDays[0]), end: dateToKey(weekDays[6]) };
  }
  // month or reschedule: fetch the full month + padding
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  // Include padding days
  const startDow = (first.getDay() + 6) % 7;
  const paddedStart = new Date(first);
  paddedStart.setDate(first.getDate() - startDow);
  const daysInMonth = last.getDate();
  const totalCells = (startDow + daysInMonth) <= 35 ? 35 : 42;
  const paddedEnd = new Date(paddedStart);
  paddedEnd.setDate(paddedStart.getDate() + totalCells - 1);

  return { start: dateToKey(paddedStart), end: dateToKey(paddedEnd) };
}

// Status badge color
function getStatusColor(status: string): { bg: string; text: string; dot: string; border: string } {
  const s = status?.toLowerCase() || "";
  if (s.includes("visit") && !s.includes("not")) return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "#10b981" };
  if (s === "planned" || s === "") return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", border: "#3b82f6" };
  if (s.includes("reschedule")) return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", border: "#f59e0b" };
  if (s.includes("stay")) return { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", border: "#a855f7" };
  return { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", border: "#9ca3af" };
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function PlanActivityPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [search, setSearch] = useState("");

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Calendar state
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailPlan, setDetailPlan] = useState<PlanRow | null>(null);

  // popup ref
  const popupRef = useRef<HTMLDivElement>(null);

  // parameter options
  const [posisiOptions, setPosisiOptions] = useState<string[]>([]);
  const [statusKunjunganOptions, setStatusKunjunganOptions] = useState<string[]>([]);
  const [kegiatanOptions, setKegiatanOptions] = useState<string[]>([]);

  // edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");

  // copy feedback state
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);

  const formatTanggalForCopy = (t: string) => t?.replace(/-/g, ' ') || "-";




  function getImageUrl(img?: string, planId?: string, base = typeof window !== "undefined" ? window.location.origin : "https://hub.mabel.co.id") {
    if (!img || img === '__base64_image__') return planId ? `${base}/api/visits/${planId}/image` : "Tidak tersedia";
    return img.startsWith("http") ? img : `${base}${img.startsWith("/") ? "" : "/uploads/"}${img}`;
  }

  // Copy plan data to clipboard
  function copyPlanText(plan: PlanRow) {
    const lines = [
      `🗓️ Tanggal Kegiatan - ${formatTanggalForCopy(plan.tanggal)}`,
      `👥 Nama Sales: ${plan.nama_sales || "-"}`,
      ``,
      `------------------------------`,
      `City: ${plan.kota || "-"}`,
      `K/L/PD: ${plan.klpd || "-"}`,
      `Institusi Kerja: ${plan.institusi_kerja || "-"}`,
      `Satuan Kerja: ${plan.satuan_kerja || "-"}`,
      `Status Ring: ${plan.status_ring || "-"}`,
      `Nama PIC: ${plan.pic_name || "-"}`,
      `Nomor HP: ${plan.pic_phone || "-"}`,
      `Jabatan: ${plan.pic_role || "-"}`,
      `Posisi: ${plan.pic_position || "-"}`,
      `Kegiatan: ${plan.kegiatan_status || "-"}`,
      `Keterangan: ${plan.descriptions || "-"}`,
      `Tindak Lanjut: ${plan.tindak_lanjut || "-"}`,
      `Status: ${plan.status || "-"}`,
      `Gambar: ${getImageUrl(plan.visit_image, plan.id)}`,
    ];
    const text = lines.join("\n");
    const copyToClipboard = (str: string) => {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(str);
      }
      // Fallback for non-secure contexts (HTTP)
      const textarea = document.createElement("textarea");
      textarea.value = str;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return Promise.resolve();
    };
    copyToClipboard(text).then(() => {
      setCopiedPlanId(plan.id);
      setTimeout(() => setCopiedPlanId(null), 2000);
    }).catch(console.error);
  }

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
    fetchPlans();
  }

  function openImageBase64(base64: string) {
    const w = window.open("");
    if (w) {
      w.document.write(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #000;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${base64}" alt="Bukti Kunjungan" />
        </body>
        </html>`,
      );
      w.document.close();
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

  // 

  // Fetch plans based on calendar view date range
  const fetchPlans = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const range = getViewDateRange(calendarView, currentDate);
      const qs = new URLSearchParams({
        limit: "100000",
        page: "1",
        start: range.start,
        end: range.end,
      });

      if (search.trim()) qs.set("q", search.trim());

      const res = await fetch(`/api/visits?${qs.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlans([]);
        return;
      }

      const items: VisitRow[] = Array.isArray(json?.items) ? json.items : [];

      const mapped: PlanRow[] = items.map((v) => {
        const visitTs = parseVisitDateToTs(v.visit_date);
        const createdTs = parseCreatedAtToTs(v.created_at);
        const sortTs = visitTs || createdTs || 0;
        const parsedDate = parseVisitDateToDate(v.visit_date);

        return {
          id: String(v._id),
          tanggal: v.visit_date || "",
          kota: v.city || "",
          klpd: v.klpd || "",
          nama_sales: v.nama_sales || "",
          institusi_kerja: v.institusi_kerja || "",
          satuan_kerja: v.satuan_kerja || "",
          status: v.status_visit || "",
          visit_image: v.visit_image && v.visit_image !== '__base64_image__' ? v.visit_image : (v.visit_image === '__base64_image__' ? '__base64_image__' : ""),
          reschedule_date: v.reschedule_date || "",
          status_ring: v.status_ring || "",
          pic_name: v.pic_name || "",
          pic_phone: v.pic_phone || "",
          pic_role: v.pic_role || "",
          pic_position: v.pic_position || "",
          kegiatan_status: v.kegiatan_status || "",
          descriptions: v.descriptions || "",
          tindak_lanjut: v.tindak_lanjut || "",
          _sortTs: sortTs,
          _date: parsedDate,
        };
      });

      mapped.sort((a, b) => b._sortTs - a._sortTs);
      setPlans(mapped);
    } finally {
      setLoading(false);
    }
  }, [user, calendarView, currentDate, search]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return;
    fetchPlans();
  }, [sessionLoading, user, fetchPlans]);

  // Debounce search
  useEffect(() => {
    if (sessionLoading || !user) return;
    const t = setTimeout(() => fetchPlans(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Group plans by date key
  const plansByDate = useMemo(() => {
    const map: Record<string, PlanRow[]> = {};
    const filteredPlans = calendarView === "reschedule"
      ? plans.filter((p) => p.status?.toLowerCase().includes("reschedule"))
      : plans;

    for (const p of filteredPlans) {
      if (!p._date) continue;
      const key = dateToKey(p._date);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [plans, calendarView]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedDate(null);
        setDetailPlan(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigation
  function navigatePrev() {
    const d = new Date(currentDate);
    if (calendarView === "month" || calendarView === "reschedule") {
      d.setMonth(d.getMonth() - 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
    setSelectedDate(null);
    setDetailPlan(null);
  }

  function navigateNext() {
    const d = new Date(currentDate);
    if (calendarView === "month" || calendarView === "reschedule") {
      d.setMonth(d.getMonth() + 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
    setSelectedDate(null);
    setDetailPlan(null);
  }

  function navigateToday() {
    setCurrentDate(new Date());
    setSelectedDate(null);
    setDetailPlan(null);
  }

  function handleDateClick(date: Date) {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null);
      setDetailPlan(null);
    } else {
      setSelectedDate(date);
      setDetailPlan(null);
    }
  }

  function getHeaderLabel(): string {
    if (calendarView === "day") return formatFullDate(currentDate);
    if (calendarView === "week") {
      const week = getWeekDays(currentDate);
      const start = week[0];
      const end = week[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES_ID[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTH_NAMES_ID[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES_ID[end.getMonth()]} ${end.getFullYear()}`;
    }
    return formatMonthYear(currentDate);
  }

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────

  function renderPlanChip(plan: PlanRow) {
    const colors = getStatusColor(plan.status);
    return (
      <div
        key={plan.id}
        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium truncate cursor-pointer hover:opacity-80 transition-opacity`}
        title={`${plan.institusi_kerja || plan.kota || "Plan"} — ${plan.status || "No Status"}`}
      >
        {plan.satuan_kerja || plan.kota || "Plan"}
      </div>
    );
  }

  // ─── POPUP ──────────────────────────────────────────────────────────────────

  function renderPopup() {
    if (!selectedDate) return null;

    const key = dateToKey(selectedDate);
    const dayPlans = plansByDate[key] || [];

    // Detail view
    if (detailPlan) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setDetailPlan(null); }}>
          <div
            ref={popupRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            style={{ animation: "fadeInScale 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Detail Aktivitas</h3>
                <button
                  onClick={() => setDetailPlan(null)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-0.5">{detailPlan.tanggal}</p>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sales</p>
                  <p className="text-sm font-medium text-gray-800">{detailPlan.nama_sales || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kota</p>
                  <p className="text-sm font-medium text-gray-800">{detailPlan.kota || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">K/L/PD</p>
                  <p className="text-sm font-medium text-gray-800">{detailPlan.klpd || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Institusi Kerja</p>
                  <p className="text-sm font-medium text-gray-800">{detailPlan.institusi_kerja || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Satuan Kerja</p>
                  <p className="text-sm font-medium text-gray-800">{detailPlan.satuan_kerja || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const c = getStatusColor(detailPlan.status);
                      return (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
                          {detailPlan.status || "No Status"}
                        </span>
                      );
                    })()}
                    {detailPlan.status?.toLowerCase() === "reschedule" && detailPlan.reschedule_date && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        📅 {detailPlan.reschedule_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {detailPlan.visit_image && (
                <div className="flex items-start gap-3">
                  <ImageIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bukti Kunjungan</p>
                    <Image
                      src={getImageUrl(detailPlan.visit_image, detailPlan.id)}
                      alt="Bukti kunjungan"
                      className="mt-1 w-20 h-20 rounded-xl cursor-pointer ring-1 ring-gray-200 hover:ring-blue-400 hover:shadow-lg transition-all object-cover"
                      onClick={() => openImageBase64(getImageUrl(detailPlan.visit_image, detailPlan.id))}
                      title="Lihat foto bukti"
                      width={500}
                      height={500}
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => { handleOpenEdit(detailPlan.id); setDetailPlan(null); setSelectedDate(null); }}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Pen className="w-3.5 h-3.5" />
                Edit Kunjungan
              </button>
              <button
                onClick={() => copyPlanText(detailPlan)}
                className={`px-4 h-9 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${copiedPlanId === detailPlan.id
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                title="Copy Plan"
              >
                {copiedPlanId === detailPlan.id ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
              <button
                onClick={() => setDetailPlan(null)}
                className="px-4 h-9 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Date popup — plan list
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
        <div
          ref={popupRef}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          style={{ animation: "fadeInScale 0.2s ease-out" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{formatFullDate(selectedDate)}</h3>
                <p className="text-blue-100 text-sm">
                  {dayPlans.length} Aktivitas
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plan list */}
          <div className="max-h-80 overflow-y-auto">
            {dayPlans.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Tidak ada aktivitas</p>
              </div>
            ) : (
              dayPlans.map((plan) => {
                const colors = getStatusColor(plan.status);
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {plan.institusi_kerja || plan.kota || "-"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {plan.kota} {plan.klpd ? `• ${plan.klpd}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                          {plan.status || "No Status"}
                        </span>
                        {plan.status?.toLowerCase() === "reschedule" && plan.reschedule_date && (
                          <span className="text-[9px] text-amber-600 font-semibold">📅 {plan.reschedule_date}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyPlanText(plan)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${copiedPlanId === plan.id
                            ? "bg-emerald-50 text-emerald-600"
                            : "text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        title="Copy Plan"
                      >
                        {copiedPlanId === plan.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setDetailPlan(plan)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { handleOpenEdit(plan.id); setSelectedDate(null); }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit Kunjungan"
                      >
                        <Pen className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── MONTH VIEW ────────────────────────────────────────────────────────────

  function renderMonthView() {
    const gridDays = getMonthGridDays(currentDate.getFullYear(), currentDate.getMonth());

    return (
      <div className="bg-white rounded-xl shadow-md ring-1 ring-black/5 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DAY_NAMES.map((name) => (
            <div key={name} className="px-2 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {gridDays.map((day, i) => {
            const key = dateToKey(day);
            const dayPlans = plansByDate[key] || [];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isTodayDate = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const maxVisible = 3;
            const moreCount = dayPlans.length > maxVisible ? dayPlans.length - maxVisible : 0;

            return (
              <div
                key={i}
                onClick={() => handleDateClick(day)}
                className={`
                  min-h-[100px] md:min-h-[120px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-all duration-150
                  ${!isCurrentMonth ? "bg-gray-50/50" : "bg-white hover:bg-blue-50/30"}
                  ${isSelected ? "ring-2 ring-blue-500 ring-inset bg-blue-50/40" : ""}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                      ${isTodayDate ? "bg-blue-600 text-white" : ""}
                      ${!isTodayDate && isCurrentMonth ? "text-gray-800" : ""}
                      ${!isTodayDate && !isCurrentMonth ? "text-gray-300" : ""}
                    `}
                  >
                    {day.getDate()}
                  </span>
                  {dayPlans.length > 0 && (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {dayPlans.length}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayPlans.slice(0, maxVisible).map((plan) => renderPlanChip(plan))}
                  {moreCount > 0 && (
                    <div className="text-[9px] text-blue-600 font-semibold pl-1">
                      +{moreCount} lainnya
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── WEEK VIEW ─────────────────────────────────────────────────────────────

  function renderWeekView() {
    const weekDays = getWeekDays(currentDate);

    return (
      <div className="bg-white rounded-xl shadow-md ring-1 ring-black/5 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {weekDays.map((day, i) => {
            const isTodayDate = isToday(day);
            return (
              <div key={i} className="px-2 py-3 text-center border-r border-gray-100 last:border-r-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {DAY_NAMES[i]}
                </div>
                <div
                  className={`
                    inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mt-1
                    ${isTodayDate ? "bg-blue-600 text-white" : "text-gray-700"}
                  `}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day, i) => {
            const key = dateToKey(day);
            const dayPlans = plansByDate[key] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={i}
                onClick={() => handleDateClick(day)}
                className={`
                  border-r border-gray-100 last:border-r-0 p-2 cursor-pointer transition-all
                  ${isSelected ? "bg-blue-50/60 ring-2 ring-blue-500 ring-inset" : "hover:bg-gray-50/50"}
                `}
              >
                <div className="space-y-1.5">
                  {dayPlans.map((plan) => {
                    const colors = getStatusColor(plan.status);
                    return (
                      <div
                        key={plan.id}
                        className={`text-[11px] px-2 py-1.5 rounded-lg ${colors.bg} ${colors.text} font-medium transition-opacity hover:opacity-80`}
                        style={{ borderLeft: `3px solid ${colors.border}` }}
                      >
                        <div className="font-semibold truncate">{plan.satuan_kerja || plan.kota || "-"}</div>
                        <div className="text-[9px] opacity-70 truncate mt-0.5">{plan.kota}</div>
                      </div>
                    );
                  })}
                  {dayPlans.length === 0 && (
                    <div className="text-[10px] text-gray-300 text-center py-4">–</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DAY VIEW ──────────────────────────────────────────────────────────────

  function renderDayView() {
    const key = dateToKey(currentDate);
    const dayPlans = plansByDate[key] || [];

    return (
      <div className="bg-white rounded-xl shadow-md ring-1 ring-black/5 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{formatFullDate(currentDate)}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {dayPlans.length} aktivitas hari ini
              </p>
            </div>
            {isToday(currentDate) && (
              <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">Hari Ini</span>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <div className="p-4">
          {dayPlans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada aktivitas</p>
              <p className="text-sm mt-1">Belum ada plan untuk tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayPlans.map((plan) => {
                const colors = getStatusColor(plan.status);
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{plan.satuan_kerja || "-"}</p>
                      <p className="text-sm text-gray-500 truncate">{plan.kota} {plan.klpd ? `• ${plan.klpd}` : ""}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                          {plan.status || "No Status"}
                        </span>
                        {plan.satuan_kerja && (
                          <span className="text-[10px] text-gray-400">{plan.institusi_kerja}</span>
                        )}
                      </div>
                    </div>

                    {plan.visit_image && (
                      <Image
                        src={getImageUrl(plan.visit_image, plan.id)}
                        alt="Bukti kunjungan"
                        className="w-12 h-12 rounded-lg flex-shrink-0 ring-1 ring-gray-200 cursor-pointer hover:ring-blue-400 transition-all object-cover"
                        onClick={() => openImageBase64(getImageUrl(plan.visit_image, plan.id))}
                        title="Lihat foto bukti"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyPlanText(plan)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${copiedPlanId === plan.id
                            ? "bg-emerald-50 text-emerald-600 opacity-100"
                            : "text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        title="Copy Plan"
                      >
                        {copiedPlanId === plan.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => { setSelectedDate(currentDate); setDetailPlan(plan); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(plan.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit Kunjungan"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────

  const viewTabs: { key: CalendarView; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "reschedule", label: "Reschedule" },
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Inline keyframes for popup animation */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="flex">
        <div className="flex-1 p-6">
          <main className="w-full max-w-none">
            {/* HEADER */}
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

            {/* TOOLBAR */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl shadow-sm ring-1 ring-black/5">
              {/* Left: Navigation */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => router.push("/plan-activity/add")}
                  className="flex items-center gap-2 h-9 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  ADD PLANS
                </button>

                <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

                <button
                  onClick={navigateToday}
                  className="h-9 px-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Hari Ini
                </button>

                <button
                  onClick={navigatePrev}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={navigateNext}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <h3 className="text-base font-bold text-gray-800 ml-2 whitespace-nowrap">
                  {getHeaderLabel()}
                </h3>
              </div>

              {/* Right: View tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setCalendarView(tab.key);
                      setSelectedDate(null);
                      setDetailPlan(null);
                    }}
                    className={`
                      h-8 px-3 rounded-md text-xs font-bold uppercase tracking-wide transition-all
                      ${calendarView === tab.key
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading bar */}
            {loading && (
              <div className="mb-4 flex items-center justify-center gap-2 py-2">
                <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 font-medium">Memuat data...</span>
              </div>
            )}

            {/* CALENDAR VIEW */}
            {calendarView === "month" && renderMonthView()}
            {calendarView === "week" && renderWeekView()}
            {calendarView === "day" && renderDayView()}
            {calendarView === "reschedule" && renderMonthView()}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 px-2 text-[11px] font-medium text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Visited
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Planned
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Reschedule
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Stay Office
              </div>
              {calendarView === "reschedule" && (
                <div className="ml-auto text-amber-600 font-semibold">
                  ⚡ Menampilkan hanya plan berstatus Reschedule
                </div>
              )}
            </div>
          </main>
        </div>

        {/* POPUPS */}
        {renderPopup()}

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
