'use client'
import React from 'react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import { RefreshCw, X, Check, ChevronDown } from 'lucide-react'
import { getValidasiOptions, getDetailOptions } from '@/data/detailvalidasi'

/* ─── Types ───────────────────────────────────────────────────── */
type CompanyRow = {
    _id: string
    nama_perusahaan: string
    sales_internal: string
    alamat: string
    kota: string
    provinsi: string
    pic: string
    jabatan: string
    produk: string
    tipe_kontak: string
    no_telp: string
    validasi: string
    detail_validasi: string
    produk_relevan_val: string
    tipe_penyedia: string
    catatan: string
    status: string
    status_wa: string
    source_id?: string
}

type SelectionMode = 'none' | 'some' | 'all'

type Stats = {
    totalPerusahaan: number
    terhubung: number
    pending: number
    tidakTerhubung: number
    belumDiproses: number
}

type FilterOptions = {
    sales: string[]
    provinsi: string[]
    produk: string[]
    validasi: string[]
}

type Option = { value: string; label: string };

export function SelectInput({
    value,
    options,
    onChange,
    className,
}: {
    value: string;
    options: Option[];
    onChange: (val: string) => void;
    className?: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)} // ✅ ambil string dari event
            className={className}
        >
            {options.map((opt, i) => (
                <option key={i} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
/* ─── Constants ───────────────────────────────────────────────── */

const TIPE_PENYEDIA_OPTIONS = [
    '— Pilih —',
    'Penyedia Jasa',
    'Penyedia Barang',
    'Distributor',
    'End User',
    'Reseller',
]

const PRODUK_RELEVAN_OPTIONS = [
    '— Pilih —',
    'AIO',
    'GENSET',
    'IFP',
    'MRS',
    'VIDEOTRON',
]

/* ─── Page ────────────────────────────────────────────────────── */
export default function ValidasiSalesPage() {
    const { user } = useSession()
    const [rows, setRows] = useState<CompanyRow[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats>({
        totalPerusahaan: 0,
        terhubung: 0,
        pending: 0,
        tidakTerhubung: 0,
        belumDiproses: 0,
    })
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        sales: [],
        provinsi: [],
        produk: [],
        validasi: [],
    })

    // Filters
    const [search, setSearch] = useState('')
    const [picSales, setPicSales] = useState('')
    const [provinsi, setProvinsi] = useState('')
    const [produk, setProduk] = useState('')
    const [validasiFilter, setValidasiFilter] = useState('')
    const [waFilter, setWaFilter] = useState('Semua')

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSending, setIsSending] = useState(false)

    // Selection mode derived from state
    const selectionMode: SelectionMode = useMemo(() => {
        if (selectedIds.length === 0) return 'none'
        if (rows.length > 0 && selectedIds.length === rows.length) return 'all'
        return 'some'
    }, [selectedIds, rows])

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(100)
    const [total, setTotal] = useState(0)

    // Side panel
    const [selectedRow, setSelectedRow] = useState<CompanyRow | null>(null)
    const [panelForm, setPanelForm] = useState({
        validasi: '',
        produk_relevan: '',
        detail_validasi: '',
        tipe_penyedia: '',
        catatan: '',
        source_id: '',
    })
    const [saving, setSaving] = useState(false)

    // Debounced search
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 400)
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
        }
    }, [search])

    // // Current datetime display
    // const [now, setNow] = useState('')
    // useEffect(() => {
    //     const update = () => {
    //         const d = new Date()
    //         const hh = String(d.getHours()).padStart(2, '0')
    //         const mi = String(d.getMinutes()).padStart(2, '0')
    //         const ss = String(d.getSeconds()).padStart(2, '0')
    //         setNow(`Update: ${hh}.${mi}.${ss}`)
    //     }
    //     update()
    //     const interval = setInterval(update, 1000)
    //     return () => clearInterval(interval)
    // }, [])

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const qs = new URLSearchParams()
            qs.set('page', String(page))
            qs.set('limit', String(pageSize))
            if (debouncedSearch) qs.set('search', debouncedSearch)
            if (picSales) qs.set('picSales', picSales)
            if (provinsi) qs.set('provinsi', provinsi)
            if (produk) qs.set('produk', produk)
            if (validasiFilter) qs.set('validasi', validasiFilter)
            if (waFilter && waFilter !== 'Semua') qs.set('wa', waFilter)

            const res = await fetch(`/api/validasi-sales?${qs.toString()}`, {
                cache: 'no-store',
            })
            const json = await res.json()

            setRows(json.items ?? [])
            setTotal(json.pagination?.total ?? 0)
            setStats(
                json.stats ?? {
                    totalPerusahaan: 0,
                    terhubung: 0,
                    pending: 0,
                    tidakTerhubung: 0,
                    belumDiproses: 0,
                }
            )
            setFilterOptions(
                json.filterOptions ?? {
                    sales: [],
                    provinsi: [],
                    produk: [],
                    validasi: [],
                }
            )
        } catch {
            setRows([])
        } finally {
            setLoading(false)
            setSelectedIds([])
        }
    }, [page, pageSize, debouncedSearch, picSales, provinsi, produk, validasiFilter, waFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Open panel
    const openPanel = (row: CompanyRow) => {
        setSelectedRow(row)
        setPanelForm({
            validasi: row.validasi || '',
            produk_relevan: row.produk_relevan_val || '',
            detail_validasi: row.detail_validasi || '',
            tipe_penyedia: row.tipe_penyedia || '',
            catatan: row.catatan || '',
            source_id: row.source_id || '',
        })
    }

    const closePanel = () => {
        setSelectedRow(null)
    }

    const handleSelectAll = () => {
        if (selectionMode === 'all') {
            setSelectedIds([])
        } else {
            setSelectedIds(rows.map((r) => r._id))
        }
    }

    const handleSelectedOne = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
    }

    const handleClearSelection = () => {
        setSelectedIds([])
    }

    // Save validasi
    const handleSave = async () => {
        if (!selectedRow) return
        console.log("selectedRow", selectedRow)
        setSaving(true)
        setIsSending(true)
        try {
            const isAllFilled = Boolean(
                panelForm.validasi &&
                panelForm.produk_relevan &&
                panelForm.detail_validasi &&
                panelForm.tipe_penyedia &&
                panelForm.catatan &&
                selectedRow.source_id
            )
            const newStatus = isAllFilled ? 'Terisi' : 'Draft'

            await fetch('/api/validasi-sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    _id: selectedRow._id,
                    sales_internal: selectedRow.sales_internal,
                    nama_perusahaan: selectedRow.nama_perusahaan,
                    alamat: selectedRow.alamat,
                    kota: selectedRow.kota,
                    provinsi: selectedRow.provinsi,
                    pic: selectedRow.pic,
                    jabatan: selectedRow.jabatan,
                    produk: selectedRow.produk,
                    status_wa: selectedRow.status_wa,
                    tipe_kontak: selectedRow.tipe_kontak,
                    no_telp: selectedRow.no_telp,
                    status: newStatus,
                    ...panelForm,
                }),
            })
            await fetchData()
            closePanel()
        } catch {
            // handle error silently
        } finally {
            setSaving(false)
            setIsSending(false)
        }
    }

    const [sendingRows, setIsSendingRows] = useState<Set<string>>(new Set())

    const handleSendRow = useCallback(
        async (row: CompanyRow) => {
            console.log("row.source_id:", row.source_id)
            console.log("full row:", row)
            if (sendingRows.has(row._id)) return
            setIsSendingRows((prev) => new Set(prev).add(row._id))
            try {
                const payload = {
                    _id: row._id,
                     sales_internal: row.sales_internal,
                     nama_perusahaan: row.nama_perusahaan,
                     alamat: row.alamat,
                     kota: row.kota,
                     provinsi: row.provinsi,
                     pic: row.pic,
                     jabatan: row.jabatan,
                     produk: row.produk,
                     status_wa: row.status_wa,
                     tipe_kontak: row.tipe_kontak,
                     no_telp: row.no_telp,
                     source_id: row.source_id,
                     validasi: row.validasi,
                     produk_relevan: row.produk_relevan_val,
                     detail_validasi: row.detail_validasi,
                     tipe_penyedia: row.tipe_penyedia,
                     catatan: row.catatan,
                     status: row.status,
                     sent_at: new Date().toISOString(),
                }

                const res = await fetch ('/api/validasi-sales/send', {
                    method: 'POST',
                    headers: { 'Content-Type' : 'application/json'},
                    body: JSON.stringify(payload)
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err?.error || 'Gagal menyimpan data')
                }

                alert(`✅ Data "${row.nama_perusahaan}" berhasil dikirim!`)
            } catch (error) {
                console.error('[handleSendRow] Error:', error)
                alert (
                    error instanceof Error
                    ? error.message
                    : 'Terjadi Kesalahan saat mengirim data',
                )
            } finally {
                setIsSendingRows((prev) => {
                    const s = new Set(prev)
                    s.delete(row._id)
                    return s
                })
            }
        },
        [sendingRows],
    )

    const handleReset = () => {
        setSearch('')
        setPicSales('')
        setProvinsi('')
        setProduk('')
        setValidasiFilter('')
        setWaFilter('Semua')
        setPage(1)
    }

    const roleBadge = user?.role === 'SUPERADMIN' ? 'Superadmin' : user?.role === 'ADMIN' ? 'Admin' : user?.role || ''

    return (
        <div className="min-h-screen bg-[#f0f4fa]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <div className="flex">
                <div className='flex-1 flex-row'>
                    {/* Main content */}
                    <div className={`flex-1 transition-all duration-300 ${selectedRow ? 'lg:mr-[340px]' : ''}`}>
                        {/* ── Header ─────────────────────────────────────────── */}
                        <div
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 gap-2 sm:gap-0"
                            style={{
                                background: 'linear-gradient(135deg, #1a2332 0%, #2d3b4e 100%)',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-extrabold shadow-md">
                                    B2B
                                </div>
                                <div>
                                    <div className="text-white text-[13px] font-extrabold tracking-wide leading-tight">
                                        VALIDASI B2B SALES
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">
                                        CRM DASHBOARD
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                    {roleBadge}
                                </span>
                                <button
                                    onClick={() => fetchData()}
                                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold px-3 py-1.5 rounded-md transition-colors"
                                >
                                    <RefreshCw size={11} strokeWidth={2.5} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="p-2 sm:p-4">
                            {/* ── Stats Cards ──────────────────────────────────── */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <StatCard label="TOTAL PERUSAHAAN" value={stats.totalPerusahaan} color="#1e293b" />
                                <StatCard label="TERHUBUNG" value={stats.terhubung} color="#059669" />
                                <StatCard label="PENDING" value={stats.pending} color="#d97706" />
                                <StatCard label="TIDAK TERHUBUNG" value={stats.tidakTerhubung} color="#dc2626" />
                                <StatCard label="BELUM DIPROSES" value={stats.belumDiproses} color="#6366f1" />
                            </div>

                            {/* ── Filters Row ──────────────────────────────────── */}
                            <div className="bg-white rounded-lg border border-slate-200 px-3 sm:px-4 py-3 mb-3 shadow-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 items-end">
                                    {/* Search */}
                                    <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            Cari Perusahaan / PIC
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nama perusahaan, PIC, kota..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 placeholder-slate-400"
                                        />
                                    </div>
                                    {/* PIC Sales */}
                                    <div className="col-span-1 lg:col-span-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            PIC Sales
                                        </label>
                                        <select
                                            value={picSales}
                                            onChange={(e) => { setPicSales(e.target.value); setPage(1) }}
                                            className={`w-full h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 ${picSales ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            <option value="">Semua PIC</option>
                                            {filterOptions.sales.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Provinsi */}
                                    <div className="col-span-1 lg:col-span-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            Provinsi
                                        </label>
                                        <select
                                            value={provinsi}
                                            onChange={(e) => { setProvinsi(e.target.value); setPage(1) }}
                                            className={`w-full h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 ${provinsi ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            <option value="">Semua Provinsi</option>
                                            {filterOptions.provinsi.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Produk */}
                                    <div className="col-span-1 lg:col-span-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            Produk
                                        </label>
                                        <select
                                            value={produk}
                                            onChange={(e) => { setProduk(e.target.value); setPage(1) }}
                                            className={`w-full h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 ${produk ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            <option value="">Semua Produk</option>
                                            {filterOptions.produk.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Validasi */}
                                    <div className="col-span-1 lg:col-span-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            Validasi
                                        </label>
                                        <select
                                            value={validasiFilter}
                                            onChange={(e) => { setValidasiFilter(e.target.value); setPage(1) }}
                                            className={`w-full h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 ${validasiFilter ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            <option value="">Semua Validasi</option>
                                            {filterOptions.validasi.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* WhatsApp */}
                                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                            WhatsApp
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={waFilter}
                                                onChange={(e) => { setWaFilter(e.target.value); setPage(1) }}
                                                className={`flex-1 h-8 px-2.5 text-[11px] border border-slate-300 rounded-md bg-gray-200 focus:outline-none focus:ring-1 ${waFilter === 'Semua' ? 'text-slate-400' : 'text-slate-700'}`}
                                            >
                                                <option value="Semua">Semua</option>
                                                <option value="Ada">Ada</option>
                                                <option value="Tidak Ada">Tidak Ada</option>
                                            </select>
                                            <button
                                                onClick={handleReset}
                                                className="h-8 px-3 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Info Row ──────────────────────────────────────── */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 px-1 gap-1 sm:gap-0">
                                <span className="text-[11px] text-slate-500">
                                    Menampilkan <strong className="text-blue-700">{total.toLocaleString()}</strong> data
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500">Tampilkan:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                                        className="h-7 px-2 text-[11px] border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none cursor-pointer"
                                    >
                                        {[25, 50, 100, 200].map((n) => (
                                            <option key={n} value={n}>{n} perhalaman</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ── Selection Action Bar ─────────────────────────── */}
                            {selectedIds.length > 0 && (
                                <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                            {selectedIds.length}
                                        </span>
                                        <span className="text-blue-800 font-semibold text-[12px]">
                                            {selectionMode === 'all' ? 'Semua data dipilih' : `${selectedIds.length} data dipilih`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleClearSelection}
                                            className="h-7 px-3 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1"
                                        >
                                            <X size={11} strokeWidth={2.5} />
                                            Batal
                                        </button>
                                        <button
                                            onClick={() => {
                                                const rowsToSend = rows.filter((r) => selectedIds.includes(r._id))
                                                rowsToSend.forEach((r) => handleSendRow(r))
                                            }}
                                            disabled={selectedIds.some((id) => sendingRows.has(id))}
                                            className="h-7 px-4 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                        >
                                            {selectedIds.some((id) => sendingRows.has(id)) ? (
                                                <>
                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={12} strokeWidth={3} />
                                                    Submit Dipilih
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Data Table ───────────────────────────────────── */}
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                                    <table className="w-full text-left border-collapse min-w-[1100px] hidden lg:table">
                                        <thead>
                                            <tr className="border-b border-slate-200" style={{ background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
                                                <th className="px-3 py-2.5 w-8 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectionMode === 'all'}
                                                        ref={(el) => { if (el) el.indeterminate = selectionMode === 'some' }}
                                                        onChange={handleSelectAll}
                                                        className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                                        title={selectionMode === 'all' ? 'Hapus semua pilihan' : 'Pilih semua'}
                                                    />
                                                </th>
                                                {[
                                                    { label: '#', w: 'w-8' },
                                                    { label: 'PIC SALES', w: 'w-[120px]' },
                                                    { label: 'NAMA PERUSAHAAN', w: 'w-[200px]' },
                                                    { label: 'LOKASI', w: 'w-[130px]' },
                                                    { label: 'PIC & JABATAN', w: '' },
                                                    { label: 'PRODUK', w: 'w-[90px]' },
                                                    { label: 'STATUS WA', w: 'w-[80px]' },
                                                    { label: 'VALIDASI & DETAIL', w: 'w-[120px]' },
                                                    { label: 'CATATAN', w: '' },
                                                    { label: 'STATUS', w: 'w-[80px]' },
                                                ].map((h) => (
                                                    <th
                                                        key={h.label}
                                                        className={`px-3 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${h.w}`}
                                                    >
                                                        {h.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={11} className="px-4 py-8 text-center text-[11px] text-slate-400">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <RefreshCw size={14} className="animate-spin text-blue-500" />
                                                            Memuat data...
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="px-4 py-8 text-center text-[11px] text-slate-400">
                                                        Tidak ada data ditemukan
                                                    </td>
                                                </tr>
                                            ) : (
                                                rows.map((row, idx) => {
                                                    const rowNum = (page - 1) * pageSize + idx + 1
                                                    const isPanelOpen = selectedRow?.nama_perusahaan === row.nama_perusahaan
                                                    const isChecked = selectedIds.includes(row._id)
                                                    return (
                                                        <tr
                                                            key={row.nama_perusahaan + idx}
                                                            className={`border-b border-slate-100 transition-colors ${isPanelOpen ? 'bg-blue-50/70' : isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'}`}
                                                        >
                                                            {/* Checkbox */}
                                                            <td className="px-3 py-2 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleSelectedOne(row._id)}
                                                                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-[11px] text-slate-400 font-medium">{rowNum}</td>
                                                            <td className="px-3 py-2 text-[11px] text-blue-800 font-medium">{row.sales_internal || '—'}</td>
                                                            <td className="px-3 py-2">
                                                                <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                                                                    {row.nama_perusahaan}
                                                                </div>
                                                                <div className="text-[9px] text-slate-400 mt-0.5 leading-tight truncate max-w-[200px]">
                                                                    {row.alamat || '—'}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="text-[11px] font-semibold text-slate-700">{row.kota || '—'}</div>
                                                                <div className="text-[9px] text-slate-400">{row.provinsi || ''}</div>
                                                            </td>
                                                            <td className="px-3 py-2 text-[11px] text-slate-500">—</td>
                                                            <td className="px-3 py-2">
                                                                {row.produk ? (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${getProdukBadgeClass(row.produk)}`}>
                                                                        {row.produk}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-flex whitespace-nowrap items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${getStatusWACellClass(row.status_wa)}`}>
                                                                    {row.status_wa || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {row.validasi ? (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${getValidasiBadgeClass(row.validasi)}`}>
                                                                        {row.validasi}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-[11px] text-slate-500 max-w-[120px] truncate">
                                                                {row.catatan || '—'}
                                                            </td>
                                                            {/* STATUS cell — click to open drafting panel */}
                                                            <td
                                                                className="px-3 py-2 cursor-pointer group"
                                                                onClick={() => openPanel(row)}
                                                                title="Klik untuk buka panel drafting"
                                                            >
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all group-hover:shadow-sm group-hover:scale-105 ${row.status === 'Terisi'
                                                                    ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                                                                    : row.status === 'Draft'
                                                                        ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
                                                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                                    }`}>
                                                                    {row.status === 'Terisi' && <Check size={10} strokeWidth={3} />}
                                                                    {row.status === 'Draft' && <ChevronDown size={10} strokeWidth={2.5} />}
                                                                    {row.status || 'Kosong'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>

                                    {/* ── Mobile Card Layout ───────────────── */}
                                    <div className="lg:hidden">
                                        {loading ? (
                                            <div className="px-4 py-8 text-center text-[11px] text-slate-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                                                    Memuat data...
                                                </div>
                                            </div>
                                        ) : rows.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-[11px] text-slate-400">
                                                Tidak ada data ditemukan
                                            </div>
                                        ) : (
                                            rows.map((row, idx) => {
                                                const rowNum = (page - 1) * pageSize + idx + 1
                                                const isSelected = selectedRow?.nama_perusahaan === row.nama_perusahaan
                                                return (
                                                    <div
                                                        key={row.nama_perusahaan + idx}
                                                        className={`border-b border-slate-100 p-3 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}`}
                                                        onClick={() => openPanel(row)}
                                                    >
                                                        <div className="flex items-start justify-between mb-1.5">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-medium">{rowNum}.</span>
                                                                    <span className="text-[11px] font-bold text-slate-800 truncate">{row.nama_perusahaan}</span>
                                                                </div>
                                                                <div className="text-[9px] text-slate-400 mt-0.5 truncate ml-5">{row.alamat || '—'}</div>
                                                            </div>
                                                            {row.produk && (
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wide shrink-0 ${getProdukBadgeClass(row.produk)}`}>
                                                                    {row.produk}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 ml-5 mt-1">
                                                            <MobileField label="PIC Sales" value={row.sales_internal} />
                                                            <MobileField label="Lokasi" value={`${row.kota || '—'}${row.provinsi ? ', ' + row.provinsi : ''}`} />
                                                            <MobileField label="Validasi" value={row.validasi} badge={row.validasi ? getValidasiBadgeClass(row.validasi) : ''} />
                                                            <MobileField label="Status" value={row.status_wa} statusColor={row.status_wa === 'Selesai' ? 'text-emerald-600' : row.status_wa === 'Draft' ? 'text-amber-600' : 'text-slate-400'} />
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Pagination ───────────────────────────────────── */}
                            {!loading && rows.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between mt-3 px-1 gap-2 sm:gap-0">
                                    <span className="text-[10px] text-slate-400">
                                        Halaman {page} dari {Math.max(1, Math.ceil(total / pageSize))}
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap justify-center">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage(page - 1)}
                                            className="px-2.5 py-1 text-[10px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ‹ Prev
                                        </button>
                                        {getPageNumbers(page, Math.max(1, Math.ceil(total / pageSize))).map((p) =>
                                            p === '...' ? (
                                                <span key={p + Math.random()} className="px-1 text-[10px] text-slate-400">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => setPage(Number(p))}
                                                    className={`w-7 h-7 text-[10px] font-semibold rounded transition-colors ${Number(p) === page ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-blue-50'}`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}
                                        <button
                                            disabled={page >= Math.ceil(total / pageSize)}
                                            onClick={() => setPage(page + 1)}
                                            className="px-2.5 py-1 text-[10px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next ›
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Side Panel ────────────────────────────────────────── */}
                    {selectedRow && (
                        <div
                            className="fixed right-0 top-0 bottom-0 w-full sm:w-[340px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
                            style={{ animation: 'slideInRight 0.25s ease-out' }}
                        >
                            {/* Panel Header */}
                            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-extrabold text-slate-800 leading-tight">
                                            {selectedRow.nama_perusahaan}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            {selectedRow.sales_internal || '—'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={closePanel}
                                        className="p-1 rounded hover:bg-slate-100 transition-colors shrink-0 ml-2"
                                    >
                                        <X size={14} className="text-slate-400" />
                                    </button>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
                                    <InfoField label="LOKASI" value={`${selectedRow.kota}${selectedRow.provinsi ? ' – ' + selectedRow.provinsi : ''}`} />
                                    <InfoField label="PIC" value={selectedRow.pic || '—'} />
                                    <InfoField label="PRODUK ASAL" value={selectedRow.produk || '—'} />
                                    <InfoField label="STATUS WA" value={selectedRow.status_wa || '—'} />
                                    {selectedRow.produk && (
                                        <div className="col-span-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${getProdukBadgeClass(selectedRow.produk)}`}>
                                                {selectedRow.produk}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panel Form */}
                            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
                                {/* Validasi */}
                                <FormField label="VALIDASI" required>
                                    <SelectInput
                                        value={panelForm.validasi}
                                        options={getValidasiOptions()}
                                        onChange={(val: string) => {
                                            setPanelForm(prev => ({
                                                ...prev,
                                                validasi: val,
                                                detail_validasi: '', // reset detail saat validasi berubah
                                            }));
                                        }}
                                        className="w-full h-9 px-3 text-[11px] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 appearance-none cursor-pointer"
                                    />
                                </FormField>

                                {/* Detail Validasi — filtered berdasarkan validasi yang dipilih */}
                                <FormField label="DETAIL VALIDASI">
                                    <SelectInput
                                        value={panelForm.detail_validasi}
                                        options={getDetailOptions(panelForm.validasi)}
                                        onChange={(val: string) => {
                                            setPanelForm(prev => ({ ...prev, detail_validasi: val }));
                                        }}
                                        className="w-full h-9 px-3 text-[11px] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 appearance-none cursor-pointer"
                                    />
                                </FormField>

                                {/* Produk Relevan */}
                                <FormField label="PRODUK RELEVAN">
                                    <select
                                        value={panelForm.produk_relevan}
                                        onChange={(e) => setPanelForm({ ...panelForm, produk_relevan: e.target.value === PRODUK_RELEVAN_OPTIONS[0] ? '' : e.target.value })}
                                        className="w-full h-9 px-3 text-[11px] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 appearance-none cursor-pointer"
                                    >
                                        {PRODUK_RELEVAN_OPTIONS.map((o) => (
                                            <option key={o} value={o === PRODUK_RELEVAN_OPTIONS[0] ? '' : o}>{o}</option>
                                        ))}
                                    </select>
                                </FormField>

                                {/* Tipe Penyedia */}
                                <FormField label="TIPE PENYEDIA">
                                    <select
                                        value={panelForm.tipe_penyedia}
                                        onChange={(e) => setPanelForm({ ...panelForm, tipe_penyedia: e.target.value === TIPE_PENYEDIA_OPTIONS[0] ? '' : e.target.value })}
                                        className="w-full h-9 px-3 text-[11px] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 appearance-none cursor-pointer"
                                    >
                                        {TIPE_PENYEDIA_OPTIONS.map((o) => (
                                            <option key={o} value={o === TIPE_PENYEDIA_OPTIONS[0] ? '' : o}>{o}</option>
                                        ))}
                                    </select>
                                </FormField>

                                {/* Catatan */}
                                <FormField label="CATATAN">
                                    <textarea
                                        value={panelForm.catatan}
                                        onChange={(e) => setPanelForm({ ...panelForm, catatan: e.target.value })}
                                        placeholder="Tulis catatan atau keterangan tambahan..."
                                        rows={4}
                                        className="w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 resize-y placeholder-slate-400"
                                    />
                                </FormField>
                            </div>

                            {/* Panel Footer */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={12} strokeWidth={3} />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Animation keyframes */}
                <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
            </div>
        </div>
    )
}

/* ─── Sub Components ──────────────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 shadow-sm">
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                {label}
            </div>
            <div className="text-[22px] font-extrabold leading-none" style={{ color }}>
                {value.toLocaleString()}
            </div>
        </div>
    )
}

function InfoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-[11px] text-slate-700 font-medium mt-0.5">{value}</div>
        </div>
    )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

function MobileField({ label, value, badge, statusColor }: { label: string; value: string; badge?: string; statusColor?: string }) {
    return (
        <div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{label}: </span>
            {badge ? (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold ${badge}`}>
                    {value || '—'}
                </span>
            ) : (
                <span className={`text-[10px] font-medium ${statusColor || 'text-slate-600'}`}>{value || '—'}</span>
            )}
        </div>
    )
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function getProdukBadgeClass(produk: string): string {
    const p = produk.toUpperCase()
    if (p.includes('VIDEOTRON')) return 'bg-purple-100 text-purple-700 border border-purple-200'
    if (p.includes('IFP') || p.includes('PP')) return 'bg-orange-100 text-orange-700 border border-orange-200'
    if (p.includes('LED')) return 'bg-blue-100 text-blue-700 border border-blue-200'
    if (p.includes('DIGITAL')) return 'bg-teal-100 text-teal-700 border border-teal-200'
    return 'bg-slate-100 text-slate-600 border border-slate-200'
}

function getValidasiBadgeClass(validasi: string): string {
    if (validasi.includes('Diterima')) return 'bg-emerald-100 text-emerald-700'
    if (validasi.includes('Terkirim')) return 'bg-blue-100 text-blue-700'
    if (validasi.includes('Terhubung')) return 'bg-green-100 text-green-700'
    if (validasi.includes('Tidak Terhubung')) return 'bg-red-100 text-red-700'
    if (validasi.includes('Dibaca')) return 'bg-yellow-100 text-yellow-700'
    if (validasi.includes('Ditolak')) return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-600'
}

function getStatusWACellClass(status_wa: string): string {
    if (status_wa.includes('Diterima')) return 'bg-emerald-100 text-emerald-700'
    if (status_wa.includes('Terkirim')) return 'bg-blue-100 text-blue-700'
    if (status_wa.includes('Terhubung')) return 'bg-green-100 text-green-700'
    if (status_wa.includes('Tidak Terhubung')) return 'bg-red-100 text-red-700'
    if (status_wa.includes('Dibaca')) return 'bg-yellow-100 text-yellow-700'
    if (status_wa.includes('Ditolak')) return 'bg-rose-100 text-rose-700'
    return 'bg-slate-100 text-slate-600'
}

function getPageNumbers(current: number, totalPages: number): (number | string)[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | string)[] = []
    if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
    } else if (current >= totalPages - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
    }
    return pages
}