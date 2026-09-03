'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/ui/SearchableSelect'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  LucideCopyCheck,
  MapPin,
  Trophy,
  X,
  Activity,
  User2,
  UserRound,
  BarChart3,
  BarChart2,
} from 'lucide-react'
import Image from 'next/image'
import { normalizeRing } from '@/lib/ring'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts'

const THEMES = {
  blue: {
    iconBg: 'bg-blue-100',
    icon: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    value: 'text-blue-600',
  },
  green: {
    iconBg: 'bg-green-100',
    icon: 'text-green-600',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
    value: 'text-green-600',
  },
  red: {
    iconBg: 'bg-red-100',
    icon: 'text-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-600',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    value: 'text-red-600',
  },
  orange: {
    iconBg: 'bg-orange-100',
    icon: 'text-orange-600',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
    value: 'text-orange-600',
  },
} as const

type ThemeColor = keyof typeof THEMES

interface StatItem {
  label: string
  value: number
  color?: ThemeColor // overrides the card's default color for this row only
}

interface TableCardProps {
  icon: LucideIcon
  title: string
  items: StatItem[]
  color?: ThemeColor // default color for header + all rows
}

interface StatCardProps {
  title: string
  icon?: React.ReactNode
  value: string
}

type VisitRow = {
  _id: string
  rank: number | null
  nama_sales: string
  visit_date: string // ISO string
  status_visit: string
  satuan_kerja: string
  city: string
  pic_name: string
  pic_phone: string
  status_ring: 'RING 4' | string
  created_at: string
  status_market: string
  klpd: string
  reschedule: string // ISO or "-"
  institusi_kerja: string
  pic_position: string
  pic_role: string
  tindak_lanjut: string
  kegiatan_status: string
  descriptions: string
  total_visit: number | null
}

type VisitDetail = {
  _id: string
  visit_date: string
  status_visit: string
  nama_sales: string
  city: string
  status_ring: string
  satuan_kerja: string
  pic_name: string
  pic_phone: string
  pic_position: string
  pic_role: string
  created_at: string
  status_market: string
  klpd: string
  institusi_kerja: string
  tindak_lanjut: string
  kegiatan_status: string
  descriptions: string
  visit_image: string | null
  reschedule: string
}

type MonthlyEntry = { total: number; penambahan: number }

type SalesMonthly = {
  name: string
  color: string
  months: Record<string, MonthlyEntry>
  grandTotal: number
}

type MonthlyProgressData = {
  months: string[]
  salesData: SalesMonthly[]
  grandTotal: {
    months: Record<string, MonthlyEntry>
    grandTotal: number
  }
}

function getPageWindow(current: number, totalPages: number, size: number) {
  if (totalPages <= size)
    return Array.from({ length: totalPages }, (_, i) => i + 1)

  const half = Math.floor(size / 2)
  let start = Math.max(1, current - half)
  let end = start + size - 1

  if (end > totalPages) {
    end = totalPages
    start = end - size + 1
  }
  return Array.from({ length: size }, (_, i) => i + 1)
}

