'use client'

import React, { useMemo, useState, useEffect } from 'react'

import { useSession } from '@/components/session/SessionProvider'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx-js-style'
import ExportExcelModal, {
  ExportColumn,
  ExportScope,
} from '@/components/modals/ExportExcelModal'

type DashboardStats = {
  totalVisits: number
  visited: number
  stayOffice: number
  notVisited: number
  salesCount: number
  satkerCount: number
  cityCount: number
  ring: {
    ring1: number
    ring2: number
    ring3: number
    ring4: number
  }
  trend?: { date: string; count: number }[]
  topVisit?: { name: string; count: number }[]
  topSales?: { name: string; count: number }[]
  klpd?: { name: string; count: number }[]
}

type VisitRow = {
  _id: string
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
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

function formatDateID(iso: string) {
  if (!iso || iso === '-') return '-'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatDateWithTime(iso: string) {
  if (!iso || iso === '-') return '-'
  try {
    const date = new Date(iso)

    const datePart = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const timePart = date
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      .replace(/\./g, ':')

    return `${datePart}, ${timePart}`
  } catch {
    return iso
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
  return Array.from({ length: size }, (_, i) => start + i)
}

function StatusPill({ value }: { value: string }) {
  const upper = (value || '-').toUpperCase()
  const isVisited = upper.includes('VISIT') && !upper.includes('NOT')

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-extrabold tracking-wide',
        isVisited
          ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
          : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
      )}
    >
      {upper}
    </span>
  )
}

