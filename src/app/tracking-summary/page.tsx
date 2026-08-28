'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  Building2,
  Calendar,
  MapIcon,
  MapPin,
  MessageCircleCodeIcon,
  Package,
  PencilIcon,
  Users,
  Users2,
} from 'lucide-react'
import { useExportToSheets } from '@/hooks/useExportToSheets'

type TrackingRow = {
  kode: string
  jenis_entitas: string
  nama_perusahaan: string
  kota: string
  provinsi: string
  produk: string
  telp: string
  tipe: string
  pic: string
  status_tlp: string
  detail_update: string
  ke_sales: string
  created_at: string
  penginput: string
  segmentasi: string
  bidang_perusahaan: string
  sumber_data: string
  sumber_lain: string
  merek_tayang: string
  brand_owner: string
  email: string
  link_produk: string
  link_toko: string
  updated_at: string
  keterangan_update: string
  bulan_data: string
}

type FilterOptions = {
  bulan: string[]
  perusahaan: string[]
  produk: string[]
  provinsi: string[]
  kota: string[]
  status_tlp: string[]
  ke_sales: string[]
  pic: string[]
}

type ExportField = {
  key: keyof TrackingRow
  label: string
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'kode', label: 'Kode' },
  { key: 'jenis_entitas', label: 'Jenis Entitas' },
  { key: 'nama_perusahaan', label: 'Nama Perusahaan' },
  { key: 'kota', label: 'Kota' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'produk', label: 'Produk' },
  { key: 'telp', label: 'No Telp' },
  { key: 'tipe', label: 'Tipe Telp' },
  { key: 'pic', label: 'Nama Pic' },
  { key: 'status_tlp', label: 'Status Telp' },
  { key: 'detail_update', label: 'Detail Update' },
  { key: 'ke_sales', label: 'Ke Sales' },
  { key: 'created_at', label: 'Tanggal Input' },
  { key: 'penginput', label: 'Penginput' },
  { key: 'segmentasi', label: 'Segmentasi' },
  { key: 'bidang_perusahaan', label: 'Bidang Perusahaan' },
  { key: 'sumber_data', label: 'Sumber Data' },
  { key: 'sumber_lain', label: 'Sumber Lain' },
  { key: 'merek_tayang', label: 'Merek Tayang' },
  { key: 'brand_owner', label: 'Brand Owner' },
  { key: 'email', label: 'Email PIC' },
  { key: 'link_produk', label: 'Link Produk' },
  { key: 'link_toko', label: 'Link Toko' },
  { key: 'updated_at', label: 'Tanggal Update' },
  { key: 'bulan_data', label: 'Bulan Data' },
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
        <span className='mt-px shrink-0 text-[11px] leading-none'>{icon}</span>
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
          <span className='text-[10.5px] text-slate-700 font-medium wrap-break-word leading-snug'>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TrackingSummaryPage() {
  const filterButtons = [
    { id: 'Bulan', icon: Calendar, label: 'Bulan' },
    { id: 'Perusahaan', icon: Building2, label: 'Perusahaan' },
    { id: 'Produk', icon: Package, label: 'Produk' },
    { id: 'Provinsi', icon: MapIcon, label: 'Provinsi' },
    { id: 'Kota', icon: MapPin, label: 'Kota/Kab' },
    { id: 'Status Wa', icon: MessageCircleCodeIcon, label: 'Status WA' },
    { id: 'Detail Update', icon: PencilIcon, label: 'Detail Update' },
    { id: 'Ke Sales', icon: Users, label: 'Ke Sales' },
    { id: 'Nama PIC', icon: Users2, label: 'Nama PIC' },
  ]

  // function selected Tracking
  const [selectedIds, setSelectedIds] = useState<string[]>([])

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
  const [exportFields, setExportFields] = useState<Set<keyof TrackingRow>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  )
  const [exporting, setExporting] = useState(false)

  // Google Sheets Export
  const { exportToSheets, loading: googleSheetsLoading } = useExportToSheets()

  // helper modal - edit PIC
  const [isModalOpen, setIsModalOpen] = useState(false)

  //filter value - multi-select arrays
  const [bulan, setBulan] = useState<string[]>([])
  const [perusahaan, setPerusahaan] = useState<string[]>([])
  const [produk, setProduk] = useState<string[]>([])
  const [provinsi, setProvinsi] = useState<string[]>([])
  const [kota, setKota] = useState<string[]>([])
  const [statusTlp, setStatusTlp] = useState<string[]>([])
  const [toSales, setToSales] = useState<string[]>([])
  const [namaPic, setNamaPic] = useState<string[]>([])

  // date state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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
    status_tlp: [],
    ke_sales: [],
    pic: [],
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<TrackingRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selected, setSelected] = useState<TrackingRow | null>(null)

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

  // ---- filter helpers ----
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
        case 'Status Wa':
          return statusTlp
        case 'Ke Sales':
          return toSales
        case 'Nama PIC':
          return namaPic
        default:
          return []
      }
    },
    [bulan, perusahaan, produk, provinsi, kota, statusTlp, toSales, namaPic],
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
      case 'Status Wa':
        setStatusTlp(vals)
        break
      case 'Ke Sales':
        setToSales(vals)
        break
      case 'Nama PIC':
        setNamaPic(vals)
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
      case 'Status Tlp':
        return filterOptions.status_tlp
      case 'Ke Sales':
        return filterOptions.ke_sales
      case 'Nama PIC':
        return filterOptions.pic || []
      default:
        return []
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
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
      statusTlp.forEach((v) => qs.append('status_tlp', v))
      toSales.forEach((v) => qs.append('ke_sales', v))
      namaPic.forEach((v) => qs.append('pic', v))
      if (startDate) qs.set('startDate', startDate)
      if (endDate) qs.set('endDate', endDate)

      try {
        const res = await fetch(`/api/tracking-summary?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        
      }
    })
  })
}
