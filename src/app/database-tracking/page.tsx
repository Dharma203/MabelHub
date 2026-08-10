'use client'

import { useState, useEffect, useMemo } from 'react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Building2,
  Landmark,
  Loader2,
  Database,
  Eye,
  ChevronDown,
  X,
} from 'lucide-react'

/* ───── types ───── */
type DatabaseRow = {
  _id: string
  kode: string
  // B2G
  satuanKerja: string
  institusiKerja: string
  segmentasi: string
  klpd: string
  // B2B
  jenisEntitas: string
  namaEntitas: string
  bidangUsaha: string
  produkRelevan: string
  merekTayang: string
  merekLainnya: string
  brandOwner: string
  sumberData: string
  linkProduk: string
  linkToko: string
  // Kontak
  nama: string
  jabatan: string
  role: string
  tipeKontak: string
  noTelp: string
  email: string
  // Sekunder
  ring: string
  salesInternal: string
  alamat: string
  kota: string
  provinsi: string
  kabupaten: string
  // Meta
  createdAt: string
  updatedAt: string
}

type Mode = 'b2g' | 'b2b'

/* ───── helpers ───── */
function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ')
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-2'>
      <label className='text-sm font-bold tracking-wide text-blue-500 uppercase'>
        {label}
      </label>
      {children}
    </div>
  )
}

/* ───── column definitions ───── */
type Col = { key: keyof DatabaseRow; label: string }

// Primary columns shown in table
const B2G_PRIMARY: Col[] = [
  { key: 'kode', label: 'Kode' },
  { key: 'satuanKerja', label: 'Satuan Kerja' },
  { key: 'institusiKerja', label: 'Institusi Kerja' },
  { key: 'klpd', label: 'KLPD' },
  { key: 'kota', label: 'Kota' },
  { key: 'ring', label: 'Ring' },
]

const B2B_PRIMARY: Col[] = [
  { key: 'kode', label: 'Kode' },
  { key: 'jenisEntitas', label: 'Jenis Entitas' },
  { key: 'namaEntitas', label: 'Nama Entitas' },
  { key: 'kota', label: 'Kota' },
  { key: 'ring', label: 'Ring' },
]

// Detail fields shown in expandable row
const B2G_DETAIL: Col[] = [
  { key: 'segmentasi', label: 'Segmentasi' },
  { key: 'nama', label: 'Nama PIC' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'role', label: 'Role' },
  { key: 'tipeKontak', label: 'Tipe Kontak' },
  { key: 'noTelp', label: 'No. Telp' },
  { key: 'email', label: 'Email' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'salesInternal', label: 'Sales Internal' },
  { key: 'createdAt', label: 'Tanggal Input' },
  { key: 'updatedAt', label: 'Terakhir Update' },
]

const B2B_DETAIL: Col[] = [
  { key: 'bidangUsaha', label: 'Bidang Usaha' },
  { key: 'produkRelevan', label: 'Produk Relevan' },
  { key: 'merekTayang', label: 'Merek Tayang' },
  { key: 'merekLainnya', label: 'Merek Lainnya' },
  { key: 'brandOwner', label: 'Brand Owner' },
  { key: 'sumberData', label: 'Sumber Data' },
  { key: 'linkProduk', label: 'Link Produk' },
  { key: 'linkToko', label: 'Link Toko' },
  { key: 'nama', label: 'Nama PIC' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'role', label: 'Role' },
  { key: 'tipeKontak', label: 'Tipe Kontak' },
  { key: 'noTelp', label: 'No. Telp' },
  { key: 'email', label: 'Email' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'salesInternal', label: 'Sales Internal' },
  { key: 'createdAt', label: 'Tanggal Input' },
  { key: 'updatedAt', label: 'Terakhir Update' },
]

