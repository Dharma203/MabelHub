'use client'

import {
  Filter,
  ChevronDown,
  Calendar,
  CalendarDays,
  Package,
  Tag,
  Building2,
  Map,
  MapPin,
  MapPinCheck,
  Users,
  PhoneCallIcon,
  BarChart2,
  X,
  LucidePenBox,
  EyeIcon,
  BarChart2Icon,
  Download,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx-js-style'
import { useExportToSheets } from '@/hooks/useExportToSheets'

type ProvinsiKotaRow = {
  no: number
  provinsi: string
  kota: string
  unik: number
  pct: number
}

type TrackingRow = {
  _id: string
  kode: string
  nama_perusahaan: string
  segmen: string
  segmentasi: string
  sumber_data: string
  kota: string
  provinsi: string
  produk: string
  pic: string
  jabatan: string
  telp: string
  tipe: string
  bidang_perusahaan: string
  sumber_date: string
  sumber_lain: string
  sales_internal: string
  merek_tayang: string
  merek_lainnya: string
  brand_owner: string
  email: string
  link_produk: string
  link_toko: string
  updated_at: string
  keterangan_update: string
  bulan_data: string
  alamat: string
  penginput: string
  jenis_entitas: string
  created_at: string
  requestor: string
}

type ExportField = {
  key: keyof TrackingRow
  label: string
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'created_at', label: 'Tanggal Input' },
  { key: 'kode', label: 'Kode' },
  { key: 'requestor', label: 'Penginput' },
  { key: 'nama_perusahaan', label: 'Nama Perusahaan' },
  { key: 'segmen', label: 'Segmen' },
  { key: 'segmentasi', label: 'Segmentasi' },
  { key: 'sumber_data', label: 'Sumber Data' },
  { key: 'kota', label: 'Kota' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'produk', label: 'Produk' },
  { key: 'pic', label: 'PIC' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'telp', label: 'Telp' },
  { key: 'tipe', label: 'Tipe Kontak' },
  { key: 'bidang_perusahaan', label: 'Bidang Perusahaan' },
  { key: 'sumber_lain', label: 'Sumber Lain' },
  { key: 'sales_internal', label: 'Sales Internal' },
  { key: 'merek_tayang', label: 'Merek Tayang' },
  { key: 'merek_lainnya', label: 'Merek Lainnya' },
  { key: 'brand_owner', label: 'Brand Owner' },
  { key: 'email', label: 'Email' },
  { key: 'link_produk', label: 'Link Produk' },
  { key: 'link_toko', label: 'Link Toko' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'requestor', label: 'Requestor' },
  { key: 'jenis_entitas', label: 'Jenis Entitas' },
  { key: 'keterangan_update', label: 'Keterangan Update' },
  { key: 'bulan_data', label: 'Bulan Data' },
  { key: 'updated_at', label: 'Tanggal Update' },
]

type ApiStats = {
  total_no_telp: number
  total_provinsi: number
  total_kota: number
  total_nama: number
  total_merek: number
  total_kontak_unik: number
  total_wa_unik: number
  provinsi_kota: ProvinsiKotaRow[]
  wa_provinsi_kota: ProvinsiKotaRow[]
}

type FilterOptions = {
  bulan: string[]
  produk: string[]
  merek: string[]
  perusahaan: string[]
  provinsi: string[]
  kota: string[]
  tipe: string[]
}

type LatestRevision = {
  found: boolean
  code_input?: string
  revised_by?: string
  revised_at?: string
  changed_fields?: { field: string; oldValue: string; newValue: string }[]
  snapshot_before?: any
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
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

function formatBulanData(val: string): string {
  const mm = val.split('-')
  if (!mm) return val
  return `${BULAN_NAMES[mm[1]] ?? mm[1]}`
}

// Helper: "2026-04" → "April-2026"
const BULAN_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
}

function formatBulan(val: string): string {
  const [yyyy, mm] = val.split('-')
  if (!yyyy || !mm) return val
  return `${BULAN_NAMES[mm] ?? mm}-${yyyy}`
}

