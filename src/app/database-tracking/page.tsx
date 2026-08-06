'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { Search } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { q } from 'motion/react-client'

type ProspekBase = {
  _id: string
  // data kontak
  nama: string
  jabatan: string
  role: string
  tipeKontak: string
  noTelp: string
  email: string
  // data sekunder
  ring: string
  salesInternal: string
  alamat: string
  kota: string
  provinsi: string
  kabupaten: string
}

type ProspekB2B = ProspekBase & {
  kategori: 'b2b'
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
}

type ProspekB2G = ProspekBase & {
  kategori: 'b2g'
  satuanKerja: string
  institusiKerja: string
  segmentasi: string
  klpd: string
}
type DatabaseRow = ProspekB2B | ProspekB2G

type ApiResp = {
  items: ProspekB2B | ProspekB2G[]
  total: number
  page: number
  limit: number
  totalPages: number
  options: {
    kota: string[]
    klpd: string[]
    ring: string[]
    segmentasi: string[]
  }
}

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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'w-full rounded-lg px-4 py-2 text-black text-sm shadow-sm border border-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none ',
        props.className || '',
      )}
    />
  )
}

export default function DatabaseTrackingPage() {
  // data kontak
  const [nama, setNama] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [role, setRole] = useState('')
  const [tipeKontak, setTipeKontak] = useState('')
  const [noTelp, setNoTelp] = useState('')
  const [email, setEmail] = useState('')

  const [search, setSearch] = useState('')
  // data sekunder
  const [kategori, setKategori] = useState<ProspekB2B[]| ProspekB2G[]>([])
  const [ring, setRing] = useState('ALL')
  const [salesInternal, setSalesInternal] = useState('')
  const [alamat, setAlamat] = useState('')
  const [kota, setKota] = useState<string[]>([])
  const [provinsi, setProvinsi] = useState<string[]>([])
  const [kabupaten, setKabupaten] = useState<string[]>([])

  // data B2b
  const [jenisEntitas, setJenisEntitas] = useState<string[]>([])
  const [namaEntitas, setNamaEntitas] = useState<string[]>([])
  const [bidangUsaha, setBidangUsaha] = useState<string[]>([])
  const [produkRelevan, setProdukRelevan] = useState<string[]>([])
  const [merekTayang, setMerekTayang] = useState<string[]>([])
  const [merekLainnya, setMerekLainnya] = useState<string[]>([])
  const [brandOwner, setBrandOWner] = useState('')
  const [sumberData, setSumberData] = useState('')
  const [linkProduk, setLinkProduk] = useState('')
  const [linkToko, setLinkToko] = useState('')
  
  // data b2g
  const [satuanKerja, setSatuanKerja] = useState<string[]>([])
  const [institusiKerja, setInstitusiKerja] = useState<string[]>([])
  const [segmentasi, setSegmentasi] = useState<string[]>([])
  const [klpd, setKlpd] = useState('')

  const searchParams = useSearchParams()
  const [codeInput, setCodeInput] = useState('')
  const [loading, setLoading] = useState(false)

  // pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [limit, setLimit] = useState(25)
  const [selected, setSelected] = useState<DatabaseRow | null>(null)
  const [rows, setRows] = useState<DatabaseRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingRows, setLoadingRows] = useState(true)
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    header: Record<string, string>
    items: any[]
  } | null>(null)

  const [items, setItems] = useState<
    {
      id: string
      nama: string
      jabatan: string
      role: string
      tipeKontak: string
      noTelp: string
      email: string
    }[]
  >(() => [
    {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      nama: '',
      jabatan: '',
      role: '',
      tipeKontak: '',
      noTelp: '',
      email: '',
    },
  ])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingRows(true)
      if (!mounted) return
      setLoading(true)

      const qs = new URLSearchParams()
      qs.set('limit', String(pageSize))
      qs.set('page', String(page))

      produkRelevan.forEach((v) => qs.append('produkRelevan', v))
      kota.forEach((v) => qs.append('kota', v))
      provinsi.forEach((v) => qs.append('provinsi', v))
      kabupaten.forEach((v) => qs.append('kabupaten', v))
      jenisEntitas.forEach((v) => qs.append('jenisEntitas', v))
      namaEntitas.forEach((v) => qs.append('namaEntitas', v))
      bidangUsaha.forEach((v) => qs.append('bidangUsaha', v))
      merekTayang.forEach((v) => qs.append('merekTayang', v))

      try {
        const res = await fetch(`/api/database-tracking?${qs.toString()}`,  {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        setRows(Array.isArray(json?.items) ? json.items: [])
        const pg = json?.pagination ?? {}
        setTotal(Number(pg?.total ?? 0))
        setTotalPages(Number(pg?.totalPages ?? 1))
        setSelected(null)
      } catch {
        if(!mounted) return
        setRows([])
        setTotal(0)
        setTotalPages(1)
        setSelected(null)
      } finally {
        if(mounted) {
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
    produkRelevan,
  ])
  

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          <h1 className='text-3xl pl-4 text-black font-extrabold'>
            Database Tracking
          </h1>
          <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
            Database B2G dan B2B yang sudah terinput
          </div>
          <div className='rounded-2xl bg-white p-10 shadow-sm ring-1 ring-gray-200 mt-4'>
            <div className='grid gap-6 md:grid-cols-4 md:items-end'>
              <Field label='PENCARIAN'>
                <div className='relative'>
                  <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                    <Search className='h-4 w-4 text-gray-600' />
                  </div>

                  <input
                    type='text'
                    className='w-full rounded-lg px-4 py-2 pl-10 text-black text-sm shadow-sm border border-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none '
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Cari institusi / satuan kerja / PIC...'
                  />
                </div>
              </Field>

              <Field label='KOTA/KABUPATEN'>
                <SearchableSelect
                  value={kota}
                  onChange={(val: string) => {
                    setKota(val)
                    setPage(1)
                  }}
                  options={[]}
                  className='h-11 border-0'
                />
              </Field>

              <Field label='KLPD'>
                <SearchableSelect
                  value={klpd}
                  onChange={(val: string) => {
                    setKlpd(val)
                    setPage(1)
                  }}
                  options={[]}
                  className='h-11 border-0'
                />
              </Field>

              <Field label='RING'>
                <SearchableSelect
                  value={ring}
                  onChange={(val: string) => {
                    setRing(val)
                    setPage(1)
                  }}
                  options={[]}
                  className='h-11 border-0'
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