export default function RekapitulasiVisitPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // ✅ Guard role (sesuaikan kalau ada rule akses lain)
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

  const [activeFilters, setActiveFilters] = useState<{
    ring: string | null
    statusGroup: string | null
    city: string | null
    satker: string | null
    sales: string | null
    klpd: string | null
    date: string | null
  }>({
    ring: null,
    statusGroup: null,
    city: null,
    satker: null,
    sales: null,
    klpd: null,
    date: null,
  })

  // ====== filter state ======
  const [fSales, setFSales] = useState<string>('ALL')
  const [fStart, setFStart] = useState<string>('')
  const [fEnd, setFEnd] = useState<string>('')
  const [fStatus, setFStatus] = useState<string>('ALL')
  const [fRing, setFRing] = useState<string>('ALL')
  const [fCity, setFCity] = useState<string>('ALL')
  const [fSatker, setFSatker] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  // ====== mobile filter toggle ======
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // ====== pagination ======
  const [pageSize, setPageSize] = useState<number>(25)
  const [page, setPage] = useState<number>(1)

  // ====== selected row for detail ======
  const [selected, setSelected] = useState<VisitRow | null>(null)

  // ====== server data ======
  const [rows, setRows] = useState<VisitRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ====== dropdown meta ======
  const [salesOptions, setSalesOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [satkerOptions, setSatkerOptions] = useState<string[]>([])

  // ====== export modal ======
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // fetch meta (dropdown) sekali
  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const res = await fetch('/api/visits/meta', { cache: 'no-store' })
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
  }, [])

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

  // fetch rows dari DB setiap filter/pagination berubah
  useEffect(() => {
    let mounted = true

    ;(async () => {
      setLoadingRows(true)

      const qs = new URLSearchParams()
      qs.set('limit', String(pageSize))
      qs.set('page', String(page))

      if (fSales !== 'ALL') qs.set('sales', fSales)
      if (fStatus !== 'ALL') qs.set('status', fStatus)
      if (fRing !== 'ALL') qs.set('ring', fRing)
      if (fCity !== 'ALL') qs.set('city', fCity)
      if (fSatker !== 'ALL') qs.set('satker', fSatker)
      if (fStart) qs.set('start', fStart)
      if (fEnd) qs.set('end', fEnd)

      try {
        const res = await fetch(`/api/visits?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))

        if (!mounted) return

        const items = Array.isArray(json?.items) ? json.items : []
        setRows(items)

        const pg = json?.pagination ?? {}
        setTotal(Number(pg?.total ?? 0))
        setTotalPages(Number(pg?.totalPages ?? 1))

        // reset detail kalau data berubah
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
  }, [pageSize, page, fSales, fStatus, fRing, fCity, fSatker, fStart, fEnd])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (sessionLoading) return
      if (!user) return // middleware seharusnya redirect

      try {
        setLoadingStats(true)
        const params = new URLSearchParams()
        if (activeFilters.ring) params.set('ring', activeFilters.ring)
        if (activeFilters.statusGroup)
          params.set('statusGroup', activeFilters.statusGroup)
        if (activeFilters.city) params.set('city', activeFilters.city)
        if (activeFilters.satker) params.set('satker', activeFilters.satker)
        if (activeFilters.sales) params.set('sales', activeFilters.sales)
        if (activeFilters.klpd) params.set('klpd', activeFilters.klpd)
        if (activeFilters.date) params.set('date', activeFilters.date)
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)

        const res = await fetch(`/api/dashboard-request?${params.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error ?? 'Failed to fetch stats')
        if (mounted) setStats(json as DashboardStats)
      } catch (e) {
        console.error(e)
        if (mounted) setStats(null)
      } finally {
        if (mounted) setLoadingStats(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [sessionLoading, user, activeFilters, startDate, endDate])

  const safePage = useMemo(
    () => Math.min(Math.max(1, page), Math.max(1, totalPages)),
    [page, totalPages],
  )

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const showingTo = Math.min(total, safePage * pageSize)

  const gotoPage = (p: number) =>
    setPage(Math.min(Math.max(1, p), Math.max(1, totalPages)))

  const onChangeFilter = (fn: (v: string) => void, v: string) => {
    fn(v)
    setSelected(null)
    setPage(1)
  }

  const exportColumns: ExportColumn[] = [
    { id: 'namaSales', label: 'Nama Sales' },
    { id: 'visitDate', label: 'Visit Date' },
    { id: 'statusVisit', label: 'Status Visit' },
    { id: 'satuanKerja', label: 'Satuan Kerja' },
    { id: 'city', label: 'City' },
    { id: 'picName', label: 'PIC Name' },
    { id: 'picPhone', label: 'PIC Phone' },
    { id: 'ring', label: 'Ring' },
    { id: 'createdAt', label: 'Created At' },
    { id: 'marketStatus', label: 'Market Status' },
    { id: 'klpd', label: 'KLPD' },
    { id: 'reschedule', label: 'Reschedule' },
    { id: 'institusiKerja', label: 'Institusi Kerja' },
    { id: 'picPosition', label: 'PIC Position' },
    { id: 'picRole', label: 'PIC Role' },
    { id: 'tindakLanjut', label: 'Tindak Lanjut' },
    { id: 'kegiatanStatus', label: 'Kegiatan Status' },
    { id: 'deskripsi', label: 'Deskripsi Kegiatan' },
  ]

  const handleExport = async (selectedCols: string[], scope: ExportScope) => {
    setIsExporting(true)
    try {
      let dataToProcess: VisitRow[] = []

      if (scope === 'all') {
        const qs = new URLSearchParams()
        qs.set('limit', '999999')
        qs.set('page', '1')

        if (fSales !== 'ALL') qs.set('sales', fSales)
        if (fStatus !== 'ALL') qs.set('status', fStatus)
        if (fRing !== 'ALL') qs.set('ring', fRing)
        if (fCity !== 'ALL') qs.set('city', fCity)
        if (fSatker !== 'ALL') qs.set('satker', fSatker)
        if (fStart) qs.set('start', fStart)
        if (fEnd) qs.set('end', fEnd)

        const res = await fetch(`/api/visits?${qs.toString()}`)
        if (!res.ok) throw new Error('Gagal mengambil data')
        const json = await res.json()
        dataToProcess = Array.isArray(json?.items) ? json.items : []
      } else {
        dataToProcess = rows
      }

      const flattenedData = dataToProcess.map((r) => {
        const row: any = {}
        if (selectedCols.includes('namaSales'))
          row['Nama Sales'] = r.nama_sales || '-'
        if (selectedCols.includes('visitDate'))
          row['Visit Date'] = formatDateID(r.visit_date)
        if (selectedCols.includes('statusVisit'))
          row['Status Visit'] = r.status_visit || '-'
        if (selectedCols.includes('satuanKerja'))
          row['Satuan Kerja'] = r.satuan_kerja || '-'
        if (selectedCols.includes('city')) row['City'] = r.city || '-'
        if (selectedCols.includes('picName'))
          row['PIC Name'] = r.pic_name || '-'
        if (selectedCols.includes('picPhone'))
          row['PIC Phone'] = r.pic_phone || '-'
        if (selectedCols.includes('ring')) row['Ring'] = r.status_ring || '-'
        if (selectedCols.includes('createdAt'))
          row['Created At'] = formatDateWithTime(r.created_at)
        if (selectedCols.includes('marketStatus'))
          row['Market Status'] = r.status_market || '-'
        if (selectedCols.includes('klpd')) row['KLPD'] = r.klpd || '-'
        if (selectedCols.includes('reschedule'))
          row['Reschedule'] =
            r.reschedule && r.reschedule !== '-'
              ? formatDateID(r.reschedule)
              : '-'
        if (selectedCols.includes('institusiKerja'))
          row['Institusi Kerja'] = r.institusi_kerja || '-'
        if (selectedCols.includes('picPosition'))
          row['PIC Position'] = r.pic_position || '-'
        if (selectedCols.includes('picRole'))
          row['PIC Role'] = r.pic_role || '-'
        if (selectedCols.includes('tindakLanjut'))
          row['Tindak Lanjut'] = r.tindak_lanjut || '-'
        if (selectedCols.includes('kegiatanStatus'))
          row['Kegiatan Status'] = r.kegiatan_status || '-'
        if (selectedCols.includes('deskripsi'))
          row['Deskripsi Kegiatan'] = r.descriptions || '-'
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(flattenedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Visit')
      XLSX.writeFile(
        workbook,
        `Rekapitulasi_Visit_${scope === 'all' ? 'All' : 'Page'}.xlsx`,
      )

      setIsExportModalOpen(false)
    } catch (error) {
      console.error('Failed to export Excel:', error)
      alert('Gagal mengekspor data ke Excel')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex min-h-screen'>
        <div className='flex-1  p-6'>
          <main className='mx-auto'>
            <div className='mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 pt-2 pb-4'>
              <div>
                <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                  VISIT DASHBOARD
                </h1>
              </div>
              <div className='px-4'>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className='rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-green-700 hover:bg-green-700 transition'
                >
                  Export Excel
                </button>
              </div>
            </div>

            <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-5'>
              <StatCard
                title='Total Visits'
                value={loadingStats ? undefined : stats?.totalVisits}
              />
              <StatCard
                title='Stay Office'
                value={loadingStats ? undefined : stats?.stayOffice}
              />
              <StatCard
                title='Not Visited'
                value={loadingStats ? undefined : stats?.notVisited}
              />
              <div className='rounded-xl bg-white p-4 shadow'>
                <p className='mb-3 text-xs text-gray-500'>MARKET COVERAGE</p>

                <div className='grid grid-cols-3 gap-4 text-center'>
                  <div>
                    <p className='text-2xl font-semibold'>
                      {loadingStats ? '-' : (stats?.salesCount ?? '-')}
                    </p>
                    <p className='mt-1 text-xs text-gray-500'>Sales</p>
                  </div>

                  <div>
                    <p className='text-2xl font-semibold'>
                      {loadingStats ? '-' : (stats?.satkerCount ?? '-')}
                    </p>
                    <p className='mt-1 text-xs text-gray-500'>Satker</p>
                  </div>

                  <div>
                    <p className='text-2xl font-semibold'>
                      {loadingStats ? '-' : (stats?.cityCount ?? '-')}
                    </p>
                    <p className='mt-1 text-xs text-gray-500'>City</p>
                  </div>
                </div>
              </div>
              <div className='rounded-xl bg-white p-4 shadow'>
                <p className='mb-3 text-xs text-gray-500'>RING DISTRIBUTION</p>
                <div className='grid grid-cols-4 gap-4 text-center'>
                  {(['ring1', 'ring2', 'ring3', 'ring4'] as const).map(
                    (ring, i) => (
                      <div key={ring}>
                        <p className='text-2xl font-semibold'>
                          {loadingStats ? '-' : (stats?.ring?.[ring] ?? '-')}
                        </p>
                        <p className='mt-1 text-xs text-gray-500'>
                          Ring {i + 1}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className='mb-6 flex flex-col  gap-4 md:flex-row md:items-center justify-between px-4'>
                  Analisa Kegiatan Status
            </div>

            {/* FILTER CARD */}
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
                  label='STATUS VISIT'
                  value={fStatus}
                  onChange={(v) => onChangeFilter(setFStatus, v)}
                  options={[{ label: 'Semua Status', value: 'ALL' }].concat(
                    paramStatus.map((s) => ({ label: s, value: s })),
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

            {/* TABLE */}
            <section className='mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100'>
              {/* Desktop View */}
              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-blue-200'>
                    <tr className='text-left'>
                      {[
                        'NAMA SALES',
                        'VISIT DATE',
                        'STATUS',
                        'SATUAN KERJA',
                        'CITY',
                        'PIC NAME',
                        'PIC PHONE',
                        'RING',
                      ].map((h) => (
                        <th
                          key={h}
                          className='whitespace-nowrap px-6 py-5 text-xs font-extrabold tracking-wider text-black'
                        >
                          {h}
                        </th>
                      ))}
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
                        const active = selected?._id === r._id
                        return (
                          <React.Fragment key={r._id}>
                            <tr
                              onClick={() => setSelected(active ? null : r)}
                              className={cn(
                                'cursor-pointer border-t border-blue-50 transition-colors',
                                active
                                  ? 'bg-blue-50/60'
                                  : 'hover:bg-blue-50/30',
                              )}
                            >
                              <td
                                className={cn(
                                  'px-6 py-6 font-extrabold text-[#0B6AA9]',
                                  active
                                    ? 'border-l-4 border-l-blue-600'
                                    : 'border-l-4 border-l-transparent',
                                )}
                              >
                                {r.nama_sales}
                              </td>
                              <td className='px-6 py-6 text-gray-800'>
                                {formatDateID(r.visit_date)}
                              </td>
                              <td className='px-6 py-6'>
                                <StatusPill value={r.status_visit} />
                              </td>
                              <td className='px-6 py-6 text-gray-900'>
                                {r.satuan_kerja}
                              </td>
                              <td className='px-6 py-6 text-gray-900'>
                                {r.city}
                              </td>
                              <td className='px-6 py-6 text-gray-900'>
                                {r.pic_name}
                              </td>
                              <td className='px-6 py-6 text-gray-900'>
                                {r.pic_phone}
                              </td>
                              <td className='px-6 py-6 font-extrabold text-[#0B6AA9]'>
                                {r.status_ring}
                              </td>
                            </tr>
                            {active && (
                              <tr className='bg-blue-50/30'>
                                <td
                                  colSpan={8}
                                  className='px-6 py-6 border-l-4 border-l-blue-600 border-b border-b-blue-100'
                                >
                                  <div className='rounded-xl bg-white p-6 shadow-sm ring-1 ring-blue-100'>
                                    <div className='mb-4 flex items-center gap-3 text-lg font-extrabold text-gray-900'>
                                      <span className='grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-600'>
                                        📖
                                      </span>
                                      Detail Kunjungan
                                    </div>
                                    <div className='grid grid-cols-1 gap-6 md:grid-cols-6 border-t border-gray-100 pt-4'>
                                      <DetailItem
                                        label='Created At'
                                        value={formatDateID(r.created_at)}
                                      />
                                      <DetailItem
                                        label='Market Status'
                                        value={r.status_market}
                                      />
                                      <DetailItem label='KLPD' value={r.klpd} />
                                      <DetailItem
                                        label='Reschedule'
                                        value={
                                          r.reschedule && r.reschedule !== '-'
                                            ? formatDateID(r.reschedule)
                                            : '-'
                                        }
                                      />
                                      <DetailItem
                                        label='Institusi Kerja'
                                        value={r.institusi_kerja}
                                      />
                                      <DetailItem
                                        label='PIC Position'
                                        value={r.pic_position}
                                      />
                                      <DetailItem
                                        label='PIC Role'
                                        value={r.pic_role}
                                      />
                                      <DetailItem
                                        label='Tindak Lanjut'
                                        value={r.tindak_lanjut}
                                      />
                                      <DetailItem
                                        label='Kegiatan Status'
                                        value={r.kegiatan_status}
                                      />
                                    </div>

                                    <div className='mt-6 border-t border-gray-100 pt-4'>
                                      <div className='text-xs font-extrabold tracking-wider text-gray-500'>
                                        DESKRIPSI
                                      </div>
                                      <div className='mt-2 whitespace-pre-line text-sm text-gray-700'>
                                        {r.descriptions || '-'}
                                      </div>
                                    </div>
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

              {/* Mobile View */}
              <div className='md:hidden flex flex-col p-4 bg-gray-50/50 gap-4'>
                {loadingRows ? (
                  <div className='py-10 text-center text-gray-500'>
                    Loading...
                  </div>
                ) : rows.length === 0 ? (
                  <div className='py-10 text-center text-gray-500'>
                    Tidak ada data.
                  </div>
                ) : (
                  rows.map((r) => {
                    const active = selected?._id === r._id
                    return (
                      <div
                        key={r._id}
                        onClick={() => setSelected(active ? null : r)}
                        className={cn(
                          'bg-white border flex flex-col rounded-2xl shadow-sm transition-colors cursor-pointer overflow-hidden',
                          active
                            ? 'border-[#0B6AA9] bg-blue-50/10 ring-1 ring-[#0B6AA9]'
                            : 'border-blue-100 hover:bg-black/5',
                        )}
                      >
                        <div className='p-4 flex flex-col gap-3'>
                          <div className='flex items-start justify-between border-b border-blue-50 pb-3'>
                            <div>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                Nama Sales
                              </div>
                              <div className='text-base font-extrabold text-[#0B6AA9]'>
                                {r.nama_sales}
                              </div>
                            </div>
                            <div className='shrink-0 ml-2'>
                              <StatusPill value={r.status_visit} />
                            </div>
                          </div>

                          <div className='grid grid-cols-2 gap-3 text-sm'>
                            <div>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                Ring
                              </div>
                              <div className='font-extrabold text-[#0B6AA9]'>
                                {r.status_ring}
                              </div>
                            </div>
                            <div>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                City
                              </div>
                              <div className='font-semibold text-gray-900'>
                                {r.city}
                              </div>
                            </div>
                            <div className='col-span-2'>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                Satuan Kerja
                              </div>
                              <div className='font-semibold text-gray-900 leading-tight'>
                                {r.satuan_kerja}
                              </div>
                            </div>
                            <div className='col-span-2'>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                PIC Name
                              </div>
                              <div className='font-semibold text-gray-900'>
                                {r.pic_name}
                              </div>
                            </div>
                            <div className='col-span-2'>
                              <div className='text-xs font-medium text-gray-500 mb-0.5'>
                                Visit Date
                              </div>
                              <div className='font-semibold text-gray-800'>
                                {formatDateID(r.visit_date)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {active && (
                          <div className='border-t border-blue-100 bg-blue-50/30 p-4'>
                            <div className='mb-4 flex items-center gap-2 text-base font-extrabold text-gray-900'>
                              <span className='grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-600 text-sm'>
                                📖
                              </span>
                              Detail Kunjungan
                            </div>
                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm'>
                              <DetailItem
                                label='Created At'
                                value={formatDateID(r.created_at)}
                              />
                              <DetailItem
                                label='Market Status'
                                value={r.status_market}
                              />
                              <DetailItem label='KLPD' value={r.klpd} />
                              <DetailItem
                                label='Reschedule'
                                value={
                                  r.reschedule && r.reschedule !== '-'
                                    ? formatDateID(r.reschedule)
                                    : '-'
                                }
                              />
                              <DetailItem
                                label='Institusi Kerja'
                                value={r.institusi_kerja}
                              />
                              <DetailItem
                                label='PIC Position'
                                value={r.pic_position}
                              />
                              <DetailItem label='PIC Role' value={r.pic_role} />
                              <DetailItem
                                label='Tindak Lanjut'
                                value={r.tindak_lanjut}
                              />
                              <DetailItem
                                label='Kegiatan Status'
                                value={r.kegiatan_status}
                              />
                            </div>

                            <div className='mt-4 border-t border-blue-100 pt-3'>
                              <div className='text-xs font-extrabold tracking-wider text-gray-500 mb-1'>
                                DESKRIPSI
                              </div>
                              <div className='whitespace-pre-line text-sm text-gray-700 bg-white p-3 rounded-lg border border-blue-50 shadow-sm leading-relaxed'>
                                {r.descriptions || '-'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* PAGINATION */}
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
                  <PageBtn
                    onClick={() => gotoPage(totalPages)}
                    ariaLabel='Last'
                  >
                    ⏭
                  </PageBtn>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        columns={exportColumns}
        onExport={handleExport}
        isLoading={isExporting}
      />
    </div>
  )
}

/* ----------------------------- UI Pieces ----------------------------- */

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

function StatCard({ title, value }: { title: string; value?: number }) {
  return (
    <div className='rounded-xl bg-white p-4 shadow'>
      <p className='text-xs text-gray-500'>{title}</p>
      <p className='mt-2 text-2xl font-semibold'>{value ?? '-'}</p>
    </div>
  )
}

function SingleCard({ title, value }: { title: string; value?: string }) {
  return (
    <div className='rounded-xl border-0 bg-gray-200 p-4 shadow'>
      <p className='text-xs text-gray-500'>{title}</p>
      <p className='mt-2 text-sm font-semibold'>{value ?? '-'}</p>
    </div>
  )
}
