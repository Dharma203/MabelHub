'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/ui/SearchableSelect'
import TableCard from '@/components/ui/TableCard'
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
  BarChartBig,
  BarChart3,
} from 'lucide-react'
import Image from 'next/image'

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
  status_ring: 'RING 1' | 'RING 2' | 'RING 3' | 'RING 4' | string
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
  return Array.from({ length: size }, (_, i) => start + i)
}

export default function TrackingB2GPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
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

  // card data
  const [city, setCity] = useState<string>('')
  const [klpd, setKlpd] = useState<string>('')

  //   dropdown meta
  const [salesOptions, setSalesOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [satkerOptions, setSatkerOptions] = useState<string[]>([])
  const [phoneOptions, setPhoneOptions] = useState<string[]>([])

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

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (sessionLoading) return
      if (!user) return // middleware seharusnya redirect
      try {
        setStatsLoading(true)
        const res = await fetch('/api/visits/stats?filterStatsB2G=true', {
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
  }, [sessionLoading, user])

  // selected row for detail
  const [selected, setSelected] = useState<VisitRow | null>(null)

  // expand row: visit dates by satker
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
        const res = await fetch('/api/visits/meta?filterStatsB2G=true', {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        setSalesOptions(Array.isArray(json?.sales) ? json.sales : [])
        setCityOptions(Array.isArray(json?.cities) ? json.cities : [])
        setSatkerOptions(Array.isArray(json?.satkers) ? json.satkers : [])
      } catch {
        if (!mounted) return
        setSalesOptions([])
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
        if (fRing !== 'ALL') params.set('ring', fRing)
        if (fCity !== 'ALL') params.set('city', fCity)
        if (fSatker !== 'ALL') params.set('satker', fSatker)
        params.set('sortBy', sortBy)
        params.set('sortDir', sortDir)
        params.set('groupBySatker', 'true')
        params.set('filterStatsB2G', 'true')
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
        {/* Content goes here */}
        <div className='flex-1 p-3 sm:p-6'>
          {/* TOP Bar */}
          <div className='mb-4 px-4 pt-2 pb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h2 className='tex-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Tracking Satuan Kerja
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
              icon={<LucideCopyCheck className='h-6 w-6 text-green-500' />}
            />
            <StatCard
              title='SATKER PALING BANYAK DIKUNJUNGI'
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
          <section className='rounded-2xl bg-white p-7 shadow-sm'>
            {/* Mobile Filter Toggle Button */}
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
                'grid grid-cols-1 gap-6 md:grid-cols-7 mt-4 md:mt-0',
                !isFilterOpen ? 'hidden md:grid' : 'grid',
              )}
            >
              <FilterSelect
                label='SALES PERSON'
                value={fSales}
                onChange={(v) => onChangeFilter(setFSales, v)}
                options={[{ label: 'Semua Sales', value: 'ALL' }].concat(
                  salesOptions.map((s) => ({ label: s, value: s })),
                )}
              />

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
                label='PIC PHONE'
                value={fPhone}
                onChange={(v) => onChangeFilter(setFPhone, v)}
                options={[{ label: 'Semua Kontak', value: 'ALL' }].concat(
                  phoneOptions.map((c) => ({ label: c, value: c })),
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
                              {r.status_ring}
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
                      <DetailItem label='Ring' value={modalVisit.status_ring} />
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
