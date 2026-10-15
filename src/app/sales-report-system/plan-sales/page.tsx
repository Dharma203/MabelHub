'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useSession } from '@/components/session/SessionProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowBigUp, Clock, Save, Target } from 'lucide-react'
import { validateFormFieldsPlan } from '@/utils/formValidationPlan'
import { computeChangedFields } from '@/utils/validation'

type ReportItem = {
  id: string
  created_at: string
  nama_sales: string
  updated_at: string
  code_submit: string
  period: string
  period_of: string
  month: string
  year: string
  leaderId: string
  leaderName: string
  total_active_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  note: string
}

function PlanSalesContent() {
  const [codeSubmit, setCodeSubmit] = useState('')
  const [period, setPeriod] = useState('')
  const [periodOf, setPeriodOf] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [activeSales, setActiveSales] = useState('')
  const [visitTarget, setVisitTarget] = useState('')
  const [demoTarget, setDemoTarget] = useState('')
  const [sphTarget, setSphTarget] = useState('')
  const [sphDealTarget, setSphDealTarget] = useState('')
  const [revenue, setRevenue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const searchParams = useSearchParams()
  const [originalSnapshot, setOriginalSnapshot] = useState<{
    header: Record<string, string>
    items: any[]
  } | null>(null)

  const [items, setItems] = useState<
  {
    id: string
    leaderName: string
    leaderId: string
    note: string
  }[]
  >(() => [
    {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      leaderName: '',
      leaderId: '',
      note: '',
    }
  ])

  const wrapperRef = useRef<HTMLDivElement>(null)

  const isRevisionMode = !!(
    searchParams.get('id')?.trim() || originalSnapshot
  )

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

  const handleKirim = () => {
    const headerError = validateFormFieldsPlan({
      leaderName,
      visit_target: visitTarget,
      demo_target: demoTarget,
      revenue,
      sph_target: sphTarget,
    })
    if (headerError) {
      alert(headerError.message)
      return
    }

    const makePrefix = (leaderName: string): string => {
      if (!leaderName) return 'ARI'
      const consonants = 'bcdfghjklmnpqrstvwxyz'
      let result = leaderName[0].toUpperCase()
      for (let i = 1; i < leaderName.length && result.length < 3; i++) {
        if (consonants.includes(leaderName[i].toLowerCase())) {
          result += leaderName[i].toUpperCase()
        }
      }
      while (result.length < 3) result += 'X'
      return result
    }
    const prefixFallback = makePrefix(leaderName)

    const makeMonthPrefix = (period: string): string => {
      if (!period) return 'BL'
      const consonants = 'bcdfghjklmnpqrstvwxyz'
      let result = period[0].toUpperCase()
      for (let i = 1; i < period.length && result.length < 2; i++) {
        if (consonants.includes(period[i].toLowerCase())) {
          result += period[i].toUpperCase()
        }
      }
      while (result.length < 2) result += 'X'
      return result
    }
    const date = new Date()
    const year = date.toLocaleDateString('id-ID', {
      year: 'numeric'
    })
    .replace(/\//g, '')
    const generatedCode = 
    codeSubmit.trim() ||
    `${prefixFallback}-${makeMonthPrefix}-${'X'}-${year}`

    const headerPayload = {
      codeSubmit: generatedCode,
      period: period,
      periodOf : 'X',
      month: month,
      year: year,
      leaderName: leaderName,
      activeSales: activeSales,
      visitTarget: visitTarget,
      demoTarget: demoTarget,
      sphTarget: sphDealTarget,
      sphDealTarget: sphDealTarget,
      revenue: revenue,
      note: note
    }

    const itemsPayload = items.map((item) => ({
      id: item.id,
      leaderName: item.leaderName,
      leaderId: item.leaderId,
      note: note,

    }))

    let res : Response

    if (isRevisionMode) {
      // hitung perubahan field
      const changedFields = computeChangedFields(
        originalSnapshot,
        headerPayload,
        itemsPayload,
      )

      // mode revisi : panggil put
      


    }
  }

  return (
    <div className='min-h-screen p-4 md:p-8 bg-blue-50'>
      <div className='mx-auto max-w-7xl space-y-8'>
        <div className='flex-1 p-4'>
          <div className='bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-100'>
            <div className='flex flex-col'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Plan Tim
              </h1>
              <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
                Form Input Plan Tim
              </div>
            </div>
          </div>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Clock
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h2 className='text-xl font-bold text-gray-700'>Periode</h2>
                <p className='text-sm font-medium text-gray-500'>
                  Data Periode , Bulan , Tahun
                </p>
              </div>
            </div>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-2'>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Periode
                </label>
                <SearchableSelect
                  value={period}
                  onChange={(val: string) => setPeriod(val)}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: 'Bulanan', label: 'Bulanan' },
                    { value: 'Mingguan', label: 'Mingguan' },
                    { value: 'Triwulan', label: 'Triwulan' },
                    { value: 'Kuartal', label: 'Kuartal' },
                  ]}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Periode Ke
                </label>
                <SearchableSelect
                  value={periodOf}
                  onChange={(val: string) => setPeriodOf(val)}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: 'X', label: 'X' },
                  ]}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Bulan
                </label>
                <SearchableSelect
                  value={month}
                  onChange={(val: string) => setMonth(val)}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: 'January', label: 'January' },
                    { value: 'February', label: 'February' },
                    { value: 'March', label: 'March' },
                    { value: 'April', label: 'April' },
                    { value: 'May', label: 'May' },
                    { value: 'June', label: 'June' },
                    { value: 'July', label: 'July' },
                    { value: 'August', label: 'August' },
                    { value: 'September', label: 'September' },
                    { value: 'October', label: 'October' },
                    { value: 'November', label: 'November' },
                    { value: 'December', label: 'December' },
                  ]}
                />
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Tahun
                </label>
                <SearchableSelect
                  value={year}
                  onChange={(val: string) => setYear(val)}
                  options={[
                    { value: '', label: '-- Pilih --' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' },
                    { value: '2028', label: '2028' },
                  ]}
                />
              </div>
            </div>
          </section>
          <section className='mt-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center gap-3 mb-6'>
              <Target
                className='text-white bg-blue-600 rounded-2xl p-1 px-2'
                size={38}
              />
              <div className='flex flex-col'>
                <h3 className='text-lg font-bold text-gray-900'>Target</h3>
                <p className='text-sm text-gray-500'>
                  Visit, Demo, SPH, SPH Deal, Revenue
                </p>
              </div>
            </div>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-5'>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Target Visit
                </label>
                <div className='relative mt-2'>
                  <input
                    type='number'
                    value={visitTarget}
                    onChange={(e) => setVisitTarget(e.target.value)}
                    placeholder='Contoh 120'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Target Demo / Presentasi
                </label>
                <div className='relative mt-2'>
                  <input
                    type='number'
                    value={demoTarget}
                    onChange={(e) => setDemoTarget(e.target.value)}
                    placeholder='Contoh 120'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Target SPH
                </label>
                <div className='relative mt-2'>
                  <input
                    type='number'
                    value={sphTarget}
                    onChange={(e) => setSphTarget(e.target.value)}
                    placeholder='Contoh 120'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Target Closing SPH
                </label>
                <div className='relative mt-2'>
                  <input
                    type='number'
                    value={sphDealTarget}
                    onChange={(e) => setSphDealTarget(e.target.value)}
                    placeholder='Contoh 120'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Target Revenue Total
                </label>
                <div className='relative mt-2'>
                  <input
                    type='number'
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder='Contoh 120'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
            </div>
          </section>
          <section className='mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5'>
            <div className='flex items-center justify-between gap-4 mb-6'>
              <div>
                <h2 className='text-xl font-bold text-gray-800'>
                  Informasi PIC & Tambahan
                </h2>
                <p className='text-sm font-medium text-gray-500'>
                  Data Penginput, Jumlah Sales Aktif, Catatan
                </p>
              </div>
            </div>
            <div className='gap-3 grid grid-cols-1 md:grid-cols-3'>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Nama Leader
                </label>
                <div className='relative mt-2'>
                  <input
                    type='text'
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder='Nama Leader'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Jumlah Sales Aktif
                </label>
                <div className='relative mt-2'>
                  <input
                    type='text'
                    value={activeSales}
                    onChange={(e) => setActiveSales(e.target.value)}
                    placeholder='Nama Leader'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
              </div>
              <div className='relative mt-2'>
                <label className='text-sm font-medium text-gray-700'>
                  Catatan
                </label>
                <div className='relative mt-2'>
                  <input
                    type='text'
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder='Nama Leader'
                    className='mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
                  />
                </div>
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
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlanTimPage() {
  return (
    <Suspense fallback={<div className='p-8 text-center'>Loading...</div>}>
      <PlanSalesContent />
    </Suspense>
  )
}