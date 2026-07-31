'use client'
import {
  Calendar,
  Filter,
  Package,
  MessageCircleCodeIcon,
  Building2,
  MapPin,
  Users,
  Map as MapIcon,
  BarChart2,
  PhoneCallIcon,
  Phone,
  MapPinCheck,
  EyeIcon,
  Send,
  ChevronDown,
  X,
  PencilIcon,
  Download,
} from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import React from 'react'
import { listStatusByUpdate, getDetailOptions } from '@/data/statusupdatecall'
import * as XLSX from 'xlsx-js-style'
import { useExportToSheets } from '@/hooks/useExportToSheets'

type StatusCallSummary = {
  tidak_tersedia: number
  sedang_sibuk: number
  tidak_diangkat: number
  mailbox: number
  positif: number
  negatif: number
}

type BroadCastRow = {
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
  status_call: string
  detail_update: string
  created_at: string
  requestor: string
  ke_sales: string
}

type FilterOptions = {
  bulan: string[]
  perusahaan: string[]
  produk: string[]
  provinsi: string[]
  kota: string[]
  status_call: string[]
  ke_sales: string[]
}

type LatestRevision = {
  found: boolean
  code_input?: string
  revised_by?: string
  revised_at?: string
  changed_fields?: { field: string; oldValue: string; newValue: string }[]
  snapshot_before?: any
}

type ApiStats = {
  total_no_telp: number
  total_provinsi: number
  total_kota: number
  total_nama: number
  total_merek: number
  total_kontak_unik: number
  provinsi_kota: {
    no: number
    provinsi: string
    kota: string
    unik: number
    pct: number
  }[]
  call_provinsi_kota: {
    no: number
    provinsi: string
    kota: string
    unik: number
    pct: number
  }[]
  ke_sales_provinsi: {
    no: number
    ke_sales: string
    provinsi: string
    kota: string
    unik: number
    pct: number
  }[]
  per_sales: {
    no: number
    ke_sales: string
    unik: number
    pct: number
  }[]
}

type keSalesSummary = {
  arie: number
  beffry: number
  ferrie: number
  kosong: number
}

interface DataItem {
  id: string
  kode_input: string
  nama_perusahaan: string
  produk: string
  merek_tayang: string
  kota: string
  provinsi: string
  pic: string
  jabatan: string
  telp: string
  email: string
  alamat: string
  segmen: string
  segmentasi: string
  tipe: string
  bidang_perusahaan: string
  brand_owner: string
  sumber_data: string
  sumber_lain: string
  link_produk: string
  link_toko: string
  penginput: string
  jenis_entitas: string
  bulan_data: string
  status_call: string
  detail_update: string
  ke_sales: string
}

type ExportField = {
  key: keyof BroadCastRow
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
  { key: 'status_call', label: 'Status Call' },
  { key: 'detail_update', label: 'Detail Update' },
  { key: 'ke_sales', label: 'Ke Sales' },
]

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
  const Icon = icon ? (
    <span className='inline-flex items-center justify-center text-slate-400 text-xs mr-1.5'>
      {icon}
    </span>
  ) : null

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