export default function TrackingB2BPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()

  // Guard role
  useEffect(() => {
    if (!sessionLoading && user) {
      const ok =
        user.role === 'SUPERADMIN' ||
        user.role === 'ADMIN' ||
        user.role === 'LEADER' ||
        user.role === 'SALES'
      if (!ok) router.replace('/')
    }
  }, [sessionLoading, user, router])

  //   filter state
  const [fSales, setFSales] = useState<string>('ALL')
  const [fStart, setFStart] = useState<string>('')
  const [fEnd, setFEnd] = useState<string>('')
  const [fPhone, setFPhone] = useState<string>('')
  const [fRing, setFRing] = useState<string>('ALL')
  const [fCity, setFCity] = useState<string>('ALL')
  const [fSatker, setFSatker] = useState<string>('ALL')
  const [fKlpd, setFKlpd] = useState<string>('ALL')
  const [fVisit, setFVisit] = useState<string>('ALL')

  //   dropdown meta
  const [salesOptions, setSalesOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [satkerOptions, setSatkerOptions] = useState<string[]>([])
  const [phoneOptions, setPhoneOptions] = useState<string[]>([])
  const [klpdOptions, setKlpdOptions] = useState<string[]>([])
  const [visitOptions, setVisitOptions] = useState<string[]>([])

  // pagination
  const [pageSize, setPageSize] = useState<number>(25)
  const [page, setPage] = useState<number>(1)

  // fetch stat
  const [statsLoading, setStatsLoading] = useState(true)
  const [totalSatuanKerja, setTotalSatuanKerja] = useState<number>(0)
  const [byKlpd, setByKlpd] = useState<{ label: string; value: number }[]>([])
  const [bySales, setBySales] = useState<{ label: string; value: number }[]>([])
  const [byRing, setByRing] = useState<{ label: string; value: number }[]>([])
  const [totalVisitAll, setTotalVisitAll] = useState<number>(0)
  const [topSatker, setTopSatker] = useState<string>('-')
  const [topSatkerCount, setTopSatkerCount] = useState<number>(0)
  const [salesAktif, setSalesAktif] = useState<number>(0)
  const [sortBy, setSortBy] = useState<string>('total_visit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // monthly progress
  const [monthlyData, setMonthlyData] = useState<MonthlyProgressData | null>(
    null,
  )
  const [loadingMonthly, setLoadingMonthly] = useState(true)
  const [progressTab, setProgressTab] = useState<'tabel' | 'grafik'>('tabel')
  const [chartMode, setChartMode] = useState<'penambahan' | 'kumulatif'>(
    'penambahan',
  )

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (sessionLoading) return
      if (!user) return // middleware seharusnya redirect
      try {
        setStatsLoading(true)
        const res = await fetch('/api/visits/stats?filterStatsB2B=true', {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        setTotalSatuanKerja(Number(json?.totalSatuanKerja) || 0)
        setTotalVisitAll(Number(json?.totalVisit) || 0)
        setTopSatker(String(json?.topSatker) || '-')
        setTopSatkerCount(Number(json?.topSatkerCount) || 0)
        setSalesAktif(Number(json?.salesAktif) || 0)
        setByKlpd(Array.isArray(json?.byKlpd) ? json.byKlpd : [])
        setBySales(Array.isArray(json?.bySales) ? json.bySales : [])
        setByRing(Array.isArray(json?.byRing) ? json.byRing : [])
      } catch {
        if (!mounted) return
        setTotalSatuanKerja(0)
        setTotalVisitAll(0)
        setTopSatker('-')
        setTopSatkerCount(0)
      } finally {
        if (mounted) setStatsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionLoading, user, totalVisitAll])

  // fetch monthly progress
  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (sessionLoading) return
      if (!user) return
      try {
        setLoadingMonthly(true)
        const res = await fetch(
          '/api/visits/monthly-progress?filterStatsB2B=true',
          {
            cache: 'no-store',
          },
        )
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        if (json?.months && json?.salesData) {
          setMonthlyData(json as MonthlyProgressData)
        }
      } catch {
        if (!mounted) return
        setMonthlyData(null)
      } finally {
        if (mounted) setLoadingMonthly(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionLoading, user])

  // selected row for detail

  const [selected, setSelected] = useState<VisitRow | null>(null)

  // expand row : visit dates by satker
  const [expandedSatker, setExpandedSatker] = useState<string | null>(null)
  const [visitDates, setVisitDates] = useState<VisitDetail[]>([])
  const [loadingVisitDates, setLoadingVisitDates] = useState(false)

  // detail modal
  const [modalVisit, setModalVisit] = useState<VisitDetail | null>(null)

  // image viewer
  const [viewImage, setViewImage] = useState<string | null>(null)

  // server data
  const [rows, setRows] = useState<VisitRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (sessionLoading) return
      if (!user) return
      try {
        const res = await fetch('/api/visits/meta?filterStatsB2B=true', {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        setSalesOptions(Array.isArray(json?.sales) ? json.sales : [])
        setCityOptions(Array.isArray(json?.cities) ? json.cities : [])
        setSatkerOptions(Array.isArray(json?.satkers) ? json.satkers : [])
        setKlpdOptions(Array.isArray(json?.klpd) ? json.klpd : [])
        setVisitOptions(
          Array.isArray(json?.status_visit) ? json.status_visit : [],
        )
      } catch {
        if (!mounted) return
        setSalesOptions([])
        setKlpdOptions([])
        setVisitOptions([])
        setCityOptions([])
        setSatkerOptions([])
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionLoading, user])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (sessionLoading) return
      if (!user) return
      try {
        setLoadingRows(true)

        const params = new URLSearchParams()
        if (fSales !== 'ALL') params.set('sales', fSales)
        if (fStart) params.set('start', fStart)
        if (fEnd) params.set('end', fEnd)
        if (fRing !== 'ALL') params.set('ring', normalizeRing(fRing))
        if (fCity !== 'ALL') params.set('city', fCity)
        if (fSatker !== 'ALL') params.set('satker', fSatker)
        if (fKlpd !== 'ALL') params.set('klpd', fKlpd)
        if (fVisit !== 'ALL') params.set('status_vist', fVisit)
        params.set('sortBy', sortBy)
        params.set('sortDir', sortDir)
        params.set('groupBySatker', 'true')
        params.set('filterStatsB2B', 'true')
        params.set('page', String(page))
        params.set('limit', String(pageSize))

        const res = await fetch(`/api/visits?${params.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        setRows(Array.isArray(json?.items) ? json.items : [])

        const pg = json?.pagination ?? {}
        setTotal(Number(pg?.total ?? 0))
        setTotalPages(Number(pg?.totalPages ?? 1))
        setSelected(null)
      } catch {
        if (!mounted) return
        setRows([])
        setTotal(0)
        setTotalPages(1)
        setSelected(null)
      } finally {
        if (mounted) setLoadingRows(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [
    fSales,
    fStart,
    fEnd,
    fRing,
    fCity,
    fSatker,
    fKlpd,
    fVisit,
    sortBy,
    sortDir,
    page,
    pageSize,
    sessionLoading,
    user,
  ])

  const [paramStatus, setParamStatus] = useState<string[]>([])
  const [paramRing, setParamRing] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/parameters')
      .then((res) => res.json())
      .then((json) => {
        const d = json?.data
        if (d) {
          setParamStatus(d.status_kunjungan || [])
          setParamRing(d.ring || [])
        }
      })
      .catch(() => {})
  }, [])

  const onChangeFilter = (fn: (v: string) => void, v: string) => {
    fn(v)
    setSelected(null)
    setExpandedSatker(null)
    setPage(1)
  }

  const handleSort = (field: string, dir: 'asc' | 'desc') => {
    setSortBy(field)
    setSortDir(dir)
    setPage(1)
    setSelected(null)
    setExpandedSatker(null)
  }

  // Fetch visit dates when expanding a satker
  const toggleExpandSatker = useCallback(
    async (satkerName: string) => {
      if (expandedSatker === satkerName) {
        setExpandedSatker(null)
        setVisitDates([])
        return
      }
      setExpandedSatker(satkerName)
      setLoadingVisitDates(true)
      try {
        const res = await fetch(
          `/api/visits/by-satker?satker=${encodeURIComponent(satkerName)}`,
          { cache: 'no-store' },
        )
        const json = await res.json().catch(() => ({}))
        setVisitDates(Array.isArray(json?.items) ? json.items : [])
      } catch {
        setVisitDates([])
      } finally {
        setLoadingVisitDates(false)
      }
    },
    [expandedSatker],
  )

  function getStatusColor(status: string) {
    const s = (status || '').toLowerCase()
    if (s.includes('visited') && !s.includes('not'))
      return { bg: 'bg-green-100', text: 'text-green-700' }
    if (s.includes('not') || s.includes('belum'))
      return { bg: 'bg-red-100', text: 'text-red-700' }
    if (s.includes('stay') || s.includes('office'))
      return { bg: 'bg-amber-100', text: 'text-amber-700' }
    if (s.includes('reschedule'))
      return { bg: 'bg-purple-100', text: 'text-purple-700' }
    return { bg: 'bg-gray-100', text: 'text-gray-700' }
  }

  function openImageFullscreen(src: string) {
    setViewImage(src)
  }

  function cn(...s: Array<string | false | null | undefined>) {
    return s.filter(Boolean).join(' ')
  }

  const safePage = useMemo(
    () => Math.min(Math.max(1, page), Math.max(1, totalPages)),
    [page, totalPages],
  )

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const showingTo = Math.min(total, safePage * pageSize)

  const gotoPage = (p: number) =>
    setPage(Math.min(Math.max(1, p), Math.max(1, totalPages)))

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        {/* {Content} */}
        <div className='flex-1 p-3 sm:p-6'>
          {/* {Top Bar} */}
          <div className='mb-4 px-4 pt-2 pb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h2 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Tracking Visit B2B
              </h2>
            </div>
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
            <StatCard
              title='TOTAL SATUAN KERJA'
              value={statsLoading ? '...' : String(totalSatuanKerja)}
              icon={<Building2 className='h-6 w-6 text-gray-500' />}
            />
            <StatCard
              title='TOTAL VISIT (VISITED+LEAD+NEGO)'
              value={statsLoading ? '...' : String(totalVisitAll)}
              icon={<LucideCopyCheck className='h-6 w-6 text-gray-500' />}
            />
            <StatCard
              title='SATKER PALING BANYAK DI KUNJUNGI'
              value={statsLoading ? '...' : `${topSatker} (${topSatkerCount}x)`}
              icon={<Trophy className='h-6 w-6 text-yellow-500' />}
            />
            <StatCard
              title='TOTAL SALES AKTIF'
              value={statsLoading ? '...' : String(salesAktif)}
              icon={<UserRound className='h-6 w-6 text-yellow-500' />}
            />
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <TableCard
              icon={BarChart3}
              title='SATKER UNIK PER KLPD'
              color='blue'
              items={byKlpd}
            />
            <TableCard
              icon={User2}
              title='SATKER UNIK PER SALES PERSON'
              color='green'
              items={bySales}
            />
            <TableCard
              icon={MapPin}
              title='SATKER UNIK PER RING'
              color='red'
              items={byRing}
            />
          </div>
          <section className='bg-white mt-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
            {/* Header */}
            <div className='bg-white text-gray px-3 sm:px-6 h-10 flex items-center justify-between gap-2'>
              <div className='flex items-center min-w-0'>
                <BarChart2
                  size={12}
                  className='mr-1.5 sm:mr-2 shrink-0 text-gray-500'
                  strokeWidth={2.5}
                />
                <strong className='text-[9px] sm:text-[10px] text-gray-500 font-bold tracking-wide whitespace-nowrap'>
                  PROGRES B2B — PENCAPAIAN SATUAN KERJA PER BULAN
                </strong>
              </div>
            </div>

            <div
              className='p-3 sm:p-4 flex flex-col gap-3'
              style={{ display: isFilterOpen ? 'flex' : 'none' }}
            >
              {/* Tabs */}
              <div className='px-3 sm:px-6 pt-2 pb-1 flex gap-1'>
                <button
                  onClick={() => setProgressTab('tabel')}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md border transition-colors cursor-pointer ${
                    progressTab === 'tabel'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📋 Tabel
                </button>
                <button
                  onClick={() => setProgressTab('grafik')}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md border transition-colors cursor-pointer ${
                    progressTab === 'grafik'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📊 Grafik
                </button>
              </div>

              {/* Content */}
              <div className='p-3 sm:p-4'>
                {loadingMonthly ? (
                  <div className='text-center py-10 text-gray-400 text-sm'>
                    Memuat data...
                  </div>
                ) : !monthlyData || monthlyData.salesData.length === 0 ? (
                  <div className='text-center py-10 text-gray-400 text-sm'>
                    Belum ada data
                  </div>
                ) : progressTab === 'tabel' ? (
                  <MonthlyTable data={monthlyData} />
                ) : (
                  <MonthlyChart
                    data={monthlyData}
                    chartMode={chartMode}
                    setChartMode={setChartMode}
                  />
                )}
              </div>
            </div>
          </section>
          <section className='rounded-2xl bg-white mt-5 p-7 shadow-sm'>
            {/* {Mobile filter toggle button} */}
            <div
              className='md:hidden flex items-center justify-between cursor-pointer mb-2 bg-blue-50 p-4 rounded-xl border border-blue-100'
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <div className='flex items-center gap-2 font-extrabold text-[#0B6AA9]'>
                <span>{isFilterOpen ? '🔽' : '▶️'}</span>
                <span>FILTER PENCARIAN</span>
              </div>
              <span className='text-sm font-bold text-[#0B6AA9] bg-white px-3 py-1 rounded-full shadow-sm'>
                {isFilterOpen ? 'Tutup' : 'Buka'}
              </span>
            </div>

            <div
              className={cn(
                'grid grid-cols-1 gap-6 md:grid-cols-9 mt-4 md:mt-0',
                !isFilterOpen ? 'hidden md:grid' : 'grid',
              )}
            >
              <FilterDate
                label='TANGGAL MULAI'
                value={fStart}
                onChange={(v) => onChangeFilter(setFStart, v)}
                onClick={(e) => {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker()
                  }
                }}
              />
              <FilterDate
                label='TANGGAL AKHIR'
                value={fEnd}
                onChange={(v) => onChangeFilter(setFEnd, v)}
                onClick={(e) => {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker()
                  }
                }}
              />
              <FilterSelect
                label='SALES PERSON'
                value={fSales}
                onChange={(v) => onChangeFilter(setFSales, v)}
                options={[{ label: 'Semua Sales', value: 'ALL' }].concat(
                  salesOptions.map((s) => ({ label: s, value: s })),
                )}
              />

              <FilterSelect
                label='RING'
                value={fRing}
                onChange={(v) => onChangeFilter(setFRing, v)}
                options={[{ label: 'Semua Ring', value: 'ALL' }].concat(
                  paramRing.map((r) => ({ label: r, value: r })),
                )}
              />

              <FilterSelect
                label='CITY'
                value={fCity}
                onChange={(v) => onChangeFilter(setFCity, v)}
                options={[{ label: 'Semua City', value: 'ALL' }].concat(
                  cityOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <FilterSelect
                label='KLPD'
                value={fKlpd}
                onChange={(v) => onChangeFilter(setFKlpd, v)}
                options={[{ label: 'Semua KLPD', value: 'ALL' }].concat(
                  klpdOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <FilterSelect
                label='PIC PHONE'
                value={fPhone}
                onChange={(v) => onChangeFilter(setFPhone, v)}
                options={[{ label: 'Semua Kontak', value: 'ALL' }].concat(
                  phoneOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <FilterSelect
                label='STATUS VISIT'
                value={fVisit}
                onChange={(v) => onChangeFilter(setFVisit, v)}
                options={[{ label: 'Semua Status', value: 'VISITED' }].concat(
                  visitOptions.map((c) => ({ label: c, value: c })),
                )}
              />

              <div>
                <FilterSelect
                  label='SATUAN KERJA'
                  value={fSatker}
                  onChange={(v) => onChangeFilter(setFSatker, v)}
                  options={[{ label: 'Semua Satker', value: 'ALL' }].concat(
                    satkerOptions.map((s) => ({ label: s, value: s })),
                  )}
                  full
                />
              </div>
            </div>
          </section>
          <section className='mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100'>
            {/* Desktop View */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-blue-200'>
                  <tr className='text-left'>
                    <SortableHeader
                      label='RANK'
                      field='rank'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='SALES PERSON'
                      field='nama_sales'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='CITY'
                      field='city'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='RING'
                      field='status_ring'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='SATUAN KERJA'
                      field='satuan_kerja'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='PIC NAME'
                      field='pic_name'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='PIC PHONE'
                      field='pic_phone'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label='TOTAL VISIT'
                      field='total_visit'
                      currentSortBy={sortBy}
                      currentSortDir={sortDir}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-6 py-12 text-center text-gray-500'
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className='px-6 py-12 text-center text-gray-500'
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const isExpanded = expandedSatker === r.satuan_kerja
                      return (
                        <React.Fragment key={r._id}>
                          <tr
                            className={cn(
                              'border-t border-blue-50 transition-colors',
                              isExpanded
                                ? 'bg-blue-50/60'
                                : 'hover:bg-blue-50/30',
                            )}
                          >
                            <td className='px-3 p-2 text-center'>
                              <span className='inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white'>
                                {r.rank ?? '-'}
                              </span>
                            </td>
                            <td
                              className={cn(
                                'px-6 py-6 font-extrabold text-[#0B6AA9]',
                                isExpanded
                                  ? 'border-l-4 border-l-blue-600'
                                  : 'border-l-4 border-l-transparent',
                              )}
                            >
                              {r.nama_sales}
                            </td>
                            <td className='px-6 py-6 text-gray-900'>
                              {r.city}
                            </td>
                            <td className='px-6 py-6 font-extrabold text-[#0B6AA9]'>
                              {normalizeRing(r.status_ring) || '-'}
                            </td>
                            <td className='px-6 py-6 text-gray-900'>
                              {r.satuan_kerja}
                            </td>
                            <td className='px-6 py-6 text-gray-900'>
                              {r.pic_name}
                            </td>
                            <td className='px-6 py-6 text-gray-900'>
                              {r.pic_phone}
                            </td>
                            <td className='px-6 py-6'>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleExpandSatker(r.satuan_kerja)
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all',
                                  isExpanded
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm',
                                )}
                              >
                                {r.total_visit ?? '-'}
                                {isExpanded ? (
                                  <ChevronUp className='w-3.5 h-3.5' />
                                ) : (
                                  <ChevronDown className='w-3.5 h-3.5' />
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className='bg-linear-to-b from-blue-50/60 to-blue-50/20'>
                              <td
                                colSpan={8}
                                className='px-6 py-5 border-l-4 border-l-blue-600 border-b border-b-blue-100'
                              >
                                <div className='rounded-xl bg-white p-5 shadow-sm ring-1 ring-blue-100'>
                                  <div className='mb-4 flex items-center gap-3 text-base font-extrabold text-gray-900'>
                                    <span className='grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600'>
                                      <Calendar className='w-4 h-4' />
                                    </span>
                                    Riwayat Kunjungan — {r.satuan_kerja}
                                    <span className='ml-auto text-xs font-semibold text-gray-400'>
                                      {visitDates.length} kunjungan
                                    </span>
                                  </div>

                                  {loadingVisitDates ? (
                                    <div className='py-8 text-center text-gray-400 text-sm'>
                                      Memuat data kunjungan...
                                    </div>
                                  ) : visitDates.length === 0 ? (
                                    <div className='py-8 text-center text-gray-400 text-sm'>
                                      Tidak ada data kunjungan.
                                    </div>
                                  ) : (
                                    <div className='grid grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1'>
                                      {visitDates.map((v) => {
                                        const sc = getStatusColor(
                                          v.status_visit,
                                        )
                                        return (
                                          <button
                                            key={v._id}
                                            type='button'
                                            onClick={() => setModalVisit(v)}
                                            className='flex items-center gap-4 w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group'
                                          >
                                            <div className='shrink-0 grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors'>
                                              <Calendar className='w-4 h-4' />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                              <div className='text-sm font-bold text-gray-900'>
                                                {v.visit_date}
                                              </div>
                                              <div className='text-xs text-gray-500 truncate'>
                                                {v.nama_sales} • {v.city}
                                              </div>
                                            </div>
                                            <span
                                              className={cn(
                                                'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                sc.bg,
                                                sc.text,
                                              )}
                                            >
                                              {v.status_visit || 'No Status'}
                                            </span>
                                            {v.visit_image && (
                                              <ImageIcon className='w-4 h-4 text-green-500 shrink-0' />
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========== VISIT DETAIL MODAL ========== */}
          {modalVisit && (
            <div
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'
              onClick={() => setModalVisit(null)}
            >
              <div
                className='relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm rounded-t-2xl'>
                  <div className='flex items-center gap-3'>
                    <span className='grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-600'>
                      <FileText className='w-5 h-5' />
                    </span>
                    <div>
                      <h3 className='text-lg font-extrabold text-gray-900'>
                        Detail Kunjungan
                      </h3>
                      <p className='text-xs text-gray-500'>
                        {modalVisit.visit_date} — {modalVisit.satuan_kerja}
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => setModalVisit(null)}
                    className='grid h-9 w-9 place-items-center rounded-xl bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors'
                  >
                    <X className='w-5 h-5' />
                  </button>
                </div>

                {/* Modal Body */}
                <div className='px-6 py-5 space-y-6'>
                  {/* Section: Detail Visit */}
                  <div>
                    <div className='flex items-center gap-2 mb-3'>
                      <MapPin className='w-4 h-4 text-blue-600' />
                      <h4 className='text-sm font-extrabold text-gray-900 uppercase tracking-wider'>
                        Detail Visit
                      </h4>
                    </div>
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 p-4 rounded-xl bg-gray-50 border border-gray-100'>
                      <DetailItem
                        label='Tanggal Visit'
                        value={modalVisit.visit_date}
                      />
                      <DetailItem
                        label='Sales Person'
                        value={modalVisit.nama_sales}
                      />
                      <DetailItem label='City' value={modalVisit.city} />
                      <DetailItem label='Ring' value={normalizeRing(modalVisit.status_ring) || '-'} />
                      <DetailItem
                        label='Satuan Kerja'
                        value={modalVisit.satuan_kerja}
                      />
                      <DetailItem label='KLPD' value={modalVisit.klpd} />
                      <DetailItem
                        label='Institusi Kerja'
                        value={modalVisit.institusi_kerja}
                      />
                      <DetailItem
                        label='PIC Name'
                        value={modalVisit.pic_name}
                      />
                      <DetailItem
                        label='PIC Phone'
                        value={modalVisit.pic_phone}
                      />
                      <DetailItem
                        label='PIC Position'
                        value={modalVisit.pic_position}
                      />
                      <DetailItem
                        label='PIC Role'
                        value={modalVisit.pic_role}
                      />
                      <DetailItem
                        label='Created At'
                        value={modalVisit.created_at}
                      />
                      <div>
                        <div className='text-xs font-extrabold tracking-wider text-gray-500'>
                          STATUS VISIT
                        </div>
                        <div className='mt-1'>
                          {(() => {
                            const sc = getStatusColor(modalVisit.status_visit)
                            return (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                  sc.bg,
                                  sc.text,
                                )}
                              >
                                {modalVisit.status_visit || 'No Status'}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <DetailItem
                        label='Market Status'
                        value={modalVisit.status_market}
                      />
                      <DetailItem
                        label='Reschedule'
                        value={
                          modalVisit.reschedule && modalVisit.reschedule !== '-'
                            ? modalVisit.reschedule
                            : '-'
                        }
                      />
                    </div>
                  </div>

                  {/* Section: Aktivitas */}
                  <div>
                    <div className='flex items-center gap-2 mb-3'>
                      <Activity className='w-4 h-4 text-green-600' />
                      <h4 className='text-sm font-extrabold text-gray-900 uppercase tracking-wider'>
                        Aktivitas
                      </h4>
                    </div>
                    <div className='p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4'>
                      <DetailItem
                        label='Kegiatan Status'
                        value={modalVisit.kegiatan_status}
                      />
                      <DetailItem
                        label='Tindak Lanjut'
                        value={modalVisit.tindak_lanjut}
                      />
                      <div>
                        <div className='text-xs font-extrabold tracking-wider text-gray-500'>
                          DESKRIPSI
                        </div>
                        <div className='mt-1 whitespace-pre-line text-sm font-semibold text-gray-900'>
                          {modalVisit.descriptions || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Dokumentasi Foto */}
                  <div>
                    <div className='flex items-center gap-2 mb-3'>
                      <ImageIcon className='w-4 h-4 text-purple-600' />
                      <h4 className='text-sm font-extrabold text-gray-900 uppercase tracking-wider'>
                        Dokumentasi Foto
                      </h4>
                    </div>
                    <div className='p-4 rounded-xl bg-gray-50 border border-gray-100'>
                      {modalVisit.visit_image ? (
                        <div
                          className='relative w-full max-w-xs mx-auto cursor-pointer group'
                          onClick={() =>
                            openImageFullscreen(modalVisit.visit_image!)
                          }
                        >
                          <Image
                            src={modalVisit.visit_image}
                            alt='Bukti Kunjungan'
                            width={500}
                            height={500}
                            quality={80}
                            className='w-full rounded-xl shadow-sm ring-1 ring-gray-200 group-hover:ring-blue-400 group-hover:shadow-lg transition-all'
                          />
                          <div className='absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center'>
                            <span className='opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow'>
                              Klik untuk memperbesar
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className='text-center py-8 text-gray-400'>
                          <ImageIcon className='w-10 h-10 mx-auto mb-2 opacity-30' />
                          <p className='text-sm'>Tidak ada foto dokumentasi</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className='sticky bottom-0 px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm rounded-b-2xl'>
                  <button
                    type='button'
                    onClick={() => setModalVisit(null)}
                    className='w-full h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors'
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========== FULLSCREEN IMAGE VIEWER ========== */}
          {viewImage && (
            <div
              className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4'
              onClick={() => setViewImage(null)}
            >
              <button
                type='button'
                onClick={() => setViewImage(null)}
                className='absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white hover:bg-white/40 transition-colors'
              >
                <X className='w-6 h-6' />
              </button>
              <Image
                src={viewImage}
                height={500}
                width={500}
                quality={80}
                alt='Full size'
                className='max-w-full max-h-full rounded-xl shadow-2xl object-contain'
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {/* Pagination */}
          <section className='mt-6 flex flex-col gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-blue-100 md:flex-row md:items-center md:justify-between'>
            <div className='text-sm text-gray-600'>
              Menampilkan {showingFrom} - {showingTo} dari {total} data
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className='h-10 rounded-xl border border-blue-100 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
              >
                <option value={10}>10 / Halaman</option>
                <option value={25}>25 / Halaman</option>
                <option value={50}>50 / Halaman</option>
                <option value={100}>100 / Halaman</option>
              </select>

              <div className='flex items-center gap-2'>
                <PageBtn onClick={() => gotoPage(1)} ariaLabel='First'>
                  ⏮
                </PageBtn>
                <PageBtn
                  onClick={() => gotoPage(safePage - 1)}
                ariaLabel='Prev'
                >
                  ◀
                </PageBtn>

                {getPageWindow(safePage, totalPages, 5).map((p) => (
                  <button
                    key={p}
                    onClick={() => gotoPage(p)}
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-xl border text-sm font-semibold',
                      p === safePage
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40',
                    )}
                  >
                    {p}
                  </button>
                ))}

                <PageBtn
                  onClick={() => gotoPage(safePage + 1)}
                  ariaLabel='Next'
                >
                  ▶
                </PageBtn>
                <PageBtn onClick={() => gotoPage(totalPages)} ariaLabel='Last'>
                  ⏭
                </PageBtn>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={ariaLabel}
      className='grid h-10 w-10 place-items-center rounded-xl border border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40'
    >
      {children}
    </button>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className='text-xs font-extrabold tracking-wider text-gray-500'>
        {label}
      </div>
      <div className='mt-1 text-sm font-semibold text-gray-900'>
        {value || '-'}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  full,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ label: string; value: string }>
  full?: boolean
}) {
  return (
    <div className={cn(full && 'w-full')}>
      <div className='text-xs font-extrabold tracking-wider text-[#0B6AA9]'>
        {label}
      </div>
      <div className='relative mt-2'>
        <SearchableSelect
          value={value}
          onChange={(val: string) => onChange(val)}
          options={options}
          placeholder={`Pilih ${label}...`}
          className='h-12 w-full appearance-none rounded-xl border-blue-200 border bg-white'
        />
      </div>
    </div>
  )
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

function FilterDate({
  label,
  value,
  onChange,
  onClick,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onClick: (e: React.MouseEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <div className='text-xs font-extrabold tracking-wider text-blue-600'>
        {label}
      </div>
      <div className='relative mt-2'>
        <input
          type='date'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={onClick}
          className='h-12 w-full rounded-xl border border-blue-200 bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-200'
        />
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className='rounded-xl bg-white p-7 shadow flex items-center gap-4'>
      {icon && <div className='rounded-lg bg-blue-100 p-2'>{icon}</div>}
      <div>
        <p className='text-l text-gray-500'>{title}</p>
        <p className='mt-2 text-3xl font-semibold'>{value ?? '-'}</p>
      </div>
    </div>
  )
}

function TableCard({
  icon: Icon,
  title,
  items,
  color = 'blue',
}: TableCardProps) {
  const theme = THEMES[color]
  const maxValue = Math.max(...items.map((item) => item.value))

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}
          >
            <Icon className={`w-4 h-4 ${theme.icon}`} strokeWidth={2} />
          </div>
          <h3 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            {title}
          </h3>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${theme.badgeBg} ${theme.badgeText}`}
        >
          {items.length} Item
        </span>
      </div>

      <hr className='border-gray-100 mb-3.5' />

      <div className='max-h-[230px] overflow-y-auto space-y-3.5'>
        {items.map((item) => {
          const rowTheme = item.color ? THEMES[item.color] : theme
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={item.label}>
              <div className='flex items-center justify-between text-sm mb-1.5'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${rowTheme.dot}`}
                  />
                  <span className='text-gray-700 truncate'>{item.label}</span>
                </div>
                <span
                  className={`font-semibold shrink-0 ml-2 ${rowTheme.value}`}
                >
                  {item.value}
                </span>
              </div>
              <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full ${rowTheme.bar}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Month column color palette (pastel backgrounds) ─── */
const MONTH_COL_COLORS = [
  { total: 'bg-blue-50', penambahan: 'bg-blue-100/50' },
  { total: 'bg-emerald-50', penambahan: 'bg-emerald-100/50' },
  { total: 'bg-amber-50', penambahan: 'bg-amber-100/50' },
  { total: 'bg-rose-50', penambahan: 'bg-rose-100/50' },
  { total: 'bg-violet-50', penambahan: 'bg-violet-100/50' },
  { total: 'bg-cyan-50', penambahan: 'bg-cyan-100/50' },
  { total: 'bg-orange-50', penambahan: 'bg-orange-100/50' },
  { total: 'bg-pink-50', penambahan: 'bg-pink-100/50' },
  { total: 'bg-teal-50', penambahan: 'bg-teal-100/50' },
  { total: 'bg-indigo-50', penambahan: 'bg-indigo-100/50' },
  { total: 'bg-lime-50', penambahan: 'bg-lime-100/50' },
  { total: 'bg-fuchsia-50', penambahan: 'bg-fuchsia-100/50' },
]

function MonthlyTable({ data }: { data: MonthlyProgressData }) {
  const { months, salesData, grandTotal } = data

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-[10px] border-collapse min-w-[900px]'>
        <thead>
          <tr className='border-b border-gray-200'>
            <th className='text-left py-2 px-2 text-gray-500 font-semibold sticky left-0 bg-white z-10 min-w-[140px]'>
              Nama Sales
            </th>
            {months.map((m, mi) => {
              const col = MONTH_COL_COLORS[mi % MONTH_COL_COLORS.length]
              return (
                <React.Fragment key={m}>
                  <th
                    className={`text-center py-2 px-1.5 text-gray-500 font-semibold ${col.total}`}
                  >
                    Total
                    <br />
                    <span className='font-normal text-[9px]'>{m}</span>
                  </th>
                  <th
                    className={`text-center py-2 px-1.5 text-gray-500 font-semibold ${col.penambahan}`}
                  >
                    Penambahan
                    <br />
                    <span className='font-normal text-[9px]'>{m}</span>
                  </th>
                </React.Fragment>
              )
            })}
            <th className='text-center py-2 px-2 text-gray-500 font-semibold bg-blue-100'>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {salesData.map((s, si) => (
            <tr
              key={s.name}
              className='border-b border-gray-100 hover:bg-gray-50/50 transition-colors'
            >
              <td className='py-1.5 px-2 sticky left-0 bg-white z-10'>
                <div className='flex items-center gap-1.5'>
                  <span
                    className='w-2 h-2 rounded-full shrink-0'
                    style={{ backgroundColor: s.color }}
                  />
                  <span className='text-gray-700 font-medium truncate'>
                    {s.name}
                  </span>
                </div>
              </td>
              {months.map((m, mi) => {
                const col = MONTH_COL_COLORS[mi % MONTH_COL_COLORS.length]
                const entry = s.months[m]
                const total = entry?.total || 0
                const penambahan = Math.max(0, entry?.penambahan || 0)
                return (
                  <React.Fragment key={m}>
                    <td
                      className={`text-center py-1.5 px-1.5 font-medium ${col.total} ${total > 0 ? 'text-gray-800' : 'text-gray-300'}`}
                    >
                      {total > 0 ? total : '-'}
                    </td>
                    <td
                      className={`text-center py-1.5 px-1.5 font-medium ${col.penambahan} ${penambahan > 0 ? 'text-gray-800' : 'text-gray-300'}`}
                    >
                      {total > 0 ? penambahan : '-'}
                    </td>
                  </React.Fragment>
                )
              })}
              <td className='text-center py-1.5 px-2 font-bold text-blue-700 bg-blue-100'>
                {s.grandTotal}
              </td>
            </tr>
          ))}
          {/* Grand Total row */}
          <tr className='border-t-2 border-gray-300 bg-gray-50 font-bold'>
            <td className='py-2 px-2 sticky left-0 bg-gray-50 z-10'>
              <div className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full shrink-0 bg-gray-600' />
                <span className='text-gray-800'>Grand Total</span>
              </div>
            </td>
            {months.map((m, mi) => {
              const col = MONTH_COL_COLORS[mi % MONTH_COL_COLORS.length]
              const entry = grandTotal.months[m]
              const total = entry?.total || 0
              const penambahan = Math.max(0, entry?.penambahan || 0)
              return (
                <React.Fragment key={m}>
                  <td
                    className={`text-center py-2 px-1.5 ${col.total} text-gray-800`}
                  >
                    {total > 0 ? total : '-'}
                  </td>
                  <td
                    className={`text-center py-2 px-1.5 ${col.penambahan} text-gray-800`}
                  >
                    {total > 0 ? penambahan : '-'}
                  </td>
                </React.Fragment>
              )
            })}
            <td className='text-center py-2 px-2 text-blue-800 bg-blue-200'>
              {grandTotal.grandTotal}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function MonthlyChart({
  data,
  chartMode,
  setChartMode,
}: {
  data: MonthlyProgressData
  chartMode: 'penambahan' | 'kumulatif'
  setChartMode: (m: 'penambahan' | 'kumulatif') => void
}) {
  const { months, salesData } = data

  // Build chart data
  const chartData = useMemo(() => {
    if (chartMode === 'penambahan') {
      return months.map((m) => {
        const entry: Record<string, string | number> = { month: m }
        for (const s of salesData) {
          entry[s.name] = Math.max(0, s.months[m]?.penambahan || 0)
        }
        return entry
      })
    } else {
      // kumulatif: running total per sales across months
      const cumulative: Record<string, number> = {}
      return months.map((m) => {
        const entry: Record<string, string | number> = { month: m }
        for (const s of salesData) {
          cumulative[s.name] =
            (cumulative[s.name] || 0) + (s.months[m]?.total || 0)
          entry[s.name] = cumulative[s.name]
        }
        return entry
      })
    }
  }, [months, salesData, chartMode])

  return (
    <div>
      {/* Toggle buttons */}
      <div className='flex gap-1 mb-4'>
        <button
          onClick={() => setChartMode('penambahan')}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
            chartMode === 'penambahan'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          📊 Penambahan Bulanan
        </button>
        <button
          onClick={() => setChartMode('kumulatif')}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
            chartMode === 'kumulatif'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          📈 Total Kumulatif
        </button>
      </div>

      <ResponsiveContainer width='100%' height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
          <XAxis dataKey='month' tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
            formatter={(value: string) => {
              const s = salesData.find((sd) => sd.name === value)
              return <span style={{ color: s?.color || '#666' }}>{value}</span>
            }}
          />
          {salesData.map((s) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={s.color}
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
            >
              <LabelList
                dataKey={s.name}
                position='top'
                style={{ fontSize: 8, fill: s.color, fontWeight: 600 }}
                formatter={((v: number) => (v > 0 ? String(v) : '')) as any}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
function SortableHeader({
  label,
  field,
  currentSortBy,
  currentSortDir,
  onSort,
}: {
  label: string
  field: string
  currentSortBy: string
  currentSortDir: 'asc' | 'desc'
  onSort: (field: string, dir: 'asc' | 'desc') => void
}) {
  const isActiveAsc = currentSortBy === field && currentSortDir === 'asc'
  const isActiveDesc = currentSortBy === field && currentSortDir === 'desc'

  return (
    <th className='whitespace-nowrap px-6 py-5 text-xs font-extrabold tracking-wider text-black'>
      <div className='flex items-center gap-2'>
        <span>{label}</span>
        <span className='flex flex-col leading-none'>
          <button
            type='button'
            onClick={() => onSort(field, 'asc')}
            aria-label={`Urutkan ${label} naik`}
            className={cn(
              'text-[10px] leading-none hover:text-blue-700',
              isActiveAsc ? 'text-blue-700' : 'text-gray-400',
            )}
          >
            ▲
          </button>
          <button
            type='button'
            onClick={() => onSort(field, 'desc')}
            aria-label={`Urutkan ${label} turun`}
            className={cn(
              'text-[10px] leading-none hover:text-blue-700',
              isActiveDesc ? 'text-blue-700' : 'text-gray-400',
            )}
          >
            ▼
          </button>
        </span>
      </div>
    </th>
  )
}
