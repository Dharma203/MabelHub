'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import { listProvinsi, listKabupatenKota } from '@/data/wilayah'
import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import { computeChangedFields } from '@/utils/validation'
import {
  ArrowLeftSquareIcon,
  Building,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useSearchInstitusi, Institusi } from '@/hooks/useSearchInstitusi'
import {
  validateContactItemsB2B,
  validateFormFieldsB2B,
} from '@/utils/formValidationB2B'
import { listMerek } from '@/data/merek'
import { label } from 'motion/react-client'

type KontakItem = {
  id: string
  nama: string
  jabatan: string
  role: string
  tipeKontak: string
  noTelp: string
  email: string
}

function FormB2BContent() {
  const [isOpen, setIsOpen] = useState(false)
  const [jenisEntitas, setJenisEntitas] = useState('')
  const [namaEntitas, setNamaEntitas] = useState('')
  const [bidangUsaha, setBidangUsaha] = useState('')
  const [provinsi, setProvinsi] = useState('')
  const [kabupaten, setKabupaten] = useState('')
  const [kota, setKota] = useState('')
  const [alamat, setAlamat] = useState('')
  const [ring, setRing] = useState<string>('RING 4')
  const [produkRelevan, setProdukRelevan] = useState('')
  const [merekTayang, setMerekTayang] = useState('')
  const [brandOwner, setBrandOwner] = useState('')
  const [sumberData, setSumberData] = useState('')
  const [linkProduk, setLinkProduk] = useState('')
  const [linkToko, setLinkToko] = useState('')
  const [merekLainnya, setMerekLainnya] = useState('')
  const [salesInternal, setSalesInternal] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const { user, loading: sessionLoading } = useSession()
  const { results, isLoading: isLoadingSearch } =
    useSearchInstitusi(namaEntitas)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const addItem = () => {
    setItems((prev) => [
      ...prev,
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
  }

  const [rows, setRows] = useState<string[][]>([])
  const newKontak: KontakItem[] = useMemo(
    () =>
      rows.map((row, index) => ({
        id: `row-${index}`,
        nama: row[0] ? String(row[0]).trim() : '',
        jabatan: row[1] ? String(row[1]).trim() : '',
        role: row[1] ? String(row[1]).trim() : '',
        tipeKontak: row[2] ? String(row[2]).trim() : '',
        noTelp: row[3] ? String(row[3]).trim() : '',
        email: row[4] ? String(row[4]).trim() : '',
      })),
    [rows],
  )

  const updateItem = (index: number, field: string, value: string) => {
    setItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const [requestor, setRequestor] = useState(
    () => user?.fullName?.trim() || user?.username?.trim() || '',
  )

  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (institusiKerja: Institusi) => {
    setNamaEntitas(institusiKerja.nama)
    setIsOpen(false)
  }

  const listKabupatenFiltered = useMemo(() => {
    if (!provinsi) return []
    return listKabupatenKota
      .filter((w) => w.provinsi === provinsi)
      .map((w) => ({ value: w.nama, label: w.nama }))
  }, [provinsi])

  const handleProvinsiChange = (val: string) => {
    setProvinsi(val)
    setKabupaten('') // reset pilihan kabupaten saat provinsi berubah
    setKota('') // reset pilihan kota saat provinsi berubah
  }

  const handleMerekChange = (val: string) => {
    setMerekLainnya(val)
  }

  const handleCariKode = async () => {
    try {
      if (!codeInput.trim()) {
        alert('Masukkan kode terlebih dahulu')
        return
      }
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const res = await fetch(`/api/form-b2b/${codeInput}`)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        alert(errData?.error || 'Data tidak ditemukan untuk kode tersebut')
        return
      }

      const data = await res.json()
      console.log('Data ditemukan:', data)

      if (!data || (Array.isArray(data) && data.length === 0)) {
        alert('Data tidak ditemukan')
        return
      }

      // Support both response shapes: { header, items } or raw array
      const header = data?.header ?? data
      const kontakItems = data?.items ?? (Array.isArray(data) ? data : [])

      if (kontakItems.length > 0) {
        setItems(
          kontakItems.map((item: any) => ({
            ...item,
            noTelp: String(item.noTelp ?? '').replace(/^62/, ''),
          })),
        )
      }
      setRequestor(
        header?.requestor ??
          user?.fullName ??
          user?.username ??
          user?.userId ??
          '',
      )
      setJenisEntitas(header.jenisEntitas ?? '')
      setNamaEntitas(header.namaEntitas ?? '')
      setBidangUsaha(header?.bidangUsaha ?? '')
      setProvinsi(header?.provinsi ?? '')
      setKota(header?.kota ?? '')
      setAlamat(header?.alamat ?? '')
      setProdukRelevan(header?.produkRelevan ?? '')
      setMerekTayang(header?.merekTayang ?? '')
      setMerekLainnya(header?.merekLainnya ?? '')
      setBrandOwner(header?.brandOwner ?? '')
      setSumberData(header?.sumberData ?? '')
      setSalesInternal(header?.salesInternal ?? '')
      setLinkProduk(header?.linkProduk ?? '')
      setLinkToko(header?.linkToko ?? '')
      setRing(header?.ring ?? '')

      // ── Simpan snapshot asli untuk diff history ──────────────────────
      setOriginalSnapshot({
        header: {
          requestor: header?.requestor ?? '',
          jenisEntitas: header.jenisEntitas ?? '',
          namaEntitas: header.namaEntitas ?? '',
          provinsi: header?.provinsi ?? '',
          kota: header?.kota ?? '',
          alamat: header?.alamat ?? '',
          produkRelevan: header?.produkRelevan ?? '',
          merekTayang: header?.merekTayang ?? '',
          brandOwner: header?.brandOwner ?? '',
          sumberData: header?.sumberData ?? '',
          linkProduk: header?.linkProduk ?? '',
          merekLainnya: header.merekLainnya ?? '',
          linkToko: header?.linkToko ?? '',
          ring: header?.ring ?? '',
          salesInternal: header?.salesInternal ?? '',
        },
        items: kontakItems,
      })
    } catch (error) {
      console.error('Error mencari kode:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const idParam = searchParams.get('id')
    if (!idParam || !idParam.trim()) return

    const fetchData = async () => {
      const code = idParam.trim()
      setCodeInput(code)
      setIsLoading(true)

      try {
        const res = await fetch(`/api/form-b2b/${code}`)
        if (!res.ok) return
        const data = await res.json()
        if (!data) return

        const header = data?.header ?? data
        const kontakItems = data?.items ?? (Array.isArray(data) ? data : [])
        if (kontakItems.length > 0) setItems(kontakItems)

        setRequestor(header?.requestor ?? '')
        setJenisEntitas(header?.jenisEntitas ?? '')
        setNamaEntitas(header?.namaEntitas ?? '')
        setProvinsi(header?.provinsi ?? '')
        setKota(header?.kota ?? '')
        setAlamat(header?.alamat ?? '')
        setProdukRelevan(header?.produkRelevan ?? '')
        setMerekTayang(header?.merekTayang ?? '')
        setMerekLainnya(header?.merekLainnya ?? '')
        setBrandOwner(header?.brandOwner ?? '')
        setSumberData(header?.sumberData ?? '')
        setSalesInternal(header?.salesInternal ?? '')
        setLinkProduk(header?.linkProduk ?? '')
        setLinkToko(header?.linkToko ?? '')

        setOriginalSnapshot({
          header: {
            requestor: header?.requestor ?? '',
            jenisEntitas: header?.jenisEntitas ?? '',
            namaEntitas: header?.namaEntitas ?? '',
            provinsi: header?.provinsi ?? '',
            kota: header?.kota ?? '',
            alamat: header?.alamat ?? '',
            produkRelevan: header?.produkRelevan ?? '',
            merekTayang: header?.merekTayang ?? '',
            brandOwner: header?.brandOwner ?? '',
            sumberData: header?.sumberData ?? '',
            linkProduk: header?.linkProduk ?? '',
            linkToko: header?.linkToko ?? '',
          },
          items: kontakItems,
        })
      } catch {
        // silent fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleKirim = async () => {
    try {
      const headerError = validateFormFieldsB2B({
        requestor,
        jenisEntitas,
        namaEntitas,
        bidangUsaha,
        provinsi,
        kota,
        alamat,
        ring,
        produkRelevan,
        merekTayang,
        brandOwner,
        sumberData,
        salesInternal,
        linkProduk,
        linkToko,
      })
      if (headerError) {
        alert(headerError.message)
        return
      }

      const contactError = validateContactItemsB2B(items)
      if (contactError) {
        alert(contactError.message)
        return
      }

      const isRevisionMode = !!(
        searchParams.get('id')?.trim() || originalSnapshot
      )

      // Gunakan kode yang sudah di-generate manual; fallback auto-generate jika masih kosong
      const namaReq =
        requestor.trim() ||
        user?.fullName?.trim() ||
        user?.username?.trim() ||
        ''

      const makePrefix = (name: string): string => {
        if (!name) return 'XXX'
        const consonants = 'bcdfghjklmnpqrstvwxyz'
        let result = name[0].toUpperCase()
        for (let i = 1; i < name.length && result.length < 3; i++) {
          if (consonants.includes(name[i].toLowerCase())) {
            result += name[i].toUpperCase()
          }
        }
        while (result.length < 3) result += 'X'
        return result
      }
      const prefixFallback = makePrefix(namaReq)
      const date = new Date()
      const dmy = date
        .toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
        .replace(/\//g, '')
      const generatedCode =
        codeInput.trim() ||
        `${prefixFallback}-${dmy}-${String(Date.now()).slice(-4)}`

      const headerPayload = {
        codeInput: generatedCode,
        requestor:
          requestor || user?.fullName || user?.username || user?.userId || '',
        jenisEntitas: jenisEntitas,
        namaEntitas: namaEntitas,
        bidangUsaha: bidangUsaha,
        provinsi: provinsi,
        kota: kota,
        alamat: alamat,
        ring: ring,
        produkRelevan: produkRelevan,
        merekTayang: merekTayang,
        brandOwner: brandOwner,
        sumberData: sumberData,
        linkProduk: linkProduk,
        linkToko: linkToko,
        merekLainnya: merekLainnya,
        salesInternal: sumberData === 'Sales Internal' ? salesInternal : '',
      }

      const itemsPayload = items.map((item) => ({
        id: item.id,
        nama: item.nama,
        jabatan: item.jabatan,
        role: item.role,
        tipeKontak: item.tipeKontak,
        noTelp: item.noTelp ? `62${item.noTelp}` : '',
        email: item.email,
      }))

      let res: Response

      if (isRevisionMode) {
        // hitung perubahan field
        const changedFields = computeChangedFields(
          originalSnapshot,
          headerPayload,
          itemsPayload,
        )

        // mode revisi: panggil put
        res = await fetch('/api/form-b2b', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generatedCode,
            header: headerPayload,
            items: itemsPayload,
            oldData: originalSnapshot,
            changedFields,
            revisedBy: requestor || user?.fullName || user?.username || '',
          }),
        })
      } else {
        // mode baru : panggil post
        res = await fetch('/api/form-b2b', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ header: headerPayload, items: itemsPayload }),
        })
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData?.error || 'Gagal Menyimpan data')
      }

      alert(
        isRevisionMode
          ? 'Data berhasil direvisi!'
          : 'Database berhasil disimpan!',
      )

      router.push('/database-prospek/form-b2b')
      setJenisEntitas('')
      setNamaEntitas('')
      setBidangUsaha('')
      setProvinsi('')
      setKota('')
      setAlamat('')
      setRing('')
      setProdukRelevan('')
      setMerekTayang('')
      setMerekLainnya('')
      setBrandOwner('')
      setSumberData('')
      setSalesInternal('')
      setCodeInput('')
      setOriginalSnapshot(null)
      setItems([
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
    } catch (error) {
      console.error('Error saving Database:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan database',
      )
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='flex'>
        <div className='flex-1 p-6'>
          <div className='bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-100'>
            <div className='flex flex-col'>
              <div className='flex justify-between gap-2 pl-4'>
                <button
                  onClick={() => {
                    router.push('/database-prospek')
                  }}
                  className='flex h-10 w-20 items-center justify-center cursor-pointer rounded-lg bg-blue-200 text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 transition'
                >
                  <ArrowLeftSquareIcon className='w-10 h-10' />
                </button>
              </div>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Database Prospek
              </h1>
              <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
                Form Input B2B
              </div>
            </div>
          </div>
          <section className='mt-2 rounded-2xl bg-white p-4 pl-7 h-24 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center justify-between gap-3 mb-6'>
              <div className='flex flex-col'>
                <h2 className='text-xl pl-1 font-bold text-gray-700'>
                  Cari Kode Untuk Revisi
                </h2>
                <input
                  className='h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  placeholder='Masukan Kode'
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                />
              </div>
              <button
                onClick={handleCariKode}
                disabled={isLoading}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                {isLoading ? (
                  <Loader2 className='animate-spin' size={20} />
                ) : (
                  'Cari Kode'
                )}
              </button>
            </div>
          </section>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Building
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h2 className='text-xl font-bold text-gray-700'>
                  Informasi Entitas
                </h2>
                <p className='text-sm font-medium text-gray-500'>
                  Data Perusahaan atau Organisasi
                </p>
              </div>
            </div>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-6'>
              <div>
                <label className='tex-sm font-semibold text-slate-600'>
                  JENIS ENTITAS
                </label>
                <div className='relative mt-2'>
                  <SearchableSelect
                    value={jenisEntitas}
                    onChange={(val: string) => setJenisEntitas(val)}
                    options={[
                      { value: '', label: '-- Pilih --' },
                      { value: 'PT', label: 'PT' },
                      { value: 'CV', label: 'CV' },
                      { value: 'BLUD', label: 'BLUD' },
                      { value: 'Pendidikan', label: 'Pendidikan' },
                      { value: 'RS', label: 'RS' },
                      { value: 'BUMN', label: 'BUMN' },
                      { value: 'Tidak Diketahui', label: 'Tidak Diketahui' },
                    ]}
                    className='border-0 bg-white'
                    placeholder='Pilih Jenis Entitas...'
                  />
                </div>
              </div>
              <div ref={wrapperRef} className='relative'>
                <label>NAMA ENTITAS</label>
                <input
                  type='text'
                  value={namaEntitas}
                  onChange={(e) => {
                    setNamaEntitas(e.target.value)
                    setIsOpen(true)
                  }}
                  onFocus={() => setIsOpen(true)}
                  autoComplete='off'
                  placeholder='Ketik nama perusahaan'
                  className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                />
                {isOpen && namaEntitas && namaEntitas.trim().length >= 2 && (
                  <div className='absolute z-50 w-full rounded-xl border border-gray-200 bg-white shadow-lg'>
                    {isLoadingSearch ? (
                      <div className='px-4 py-3 text-sm w-full text-gray-400'>
                        Mencari
                      </div>
                    ) : results.length > 0 ? (
                      <ul className='max-h-100 overflow-y-auto'>
                        {results.map((item) => (
                          <li
                            key={item.id}
                            onMouseDown={() => handleSelect(item)}
                            className='cursor-pointer px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-600'
                          >
                            {item.nama}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className='px-4 py-3 text-sm text-gray-400'>
                        Institusi Kerja tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className='mt-2'>
                <label className='text-sm font-semibold text-slate-600'>
                  PROVINSI
                </label>
                <SearchableSelect
                  value={provinsi}
                  onChange={(val: string) => handleProvinsiChange(val)}
                  options={listProvinsi.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                  className='border-0 bg-white'
                  placeholder='Pilih Provinsi...'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  KOTA / KABUPATEN
                </label>
                <div className='relative mt-2'>
                  <SearchableSelect
                    value={kota}
                    onChange={(val: string) => {
                      setKota(val)
                      setKabupaten(val)
                    }}
                    isDisabled={!provinsi}
                    options={listKabupatenFiltered.map((k) => ({
                      value: k.value,
                      label: k.label,
                    }))}
                    className='border-0 bg-white'
                    placeholder='Pilih Kota/Kabupaten...'
                  />
                </div>
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  ALAMAT
                </label>
                <input
                  type='text'
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder='Jalan Contoh No. 123'
                  className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  BIDANG USAHA
                </label>
                <SearchableSelect
                  value={bidangUsaha}
                  onChange={(val: string) => setBidangUsaha(val)}
                  className='mt-2 border-0 bg-white'
                  options={[
                    { value: '', label: ' -- Pilih --' },
                    {
                      value: 'Energi & Pertambangan',
                      label: 'Energi & Pertambangan',
                    },
                    { value: 'Jasa Profesional', label: 'Jasa Profesional' },
                    {
                      value: 'Jasa Umum & Lainnya',
                      label: 'Jasa Umum & Lainnya',
                    },
                    { value: 'Kesehatan', label: 'Kesehatan' },
                    {
                      value: 'Keuangan & Asuransi',
                      label: 'Keuangan & Asuransi',
                    },
                    {
                      value: 'Kontruksi & Properti',
                      label: 'Kontruksi & Properti',
                    },
                    { value: 'Kreatif & Media', label: 'Kreatif & Media' },
                    {
                      value: 'Manufaktur & Industri',
                      label: 'Manufaktur & Industri',
                    },
                    {
                      value: 'Perhotelan & Pariwisata',
                      label: 'Perhotelan & Pariwisata',
                    },
                    {
                      value: 'Pertanian, Perkebunan & Perikanan',
                      label: 'Pertanian, Perkebunan & Perikanan',
                    },
                    {
                      value: 'Teknologi & Digital',
                      label: 'Teknologi & Digital',
                    },
                    {
                      value: 'UMKM & Industri Rumah Tangga',
                      label: 'UMKM & Industri Rumah Tangga',
                    },
                    {
                      value: 'Pemerintahan & BUMN',
                      label: 'Pemerintahan & BUMN',
                    },
                    { value: 'Pendidikan', label: 'Pendidikan' },
                    {
                      value: 'Perdagangan (Trading)',
                      label: 'Perdagangan (Trading)',
                    },
                  ]}
                />
              </div>
            </div>
          </section>
          <section className='mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center justify-between gap-4 mb-6'>
              <div>
                <h2 className='text-xl font-bold text-gray-800'>
                  Informasi PIC
                </h2>
                <p className='text-sm font-medium text-gray-500'>
                  Data kontak person instansi
                </p>
              </div>
              <button
                onClick={addItem}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Plus className='w-4 h-4' />{' '}
                <p className='text-xs font-semibold'>Tambah Kontak</p>
              </button>
            </div>
            <div className='flex flex-col gap-4'>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className='relative grid grid-cols-1 gap-3 md:grid-cols-6 p-4 border border-gray-100 rounded-xl bg-gray-50/50'
                >
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className='absolute -top-2 -right-2 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition-colors z-10 shadow-sm'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  )}
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      NAMA PIC
                    </label>
                    <input
                      type='text'
                      value={item.nama}
                      onChange={(e) =>
                        updateItem(index, 'nama', e.target.value)
                      }
                      placeholder='Masukkan Nama'
                      className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      JABATAN
                    </label>
                    <SearchableSelect
                      value={item.jabatan}
                      onChange={(value) =>
                        updateItem(index, 'jabatan', value as string)
                      }
                      options={[
                        { value: '', label: '-- Pilih Jabatan --' },
                        { value: 'Kepala', label: 'Kepala' },
                        { value: 'Staff', label: 'Staff' },
                      ]}
                      placeholder='Masukkan Jabatan'
                      className='mt-2 border-0 bg-white'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      ROLE PIC
                    </label>
                    <input
                      type='text'
                      value={item.role}
                      onChange={(e) =>
                        updateItem(index, 'role', e.target.value)
                      }
                      placeholder='Masukkan Role'
                      className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      TIPE KONTAK
                    </label>
                    <SearchableSelect
                      value={item.tipeKontak}
                      onChange={(value) =>
                        updateItem(index, 'tipeKontak', value as string)
                      }
                      options={(() => {
                        const base = [
                          { value: '', label: '-Pilih-' },
                          { value: 'WhatsApp', label: 'WhatsApp' },
                          { value: 'Office', label: 'Office' },
                          { value: 'Phone', label: 'Phone' },
                        ]
                        if (
                          item.tipeKontak &&
                          !base.find((o) => o.value === item.tipeKontak)
                        ) {
                          base.push({
                            value: item.tipeKontak,
                            label: item.tipeKontak,
                          })
                        }
                        return base
                      })()}
                      className='w-full'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      NO KONTAK
                    </label>
                    <input
                      type='text'
                      value={item.noTelp}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '')

                        if (val.startsWith('0') || val.startsWith('6')) {
                          val = val.substring(1)
                        }

                        updateItem(index, 'noTelp', val)
                      }}
                      placeholder='6281234567890'
                      maxLength={14}
                      className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-blue-600'>
                      EMAIL
                    </label>
                    <input
                      type='text'
                      value={item.email}
                      onChange={(e) =>
                        updateItem(index, 'email', e.target.value)
                      }
                      placeholder='email@example.com'
                      className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className='mt-6 rounded-2xl bg-white p-7 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center justify-between gap-4 mb-6'>
              <div>
                <h2 className='text-xl font-bold text-gray-800'>
                  Assignment & Status
                </h2>
                <p className='text-sm font-medium text-gray-500'>
                  Informasi tambahan instansi
                </p>
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  RING
                </label>
                <SearchableSelect
                  value={ring}
                  onChange={(val: string) => setRing(val)}
                  className='mt-2 border-0 w-full bg-white'
                  options={[{ value: 'RING 4', label: 'RING 4' }]}
                />
              </div>
              <div>
                <div>
                  <label className='text-sm font-semibold text-slate-600'>
                    PENGINPUT
                  </label>
                  <SearchableSelect
                    value={requestor}
                    onChange={(val: string) => setRequestor(val)}
                    options={(() => {
                      const base = [
                        { value: '', label: 'Pilih Requestor' },
                        {
                          value: user?.fullName || '',
                          label: user?.fullName || '',
                        },
                      ]
                      // jika requestor dari database belum ada di list, tambahkan otomatis
                      if (
                        requestor &&
                        !base.find((o) => o.value === requestor)
                      ) {
                        base.push({ value: requestor, label: requestor })
                      }
                      return base
                    })()}
                    className='mt-2 border-0 w-full bg-white'
                    placeholder='silahkan pilih ....'
                  />
                </div>
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  PRODUK RELEVAN
                </label>
                <SearchableSelect
                  value={produkRelevan}
                  onChange={(value) => setProdukRelevan(value)}
                  options={(() => {
                    const base = [
                      { value: '', label: 'Pilih Produk Relevan' },
                      { value: 'IFP', label: 'IFP' },
                      { value: 'MRS', label: 'MRS' },
                      { value: 'VIDEOTRON', label: 'VIDEOTRON' },
                      { value: 'AIO', label: 'AIO' },
                      { value: 'Genset', label: 'Genset' },
                    ]
                    if (
                      produkRelevan &&
                      !base.find((o) => o.value === produkRelevan)
                    ) {
                      base.push({ value: produkRelevan, label: produkRelevan })
                    }
                    return base
                  })()}
                  className='mt-2 border-0 bg-white w-full'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  MEREK TAYANG
                </label>
                <SearchableSelect
                  value={merekTayang}
                  onChange={(value) => {
                    setMerekTayang(value)
                    if (value !== 'Lainnya') setMerekLainnya('')
                  }}
                  options={(() => {
                    const base = [
                      { value: '', label: 'Pilih Merek Tayang' },
                      { value: 'HDe', label: 'HDe' },
                      { value: 'MABO POWER', label: 'MABO POWER' },
                      { value: 'MOBO POWER', label: 'MOBO POWER' },
                      { value: 'Lainnya', label: 'Lainnya' },
                    ]
                    if (
                      merekTayang &&
                      !base.find((o) => o.value === merekTayang)
                    ) {
                      base.push({ value: merekTayang, label: merekTayang })
                    }
                    return base
                  })()}
                  className='mt-2 border-0 bg-white w-full'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  BRAND OWNER
                </label>
                <SearchableSelect
                  value={brandOwner}
                  onChange={(value) => setBrandOwner(value)}
                  options={(() => {
                    const base = [
                      { value: '', label: 'Pilih Brand Owner' },
                      { value: 'YA', label: 'YA' },
                      { value: 'TIDAK', label: 'TIDAK' },
                    ]
                    if (
                      brandOwner &&
                      !base.find((o) => o.value === brandOwner)
                    ) {
                      base.push({ value: brandOwner, label: brandOwner })
                    }
                    return base
                  })()}
                  className='mt-2 border-0 bg-white w-full'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  SUMBER DATA
                </label>
                <SearchableSelect
                  value={sumberData}
                  onChange={(value) => {
                    setSumberData(value)
                    // Reset sales internal jika pindah ke sumber lain
                    if (value !== 'Sales Internal') setSalesInternal('')
                  }}
                  options={(() => {
                    const base = [
                      { value: '', label: 'Pilih Sumber Data' },
                      { value: 'e-Katalog LKPP', label: 'e-Katalog LKPP' },
                      { value: 'INAPROC', label: 'INAPROC' },
                      { value: 'PaDi UMKM', label: 'PaDi UMKM' },
                      { value: 'Mbizmarket', label: 'Mbizmarket' },
                      { value: 'SIPLah', label: 'SIPLah' },
                      { value: 'SPSE Pemda', label: 'SPSE Pemda' },
                      {
                        value: 'Sistem Internal Instansi',
                        label: 'Sistem Internal Instansi',
                      },
                      { value: 'Sales Internal', label: 'Sales Internal' },
                    ]
                    if (
                      sumberData &&
                      !base.find((o) => o.value === sumberData)
                    ) {
                      base.push({ value: sumberData, label: sumberData })
                    }
                    return base
                  })()}
                  className='mt-2 w-full'
                />
              </div>
              {/* Hanya muncul jika sumberData === 'Sales Internal' */}
              {sumberData === 'Sales Internal' && (
                <div>
                  <label className='text-sm font-semibold text-slate-600'>
                    NAMA SALES INTERNAL
                  </label>
                  <SearchableSelect
                    value={salesInternal}
                    onChange={(value) => {
                      setSalesInternal(value)
                    }}
                    options={[
                      { value: '', label: '--Pilih Nama Sales--' },
                      {
                        value: 'Arie Muhammad Fajar',
                        label: 'Arie Muhammad Fajar',
                      },
                      { value: 'Beffry Rizkana', label: 'Beffry Rizkana' },
                      { value: 'Ferrie Ferdinal', label: 'Ferrie Ferdinal' },
                      { value: 'Hery Nugraha', label: 'Hery Nugraha' },
                      { value: 'Hendri', label: 'Hendri' },
                      { value: 'Eva Tamika', label: 'Eva Tamika' },
                      { value: 'Toni Ramdan', label: 'Toni Ramdan' },
                      { value: 'Mugi Khairul', label: 'Mugi Khairul' },
                    ]}
                    placeholder='Ketik nama sales...'
                    className='mt-2 w-full'
                  />
                </div>
              )}
              {merekTayang === 'Lainnya' && (
                <div className=''>
                  <label className='text-sm font-semibold text-slate-600'>
                    MEREK LAINNYA
                  </label>
                  <SearchableSelect
                    value={merekLainnya}
                    onChange={(val: string) => handleMerekChange(val)}
                    options={listMerek.map((p) => ({
                      value: p.nama,
                      label: p.nama,
                    }))}
                    className='mt-2 border-0 bg-white w-full'
                  />
                </div>
              )}
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  LINK PRODUK
                </label>
                <input
                  type='text'
                  value={linkProduk}
                  onChange={(e) => setLinkProduk(e.target.value)}
                  placeholder='https:// atau contoh.com'
                  className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                />
              </div>
              <div>
                <label className='text-sm font-semibold text-slate-600'>
                  LINK TOKO
                </label>
                <input
                  type='text'
                  value={linkToko}
                  onChange={(e) => setLinkToko(e.target.value)}
                  placeholder='https:// atau contoh.com'
                  className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                />
              </div>
            </div>
          </section>

          <div className='mt-6'>
            <div className='flex items-center justify-center gap-4 mb-6'>
              <button
                onClick={handleKirim}
                className='flex h-10 items-center justify-center gap-2 cursor-pointer rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-blue-700 hover:bg-blue-700 transition-all'
              >
                <Save className='h-5 w-5' />
                {searchParams.get('id') ? 'Simpan Revisi' : 'Simpan Database'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormB2BPage() {
  return (
    <Suspense fallback={<div className='p-8 text-center'>Loading...</div>}>
      <FormB2BContent />
    </Suspense>
  )
}
