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
