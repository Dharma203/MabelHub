'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import { FolderOpen, MapPin, Search, Users } from 'lucide-react'
import { useState } from 'react'

type PlanOption = {
  code_submit: string
  leaderName: string
  period: string
  month: string
  year: string
  revised: boolean
}

type SalesTarget = {
  nama_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  note: string
}

type SalesVisit = {
  nama_sales: string
  segmentasi: string
  tipe_visit: string
  nama_perusahaan: string
  note: string
}

type Plan = {
  code_submit: string
  leaderName: string
  note: string
  period: string
  periodOf: string
  month: string
  year: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  sales_targets: SalesTarget[]
  sales_visit: SalesVisit[]
}

const formatNumber = (value: string | number) =>
  Number(value || 0).toLocaleString('id-ID')

const formatRupiah = (value: string | number) =>
  `Rp ${formatNumber(value)}`

function ListPlanContent() {
  const leaderName = 'Arie Muhamad Fajar'
  const [period, setPeriod] = useState('')
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [codeSubmit, setCodeSubmit] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState('')

  const handleCariKode = async () => {
    setIsSearching(true)
    setError('')
    setPlans([])
    setCodeSubmit('')
    setPlan(null)

    try {
      const params = new URLSearchParams({ leaderName })
      if (period) params.set('period', period)
      const response = await fetch(`/api/list-plan?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal mencari plan.')
      setPlans(data.plans)
      if (data.plans.length === 0) {
        setError('Data plan tidak ditemukan untuk leader dan periode tersebut.')
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Gagal mencari data plan.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleBukaPlan = async () => {
    if (!codeSubmit) return
    setIsOpening(true)
    setError('')

    try {
      const response = await fetch(
        `/api/list-plan?${new URLSearchParams({ code: codeSubmit })}`,
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal membuka plan.')
      setPlan(data.plan)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Gagal membuka data plan.',
      )
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='mx-auto p-4'>
        <header className='mb-5'>
          <h1 className='text-3xl font-extrabold text-slate-900'>
            Lihat &amp; Revisi Plan
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Cari plan berdasarkan leader dan periode, lalu buka kode submit
            untuk melihat target dan rencana visit.
          </p>
        </header>

        <section className='overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm'>
          <div className='flex items-center gap-3 border-b border-slate-200 bg-sky-50 px-5 py-4'>
            <Search className='rounded-lg bg-sky-700 p-2 text-white' size={38} />
            <div>
              <h2 className='font-bold text-slate-900'>Cari Data Plan</h2>
              <p className='text-xs text-slate-500'>
                Filter berdasarkan leader dan periode untuk memilih kode submit
              </p>
            </div>
            Export
          </div>
          <div className='p-5'>
            <p className='mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800'>
              Pilih periode, lalu klik Cari Kode. Kode submit menampilkan bulan
              dan tahun plan; tanda centang berarti plan pernah direvisi.
            </p>

            <div className='grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]'>
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>
                  Nama Leader
                </label>
                <input
                  value={leaderName}
                  readOnly
                  className='h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500'
                />
              </div>
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>
                  Periode
                </label>
                <SearchableSelect
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: '', label: '-- Semua Periode --' },
                    { value: 'Mingguan', label: 'Mingguan' },
                    { value: 'Bulanan', label: 'Bulanan' },
                    { value: 'Triwulan', label: 'Triwulan' },
                    { value: 'Kuartal', label: 'Kuartal' },
                  ]}
                />
              </div>
              <button
                type='button'
                onClick={handleCariKode}
                disabled={isSearching}
                className='inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Search size={16} />
                {isSearching ? 'Mencari...' : 'Cari Kode'}
              </button>
            </div>

            {plans.length > 0 && (
              <div className='mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700'>
                    Pilih Kode Submit
                  </label>
                  <SearchableSelect
                    value={codeSubmit}
                    onChange={setCodeSubmit}
                    placeholder='Pilih kode submit'
                    options={plans.map((item) => ({
                      value: item.code_submit,
                      label: `${item.revised ? '✅ ' : '○ '}${item.code_submit} (${item.leaderName} · ${item.period} · ${item.month} ${item.year})`,
                    }))}
                  />
                </div>
                <button
                  type='button'
                  onClick={handleBukaPlan}
                  disabled={!codeSubmit || isOpening}
                  className='inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <FolderOpen size={16} />
                  {isOpening ? 'Membuka...' : 'Buka Plan'}
                </button>
              </div>
            )}

            {error && (
              <p role='status' className='mt-4 text-sm text-rose-600'>
                {error}
              </p>
            )}
          </div>
        </section>

        {plan && (
          <div className='mt-5 space-y-5'>
            <section className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-bold text-slate-900'>
                    {plan.code_submit}
                  </h2>
                  <p className='mt-1 text-sm text-slate-500'>
                    {plan.leaderName} · {plan.period} · {plan.month} {plan.year}
                  </p>
                </div>
                {plan.note && (
                  <p className='text-sm text-slate-500'>
                    Catatan: {plan.note}
                  </p>
                )}
              </div>
              <div className='mt-5 grid grid-cols-2 gap-3 md:grid-cols-5'>
                {[
                  ['Target Visit', plan.visit_target],
                  ['Target Demo', plan.demo_target],
                  ['Target SPH', plan.sph_target],
                  ['Target Closing', plan.sph_deal_target],
                  ['Target Revenue', formatRupiah(plan.revenue)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className='rounded-lg border border-slate-200 px-4 py-3'
                  >
                    <p className='text-xs font-medium uppercase text-slate-400'>
                      {label}
                    </p>
                    <p className='mt-1 font-bold text-slate-800'>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex items-center gap-3 border-b border-slate-200 bg-sky-50 px-5 py-4'>
                <Users className='text-sky-700' size={22} />
                <div>
                  <h2 className='font-bold text-slate-900'>
                    Target Per Sales
                  </h2>
                  <p className='text-xs text-slate-500'>
                    Data plan per individu
                  </p>
                </div>
              </div>
              <div className='overflow-x-auto p-4'>
                <table className='w-full min-w-200 text-left text-sm'>
                  <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                    <tr>
                      <th className='px-3 py-3'>#</th>
                      <th className='px-3 py-3'>Nama Sales</th>
                      <th className='px-3 py-3'>Target Visit</th>
                      <th className='px-3 py-3'>Target Demo</th>
                      <th className='px-3 py-3'>Target SPH</th>
                      <th className='px-3 py-3'>Target Closing</th>
                      <th className='px-3 py-3'>Target Revenue</th>
                      <th className='px-3 py-3'>Catatan</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {plan.sales_targets.map((row, index) => (
                      <tr key={`${row.nama_sales}-${index}`}>
                        <td className='px-3 py-2 text-slate-500'>
                          {index + 1}
                        </td>
                        <td className='px-3 py-2 font-medium'>
                          {row.nama_sales}
                        </td>
                        <td className='px-3 py-2'>
                          {formatNumber(row.visit_target)}
                        </td>
                        <td className='px-3 py-2'>
                          {formatNumber(row.demo_target)}
                        </td>
                        <td className='px-3 py-2'>
                          {formatNumber(row.sph_target)}
                        </td>
                        <td className='px-3 py-2'>
                          {formatNumber(row.sph_deal_target)}
                        </td>
                        <td className='px-3 py-2'>
                          {formatRupiah(row.revenue)}
                        </td>
                        <td className='px-3 py-2 text-slate-500'>
                          {row.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex items-center gap-3 border-b border-slate-200 bg-sky-50 px-5 py-4'>
                <MapPin className='text-sky-700' size={22} />
                <div>
                  <h2 className='font-bold text-slate-900'>Rencana Visit</h2>
                  <p className='text-xs text-slate-500'>
                    Daftar rencana kunjungan ({plan.sales_visit.length} item)
                  </p>
                </div>
              </div>
              <div className='overflow-x-auto p-4'>
                <table className='w-full min-w-160 text-left text-sm'>
                  <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                    <tr>
                      <th className='px-3 py-3'>#</th>
                      <th className='px-3 py-3'>Nama Sales</th>
                      <th className='px-3 py-3'>Segmentasi</th>
                      <th className='px-3 py-3'>Tipe Visit</th>
                      <th className='px-3 py-3'>Entity</th>
                      <th className='px-3 py-3'>Catatan</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {plan.sales_visit.length ? (
                      plan.sales_visit.map((row, index) => (
                        <tr key={`${row.nama_sales}-${index}`}>
                          <td className='px-3 py-2 text-slate-500'>
                            {index + 1}
                          </td>
                          <td className='px-3 py-2 font-medium'>
                            {row.nama_sales}
                          </td>
                          <td className='px-3 py-2'>{row.segmentasi}</td>
                          <td className='px-3 py-2'>{row.tipe_visit}</td>
                          <td className='px-3 py-2'>
                            {row.nama_perusahaan}
                          </td>
                          <td className='px-3 py-2 text-slate-500'>
                            {row.note || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className='px-3 py-8 text-center text-slate-400'
                        >
                          Tidak ada rencana visit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ListPlanPage() {
  return <ListPlanContent />
}