// ---- DetailItem sub-component ----
function DetailItem({
  label,
  value,
  icon,
  isLink = false,
}: {
  label: string
  value?: string | null
  icon?: string
  isLink?: boolean
}) {
  const empty = !value || value.trim() === ''
  return (
    <div className='flex items-start gap-1.5 min-w-0'>
      {icon && (
        <span className='mt-[1px] shrink-0 text-[11px] leading-none'>
          {icon}
        </span>
      )}
      <div className='flex flex-col min-w-0'>
        <span className='text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5'>
          {label}:
        </span>
        {empty ? (
          <span className='text-[10.5px] text-slate-300 italic'>-</span>
        ) : isLink ? (
          <a
            href={value!.startsWith('http') ? value! : `https://${value}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-[10.5px] text-blue-600 underline underline-offset-2 font-medium truncate hover:text-blue-800'
          >
            🔗 Buka Link
          </a>
        ) : (
          <span className='text-[10.5px] text-slate-700 font-medium break-words leading-snug'>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TrackingDatabasePage() {
  const router = useRouter()

  const filterButtons = [
    { id: 'Bulan', icon: CalendarDays, label: 'Bulan' },
    { id: 'Produk', icon: Package, label: 'Produk' },
    { id: 'Merek', icon: Tag, label: 'Merek' },
    { id: 'Perusahaan', icon: Building2, label: 'Perusahaan' },
    { id: 'Provinsi', icon: Map, label: 'Provinsi' },
    { id: 'Kota', icon: MapPin, label: 'Kota/Kab' },
    { id: 'Tipe', icon: Users, label: 'Tipe Kontak' },
  ]

  // filter state
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [isFilterOpen2, setIsFilterOpen2] = useState(true)

  // filter value — multi-select arrays (empty = no filter)
  const [bulan, setBulan] = useState<string[]>([])
  const [produk, setProduk] = useState<string[]>([])
  const [merek, setMerek] = useState<string[]>([])
  const [perusahaan, setPerusahaan] = useState<string[]>([])
  const [provinsi, setProvinsi] = useState<string[]>([])
  const [kota, setKota] = useState<string[]>([])
  const [tipe, setTipe] = useState<string[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // dropdown filter
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>(
    {},
  )
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    bulan: [],
    produk: [],
    merek: [],
    perusahaan: [],
    provinsi: [],
    kota: [],
    tipe: [],
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleWhatsAppClick = (telp: unknown) => {
    const raw = String(telp ?? '').trim()
    if (!raw) return
    let cleanNumber = raw.replace(/\D/g, '')
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '62' + cleanNumber.slice(1)
    } else if (!cleanNumber.startsWith('62')) {
      cleanNumber = '62' + cleanNumber
    }
    if (cleanNumber.length < 10) return // nomor tidak balid
    window.open(
      `https://wa.me/${cleanNumber}`,
      '_blank',
      'noopener, noreferrer',
    )
  }

  // pagination
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<TrackingRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState<TrackingRow | null>(null)

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportMode, setExportMode] = useState<'all' | 'date' | 'pagination'>(
    'all',
  )
  const [exportFields, setExportFields] = useState<Set<keyof TrackingRow>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  )
  const [exporting, setExporting] = useState(false)

  // Google Sheets export
  const { exportToSheets, loading: googleSheetsLoading } = useExportToSheets()

  // Riwayat revisi terbaru untuk row yang sedang dipilih
  const [latestRevision, setLatestRevision] = useState<LatestRevision | null>(
    null,
  )
  const [loadingRevision, setLoadingRevision] = useState(false)

  // data — statistik & analitik
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ApiStats | null>(null)

  // Fetch distinct filter options
  useEffect(() => {
    fetch('/api/tracking-database/filters')
      .then((r) => r.json())
      .then((data: FilterOptions) => setFilterOptions(data))
      .catch(() => {})
  }, [])

  // Auto-fetch riwayat revisi terbaru saat row di-expand
  useEffect(() => {
    const fetchRevision = async () => {
      if (!selected?.kode) {
        setLatestRevision(null)
        return
      }
      setLoadingRevision(true)
      try {
        const r = await fetch(
          `/api/input-database/history/${encodeURIComponent(selected.kode)}`,
        )
        const data: LatestRevision = await r.json()
        setLatestRevision(data)
      } catch {
        setLatestRevision({ found: false })
      } finally {
        setLoadingRevision(false)
      }
    }

    fetchRevision()
  }, [selected?.kode])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ---- filter helpers ----
  const getFilterArr = useCallback(
    (id: string): string[] => {
      switch (id) {
        case 'Bulan':
          return bulan
        case 'Produk':
          return produk
        case 'Merek':
          return merek
        case 'Perusahaan':
          return perusahaan
        case 'Provinsi':
          return provinsi
        case 'Kota':
          return kota
        case 'Tipe':
          return tipe
        default:
          return []
      }
    },
    [bulan, produk, merek, perusahaan, provinsi, kota, tipe],
  )

  const setFilterArr = (id: string, vals: string[]) => {
    switch (id) {
      case 'Bulan':
        setBulan(vals)
        break
      case 'Produk':
        setProduk(vals)
        break
      case 'Merek':
        setMerek(vals)
        break
      case 'Perusahaan':
        setPerusahaan(vals)
        break
      case 'Provinsi':
        setProvinsi(vals)
        break
      case 'Kota':
        setKota(vals)
        break
      case 'Tipe':
        setTipe(vals)
        break
    }
    setPage(1)
    setSelected(null)
  }

  const toggleFilterVal = (id: string, val: string) => {
    const cur = getFilterArr(id)
    setFilterArr(
      id,
      cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
    )
  }

  const clearFilterArr = (id: string) => {
    setFilterArr(id, [])
    setOpenDropdown(null)
  }

  const selectAllFilter = (id: string, opts: string[]) => {
    setFilterArr(id, [...opts])
  }

  const getOptions = useCallback(
    (id: string): string[] => {
      switch (id) {
        case 'Bulan':
          return filterOptions.bulan
        case 'Produk':
          return filterOptions.produk
        case 'Merek':
          return filterOptions.merek
        case 'Perusahaan':
          return filterOptions.perusahaan
        case 'Provinsi':
          return filterOptions.provinsi
        case 'Kota':
          return filterOptions.kota
        case 'Tipe':
          return filterOptions.tipe
        default:
          return []
      }
    },
    [filterOptions],
  )

  // ---- main data fetch (stats + paginated rows) ----
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingRows(true)
      if (!mounted) return
      setLoading(true)

      const qs = new URLSearchParams()
      qs.set('limit', String(pageSize))
      qs.set('page', String(page))

      bulan.forEach((v) => qs.append('bulan', v))
      produk.forEach((v) => qs.append('produk', v))
      merek.forEach((v) => qs.append('merek', v))
      perusahaan.forEach((v) => qs.append('perusahaan', v))
      provinsi.forEach((v) => qs.append('provinsi', v))
      kota.forEach((v) => qs.append('kota', v))
      tipe.forEach((v) => qs.append('tipe', v))
      if (startDate) qs.set('startDate', startDate)
      if (endDate) qs.set('endDate', endDate)

      try {
        const res = await fetch(`/api/tracking-database?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        if (json?.total_kontak_unik !== undefined) {
          setStats({
            total_no_telp: json.total_no_telp ?? 0,
            total_provinsi: json.total_provinsi ?? 0,
            total_kota: json.total_kota ?? 0,
            total_nama: json.total_nama ?? 0,
            total_merek: json.total_merek ?? 0,
            total_kontak_unik: json.total_kontak_unik ?? 0,
            total_wa_unik: json.total_wa_unik ?? 0,
            provinsi_kota: Array.isArray(json.provinsi_kota)
              ? json.provinsi_kota
              : [],
            wa_provinsi_kota: Array.isArray(json.wa_provinsi_kota)
              ? json.wa_provinsi_kota
              : [],
          })
        }

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
        if (mounted) {
          setLoadingRows(false)
          setLoading(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [
    page,
    pageSize,
    bulan,
    produk,
    merek,
    perusahaan,
    provinsi,
    kota,
    tipe,
    startDate,
    endDate,
  ])

  const safePage = useMemo(
    () => Math.min(Math.max(1, page), Math.max(1, totalPages)),
    [page, totalPages],
  )
  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const showingTo = Math.min(total, safePage * pageSize)
  const gotoPage = (p: number) =>
    setPage(Math.min(Math.max(1, p), Math.max(1, totalPages)))

  // ---- Export handler ----
  const handleExport = async () => {
    // Validasi mode 'date' wajib isi tanggal
    if (exportMode === 'date' && !exportStartDate && !exportEndDate) {
      alert('Silakan pilih minimal salah satu tanggal (mulai atau akhir)')
      return
    }

    setExporting(true)
    try {
      let allRows: TrackingRow[] = []

      if (exportMode === 'pagination') {
        // Mode pagination: pakai data yang sedang tampil di tabel (rows state)
        allRows = rows
      } else {
        const qs = new URLSearchParams()
        qs.set('limit', '999999')
        qs.set('page', '1')

        // Filter kategori tetap dipakai di semua mode (bulan, produk, dst)
        bulan.forEach((v) => qs.append('bulan', v))
        produk.forEach((v) => qs.append('produk', v))
        merek.forEach((v) => qs.append('merek', v))
        perusahaan.forEach((v) => qs.append('perusahaan', v))
        provinsi.forEach((v) => qs.append('provinsi', v))
        kota.forEach((v) => qs.append('kota', v))
        tipe.forEach((v) => qs.append('tipe', v))

        const formatDisplayDate = (dateStr: string) => {
          const d = new Date(dateStr)
          return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
        }

        if (exportMode === 'date') {
          // Mode by tanggal: wajib pakai tanggal dari modal export
          if (exportStartDate)
            qs.set('startDate', formatDisplayDate(exportStartDate))
          if (exportEndDate) qs.set('endDate', formatDisplayDate(exportEndDate))
        }
        // Mode 'all': tidak set startDate/endDate sama sekali → tarik semua data

        const res = await fetch(`/api/tracking-database?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        allRows = Array.isArray(json?.items) ? json.items : []
      }

      if (allRows.length === 0) {
        alert('Tidak ada data untuk di-export')
        return
      }

      const selectedFields = EXPORT_FIELDS.filter((f) =>
        exportFields.has(f.key),
      )
      const exportData = allRows.map((row, idx) => {
        const obj: Record<string, any> = { No: idx + 1 }
        selectedFields.forEach((f) => {
          let val = row[f.key] ?? ''
          if ((f.key === 'created_at' || f.key === 'updated_at') && val) {
            try {
              const d = new Date(val as string)
              if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const dd = String(d.getDate()).padStart(2, '0')
                val = `${yyyy}-${mm}-${dd}`
              }
            } catch (err) {
              // fallback if invalid date
            }
          }
          obj[f.label] = val
        })
        return obj
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')

      const modeLabel =
        exportMode === 'all'
          ? 'Semua'
          : exportMode === 'date'
            ? 'ByTanggal'
            : `Hal${safePage}`
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `TrackingDatabase_${modeLabel}_${dateStr}.xlsx`)

      setShowExportModal(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      alert(message ?? 'Gagal export data')
    } finally {
      setExporting(false)
    }
  }

  const handleExportToSheets = async () => {
    if (exportMode === 'date' && !exportStartDate && !exportEndDate) {
      alert('Silakan pilih minimal salah satu tanggal (mulai atau akhir)')
      return
    }

    setExporting(true)
    try {
      let allRows: TrackingRow[] = []

      if (exportMode === 'pagination') {
        allRows = rows
      } else {
        const qs = new URLSearchParams()
        qs.set('limit', '999999')
        qs.set('page', '1')

        bulan.forEach((v) => qs.append('bulan', v))
        produk.forEach((v) => qs.append('produk', v))
        merek.forEach((v) => qs.append('merek', v))
        perusahaan.forEach((v) => qs.append('perusahaan', v))
        provinsi.forEach((v) => qs.append('provinsi', v))
        kota.forEach((v) => qs.append('kota', v))
        tipe.forEach((v) => qs.append('tipe', v))

        const formatDisplayDate = (dateStr: string) => {
          const d = new Date(dateStr)
          return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
        }

        if (exportMode === 'date') {
          if (exportStartDate)
            qs.set('startDate', formatDisplayDate(exportStartDate))
          if (exportEndDate) qs.set('endDate', formatDisplayDate(exportEndDate))
        }

        const res = await fetch(`/api/tracking-database?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        allRows = Array.isArray(json?.items) ? json.items : []
      }

      if (allRows.length === 0) {
        alert('Tidak ada data untuk di-export')
        return
      }

      const selectedFields = EXPORT_FIELDS.filter((f) =>
        exportFields.has(f.key),
      )
      const headers = ['No', ...selectedFields.map((f) => f.label)]
      const sheetRows = allRows.map((row, idx) => {
        const rowData: (string | number | boolean | null)[] = [idx + 1]
        selectedFields.forEach((f) => {
          let val = row[f.key] ?? ''
          if ((f.key === 'created_at' || f.key === 'updated_at') && val) {
            try {
              const d = new Date(val as string)
              if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear()
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const dd = String(d.getDate()).padStart(2, '0')
                val = `${yyyy}-${mm}-${dd}`
              }
            } catch (err) {
              // fallback
            }
          }
          rowData.push(val)
        })
        return rowData
      })

      const modeLabel =
        exportMode === 'all'
          ? 'Semua'
          : exportMode === 'date'
            ? 'ByTanggal'
            : `Hal${safePage}`
      const title = `TrackingDatabase_${modeLabel}`

      await exportToSheets(title, headers, sheetRows)
      setShowExportModal(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      alert(message ?? 'Gagal export ke Google Sheets')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-3 sm:p-6'>
          <div className='bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <h4 className='text-[17px] sm:text-[20px] mb-1 font-extrabold text-(--gray-800) m-0 tracking-[-0.5px]'>
                  Database Tracking
                </h4>
                <p className='text-xs sm:text-sm ml-1 text-slate-500 font-medium'>
                  Monitor dan kelola seluruh data entitas dengan filter cerdas
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className='flex items-center gap-2 h-10 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors shrink-0'
              >
                <Download size={16} strokeWidth={2.5} />
                Export Data
              </button>
            </div>
          </div>

          {/* Section Filter Data Cerdas */}
          <section className='bg-white rounded-xl shadow-sm border border-gray-200'>
            {/* Header - biru cerah seperti gambar */}
            <div className='bg-[#2563eb] text-white px-3 sm:px-5 h-10 flex items-center justify-between rounded-t-xl gap-2'>
              <div className='flex items-center gap-1.5 sm:gap-2 min-w-0'>
                <Filter
                  size={13}
                  strokeWidth={2.5}
                  className='text-white shrink-0'
                />
                <strong className='text-[10px] sm:text-[11px] font-bold tracking-wide whitespace-nowrap'>
                  Filter Data Cerdas
                </strong>
                <span className='text-[9px] sm:text-[10px] text-blue-200 font-normal hidden sm:inline'>
                  (Multi-pilih, cascading dinamis)
                </span>
              </div>
              <button
                className='bg-white text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer shadow-sm shrink-0'
                aria-label={isFilterOpen ? 'Tutup filter' : 'Buka filter'}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <ChevronDown
                  size={14}
                  strokeWidth={2.5}
                  className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Konten Filter */}
            <div
              className='p-3 sm:p-4 flex flex-col gap-3'
              style={{ display: isFilterOpen ? 'flex' : 'none' }}
            >
              {/* Baris 1: Filter Tanggal Input - putih bersih */}
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
                <div className='flex items-center text-xs font-semibold text-gray-600 min-w-max'>
                  <Calendar
                    size={14}
                    className='mr-1.5 text-blue-500'
                    strokeWidth={2.5}
                  />
                  Tanggal Input:
                </div>
                <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <input
                    type='date'
                    className='flex-1 sm:flex-none sm:w-30 text-xs h-8 px-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
                    placeholder='mm/dd/yyyy'
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setPage(1)
                      setSelected(null)
                    }}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker()
                      }
                    }}
                  />
                  <span className='text-gray-400 font-semibold'>-</span>
                  <input
                    type='date'
                    className='flex-1 sm:flex-none sm:w-30 text-xs h-8 px-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
                    placeholder='mm/dd/yyyy'
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setPage(1)
                      setSelected(null)
                    }}
                    onClick={(e) => {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker()
                      }
                    }}
                  />
                </div>
              </div>

              {/* Baris 2: Tombol Filter dengan Dropdown */}
              <div
                ref={dropdownRef}
                className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 w-full'
              >
                {filterButtons.map((btn) => {
                  const IconComponent = btn.icon
                  const activeArr = getFilterArr(btn.id)
                  const count = activeArr.length
                  const isActive = count > 0
                  const opts = getOptions(btn.id) ?? []
                  const search = dropdownSearch[btn.id] ?? ''
                  const filtered = search
                    ? opts.filter((o) => {
                        const display = btn.id === 'Bulan' ? formatBulan(o) : o
                        return display
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      })
                    : opts
                  const allSelected =
                    opts.length > 0 && opts.every((o) => activeArr.includes(o))
                  const isOpen = openDropdown === btn.id
                  return (
                    <div key={btn.id} className='relative'>
                      {/* Trigger button - pill putih, border highlight biru saat diklik */}
                      <button
                        type='button'
                        onClick={() => setOpenDropdown(isOpen ? null : btn.id)}
                        className={`w-full flex items-center justify-between gap-1 py-[7px] px-3 text-[11px] font-semibold rounded-lg cursor-pointer ${
                          isOpen
                            ? 'border-2 border-blue-500 bg-white text-blue-600 shadow-md'
                            : isActive
                              ? 'border-2 border-blue-400 bg-white text-blue-700'
                              : 'border border-slate-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        <span className='flex items-center gap-1.5 min-w-0'>
                          <IconComponent
                            size={11}
                            className={`shrink-0 ${isOpen || isActive ? 'text-blue-500' : 'text-gray-400'}`}
                            strokeWidth={2}
                          />
                          <span className='truncate'>{btn.label}</span>
                        </span>
                        <span className='flex items-center gap-1 shrink-0'>
                          {isActive && (
                            <span className='inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold'>
                              {count}
                            </span>
                          )}
                          <ChevronDown
                            size={14}
                            strokeWidth={2.5}
                            className={`ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      {/* Dropdown panel - to front, shadow kuat */}
                      {isOpen && (
                        <div
                          className='absolute top-[calc(100%+4px)] left-0 z-[9999] w-56 bg-white rounded-lg flex flex-col'
                          style={{
                            boxShadow:
                              '0 12px 40px -4px rgba(0,0,0,0.2), 0 4px 12px -2px rgba(0,0,0,0.08)',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {/* Search langsung, tanpa header */}
                          <div className='px-2 pt-2 pb-1'>
                            <input
                              autoFocus
                              type='text'
                              placeholder='Cari...'
                              value={search}
                              onChange={(e) =>
                                setDropdownSearch((prev) => ({
                                  ...prev,
                                  [btn.id]: e.target.value,
                                }))
                              }
                              className='w-full text-[11px] px-2 py-1.5 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400'
                            />
                          </div>
                          {/* Semua / Hapus */}
                          <div className='flex items-center gap-1 px-2 pb-1'>
                            <button
                              type='button'
                              onClick={() => selectAllFilter(btn.id, opts)}
                              className='flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-1'
                            >
                              ✓ Semua
                            </button>
                            <span className='text-gray-300'>|</span>
                            <button
                              type='button'
                              onClick={() => clearFilterArr(btn.id)}
                              className='flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-700 px-1'
                            >
                              X Hapus
                            </button>
                          </div>
                          {/* Option list */}
                          <div
                            className='max-h-48 overflow-y-auto border-t border-gray-100'
                            style={{ scrollbarWidth: 'thin' }}
                          >
                            {filtered.length === 0 ? (
                              <div className='px-3 py-2 text-[10px] text-slate-400 text-center'>
                                Tidak ada data
                              </div>
                            ) : (
                              filtered.map((opt) => {
                                const checked = activeArr.includes(opt)
                                return (
                                  <label
                                    key={opt}
                                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50 ${checked ? 'bg-blue-50/60' : ''}`}
                                  >
                                    <input
                                      type='checkbox'
                                      checked={checked}
                                      onChange={() =>
                                        toggleFilterVal(btn.id, opt)
                                      }
                                      className='accent-blue-600 w-3.5 h-3.5 shrink-0'
                                    />
                                    <span
                                      className={`text-[11px] truncate ${checked ? 'font-semibold text-blue-700' : 'text-slate-700'}`}
                                    >
                                      {btn.id === 'Bulan'
                                        ? formatBulan(opt)
                                        : opt}
                                    </span>
                                  </label>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Hint info row */}
              <div className='flex items-center gap-1.5 text-[10px] text-slate-400'>
                <span className='text-blue-400'>ⓘ</span>
                Klik tombol filter → centang pilihan. Bisa pilih lebih dari
                satu.
                {(filterButtons.some((b) => getFilterArr(b.id).length > 0) ||
                  startDate ||
                  endDate) && (
                  <span className='text-blue-600 font-semibold ml-1'>
                    Menampilkan {total.toLocaleString()} data
                  </span>
                )}
              </div>

              {/* ---- Chips row: active selections ---- */}
              {filterButtons.some((b) => getFilterArr(b.id).length > 0) && (
                <div className='flex flex-wrap gap-1 mt-0.5'>
                  {filterButtons.flatMap((btn) =>
                    getFilterArr(btn.id).map((val) => (
                      <span
                        key={`${btn.id}-${val}`}
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200'
                      >
                        {btn.label}:{' '}
                        {btn.id === 'Bulan' ? formatBulan(val) : val}
                        <button
                          type='button'
                          onClick={() => toggleFilterVal(btn.id, val)}
                          className='hover:text-red-500 ml-0.5'
                        >
                          <X size={9} />
                        </button>
                      </span>
                    )),
                  )}
                  <button
                    type='button'
                    onClick={() =>
                      filterButtons.forEach((b) => clearFilterArr(b.id))
                    }
                    className='text-[10px] text-red-500 hover:text-red-700 font-semibold ml-1'
                  >
                    Reset Semua
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className='bg-white mt-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
            {/* Header Biru Filter */}
            <div className='bg-[#1E3B62] text-white px-3 sm:px-6 h-10 flex items-center justify-between gap-2'>
              <div className='flex items-center min-w-0'>
                <BarChart2
                  size={12}
                  className='mr-1.5 sm:mr-2 shrink-0'
                  strokeWidth={2.5}
                />
                <strong className='text-[9px] sm:text-[10px] font-bold tracking-wide whitespace-nowrap'>
                  Analis Data
                </strong>
                <span className='text-[8px] sm:text-[9px] ml-1 sm:ml-2 text-blue-100 font-normal tracking-wide hidden sm:inline'>
                  (Klik baris tabel analisa untuk filter data)
                </span>
              </div>
              <button
                className='bg-white text-blue-600 p-1 rounded hover:bg-slate-50 transition-colors shadow-sm cursor-pointer shrink-0'
                aria-label={isFilterOpen2 ? 'Tutup filter' : 'Buka filter'}
                onClick={() => setIsFilterOpen2(!isFilterOpen2)}
              >
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  className={`transition-transform duration-200 ${isFilterOpen2 ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Konten Filter */}
            <div
              className='p-3 sm:p-4 gap-3'
              style={{
                display: isFilterOpen2 ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <div className='flex flex-col sm:flex-row gap-3 w-full'>
                {/* Card 2: Total Data Unik */}
                <div className='w-full md:w-full'>
                  <div className='flex flex-col border-0 h-full border-l-4 border-l-[#2563eb] bg-[#f8fbff] rounded-lg shadow-sm'>
                    <div className='py-2 px-3 flex flex-col justify-between'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-full flex items-center justify-center text-white shrink-0 w-9 h-9 bg-linear-to-br from-[#2563eb] to-[#1e40af]'>
                            <Users size={14} className='text-white' />
                          </div>
                          <div>
                            <div className='font-bold text-[12px] text-[#1e293b]'>
                              Total Data Unik
                            </div>
                            <div className='text-[10px] text-slate-500'>
                              No HP + Nama Entitas (kol. T & E)
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div
                            className='font-bold text-[1.8rem] leading-none text-blue-600'
                            id='statTotalUnik'
                          >
                            {loading ? '...' : (stats?.total_kontak_unik ?? 0)}
                          </div>
                          <div className='text-[10px] text-slate-500'>
                            kontak unik
                          </div>
                        </div>
                      </div>
                      <div className='w-full bg-[#dbeafe] rounded-full h-0.75 mt-2'>
                        <div className='bg-blue-600 h-0.75 rounded-full w-full'></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Total Kontak WA Unik */}
                <div className='w-full md:w-full'>
                  <div className='flex flex-col border-0 h-full border-l-4 border-l-[#16a34a] bg-[#f0fdf4] rounded-lg shadow-sm'>
                    <div className='py-2 px-3 flex flex-col justify-between'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='rounded-full flex items-center justify-center text-white shrink-0 w-9 h-9 bg-gradient-to-br from-[#16a34a] to-[#15803d]'>
                            <PhoneCallIcon
                              size={14}
                              className='text-white'
                              strokeWidth={2.5}
                            />
                          </div>
                          <div>
                            <div className='font-bold text-[12px] text-[#1e293b]'>
                              Total Kontak WA Unik
                            </div>
                            <div className='text-[10px] text-slate-500'>
                              Tipe Kontak WA / WhatsApp (kol. U)
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div
                            className='font-bold text-[1.8rem] leading-none text-green-600'
                            id='statWaUnik'
                          >
                            {loading ? '...' : (stats?.total_wa_unik ?? 0)}
                          </div>
                          <div className='text-[10px] text-slate-500'>
                            <span id='statWaPct'>
                              {loading || !stats
                                ? '...'
                                : stats.total_kontak_unik > 0
                                  ? Math.round(
                                      (stats.total_wa_unik /
                                        stats.total_kontak_unik) *
                                        100,
                                    )
                                  : 0}
                            </span>
                            % dari total
                          </div>
                        </div>
                      </div>
                      <div className='w-full bg-green-200 rounded-full h-[3px] mt-2 flex'>
                        <div
                          className='bg-green-600 h-[3px] rounded-full transition-all duration-700'
                          id='progWaUnik'
                          style={{
                            width:
                              loading || !stats || stats.total_kontak_unik === 0
                                ? '0%'
                                : `${Math.round((stats.total_wa_unik / stats.total_kontak_unik) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className='flex flex-col sm:flex-row gap-3 w-full px-3 sm:px-4 pb-3 sm:pb-4'
              style={{ display: isFilterOpen2 ? 'flex' : 'none' }}
            >
              {/* Panel Kiri: Data Unik per Provinsi & Kota */}
              <div className='flex flex-col flex-1 rounded-lg border border-blue-100 overflow-hidden shadow-sm'>
                {/* Header Panel Kiri */}
                <div
                  className='flex items-center justify-between px-3 py-[6px]'
                  style={{
                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                    borderBottom: '2px solid #2563eb',
                  }}
                >
                  <div className='flex items-center gap-1.5'>
                    <MapPinCheck
                      size={13}
                      className='text-blue-600 shrink-0'
                      strokeWidth={2.5}
                    />
                    <span className='text-[11px] font-bold text-[#1e293b]'>
                      Data Unik per Provinsi &amp; Kota
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                    <span
                      id='statProvinsiRows'
                      className='font-semibold text-blue-700'
                    >
                      {loading ? '...' : (stats?.provinsi_kota.length ?? 0)}
                    </span>
                    <span>baris</span>
                    <span className='mx-0.5 text-slate-300'>|</span>
                    <span
                      id='statProvinsiTotal'
                      className='font-semibold text-blue-700'
                    >
                      {loading ? '...' : (stats?.total_kontak_unik ?? 0)}
                    </span>
                    <span>total</span>
                  </div>
                </div>
                {/* Tabel */}
                <div className='max-h-[230px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-blue-50 [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-blue-400'>
                  <table className='w-full text-left border-collapse'>
                    <thead className='sticky top-0 z-10 bg-[#f1f5f9]'>
                      <tr>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500 w-7'>
                          #
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                          Provinsi
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                          Kota/Kab
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500 text-right'>
                          Unik
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      id='tbodyProvinsiUnik'
                      className='divide-y divide-gray-100'
                    >
                      {loading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-2 py-4 text-center text-[10px] text-slate-400'
                          >
                            Memuat data...
                          </td>
                        </tr>
                      ) : (stats?.provinsi_kota ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-2 py-4 text-center text-[10px] text-slate-400'
                          >
                            Tidak ada data
                          </td>
                        </tr>
                      ) : (
                        (stats?.provinsi_kota ?? []).map((row) => (
                          <tr
                            key={row.no}
                            onClick={() => {
                              setProvinsi([row.provinsi])
                              setKota([row.kota])
                              setPage(1)
                              setSelected(null)
                            }}
                            className={`transition-colors cursor-pointer ${
                              provinsi.includes(row.provinsi) &&
                              kota.includes(row.kota)
                                ? 'bg-blue-100 ring-1 ring-inset ring-blue-400'
                                : 'hover:bg-blue-50/70'
                            }`}
                          >
                            <td className='px-2 py-1.5 text-[10px] text-slate-400'>
                              {row.no}
                            </td>
                            <td className='px-2 py-1.5 text-[10px] text-slate-700 font-medium'>
                              {row.provinsi}
                            </td>
                            <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                              <div className='flex items-center gap-1.5'>
                                <span>{row.kota}</span>
                                <div className='flex-1 min-w-[36px] bg-blue-100 rounded-full h-[4px] overflow-hidden'>
                                  <div
                                    className='bg-blue-500 h-full rounded-full'
                                    style={{ width: `${row?.unik}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className='px-2 py-1.5 text-right'>
                              <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white'>
                                {row.unik}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Panel Kanan: Kontak WA Unik per Provinsi & Kota */}
              <div className='flex flex-col flex-1 rounded-lg border border-green-100 overflow-hidden shadow-sm'>
                {/* Header Panel Kanan */}
                <div
                  className='flex items-center justify-between px-3 py-[6px]'
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    borderBottom: '2px solid #16a34a',
                  }}
                >
                  <div className='flex items-center gap-1.5'>
                    <PhoneCallIcon
                      size={13}
                      className='text-green-600 shrink-0'
                      strokeWidth={2.5}
                    />
                    <span className='text-[11px] font-bold text-[#1e293b]'>
                      Kontak WA Unik per Provinsi &amp; Kota
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                    <span
                      id='statWaProvinsiRows'
                      className='font-semibold text-green-700'
                    >
                      {loading ? '...' : (stats?.wa_provinsi_kota.length ?? 0)}
                    </span>
                    <span>baris</span>
                    <span className='mx-0.5 text-slate-300'>|</span>
                    <span
                      id='statWaProvinsiTotal'
                      className='font-semibold text-green-700'
                    >
                      {loading ? '...' : (stats?.total_wa_unik ?? 0)}
                    </span>
                    <span>total</span>
                  </div>
                </div>
                {/* Tabel */}
                <div className='max-h-[230px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-green-50 [&::-webkit-scrollbar-thumb]:bg-green-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-green-400'>
                  <table className='w-full text-left border-collapse'>
                    <thead className='sticky top-0 z-10 bg-[#f1f5f9]'>
                      <tr>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500 w-7'>
                          #
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                          Provinsi
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500'>
                          Kota/Kab
                        </th>
                        <th className='px-2 py-1.5 text-[10px] font-semibold text-slate-500 text-right'>
                          WA Unik
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      id='tbodyWaProvinsi'
                      className='divide-y divide-gray-100'
                    >
                      {loading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-2 py-4 text-center text-[10px] text-slate-400'
                          >
                            Memuat data...
                          </td>
                        </tr>
                      ) : (stats?.wa_provinsi_kota ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-2 py-4 text-center text-[10px] text-slate-400'
                          >
                            Tidak ada data
                          </td>
                        </tr>
                      ) : (
                        (stats?.wa_provinsi_kota ?? []).map((row) => (
                          <tr
                            key={row.no}
                            onClick={() => {
                              setProvinsi([row.provinsi])
                              setKota([row.kota])
                              setTipe(['WhatsApp'])
                              setPage(1)
                              setSelected(null)
                            }}
                            className={`transition-colors cursor-pointer ${
                              provinsi.includes(row.provinsi) &&
                              kota.includes(row.kota) &&
                              tipe.includes('WhatsApp')
                                ? 'bg-green-100 ring-1 ring-inset ring-green-400'
                                : 'hover:bg-green-50/70'
                            }`}
                          >
                            <td className='px-2 py-1.5 text-[10px] text-slate-400'>
                              {row.no}
                            </td>
                            <td className='px-2 py-1.5 text-[10px] text-slate-700 font-medium'>
                              {row.provinsi}
                            </td>
                            <td className='px-2 py-1.5 text-[10px] text-slate-600'>
                              <div className='flex items-center gap-1.5'>
                                <span>{row.kota}</span>
                                <div className='flex-1 min-w-[36px] bg-green-100 rounded-full h-[4px] overflow-hidden'>
                                  <div
                                    className='bg-green-500 h-full rounded-full'
                                    style={{ width: `${row?.unik}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className='px-2 py-1.5 text-right'>
                              <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-600 text-white'>
                                {row.unik}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
          {/* {Table 3} */}
          <div className='mt-4 overflow-hidden rounded-2xl bg-blue shadow-sm ring-1 ring-gray-200'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-left items-center bg-transparent lg:bg-white block lg:table'>
                <thead className='bg-blue-600 justify-center hidden lg:table-header-group'>
                  <tr>
                    {[
                      { label: 'No' },
                      { label: '⚙ Aksi' },
                      { label: 'KODE' },
                      { label: '🏢 NAMA PERUSAHAAN' },
                      { label: '📍 KOTA' },
                      { label: '🗺️ PROVINSI' },
                      { label: '📦 PRODUK' },
                      { label: '👨‍💼 PIC' },
                      { label: '💼 JABATAN' },
                      { label: '📞 TELP' },
                      { label: '📱 TIPE' },
                    ].map((h, index) => (
                      <th
                        key={index}
                        className='px-5 py-3 text-[10px] font-semibold text-white'
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className='divide-y lg:divide-gray-300 block lg:table-row-group'>
                  {loadingRows ? (
                    <tr>
                      <td
                        colSpan={11}
                        className='px-6 py-8 text-center text-[10px] text-gray-500'
                      >
                        <div className='flex justify-center items-center gap-2'>
                          <span className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></span>
                          <span>Memuat Data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className='px-6 py-8 text-center text-[10px] text-gray-500'
                      >
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => {
                      const active = selected?._id === row._id
                      return (
                        <React.Fragment key={row._id}>
                          <tr
                            key={row.kode + i}
                            className='block lg:table-row mb-4 lg:mb-0 bg-white rounded-xl lg:rounded-none shadow-md lg:shadow-none border border-gray-200 lg:border-b lg:border-t-0 lg:border-x-0 p-3 lg:p-0 hover:bg-blue-50/50 transition-colors cursor-pointer relative overflow-hidden'
                          >
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5.5 sm:py-2 text-[10px] text-slate-500 sm:whitespace-nowrap border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                No
                              </span>
                              <span>{(safePage - 1) * pageSize + i + 1}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-4 sm:py-2 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400 text-[10px]'>
                                ⚙ Aksi
                              </span>
                              <div className='flex items-center gap-1.5'>
                                <button
                                  title='Lihat Detail'
                                  onClick={() =>
                                    setSelected(
                                      selected?._id === row._id ? null : row,
                                    )
                                  }
                                  className={cn(
                                    'inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 cursor-pointer',
                                    selected?._id === row._id
                                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-300'
                                      : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white',
                                  )}
                                >
                                  <EyeIcon size={12} strokeWidth={2.2} />
                                </button>
                                <button
                                  title='Revisi Data'
                                  onClick={() =>
                                    router.push(
                                      `/input-database?id=${encodeURIComponent(row.kode)}`,
                                    )
                                  }
                                  className='inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-400 text-gray-900 hover:bg-amber-500 transition-all duration-150 cursor-pointer shadow-sm shadow-amber-200'
                                >
                                  <LucidePenBox size={12} strokeWidth={2.2} />
                                </button>
                              </div>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-3.5 lg:py-3 text-[10px] text-blue-700 font-[Plus Jakarta Sans] border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                KODE
                              </span>
                              <span>{row.kode}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-700 font-medium border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                🏢 NAMA PERUSAHAAN
                              </span>
                              <span className='text-right'>
                                {row.nama_perusahaan}
                              </span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                📍 KOTA
                              </span>
                              <span className='text-right'>{row.kota}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                🗺️ PROVINSI
                              </span>
                              <span className='text-right'>{row.provinsi}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                📦 PRODUK
                              </span>
                              <span className='text-right'>{row.produk}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-700 font-medium border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                👨‍💼 PIC
                              </span>
                              <span className='text-right'>{row.pic}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-600 border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                💼 JABATAN
                              </span>
                              <span className='text-right'>{row.jabatan}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] text-slate-600 font-mono border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                📞 TELP
                              </span>
                              <span>{row.telp}</span>
                            </td>
                            <td className='flex justify-between items-center px-1 py-1.5 sm:px-5 lg:py-3 text-[10px] border-b border-dashed border-gray-100 lg:border-0 lg:table-cell'>
                              <span className='lg:hidden font-bold text-gray-400'>
                                📱 TIPE
                              </span>
                              <button
                                onClick={() => handleWhatsAppClick(row.telp)}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full cursor-pointer transition-all duration-150 hover:opacity-50 text-[9px] font-bold ${
                                  row.tipe === 'WhatsApp'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {row.tipe}
                              </button>
                            </td>
                          </tr>
                          {active && (
                            <tr className='bg-blue-50/20 block lg:table-row -mt-4 lg:mt-0 mb-4 lg:mb-0 border border-t-0 sm:border-t rounded-b-xl lg:rounded-none border-blue-200 lg:border-0 relative z-10 lg:z-auto shadow-md lg:shadow-none'>
                              <td
                                colSpan={11}
                                className='block lg:table-cell px-2 sm:px-4 py-2 lg:py-3 border-b border-blue-100'
                              >
                                <div className='rounded-xl bg-white shadow-sm ring-1 ring-blue-100 overflow-hidden'>
                                  {/* ── Header bar ── */}
                                  <div className='flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100'>
                                    <div className='flex items-center gap-2'>
                                      <span className='grid h-5.5 w-4.5 place-items-center rounded-xl bg-blue-600 text-white text-[9px]'>
                                        ℹ
                                      </span>
                                      <span className='text-[12px] font-extrabold text-blue-700 tracking-tight'>
                                        Detail Informasi Lengkap
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/input-database?id=${encodeURIComponent(selected.kode)}`,
                                        )
                                      }
                                      className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-gray-900 text-[10px] font-bold transition-all duration-150 shadow-sm cursor-pointer'
                                    >
                                      <LucidePenBox
                                        size={11}
                                        strokeWidth={2.5}
                                      />
                                      Revisi Data Ini
                                    </button>
                                  </div>

                                  {/* ── Main 3-column grid ── */}
                                  <div className='grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 px-5 py-4'>
                                    {/* COL 1 */}
                                    <div className='flex flex-col gap-2.5'>
                                      <DetailItem
                                        icon='📅'
                                        label='Tanggal Input'
                                        value={
                                          selected.created_at
                                            ? new Date(selected.created_at)
                                                .toLocaleDateString('sv-SE', {
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  second: '2-digit',
                                                  hour12: false,
                                                })
                                                .replace('pukul', '')
                                                .replace(' ', ' ')
                                                .trim()
                                            : '-'
                                        }
                                      />
                                      <DetailItem
                                        icon='👤'
                                        label='Penginput'
                                        value={selected.requestor}
                                      />
                                      <DetailItem
                                        icon='🏷'
                                        label='Jenis Entitas'
                                        value={selected.segmen}
                                      />
                                      <DetailItem
                                        icon='🔖'
                                        label='Segmentasi'
                                        value={selected.segmentasi}
                                      />
                                      <DetailItem
                                        icon='🏭'
                                        label='Bidang Usaha'
                                        value={selected.bidang_perusahaan}
                                      />
                                    </div>

                                    {/* COL 2 */}
                                    <div className='flex flex-col gap-2.5'>
                                      <DetailItem
                                        icon='📂'
                                        label='Sumber Data'
                                        value={selected.sumber_data}
                                      />
                                      <DetailItem
                                        icon='📎'
                                        label='Sumber Lain'
                                        value={
                                          selected.sumber_data ===
                                          'Sales Internal'
                                            ? selected.sales_internal
                                            : '-'
                                        }
                                      />
                                      <DetailItem
                                        icon='🎯'
                                        label='Merek Tayang'
                                        value={
                                          selected.merek_tayang === 'Lainnya'
                                            ? selected.merek_lainnya
                                            : selected.merek_tayang
                                        }
                                      />
                                      <DetailItem
                                        icon='👑'
                                        label='Brand Owner'
                                        value={selected.brand_owner}
                                      />
                                      <DetailItem
                                        icon='✉️'
                                        label='Email PIC'
                                        value={selected.email}
                                      />
                                    </div>

                                    {/* COL 3 */}
                                    <div className='flex flex-col gap-2.5'>
                                      <DetailItem
                                        icon='🔗'
                                        label='Link Produk'
                                        value={selected.link_produk}
                                        isLink
                                      />
                                      <DetailItem
                                        icon='🛒'
                                        label='Link Toko'
                                        value={selected.link_toko}
                                        isLink
                                      />
                                      <DetailItem
                                        icon='🕒'
                                        label='Tanggal Update'
                                        value={selected.updated_at}
                                      />
                                      {/* Keterangan Update — Riwayat Revisi Terbaru */}
                                      <div className='flex items-start gap-1.5 min-w-0 col-span-1'>
                                        <span className='mt-[1px] shrink-0 text-[11px] leading-none'>
                                          📝
                                        </span>
                                        <div className='flex flex-col min-w-0'>
                                          <span className='text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1'>
                                            Keterangan Update:
                                          </span>
                                          {loadingRevision ? (
                                            <span className='text-[10px] text-slate-400 italic'>
                                              Memuat riwayat...
                                            </span>
                                          ) : !latestRevision ||
                                            !latestRevision.found ? (
                                            <span className='text-[10px] text-slate-300 italic'>
                                              Belum ada riwayat revisi
                                            </span>
                                          ) : (
                                            <div className='flex flex-col gap-1'>
                                              <span className='text-[10px] text-slate-600 font-medium'>
                                                Direvisi oleh{' '}
                                                <span className='text-blue-600 font-bold'>
                                                  {latestRevision.revised_by}
                                                </span>
                                                {latestRevision.revised_at && (
                                                  <>
                                                    {' '}
                                                    pada{' '}
                                                    {new Date(
                                                      latestRevision.revised_at,
                                                    ).toLocaleDateString(
                                                      'id-ID',
                                                      {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                      },
                                                    )}
                                                  </>
                                                )}
                                              </span>
                                              {latestRevision.changed_fields &&
                                                latestRevision.changed_fields
                                                  .length > 0 && (
                                                  <div className='flex flex-col gap-0.5 mt-0.5'>
                                                    {latestRevision.changed_fields.map(
                                                      (cf, i) => (
                                                        <div
                                                          key={i}
                                                          className='text-[9.5px] text-slate-600 leading-snug'
                                                        >
                                                          <span className='font-semibold text-slate-500'>
                                                            {cf.field}:
                                                          </span>{' '}
                                                          <span className='line-through text-red-400'>
                                                            {cf.oldValue || '-'}
                                                          </span>
                                                          {' → '}
                                                          <span className='text-green-600 font-semibold'>
                                                            {cf.newValue || '-'}
                                                          </span>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <DetailItem
                                        icon='📆'
                                        label='Bulan Data'
                                        value={formatBulanData(
                                          selected.created_at,
                                        )}
                                      />
                                    </div>
                                  </div>

                                  {/* ── Alamat full width ── */}
                                  {selected.alamat &&
                                    selected.alamat.trim() !== '' && (
                                      <div className='border-t border-gray-100 px-5 py-3'>
                                        <div className='flex items-start gap-2'>
                                          <span className='text-[11px] mt-0.5'>
                                            📍
                                          </span>
                                          <div>
                                            <span className='text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5'>
                                              Alamat Lengkap:
                                            </span>
                                            <span className='text-[10.5px] text-slate-700 font-medium'>
                                              {selected.alamat}
                                            </span>
                                          </div>
                                        </div>
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
          </div>

          {/* Pagination */}
          <section className='mt-4 sm:mt-6 flex flex-col gap-3 rounded-2xl bg-white px-3 sm:px-6 py-3 lg:py-4 shadow-sm ring-1 ring-blue-100'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <p className='text-xs sm:text-sm font-medium text-gray-700'>
                Showing <strong>{showingFrom}</strong> to{' '}
                <strong>{showingTo}</strong> of <strong>{total}</strong> entries
              </p>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className='h-8 sm:h-10 rounded-lg border border-blue-100 bg-white px-2 sm:px-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-200 w-full sm:w-auto'
              >
                <option value={10}>10 / Halaman</option>
                <option value={20}>20 / Halaman</option>
                <option value={50}>50 / Halaman</option>
                <option value={100}>100 / Halaman</option>
              </select>
            </div>
            <div className='flex items-center justify-center gap-1 sm:gap-2 flex-wrap'>
              <PageBtn onClick={() => gotoPage(1)} ariaLabel='First'>
                ⏮
              </PageBtn>
              <PageBtn onClick={() => gotoPage(page - 1)} ariaLabel='Previous'>
                ◀
              </PageBtn>

              {getPageWindow(safePage, totalPages, 5).map((p) => (
                <button
                  key={p}
                  type='button'
                  onClick={() => gotoPage(p)}
                  aria-label={p.toString()}
                  className={`grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl border text-xs sm:text-sm ${
                    p === safePage
                      ? 'border-blue-500 bg-blue-600 text-white font-bold'
                      : 'border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40'
                  }`}
                >
                  {p}
                </button>
              ))}

              <PageBtn onClick={() => gotoPage(page + 1)} ariaLabel='Next'>
                ▶
              </PageBtn>
              <PageBtn onClick={() => gotoPage(totalPages)} ariaLabel='Last'>
                ⏭
              </PageBtn>
            </div>
          </section>
          {/* Legend Footer */}
          <div className='flex flex-wrap items-center mt-4 gap-60 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500'>
            <span className='flex items-center gap-1'>
              👁<strong>Tombol Lihat Detail</strong>
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-full bg-amber-500'></span>
              Tombol <strong>Revisi Data</strong>
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-sm bg-gray-300'></span>
              <BarChart2Icon className='w-3 h-3 text-green-500' />
              Klik baris analisa untuk drill-down data
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-sm bg-gray-300'></span>
              Centang <strong>☑</strong> untuk submit massal
            </span>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-2xl w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto'>
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white rounded-t-2xl'>
              <div className='flex items-center gap-2'>
                <div className='grid h-8 w-8 place-items-center rounded-lg bg-green-600 text-white'>
                  <Download size={16} />
                </div>
                <div>
                  <h3 className='text-[15px] font-extrabold text-gray-800'>
                    Export Data
                  </h3>
                  <p className='text-[10px] text-slate-500'>
                    Pilih rentang tanggal dan kolom yang ingin di-export
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className='grid h-8 w-8 place-items-center rounded-lg hover:bg-gray-100 transition-colors'
              >
                <X size={18} className='text-gray-500' />
              </button>
            </div>

            {/* Body */}
            <div className='px-6 py-4 space-y-5'>
              {/* Export Mode Selection */}
              <div>
                <label className='text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2'>
                  🎯 Pilih Mode Export
                </label>
                <div className='grid grid-cols-3 gap-2'>
                  {[
                    {
                      id: 'all',
                      label: 'Semua Data',
                      desc: 'Tarik seluruh data',
                      icon: '📦',
                    },
                    {
                      id: 'date',
                      label: 'By Tanggal',
                      desc: 'Sesuai rentang tanggal',
                      icon: '📅',
                    },
                    {
                      id: 'pagination',
                      label: 'By Halaman',
                      desc: `Halaman ${safePage} aktif`,
                      icon: '📄',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type='button'
                      onClick={() => setExportMode(m.id as typeof exportMode)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-center transition-all',
                        exportMode === m.id
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-green-300',
                      )}
                    >
                      <span className='text-lg'>{m.icon}</span>
                      <span className='text-[11px] font-bold'>{m.label}</span>
                      <span className='text-[9px] text-slate-400'>
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Date Range */}
              {exportMode === 'date' && (
                <div>
                  <label className='text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2'>
                    📅 Rentang Tanggal Export
                  </label>
                  <div className='flex items-center gap-2'>
                    <input
                      type='date'
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker()
                        }
                      }}
                      className='flex-1 text-sm h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400'
                    />
                    <span className='text-gray-400 font-semibold text-sm'>
                      —
                    </span>
                    <input
                      type='date'
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker()
                        }
                      }}
                      className='flex-1 text-sm h-10 px-3 border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400'
                    />
                  </div>
                  <p className='text-[10px] text-slate-400 mt-1'>
                    Pilih minimal salah satu tanggal (mulai atau akhir)
                  </p>
                </div>
              )}

              {exportMode === 'pagination' && (
                <div className='px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-700'>
                  ℹ️ Akan export <strong>{rows.length} data</strong> yang sedang
                  tampil di halaman <strong>{safePage}</strong> ({pageSize}{' '}
                  data/halaman).
                </div>
              )}

              {exportMode === 'all' && (
                <div className='px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700'>
                  ⚠️ Akan tarik <strong>seluruh data</strong> tanpa batasan
                  tanggal. Filter kategori (Bulan/Produk/dll) yang aktif tetap
                  berlaku.
                </div>
              )}

              {/* Field Selection */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='text-xs font-bold text-gray-700 uppercase tracking-wider'>
                    📋 Pilih Kolom Export
                  </label>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() =>
                        setExportFields(
                          new Set(EXPORT_FIELDS.map((f) => f.key)),
                        )
                      }
                      className='text-[10px] font-semibold text-green-600 hover:text-green-800 px-2 py-0.5 rounded hover:bg-green-50'
                    >
                      ✓ Pilih Semua
                    </button>
                    <span className='text-gray-300'>|</span>
                    <button
                      type='button'
                      onClick={() => setExportFields(new Set())}
                      className='text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50'
                    >
                      ✕ Hapus Semua
                    </button>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-1.5 max-h-[280px] overflow-y-auto p-3 rounded-xl border border-gray-100 bg-gray-50/50'>
                  {EXPORT_FIELDS.map((f) => {
                    const checked = exportFields.has(f.key)
                    return (
                      <label
                        key={f.key}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-[12px]',
                          checked
                            ? 'bg-green-50 ring-1 ring-green-200 text-green-800 font-semibold'
                            : 'bg-white ring-1 ring-gray-100 text-gray-600 hover:ring-green-200 hover:bg-green-50/30',
                        )}
                      >
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={() => {
                            setExportFields((prev) => {
                              const next = new Set(prev)
                              if (next.has(f.key)) {
                                next.delete(f.key)
                              } else {
                                next.add(f.key)
                              }
                              return next
                            })
                          }}
                          className='accent-green-600 w-3.5 h-3.5 shrink-0'
                        />
                        {f.label}
                      </label>
                    )
                  })}
                </div>
                <p className='text-[10px] text-slate-400 mt-1.5'>
                  {exportFields.size} dari {EXPORT_FIELDS.length} kolom dipilih
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl'>
              <button
                onClick={() => setShowExportModal(false)}
                className='h-10 px-5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors'
              >
                Batal
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || exportFields.size === 0}
                className={cn(
                  'h-10 px-6 rounded-xl text-sm font-bold text-white shadow-sm transition-colors flex items-center gap-2',
                  exporting || exportFields.size === 0
                    ? 'bg-green-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700',
                )}
              >
                {exporting ? (
                  <>
                    <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Mengexport...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Excel
                  </>
                )}
              </button>
              <button
                onClick={handleExportToSheets}
                disabled={googleSheetsLoading || exportFields.size === 0}
                className={cn(
                  'h-10 px-6 rounded-xl text-sm font-bold text-white shadow-sm transition-colors flex items-center gap-2',
                  googleSheetsLoading || exportFields.size === 0
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700',
                )}
                title='Create a new Google Sheet with the data'
              >
                {googleSheetsLoading ? (
                  <>
                    <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Creating...
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    Google Sheets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className='grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl border border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40 text-xs sm:text-sm'
    >
      {children}
    </button>
  )
}