export default function TrackingCallPage() {
  const filterButtons = [
    { id: 'Bulan', icon: Calendar, label: 'Bulan' },
    { id: 'Perusahaan', icon: Building2, label: 'Perusahaan' },
    { id: 'Produk', icon: Package, label: 'Produk' },
    { id: 'Provinsi', icon: MapIcon, label: 'Provinsi' },
    { id: 'Kota', icon: MapPin, label: 'Kota/Kab' },
    { id: 'Status Call', icon: PhoneCallIcon, label: 'Status Call' },
    { id: 'Detail Update', icon: PencilIcon, label: 'Detail Update' },
    { id: 'Ke Sales', icon: Users, label: 'Ke Sales' },
  ]

  const [statusCallSummary, setStatusCallSummary] = useState<StatusCallSummary>(
    {
      tidak_tersedia: 0,
      sedang_sibuk: 0,
      tidak_diangkat: 0,
      mailbox: 0,
      positif: 0,
      negatif: 0,
    },
  )

  const [keSalesSummary, setKeSalesSummary] = useState<keSalesSummary>({
    arie: 0,
    beffry: 0,
    ferrie: 0,
    kosong: 0,
  })
  // function selected broadcast
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSending, setisSending] = useState(false)

  // Select all: gunakan `rows` (state data yang sudah di-fetch)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(rows.map((r) => r._id))
    } else {
      setSelectedIds([])
    }
  }

  // Toggle satu checkbox per baris
  const handleSelectedOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }
  const handleFilterByStatus = (status: string) => {
    setStatusCall((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    )
    setPage(1)
    setSelected(null)
  }

  const handleKirimKeDatabase = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal satu data!')
      return
    }
    setisSending(true)
    try {
      const selectedRows = rows.filter((r) => selectedIds.includes(r._id))
      const results = await Promise.allSettled(
        selectedRows.map((row) =>
          fetch('/api/tracking-call/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_id: row._id,
              kode: row.kode,
              nama_perusahaan: row.nama_perusahaan,
              produk: row.produk,
              merek_tayang: row.merek_tayang,
              kota: row.kota,
              provinsi: row.provinsi,
              pic: row.pic,
              jabatan: row.jabatan,
              telp: row.telp,
              email: row.email,
              alamat: row.alamat,
              segmen: row.segmen,
              segmentasi: row.segmentasi,
              tipe: row.tipe,
              bidang_perusahaan: row.bidang_perusahaan,
              brand_owner: row.brand_owner,
              sumber_date: row.sumber_date,
              sumber_lain: row.sumber_lain,
              link_produk: row.link_produk,
              link_toko: row.link_toko,
              penginput: row.penginput,
              jenis_entitas: row.jenis_entitas,
              bulan_data: row.bulan_data,
              status_call: row.status_call,
              detail_update: row.detail_update,
              ke_sales: row.ke_sales,
              sent_at: new Date().toISOString(),
            }),
          }),
        ),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        alert(
          `⚠️ ${results.length - failed} berhasil, ${failed} gagal dikirim.`,
        )
      } else {
        alert(`✅ ${results.length} data berhasil dikirim!`)
        setSelectedIds([])
      }
    } catch (error) {
      console.error('Gagal mengirim data:', error)
      alert('Terjadi kesalahan saat mengirim data.')
    } finally {
      setisSending(false)
    }
  }

  // filter state
  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [isFilterOpen2, setIsFilterOpen2] = useState(true)

  // export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportMode, setExportMode] = useState<'all' | 'date' | 'pagination'>(
    'all',
  )
  const [exportFields, setExportFields] = useState<Set<keyof BroadCastRow>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  )
  const [exporting, setExporting] = useState(false)

  // Google Sheets export
  const { exportToSheets, loading: googleSheetsLoading } = useExportToSheets()

  // filter value - multi-select arrays
  const [bulan, setBulan] = useState<string[]>([])
  const [perusahaan, setPerusahaan] = useState<string[]>([])
  const [produk, setProduk] = useState<string[]>([])
  const [provinsi, setProvinsi] = useState<string[]>([])
  const [kota, setKota] = useState<string[]>([])
  const [statusCall, setStatusCall] = useState<string[]>([])
  const [toSales, setToSales] = useState<string[]>([])
  const [namaPic, setNamaPic] = useState<string[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // data - statistik & analitik
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ApiStats | null>(null)

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>(
    {},
  )
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    bulan: [],
    perusahaan: [],
    produk: [],
    provinsi: [],
    kota: [],
    status_call: [],
    ke_sales: [],
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<BroadCastRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState<BroadCastRow | null>(null)
  const [loadingRevision, setLoadingRevision] = useState(false)
  const [latestRevision, setLatestRevision] = useState<LatestRevision | null>(
    null,
  )

  // Baru setelah ini boleh ada useCallback yang pakai setRows
  const updateRowStatusCall = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status_call: value } : r)),
    )
  }

  const updateRowKeSales = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, ke_sales: value } : r)),
    )
  }

  const updateRowDetailUpdate = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, detail_update: value } : r)),
    )
  }

  // Kirim data satu baris ke database tracking_broadcast
  const [sendingRows, setSendingRows] = useState<Set<string>>(new Set())

  const handleSendRow = useCallback(
    async (row: BroadCastRow) => {
      if (sendingRows.has(row._id)) return
      setSendingRows((prev) => new Set(prev).add(row._id))
      try {
        const payload = {
          source_id: row._id,
          kode: row.kode,
          nama_perusahaan: row.nama_perusahaan,
          produk: row.produk,
          merek_tayang: row.merek_tayang,
          kota: row.kota,
          provinsi: row.provinsi,
          pic: row.pic,
          jabatan: row.jabatan,
          telp: row.telp,
          email: row.email,
          alamat: row.alamat,
          segmen: row.segmen,
          segmentasi: row.segmentasi,
          tipe: row.tipe,
          bidang_perusahaan: row.bidang_perusahaan,
          brand_owner: row.brand_owner,
          sumber_date: row.sumber_date,
          sumber_lain: row.sumber_lain,
          link_produk: row.link_produk,
          link_toko: row.link_toko,
          penginput: row.penginput,
          jenis_entitas: row.jenis_entitas,
          bulan_data: row.bulan_data,
          status_call: row.status_call,
          detail_update: row.detail_update,
          ke_sales: row.ke_sales,
          sent_at: new Date().toISOString(),
        }

        const res = await fetch('/api/tracking-call/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Gagal menyimpan data')
        }

        alert(`✅ Data "${row.nama_perusahaan}" berhasil dikirim!`)
      } catch (error) {
        console.error('[handleSendRow] Error:', error)
        alert(
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat mengirim data',
        )
      } finally {
        setSendingRows((prev) => {
          const s = new Set(prev)
          s.delete(row._id)
          return s
        })
      }
    },
    [sendingRows],
  )
  useEffect(() => {
    fetch('/api/tracking-call/filters')
      .then((r) => {
        if (!r.ok) throw new Error(`Filter API error: ${r.status}`)
        return r.json()
      })
      .then((data: FilterOptions) => setFilterOptions(data))
      .catch((err) => console.error('[filters fetch]', err))
  }, [])

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null)
      }
    }
    // Use 'mouseup' instead of 'mousedown' so the trigger button's onClick fires first
    document.addEventListener('mouseup', handleClickOutside)
    return () => document.removeEventListener('mouseup', handleClickOutside)
  }, [])

  // filter helpers
  const getFilterArr = useCallback(
    (id: string): string[] => {
      switch (id) {
        case 'Bulan':
          return bulan
        case 'Perusahaan':
          return perusahaan
        case 'Produk':
          return produk
        case 'Provinsi':
          return provinsi
        case 'Kota':
          return kota
        case 'Status Call':
          return statusCall
        case 'Ke Sales':
          return toSales
        default:
          return []
      }
    },
    [bulan, perusahaan, produk, provinsi, kota, statusCall, toSales],
  )

  // ✅ Sesudah — hapus dependency array
  const setFilterArr = (id: string, vals: string[]) => {
    switch (id) {
      case 'Bulan':
        setBulan(vals)
        break
      case 'Perusahaan':
        setPerusahaan(vals)
        break
      case 'Produk':
        setProduk(vals)
        break
      case 'Provinsi':
        setProvinsi(vals)
        break
      case 'Kota':
        setKota(vals)
        break
      case 'Status Call':
        setStatusCall(vals)
        break
      case 'Ke Sales':
        setToSales(vals)
        break
      default:
        return []
    }
    setPage(1)
    setSelected(null)
  }

  const toggleFilterVal = useCallback(
    (id: string, val: string) => {
      const cur = getFilterArr(id)
      setFilterArr(
        id,
        cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
      )
    },
    [getFilterArr, setFilterArr],
  )

  const clearFilterArr = (id: string) => {
    setFilterArr(id, [])
    setOpenDropdown(null)
  }

  const selectAllFilter = useCallback(
    (id: string, opts: string[]) => {
      setFilterArr(id, [...opts])
    },
    [setFilterArr],
  )

  // getOptions: tidak pakai useCallback supaya selalu baca filterOptions terbaru
  const getOptions = (id: string): string[] => {
    switch (id) {
      case 'Bulan':
        return filterOptions.bulan
      case 'Perusahaan':
        return filterOptions.perusahaan
      case 'Produk':
        return filterOptions.produk
      case 'Provinsi':
        return filterOptions.provinsi
      case 'Kota':
        return filterOptions.kota
      case 'Status Call':
        return filterOptions.status_call
      case 'Ke Sales':
        return filterOptions.ke_sales
      default:
        return []
    }
  }

  // ---- main data fetch (paginated rows) ----
  useEffect(() => {
    let mounted = true
      ; (async () => {
        setLoadingRows(true)
        if (!mounted) return

        const qs = new URLSearchParams()
        qs.set('limit', String(pageSize))
        qs.set('page', String(page))

        bulan.forEach((v) => qs.append('bulan', v))
        perusahaan.forEach((v) => qs.append('perusahaan', v))
        produk.forEach((v) => qs.append('produk', v))
        provinsi.forEach((v) => qs.append('provinsi', v))
        kota.forEach((v) => qs.append('kota', v))
        statusCall.forEach((v) => qs.append('status_call', v))
        toSales.forEach((v) => qs.append('ke_sales', v))
        if (startDate) qs.set('startDate', startDate)
        if (endDate) qs.set('endDate', endDate)

        try {
          const res = await fetch(`/api/tracking-call?${qs.toString()}`, {
            cache: 'no-store',
          })
          const json = await res.json().catch(() => ({}))
          if (!mounted) return

          setRows(Array.isArray(json?.items) ? json.items : [])
          setStatusCallSummary({
            tidak_tersedia: json?.statusCallSummary?.tidak_tersedia ?? 0,
            sedang_sibuk: json?.statusCallSummary?.sedang_sibuk ?? 0,
            tidak_diangkat: json?.statusCallSummary?.tidak_diangkat ?? 0,
            mailbox: json?.statusCallSummary?.mailbox ?? 0,
            positif: json?.statusCallSummary?.positif ?? 0,
            negatif: json?.statusCallSummary?.negatif ?? 0,
          })
          setStats({
            total_no_telp: json?.summaryStats?.total_no_telp ?? 0,
            total_provinsi: json?.summaryStats?.total_provinsi ?? 0,
            total_kota: json?.summaryStats?.total_kota ?? 0,
            total_nama: json?.summaryStats?.total_nama ?? 0,
            total_merek: json?.summaryStats?.total_merek ?? 0,
            total_kontak_unik: json?.summaryStats?.total_kontak_unik ?? 0,
            provinsi_kota: json?.summaryStats?.provinsi_kota ?? [],
            call_provinsi_kota: json?.summaryStats?.call_provinsi_kota ?? [],
            ke_sales_provinsi: json?.summaryStats?.ke_sales_provinsi ?? [],
            per_sales: json?.summaryStats?.per_sales ?? [],
          })
          setKeSalesSummary({
            arie: json?.keSalesSummary?.arie ?? 0,
            beffry: json?.keSalesSummary?.beffry ?? 0,
            ferrie: json?.keSalesSummary?.ferrie ?? 0,
            kosong: json?.keSalesSummary?.kosong ?? 0,
          })
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
    perusahaan,
    produk,
    provinsi,
    kota,
    statusCall,
    toSales,
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

  // export handler
  const handleExport = async () => {
    // validasi mode 'date' wajib isi tangggal
    if (exportMode === 'date' && !exportStartDate && !exportEndDate) {
      alert('Silakan pilih minimal salah satu tanggal (mulai atau akhir)')
      return
    }

    setExporting(true)
    try {
      let allRows: BroadCastRow[] = []

      if (exportMode === 'pagination') {
        // Mode Pagination : pakai data yang sedang tampil di tabel (rows state)
        allRows = rows
      } else {
        const qs = new URLSearchParams()
        qs.set('limit', String(pageSize))
        qs.set('page', String(page))
        qs.set('export', 'true')

        // Filter kategori tetap dipakai di semua mode (bulan, produk, dst)
        bulan.forEach((v) => qs.append('bulan', v))
        produk.forEach((v) => qs.append('produk', v))
        perusahaan.forEach((v) => qs.append('perusahaan', v))
        provinsi.forEach((v) => qs.append('provinsi', v))
        kota.forEach((v) => qs.append('kota', v))
        statusCall.forEach((v) => qs.append('status_call', v))
        toSales.forEach((v) => qs.append('ke_sales', v))
        namaPic.forEach((v) => qs.append('pic', v))

        if (exportMode === 'date') {
          // Mode by tanggal: pakai tanggal dari modal export (format YYYY-MM-DD)
          if (exportStartDate) qs.set('startDate', exportStartDate)
          if (exportEndDate) qs.set('endDate', exportEndDate)
        }
        // Mode 'all': tidak set startDate/endDate sama sekali → tarik semua data

        const res = await fetch(`/api/tracking-call/?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        allRows = Array.isArray(json?.items) ? json.items : []
      }

      if (allRows.length === 0) {
        alert('Tidak ada data untuk di export')
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
                const dd = String(d.getDay()).padStart(2, '0')
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
      XLSX.writeFile(wb, `TrackingCall_${modeLabel}_${dateStr}.xlsx`)

      setShowExportModal(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      alert(message ?? 'gagal export data')
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
      let allRows: BroadCastRow[] = []

      if (exportMode === 'pagination') {
        allRows = rows
      } else {
        const qs = new URLSearchParams()
        qs.set('limit', '50000')
        qs.set('page', '1')
        qs.set('export', 'true')

        bulan.forEach((v) => qs.append('bulan', v))
        produk.forEach((v) => qs.append('produk', v))
        perusahaan.forEach((v) => qs.append('perusahaan', v))
        provinsi.forEach((v) => qs.append('provinsi', v))
        kota.forEach((v) => qs.append('kota', v))
        statusCall.forEach((v) => qs.append('status_call', v))
        toSales.forEach((v) => qs.append('ke_sales', v))
        namaPic.forEach((v) => qs.append('pic', v))

        if (exportMode === 'date') {
          if (exportStartDate) qs.set('startDate', exportStartDate)
          if (exportEndDate) qs.set('endDate', exportEndDate)
        }

        const res = await fetch(`/api/tracking-call?${qs.toString()}`, {
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
      const title = `TrackingCall_${modeLabel}`

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
        <div className='flex-1 p-2 sm:p-4 md:p-6 max-w-full overflow-x-hidden'>
          <div className='bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <h4 className='text-[16px] sm:text-[20px] mb-1 font-extrabold text-(--gray-800) m-0 tracking-[-0.5px]'>
                  Tracking Call
                </h4>
                <p className='text-xs sm:text-sm ml-1 text-slate-500 font-medium'>
                  Monitor status pengiriman pesan
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
          <section className='bg-white rounded-xl shadow-sm border border-gray-200'>
            {/* Header - biru cerah seperti gambar */}
            <div className='bg-[#28207b] text-white px-5 h-10 flex items-center justify-between rounded-t-xl'>
              <div className='flex items-center gap-2'>
                <Filter size={13} strokeWidth={2.5} className='text-white' />
                <strong className='text-[11px] font-bold tracking-wide'>
                  Filter Data Call
                </strong>
                <span className='text-[10px] ml-1 text-blue-100 font-normal'>
                  (Multi-pilih, cascading dinamis)
                </span>
              </div>
              <button
                className='bg-white text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer shadow-sm'
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

            {/* {Konten Filter} */}
            <div
              className='p-4 flex flex-col gap-3'
              style={{ display: isFilterOpen ? 'flex' : 'none' }}
            >
              {/* Baris 1: Filter Tanggal Input */}
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
                <div className='flex items-center text-xs font-semibold text-gray-600 min-w-max'>
                  <Calendar
                    size={14}
                    className='mr-1.5 text-blue-500'
                    strokeWidth={2.5}
                  />
                  Tanggal Input:
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='date'
                    className='w-30 text-xs h-8 px-2 border border-slate-300 rounded-lg bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
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
                    className='w-30 text-xs h-8 px-2 border border-slate-300 rounded-lg cursor-pointer bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400'
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
                className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-nowrap gap-2 w-full'
              >
                {filterButtons.map((btn) => {
                  const IconComponent = btn.icon
                  const activeArr = getFilterArr(btn.id)
                  const count = activeArr.length
                  const isActive = count > 0
                  const opts = getOptions(btn.id)
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
                    <div
                      key={btn.id}
                      className='relative inline-block lg:flex-1 min-w-0'
                    >
                      {/* Trigger button - pill putih, border highlight biru saat diklik */}
                      <button
                        type='button'
                        onClick={() => setOpenDropdown(isOpen ? null : btn.id)}
                        className={`w-full flex items-center justify-between gap-1 py-[7px] px-3 text-[11px] font-semibold rounded-lg cursor-pointer ${isOpen
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
                            size={10}
                            className={`ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      {/* Dropdown panel */}
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

          <section className='bg-white mt-3 sm:mt-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
            <div className='bg-[#09365d] text-white px-3 sm:px-6 h-10 flex items-center justify-between'>
              <div className='flex items-center'>
                <BarChart2 size={12} className='mr-2' strokeWidth={2.5} />
                <strong className='text-[8px] font-bold tracking-wide'>
                  Analis Data Broadcast
                </strong>
                <span className='text-[9px] sm:text-[8px] ml-1 sm:ml-2 text-blue-100 font-normal tracking-wide hidden sm:inline'>
                  (Klik baris tabel untuk drill-down)
                </span>
              </div>
              <button
                className='bg-white text-blue-600 p-1 rounded hover:bg-slate-50 transition-colors shadow-sm cursor-pointer shrink-0'
                aria-label={isFilterOpen2 ? 'Tutup filter' : 'Buka filter'}
              >
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  onClick={() => setIsFilterOpen2(!isFilterOpen2)}
                  className={`transition-transform duration-200 ${isFilterOpen2 ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* {Konten Filter 2} */}
            <div
              className='p-3 sm:p-4 flex flex-col gap-3'
              style={{ display: isFilterOpen2 ? 'flex' : 'none' }}
            >
              <div className='flex flex-col sm:flex-row gap-3 w-full'>
                {/* Card Kiri: Total Unik No HP */}
                <div className='shrink-0 md:w-auto w-full'>
                  <div className='flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-sm px-3 sm:px-4 py-3 h-full min-w-0 sm:min-w-[200px]'>
                    <div className='rounded-full flex items-center justify-center text-white shrink-0 w-9 h-9 bg-gradient-to-br from-green-500 to-teal-600'>
                      <PhoneCallIcon
                        size={14}
                        className='text-white'
                        strokeWidth={2}
                      />
                    </div>
                    <div className='flex flex-col'>
                      <div className='font-bold text-[12px] text-black leading-tight'>
                        Total Unik No HP
                      </div>
                      <div className='text-[10px] text-slate-400'>
                        Kolom G (picTelp) unik
                      </div>
                    </div>
                    <div className='ml-auto text-right'>
                      <div
                        className='font-extrabold text-[1.8rem] leading-none text-green-500'
                        id='statWaUnik'
                      >
                        {loadingRows ? '...' : (stats?.total_kontak_unik ?? 0)}
                      </div>
                      <div className='text-[10px] text-slate-400'>kontak</div>
                    </div>
                  </div>
                </div>

                {/* Panel Kanan: Distribusi Status WA */}
                <div className='flex-1 min-w-0'>
                  <div className='bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2.5 h-full'>
                    <div className='flex items-center gap-1.5 mb-2'>
                      <span className='inline-block w-2 h-2 rounded-full bg-green-500 shrink-0'></span>
                      <span className='font-bold text-[11px] text-slate-700'>
                        Distribusi Status Call
                      </span>
                    </div>
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-1.5'>
                      {/* Tidak Tersedia */}
                      <button
                        onClick={() => handleFilterByStatus('Tidak Tersedia')}
                        className='cursor-pointer hover:bg-slate-400 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-3 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-slate-400 shrink-0'></span>
                          <span className='text-[10px] text-slate-600 font-medium whitespace-nowrap'>
                            Tidak Tersedia
                          </span>
                          <span className='text-[10px] font-bold text-slate-700 ml-0.5'>
                            {statusCallSummary.tidak_tersedia}
                          </span>
                        </div>
                      </button>

                      {/* Sedang Sibuk */}
                      <button
                        onClick={() => handleFilterByStatus('Sedang Sibuk')}
                        className='cursor-pointer hover:bg-blue-400 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-blue-400 shrink-0'></span>
                          <span className='text-[10px] text-blue-700 font-medium whitespace-nowrap'>
                            Sedang Sibuk
                          </span>
                          <span
                            className='text-[10px] font-bold text-blue-800 ml-0.5'
                            id='statSedangSibuk'
                          >
                            {statusCallSummary.sedang_sibuk}
                          </span>
                        </div>
                      </button>

                      {/* Tidak Diangkat */}
                      <button
                        onClick={() => handleFilterByStatus('Tidak Diangkat')}
                        className='cursor-pointer hover:bg-yellow-400 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-yellow-400 shrink-0'></span>
                          <span className='text-[10px] text-yellow-700 font-medium whitespace-nowrap'>
                            Tidak Diangkat
                          </span>
                          <span
                            className='text-[10px] font-bold text-yellow-800 ml-0.5'
                            id='statTidakDiangkat'
                          >
                            {statusCallSummary.tidak_diangkat}
                          </span>
                        </div>
                      </button>

                      {/* Mailbox */}
                      <button
                        onClick={() => handleFilterByStatus('Mailbox')}
                        className='cursor-pointer hover:bg-green-500 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-green-500 shrink-0'></span>
                          <span className='text-[10px] text-green-700 font-medium whitespace-nowrap'>
                            Mailbox
                          </span>
                          <span
                            className='text-[10px] font-bold text-green-800 ml-0.5'
                            id='statMailbox'
                          >
                            {statusCallSummary.mailbox}
                          </span>
                        </div>
                      </button>

                      {/* Positif */}
                      <button
                        onClick={() => handleFilterByStatus('Positif')}
                        className='cursor-pointer hover:bg-green-700 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-[#0891B2] shrink-0'></span>
                          <span className='text-[10px] text-green-700 font-medium whitespace-nowrap'>
                            Positif
                          </span>
                          <span
                            className='text-[10px] font-bold text-green-800 ml-0.5'
                            id='statPositif'
                          >
                            {statusCallSummary.positif}
                          </span>
                        </div>
                      </button>

                      {/* Negatif */}
                      <button
                        onClick={() => handleFilterByStatus('Negatif')}
                        className='cursor-pointer hover:bg-purple-400 hover:rounded-2xl'
                      >
                        <div className='flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5'>
                          <span className='w-2 h-2 rounded-full bg-purple-400 shrink-0'></span>
                          <span className='text-[10px] text-purple-700 font-medium whitespace-nowrap'>
                            Negatif
                          </span>
                          <span
                            className='text-[10px] font-bold text-purple-800 ml-0.5'
                            id='statNegatif'
                          >
                            {statusCallSummary.negatif}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Konten Filter */}
            <div
              className='flex flex-col sm:flex-row gap-3 w-full px-3 sm:px-4 pb-3 sm:pb-4 mt-1.5'
              style={{ display: isFilterOpen2 ? 'flex' : 'none' }}
            >
              {/* Panel Kiri: Data Unik per Provinsi & Kota */}
              <div className='flex flex-col flex-1 rounded-lg border border-blue-100 overflow-hidden shadow-sm'>
                {/* Header Panel Kiri */}
                <div
                  className='flex items-center justify-between px-3 py-[6px]'
                  style={{
                    background: '#dbeafe',
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
                      Unik No HP per Provinsi &amp; Kota
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                    <span
                      id='statProvinsiRows'
                      className='font-semibold text-blue-700'
                    >
                      {loadingRows ? '...' : (stats?.provinsi_kota.length ?? 0)}
                    </span>
                    <span>baris</span>
                    <span className='mx-0.5 text-slate-300'>|</span>
                    <span
                      id='statProvinsiTotal'
                      className='font-semibold text-blue-700'
                    >
                      {loadingRows
                        ? '...'
                        : (stats?.provinsi_kota.reduce(
                          (acc, row) => acc + row.unik,
                          0,
                        ) ?? 0)}
                    </span>
                    <span>total</span>
                  </div>
                </div>
                {/* Tabel */}
                <div className='max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-blue-50 [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-blue-400'>
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
                      {loadingRows ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-3 py-4 text-center text-[10px] text-slate-400'
                          >
                            Memuat data...
                          </td>
                        </tr>
                      ) : (stats?.provinsi_kota ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className='px-3 py-4 text-center text-[10px] text-slate-400'
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
                            className='hover:bg-blue-50/50 transition-colors cursor-pointer'
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
                                    style={{ width: `${row.pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className='px-2 py-1.5 text-right'>
                              <span className='inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-900 text-white'>
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

              {/* Panel Kanan: Unik No HP per Ke Sales */}
              <div className='flex flex-col flex-1 rounded-lg border border-[#fde88a] overflow-hidden shadow-sm'>
                {/* Header Panel Kanan */}
                <div
                  className='flex items-center justify-between px-3 py-[6px]'
                  style={{
                    background: 'linear-gradient(135deg, #fde88a, #fde88a)',
                    borderBottom: '2px solid #D97706',
                  }}
                >
                  <div className='flex items-center gap-1.5'>
                    <Users
                      size={13}
                      className='text-[#D97706] shrink-0'
                      strokeWidth={2.5}
                    />
                    <span className='text-[11px] font-bold text-[#1e293b]'>
                      Unik No HP per Ke Sales
                    </span>
                  </div>
                  <div className='flex items-center gap-1 text-[10px] text-slate-500'>
                    <span className='font-semibold text-amber-700'>
                      {loadingRows ? '...' : (stats?.per_sales?.length ?? 0)}
                    </span>
                    <span>sales</span>
                    <span className='mx-0.5 text-slate-300'>|</span>
                    <span className='font-semibold text-amber-700'>
                      {loadingRows
                        ? '...'
                        : (stats?.per_sales?.reduce(
                          (acc, r) => acc + r.unik,
                          0,
                        ) ?? 0)}
                    </span>
                    <span>total</span>
                  </div>
                </div>
                {/* Tabel */}
                <div className='max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-amber-50 [&::-webkit-scrollbar-thumb]:bg-amber-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-amber-400'>
                  <table className='w-full text-left border-collapse'>
                    <thead className='sticky top-0 z-10 bg-[#FFFBEB]'>
                      <tr>
                        <th className='px-3 py-2 text-[10px] font-semibold text-slate-500 w-8'>
                          #
                        </th>
                        <th className='px-3 py-2 text-[10px] font-semibold text-slate-500'>
                          Ke Sales
                        </th>
                        <th className='px-3 py-2 text-[10px] font-semibold text-slate-500 text-right'>
                          Unik
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-amber-100/60'>
                      {loadingRows ? (
                        <tr>
                          <td
                            colSpan={3}
                            className='px-3 py-4 text-center text-[10px] text-slate-400'
                          >
                            Memuat data...
                          </td>
                        </tr>
                      ) : (stats?.per_sales ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className='px-3 py-4 text-center text-[10px] text-slate-400'
                          >
                            Tidak ada data
                          </td>
                        </tr>
                      ) : (
                        (stats?.per_sales ?? []).map((row) => (
                          <tr
                            key={row.no}
                            onClick={() => {
                              setToSales([row.ke_sales ?? ''])
                              setPage(1)
                              setSelected(null)
                            }}
                            className='hover:bg-amber-50/60 transition-colors cursor-pointer'
                          >
                            <td className='px-3 py-2 text-[10px] text-slate-400'>
                              {row.no}
                            </td>
                            <td className='px-3 py-2 text-[10px] text-slate-700 font-medium'>
                              {/* ✅ Tampilkan "(Belum Diteruskan)" jika ke_sales null */}
                              {row.ke_sales ?? '(Belum Diteruskan)'}
                            </td>
                            <td className='px-3 py-2 text-right'>
                              <div className='flex items-center gap-2 justify-end'>
                                <div className='flex-1 min-w-[40px] max-w-[140px] bg-gray-200 rounded-full h-[5px] overflow-hidden'>
                                  <div
                                    className='h-full rounded-full'
                                    style={{
                                      width: `${row.pct}%`,
                                      background:
                                        row.ke_sales === '(Belum Diteruskan)'
                                          ? 'linear-gradient(90deg, #9CA3AF, #6B7280)'
                                          : 'linear-gradient(90deg, #F59E0B, #D97706)',
                                    }}
                                  />
                                </div>
                                <span className='inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-sm'>
                                  {row.unik}
                                </span>
                              </div>
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
          <div className='mt-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
            {/* Toolbar kirim batch di atas tabel */}
            {selectedIds.length > 0 && (
              <div className='flex items-center justify-end gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100'>
                <span className='text-[11px] text-blue-700 font-semibold'>
                  {selectedIds.length} baris dipilih
                </span>
                <button
                  onClick={handleKirimKeDatabase}
                  disabled={isSending}
                  className='inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                >
                  {isSending ? (
                    <>
                      <span className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' />{' '}
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={11} strokeWidth={2.5} /> Kirim (
                      {selectedIds.length}) Data
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className='text-[11px] text-gray-500 hover:text-gray-700 underline'
                >
                  Batal pilih
                </button>
              </div>
            )}
            <div className='overflow-x-auto -mx-0 sm:mx-0'>
              <table className='min-w-[900px] sm:min-w-full text-left border-collapse'>
                {/* Header */}
                <thead className='sticky top-0 z-10'>
                  <tr className='bg-[#1a2c4e] text-white'>
                    {[
                      { label: 'NO' },
                      { label: '👁 LIHAT' },
                      { label: '🏢 PERUSAHAAN' },
                      { label: '📦 PRODUK' },
                      { label: '📍 INFO LOKASI' },
                      { label: '👤 KONTAK PIC' },
                      { label: '💬 STATUS CALL' },
                      { label: '📝 DETAIL UPDATE' },
                      { label: '➡ KE SALES' },
                      { label: '⚙' },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className='px-2 py-2 text-[10px] font-bold tracking-wide whitespace-nowrap border-r border-[#243a5e] last:border-r-0'
                      >
                        {h.label}
                      </th>
                    ))}
                    {/* Checkbox Select All — kolom paling kanan */}
                    <th className='px-3 py-2 border-l border-[#243a5e] text-center'>
                      <input
                        type='checkbox'
                        onChange={handleSelectAll}
                        checked={
                          rows.filter((r) => r.tipe === 'WhatsApp').length >
                          0 &&
                          selectedIds.length ===
                          rows.filter((r) => r.tipe === 'WhatsApp').length
                        }
                        className='w-3.5 h-3.5 accent-blue-500 cursor-pointer'
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-300 bg-white'>
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
                      console.log('tipe:', row.tipe)
                      const active = selected?._id === row._id
                      return (
                        <React.Fragment key={row._id}>
                          <tr
                            key={row.kode + i}
                            className={cn(
                              'hover:bg-blue-50/50 transition-colors cursor-pointer border-b border-gray-200',
                              selectedIds.includes(row._id) ? 'bg-blue-50' : '',
                            )}
                          >
                            <td className='whitespace-nowrap px-5.5 py-2 text-[10px] text-slate-500'>
                              {(safePage - 1) * pageSize + i + 1}
                            </td>
                            <td className='px-4 py-2'>
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
                              </div>
                            </td>
                            <td className='whitespace-nowrap px-5 py-3 text-[10px] text-slate-700 font-medium'>
                              {row.nama_perusahaan}
                            </td>
                            <td className='whitespace-nowrap px-5 py-3 text-[10px] text-slate-600'>
                              {row.produk}
                            </td>
                            <td className='whitespace-nowrap px-5 py-3 text-[10px] text-slate-600'>
                              {row.kota}, {row.provinsi}
                            </td>
                            <td className='px-2 py-2 text-[10px] text-gray-700'>
                              <div className='flex flex-col gap-0.5'>
                                <span className='font-semibold text-slate-800'>
                                  {row.pic || '-'}
                                  {row.jabatan ? ` (${row.jabatan})` : ''}
                                </span>
                                <span className='flex items-center gap-1 text-slate-500'>
                                  <Phone
                                    size={9}
                                    strokeWidth={2}
                                    className='shrink-0'
                                  />
                                  {row.telp || '-'}
                                </span>
                              </div>
                            </td>
                            {/* STATUS CALL */}
                            <td className='px-1 py-1 text-[10px] text-slate-600'>
                              <SearchableSelect
                                value={row.status_call || ''}
                                onChange={(val: string) => {
                                  updateRowStatusCall(row._id, val)
                                  // Reset detail_update saat status berubah
                                  updateRowDetailUpdate(row._id, '')
                                }}
                                options={listStatusByUpdate}
                                className='text-[10px] border border-gray-300 rounded-lg bg-white text-gray-700 w-40 sm:w-57 h-12 cursor-pointer'
                                placeholder='Pilih Status...'
                              />
                            </td>
                            {/* DETAIL UPDATE — difilter berdasarkan status_wa yang dipilih */}
                            <td className='px-1 py-1 text-[10px] text-slate-600'>
                              <SearchableSelect
                                value={row.detail_update || ''}
                                onChange={(val: string) =>
                                  updateRowDetailUpdate(row._id, val)
                                }
                                isDisabled={!row.status_call}
                                options={getDetailOptions(
                                  row.status_call || '',
                                )}
                                className='text-[10px] border border-gray-300 rounded-lg bg-white text-gray-700 w-40 sm:w-57 h-12 cursor-pointer'
                                placeholder='Pilih Detail...'
                              />
                            </td>
                            <td className='px-2 sm:px-5 py-3 text-[10px] text-slate-600'>
                              <select
                                value={row.ke_sales || ''}
                                onChange={(e) =>
                                  updateRowKeSales(row._id, e.target.value)
                                }
                                className='text-[10px] border border-gray-300 rounded-lg px-2 sm:px-4 py-3 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 w-36 sm:w-45 h-12 cursor-pointer'
                              >
                                <option value=''>- Pilih Sales -</option>
                                <option value='Arie Muhamad Fajar'>
                                  Arie Muhamad Fajar
                                </option>
                                <option value='Beffry Rizkana'>
                                  Beffry Rizkana
                                </option>
                                <option value='Ferrie Ferdinal'>
                                  Ferrie Ferdinal
                                </option>
                              </select>
                            </td>
                            <td className='py-2 px-3'>
                              <button
                                title='Kirim ke database'
                                onClick={() => handleSendRow(row)}
                                disabled={sendingRows.has(row._id)}
                                className='inline-flex items-center justify-center w-8 h-7 rounded bg-blue-700 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                              >
                                {sendingRows.has(row._id) ? (
                                  <span className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' />
                                ) : (
                                  <Send
                                    size={12}
                                    strokeWidth={2}
                                    className='text-white'
                                  />
                                )}
                              </button>
                            </td>
                            {/* Checkbox per baris — kolom paling kanan */}
                            <td className='px-3 py-2 text-center'>
                              <input
                                type='checkbox'
                                checked={selectedIds.includes(row._id)}
                                onChange={() => handleSelectedOne(row._id)}
                                className='w-3.5 h-3.5 accent-blue-500 cursor-pointer'
                              />
                            </td>
                          </tr>
                          {active && (
                            <tr className='bg-blue-50/20'>
                              <td
                                colSpan={11}
                                className='px-4 py-3 border-b border-blue-100'
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
                                        icon='👑'
                                        label='Brand Owner'
                                        value={selected.brand_owner}
                                      />
                                      <DetailItem
                                        icon='✉️'
                                        label='Email PIC'
                                        value={selected.email}
                                      />
                                      <DetailItem
                                        icon='🕒'
                                        label='Tanggal Update'
                                        value={selected.updated_at}
                                      />
                                    </div>

                                    {/* COL 3 */}
                                    <div className='flex flex-col gap-2.5'>
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
                                      {selected.alamat &&
                                        selected.alamat.trim() !== '' && (
                                          <div className='border-4 shadow-sm bg-gray-100 rounded-lg border-gray-100 px-3 py-3'>
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
                                  </div>

                                  {/* ── Alamat full width ── */}
                                  {selected.produk &&
                                    selected.produk.trim() !== '' && (
                                      <div className='border-t border-gray-200 px-5 py-3'>
                                        <div className='flex items-start gap-2'>
                                          <span className='text-[11px] mt-0.5'></span>
                                          <div>
                                            <span className='text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5'>
                                              Produk Relevan
                                            </span>
                                            <span className='border rounded-sm border-gray-300 py-1 px-1.5 text-[10.5px] text-slate-700 font-medium'>
                                              📦
                                              {selected.merek_tayang &&
                                                selected.merek_tayang.trim() !==
                                                ''
                                                ? `${selected.produk} / ${selected.merek_tayang}`
                                                : selected.produk}
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
          <section className='mt-4 sm:mt-6 flex flex-col gap-3 rounded-2xl bg-white px-3 sm:px-6 py-3 sm:py-4 shadow-sm ring-1 ring-blue-100 md:flex-row md:items-center md:justify-between'>
            <div className='text-sm text-gray-500 font-medium'>
              <p className='font-medium text-gray-700'>
                Showing <strong>{showingFrom}</strong> to{' '}
                <strong>{showingTo}</strong> of <strong>{total}</strong> entries
              </p>
              <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className='h-10 rounder-xl border border-blue-100 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                >
                  <option value={10}>10 / Halaman</option>
                  <option value={20}>20 / Halaman</option>
                  <option value={50}>50 / Halaman</option>
                  <option value={100}>100 / Halaman</option>
                </select>
                <div className='flex items-center gap-1 sm:gap-2 flex-wrap'>
                  <PageBtn onClick={() => gotoPage(1)} ariaLabel='First'>
                    ⏮
                  </PageBtn>
                  <PageBtn
                    onClick={() => gotoPage(page - 1)}
                    ariaLabel='Previous'
                  >
                    ◀
                  </PageBtn>

                  {getPageWindow(safePage, totalPages, 5).map((p) => (
                    <button
                      key={p}
                      type='button'
                      onClick={() => gotoPage(p)}
                      aria-label={p.toString()}
                      className='grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl border border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40 text-xs sm:text-sm'
                    >
                      {p}
                    </button>
                  ))}

                  <PageBtn onClick={() => gotoPage(page + 1)} ariaLabel='Next'>
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
            </div>
          </section>
          {/* Legend Footer */}
          <div className='flex flex-wrap items-center mt-4 gap-2 sm:gap-4 px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200 text-[9px] sm:text-[10px] text-gray-500 rounded-lg lg:rounded-none'>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-sm bg-[#0DCAF0]'></span>
              <strong>DATA_WA</strong>
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-full bg-blue-500'></span>
              <strong>👁</strong> detail
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex w-3 h-3 rounded-sm bg-gray-300'></span>
              <strong>☑</strong> massal
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex px-1.5 py-0.5 rounded-sm bg-green-500 text-white font-bold text-[9px]'>
                STATUS
              </span>
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-flex px-1.5 py-0.5 rounded-sm bg-yellow-400 text-white font-bold text-[9px]'>
                SALES
              </span>
            </span>
          </div>
        </div>
      </div>
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
      className='grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl border border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40 text-xs sm:text-sm'
    >
      {children}
    </button>
  )
}