/* ═══════════════════════════════════════════════ */
export default function DatabaseTrackingPage() {
  const [mode, setMode] = useState<Mode>('b2g')
  const [search, setSearch] = useState('')

  // filters
  const [ring, setRing] = useState('')
  const [klpd, setKlpd] = useState('')
  const [kota, setKota] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // data
  const [rows, setRows] = useState<DatabaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)

  // derived filter options from loaded data
  const filterOptions = useMemo(() => {
    const ringSet = new Set<string>()
    const kotaSet = new Set<string>()
    const klpdSet = new Set<string>()

    rows.forEach((r) => {
      if (r.ring) ringSet.add(r.ring)
      if (r.kota) kotaSet.add(r.kota)
      if (r.klpd) klpdSet.add(r.klpd)
    })

    const toOpts = (s: Set<string>) =>
      Array.from(s)
        .sort()
        .map((v) => ({ value: v, label: v }))

    return {
      ring: toOpts(ringSet),
      kota: toOpts(kotaSet),
      klpd: toOpts(klpdSet),
    }
  }, [rows])

  /* ── fetch data ── */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)

      const qs = new URLSearchParams()
      qs.set('mode', mode)

      if (ring) qs.set('ring', ring)
      if (klpd) qs.set('klpd', klpd)
      if (kota) qs.append('kota', kota)

      try {
        const res = await fetch(`/api/database-tracking?${qs.toString()}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return

        setRows(Array.isArray(json?.rows) ? json.rows : [])
        const pg = json?.pagination ?? {}
        setTotal(Number(pg?.total ?? json?.rows?.length ?? 0))
        setTotalPages(Number(pg?.totalPages ?? 1))
      } catch {
        if (!mounted) return
        setRows([])
        setTotal(0)
        setTotalPages(1)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [mode, ring, klpd, kota])

  // reset page & filters when switching mode
  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return
    setMode(newMode)
    setSearch('')
    setRing('')
    setKlpd('')
    setKota('')
    setPage(1)
  }

  /* ── client-side search + pagination ── */
  const columns = mode === 'b2g' ? B2G_PRIMARY : B2B_PRIMARY
  const detailFields = mode === 'b2g' ? B2G_DETAIL : B2B_DETAIL

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      columns.some((col) => {
        const val = r[col.key]
        return val && String(val).toLowerCase().includes(q)
      }),
    )
  }, [rows, search, columns])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const clientTotalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  // reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          {/* ── Header ── */}
          <div className='flex items-center gap-3 pl-4'>
            <Database className='h-8 w-8 text-blue-600' />
            <div>
              <h1 className='text-3xl text-black font-extrabold'>
                Database Tracking
              </h1>
              <div className='text-sm mt-1 text-slate-500 font-medium'>
                Database B2G dan B2B yang sudah terinput
              </div>
            </div>
          </div>

          {/* ── Mode Toggle ── */}
          <div className='mt-5 ml-4 flex gap-2'>
            <button
              onClick={() => handleModeSwitch('b2g')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                mode === 'b2g'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
              )}
            >
              <Landmark className='h-4 w-4' />
              Data B2G
            </button>
            <button
              onClick={() => handleModeSwitch('b2b')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                mode === 'b2b'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
              )}
            >
              <Building2 className='h-4 w-4' />
              Data B2B
            </button>
          </div>

          {/* ── Filters ── */}
          <div className='rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 mt-4'>
            <div className='grid gap-6 md:grid-cols-4 md:items-end'>
              <Field label='PENCARIAN'>
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                    <Search className='h-4 w-4 text-gray-600' />
                  </div>
                  <input
                    type='text'
                    className='w-full rounded-lg px-4 py-2 pl-10 text-black text-sm shadow-sm border border-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      mode === 'b2g'
                        ? 'Cari institusi / satuan kerja / PIC...'
                        : 'Cari entitas / bidang usaha / PIC...'
                    }
                  />
                </div>
              </Field>

              <Field label='KOTA'>
                <SearchableSelect
                  value={kota}
                  onChange={(val: string) => {
                    setKota(val)
                    setPage(1)
                  }}
                  options={filterOptions.kota}
                  placeholder='Semua Kota'
                  isClearable
                  className='h-11 border-0'
                />
              </Field>

              {mode === 'b2g' && (
                <Field label='KLPD'>
                  <SearchableSelect
                    value={klpd}
                    onChange={(val: string) => {
                      setKlpd(val)
                      setPage(1)
                    }}
                    options={filterOptions.klpd}
                    placeholder='Semua KLPD'
                    isClearable
                    className='h-11 border-0'
                  />
                </Field>
              )}

              <Field label='RING'>
                <SearchableSelect
                  value={ring}
                  onChange={(val: string) => {
                    setRing(val)
                    setPage(1)
                  }}
                  options={filterOptions.ring}
                  placeholder='Semua Ring'
                  isClearable
                  className='h-11 border-0'
                />
              </Field>
            </div>
          </div>

          {/* ── Summary Bar ── */}
          <div className='mt-4 ml-1 flex items-center justify-between'>
            <div className='text-sm text-slate-500 font-medium'>
              Menampilkan{' '}
              <span className='font-bold text-slate-700'>
                {filteredRows.length}
              </span>{' '}
              data {mode.toUpperCase()}
              {search && (
                <span>
                  {' '}untuk pencarian &ldquo;
                  <span className='font-semibold text-blue-600'>{search}</span>
                  &rdquo;
                </span>
              )}
            </div>
          </div>

          {/* ── Table ── */}
          <div className='mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200'>
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm text-left'>
                <thead
                  className={clsx(
                    'border-b border-gray-200',
                    mode === 'b2g' ? 'bg-blue-50' : 'bg-emerald-50',
                  )}
                >
                  <tr>
                    <th className='whitespace-nowrap px-5 py-4 text-xs font-bold text-gray-500 uppercase'>
                      No
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className='whitespace-nowrap px-5 py-4 text-xs font-bold text-gray-500 uppercase'
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className='whitespace-nowrap px-5 py-4 text-xs font-bold text-gray-500 uppercase'>
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className='divide-y divide-gray-100'>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={columns.length + 2}
                        className='px-6 py-16 text-center text-sm text-gray-400'
                      >
                        <div className='flex flex-col justify-center items-center gap-3'>
                          <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
                          <span>Memuat data {mode.toUpperCase()}...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 2}
                        className='px-6 py-16 text-center text-sm text-gray-400'
                      >
                        <div className='flex flex-col items-center gap-2'>
                          <Database className='h-10 w-10 text-gray-300' />
                          <span>
                            Tidak ada data {mode.toUpperCase()} yang ditemukan.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const isExpanded = expandedId === row._id
                      return (
                        <>
                          <tr
                            key={row._id}
                            className={clsx(
                              'transition-colors cursor-pointer',
                              isExpanded
                                ? mode === 'b2g' ? 'bg-blue-50/60' : 'bg-emerald-50/60'
                                : 'hover:bg-gray-50/70',
                            )}
                            onClick={() => setExpandedId(isExpanded ? null : row._id)}
                          >
                            <td className='whitespace-nowrap px-5 py-3.5 text-sm text-gray-400 font-medium'>
                              {(page - 1) * pageSize + idx + 1}
                            </td>
                            {columns.map((col) => (
                              <td
                                key={col.key}
                                className='whitespace-nowrap px-5 py-3.5 text-sm text-gray-700'
                              >
                                {String(row[col.key] || '-')}
                              </td>
                            ))}
                            <td className='whitespace-nowrap px-5 py-3.5'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedId(isExpanded ? null : row._id)
                                }}
                                className={clsx(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                  isExpanded
                                    ? 'bg-gray-200 text-gray-700'
                                    : mode === 'b2g'
                                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                                )}
                              >
                                {isExpanded ? (
                                  <><X className='h-3.5 w-3.5' /> Tutup</>
                                ) : (
                                  <><Eye className='h-3.5 w-3.5' /> Detail</>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* ── Expandable detail row ── */}
                          {isExpanded && (
                            <tr key={`${row._id}-detail`} className='bg-gray-50/80'>
                              <td colSpan={columns.length + 2} className='px-6 py-5'>
                                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3'>
                                  {detailFields.map((f) => (
                                    <div key={f.key}>
                                      <div className='text-[11px] font-bold text-gray-400 uppercase tracking-wide'>
                                        {f.label}
                                      </div>
                                      <div className='text-sm text-gray-800 mt-0.5'>
                                        {String(row[f.key] || '-')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {!loading && filteredRows.length > 0 && (
              <div className='flex items-center justify-between border-t border-gray-100 px-6 py-4'>
                <div className='text-sm text-gray-500'>
                  Halaman{' '}
                  <span className='font-bold text-gray-700'>{page}</span> dari{' '}
                  <span className='font-bold text-gray-700'>
                    {clientTotalPages}
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className='p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronsLeft className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className='p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </button>

                  {/* page numbers */}
                  {Array.from({ length: Math.min(5, clientTotalPages) }, (_, i) => {
                    let p: number
                    if (clientTotalPages <= 5) {
                      p = i + 1
                    } else if (page <= 3) {
                      p = i + 1
                    } else if (page >= clientTotalPages - 2) {
                      p = clientTotalPages - 4 + i
                    } else {
                      p = page - 2 + i
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={clsx(
                          'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors',
                          p === page
                            ? mode === 'b2g'
                              ? 'bg-blue-600 text-white shadow'
                              : 'bg-emerald-600 text-white shadow'
                            : 'hover:bg-gray-100 text-gray-600',
                        )}
                      >
                        {p}
                      </button>
                    )
                  })}

                  <button
                    onClick={() =>
                      setPage((p) => Math.min(clientTotalPages, p + 1))
                    }
                    disabled={page >= clientTotalPages}
                    className='p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronRight className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => setPage(clientTotalPages)}
                    disabled={page >= clientTotalPages}
                    className='p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronsRight className='h-4 w-4' />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
