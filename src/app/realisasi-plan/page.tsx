'use client'

import { Fragment, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  Map,
  Search,
  Users,
} from 'lucide-react'

type Plan = {
  code_submit: string
  leaderName: string
  note: string
  period: string
  periodOf: string
  month: string
  year: string
  total_active_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
  sales_targets: {
    nama_sales: string
    visit_target: string
    demo_target: string
    sph_target: string
    sph_deal_target: string
    revenue: string
    note: string
  }[]
  sales_visit: {
    nama_sales: string
    segmentasi: string
    tipe_visit: string
    nama_perusahaan: string
    note: string
  }[]
}

type SaleRealization = {
  nama_sales: string
  visit: string
  visitSource?: string
  demo: string
  sph: string
  closing: string
  revenue: string
  note: string
}

type VisitRealization = {
  status: string
  note: string
}

const steps = [
  'Info Realisasi',
  'Realisasi Per Sales',
  'Realisasi Visit',
  'Review & Simpan',
]
const visitStatuses = [
  'Terlaksana',
  'Tidak Terlaksana',
  'Reschedule',
  'Pending',
]
const formatNumber = (value: string | number) =>
  Number(value || 0).toLocaleString('id-ID')
const formatRupiah = (value: string | number) => `Rp ${formatNumber(value)}`

function Stepper({
  current,
  onSelect,
}: {
  current: number
  onSelect: (step: number) => void
}) {
  return (
    <nav
      aria-label='Langkah realisasi'
      className='mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4'
    >
      {steps.map((label, index) => (
        <button
          key={label}
          type='button'
          onClick={() => index < current && onSelect(index)}
          aria-current={index === current ? 'step' : undefined}
          className={`flex items-center gap-3 text-left ${index < current ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${index < current ? 'border-emerald-500 bg-emerald-500 text-white' : index === current ? 'border-sky-700 bg-sky-700 text-white ring-4 ring-sky-100' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
          >
            {index < current ? <Check size={17} /> : index + 1}
          </span>
          <span>
            <span className='block text-xs text-slate-400'>
              Langkah {index + 1}
            </span>
            <span
              className={`block text-sm font-semibold ${index === current ? 'text-sky-800' : index < current ? 'text-emerald-600' : 'text-slate-600'}`}
            >
              {label}
            </span>
          </span>
        </button>
      ))}
    </nav>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className='flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white px-5 py-4'>
      <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-sky-800 text-white'>
        {icon}
      </span>
      <div>
        <h2 className='font-bold text-slate-900'>{title}</h2>
        <p className='text-sm text-slate-500'>{subtitle}</p>
      </div>
    </div>
  )
}

function Metric({
  label,
  plan,
  actual,
  money = false,
}: {
  label: string
  plan: string
  actual?: number
  money?: boolean
}) {
  const target = Number(plan) || 0
  const amount = actual ?? target
  const percent = target ? Math.min((amount / target) * 100, 100) : 0
  return (
    <div className='rounded-xl border border-sky-200 bg-sky-50 p-4'>
      <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
        {label}
      </p>
      <p className='mt-1 font-bold text-sky-900'>
        {money ? formatRupiah(amount) : formatNumber(amount)}
        <span className='ml-1 text-sm font-normal text-slate-500'>
          / {money ? formatRupiah(target) : formatNumber(target)}
        </span>
      </p>
      {actual !== undefined && (
        <>
          <p
            className={`mt-1 text-xs font-semibold ${percent >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {Math.round(target ? (amount / target) * 100 : 0)}%
          </p>
          <div className='mt-2 h-1.5 rounded-full bg-slate-200'>
            <div
              className={`h-1.5 rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-sky-600'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default function RealisasiPlanPage() {
  const [code, setCode] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [sales, setSales] = useState<SaleRealization[]>([])
  const [visits, setVisits] = useState<VisitRealization[]>([])
  const [teamNote, setTeamNote] = useState('')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const loadPlan = async (value: string) => {
    if (!value.trim()) {
      setError('Masukkan kode submit plan terlebih dahulu.')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const response = await fetch(
        `/api/list-plan?${new URLSearchParams({ code: value.trim() })}`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || 'Plan tidak dapat dimuat.')
      const selected = data.plan as Plan
      if (
        !Array.isArray(selected.sales_targets) ||
        !Array.isArray(selected.sales_visit)
      ) {
        throw new Error(
          'Data plan tidak memiliki target sales atau rencana visit.',
        )
      }
      const actualResponse = await fetch(
        `/api/realisasi-plan?${new URLSearchParams({ code: selected.code_submit })}`,
        { cache: 'no-store' },
      )
      const actualData = await actualResponse.json()
      if (!actualResponse.ok) {
        throw new Error(actualData.error || 'Realisasi visit tidak dapat dimuat.')
      }
      setPlan(selected)
      setCode(selected.code_submit)
      setSales(
        selected.sales_targets.map((row) => ({
          nama_sales: row.nama_sales,
          visit: String(actualData.counts?.[row.nama_sales] ?? 0),
          visitSource: actualData.sources?.[row.nama_sales] ?? 'Belum ada data',
          demo: '0',
          sph: '0',
          closing: '0',
          revenue: '0',
          note: '',
        })),
      )
      setVisits(selected.sales_visit.map(() => ({ status: '', note: '' })))
      setTeamNote('')
      setStep(0)
    } catch (loadError) {
      setPlan(null)
      setError(
        loadError instanceof Error ? loadError.message : 'Gagal memuat plan.',
      )
    } finally {
      setLoading(false)
    }
  }

  const updateSale = (
    index: number,
    field: keyof SaleRealization,
    value: string,
  ) => {
    setSaved(false)
    setSales((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }
  const updateVisit = (
    index: number,
    field: keyof VisitRealization,
    value: string,
  ) => {
    setSaved(false)
    setVisits((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const goNext = () => {
    setError('')
    if (
      step === 1 &&
      sales.some((row) =>
        [row.visit, row.demo, row.sph, row.closing, row.revenue].some(
          (value) =>
            value.trim() === '' ||
            !Number.isFinite(Number(value)) ||
            Number(value) < 0,
        ),
      )
    ) {
      setError('Isi seluruh realisasi dengan angka nol atau lebih.')
      return
    }
    if (step === 2 && visits.some((row) => !row.status)) {
      setError('Pilih status untuk setiap rencana visit.')
      return
    }
    setStep((current) => Math.min(current + 1, 3))
  }

  const saveRealization = async () => {
    if (!plan) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/realisasi-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_submit: plan.code_submit,
          team_note: teamNote,
          sales: sales.map((row) => ({
            ...row,
            visit: Number(row.visit),
            demo: Number(row.demo),
            sph: Number(row.sph),
            closing: Number(row.closing),
            revenue: Number(row.revenue),
          })),
          visits: plan.sales_visit.map((row, index) => ({
            ...row,
            ...visits[index],
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error || 'Gagal menyimpan realisasi.')
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Gagal menyimpan realisasi.',
      )
    } finally {
      setSaving(false)
    }
  }

  const totals = sales.reduce(
    (total, row) => ({
      visit: total.visit + Number(row.visit || 0),
      demo: total.demo + Number(row.demo || 0),
      sph: total.sph + Number(row.sph || 0),
      closing: total.closing + Number(row.closing || 0),
      revenue: total.revenue + Number(row.revenue || 0),
    }),
    { visit: 0, demo: 0, sph: 0, closing: 0, revenue: 0 },
  )

  return (
    <div className='mx-auto max-w-[1600px] p-4 md:p-6'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-slate-900'>Input Realisasi</h1>
        <p className='mt-1 text-sm text-slate-500'>
          Masukkan realisasi berdasarkan kode submit plan. Data plan dimuat
          otomatis sebagai acuan.
        </p>
      </div>

      <section className='mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
        {!plan ? (
          <div className='p-5'>
            <label
              htmlFor='plan-code'
              className='mb-2 block text-sm font-semibold text-slate-700'
            >
              Kode Submit Plan
            </label>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <input
                id='plan-code'
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && loadPlan(code)}
                placeholder='Contoh: ARI-BL-X-NOV-2026'
                className='h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
              />
              <button
                type='button'
                onClick={() => loadPlan(code)}
                disabled={loading}
                className='inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-800 px-5 text-sm font-semibold text-white hover:bg-sky-900 disabled:opacity-60'
              >
                <Search size={16} /> {loading ? 'Memuat...' : 'Muat Plan'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50/60 px-5 py-4'>
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white'>
                  <ClipboardList size={20} />
                </span>
                <div>
                  <h2 className='font-bold text-slate-900'>
                    Data Plan Referensi
                  </h2>
                  <p className='text-sm text-slate-600'>
                    Kode: {plan.code_submit} — {plan.leaderName} | {plan.period}{' '}
                    {plan.month} {plan.year}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => {
                  setPlan(null)
                  setStep(0)
                  setSaved(false)
                  setError('')
                }}
                className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                Ganti Kode
              </button>
            </div>
            <div className='grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5'>
              <Metric label='Plan Visit' plan={plan.visit_target} />
              <Metric label='Plan Demo' plan={plan.demo_target} />
              <Metric label='Plan SPH' plan={plan.sph_target} />
              <Metric label='Plan Closing' plan={plan.sph_deal_target} />
              <Metric label='Plan Revenue' plan={plan.revenue} money />
            </div>
          </>
        )}
      </section>

      {error && (
        <p
          role='alert'
          className='mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role='status'
          className='mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
        >
          Realisasi berhasil disimpan.
        </p>
      )}

      {plan && (
        <>
          <Stepper current={step} onSelect={setStep} />
          <section className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
            {step === 0 && (
              <>
                <SectionHeader
                  icon={<FileCheck2 size={20} />}
                  title='Informasi Realisasi Tim'
                  subtitle='Periode dan info tim diambil otomatis dari plan'
                />
                <div className='grid gap-4 p-5 md:grid-cols-3'>
                  {[
                    ['Periode', plan.period],
                    ['Periode Ke', plan.periodOf],
                    ['Bulan / Tahun', `${plan.month} ${plan.year}`],
                    ['Nama Leader', plan.leaderName],
                    ['Jumlah Sales Aktif', `${plan.total_active_sales} orang`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className='mb-1 text-xs font-medium text-slate-500'>
                        {label}
                      </p>
                      <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700'>
                        {value}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label
                      htmlFor='team-note'
                      className='mb-1 block text-xs font-medium text-slate-500'
                    >
                      Catatan Realisasi
                    </label>
                    <input
                      id='team-note'
                      value={teamNote}
                      onChange={(event) => {
                        setSaved(false)
                        setTeamNote(event.target.value)
                      }}
                      placeholder='Catatan tambahan (opsional)'
                      className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
                    />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <SectionHeader
                  icon={<Users size={20} />}
                  title='Realisasi Per Sales'
                  subtitle={`VisitActivity ${plan.month} ${plan.year}; jika belum ada aktivitas, diisi dari jumlah rencana visit plan. Angka dapat disesuaikan.`}
                />
                <div className='overflow-x-auto p-5'>
                  <table className='w-full min-w-[1100px] text-left text-sm'>
                    <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                      <tr>
                        {[
                          '#',
                          'Nama Sales',
                          'Plan Visit',
                          'Real Visit',
                          'Plan Demo',
                          'Real Demo',
                          'Plan SPH',
                          'Real SPH',
                          'Plan Closing',
                          'Real Closing',
                          'Plan Revenue',
                          'Real Revenue',
                          'Catatan',
                        ].map((head) => (
                          <th key={head} className='px-3 py-3'>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((row, index) => {
                        const target = plan.sales_targets[index]
                        return (
                          <tr
                            key={`${row.nama_sales}-${index}`}
                            className='border-t border-slate-200'
                          >
                            <td className='px-3 py-2 text-slate-400'>
                              {index + 1}
                            </td>
                            <td className='whitespace-nowrap px-3 py-2 font-semibold'>
                              {row.nama_sales}
                            </td>
                            {(
                              [
                                'visit',
                                'demo',
                                'sph',
                                'closing',
                                'revenue',
                              ] as const
                            ).map((field) => {
                              const planFields: Record<
                                typeof field,
                                keyof typeof target
                              > = {
                                visit: 'visit_target',
                                demo: 'demo_target',
                                sph: 'sph_target',
                                closing: 'sph_deal_target',
                                revenue: 'revenue',
                              }
                              const planField = planFields[field]
                              return (
                                <Fragment key={field}>
                                  <td className='whitespace-nowrap bg-emerald-50 px-3 py-2 font-medium text-emerald-700'>
                                    {field === 'revenue'
                                      ? formatRupiah(target[planField])
                                      : formatNumber(target[planField])}
                                  </td>
                                  <td className='min-w-28 px-2 py-2'>
                                    <input
                                      aria-label={`${field} ${row.nama_sales}`}
                                      title={field === 'visit' ? `Sumber: ${row.visitSource}` : undefined}
                                      type='number'
                                      min='0'
                                      step={field === 'revenue' ? 'any' : '1'}
                                      value={row[field]}
                                      onChange={(event) =>
                                        updateSale(
                                          index,
                                          field,
                                          event.target.value,
                                        )
                                      }
                                      className='h-9 w-24 rounded-md border border-slate-300 px-2 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100'
                                    />
                                  </td>
                                </Fragment>
                              )
                            })}
                            <td className='min-w-36 px-2 py-2'>
                              <input
                                aria-label={`Catatan ${row.nama_sales}`}
                                value={row.note}
                                onChange={(event) =>
                                  updateSale(index, 'note', event.target.value)
                                }
                                placeholder='Opsional'
                                className='h-9 w-32 rounded-md border border-slate-300 px-2 outline-none focus:border-sky-600'
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className='border-t-2 border-sky-500 bg-sky-50 font-bold text-sky-900'>
                      <tr>
                        <td colSpan={2} className='px-3 py-3'>
                          Σ TOTAL REALISASI
                        </td>
                        {(
                          [
                            'visit',
                            'demo',
                            'sph',
                            'closing',
                            'revenue',
                          ] as const
                        ).map((field) => (
                          <td key={field} colSpan={2} className='px-3 py-3'>
                            {field === 'revenue'
                              ? formatRupiah(totals[field])
                              : formatNumber(totals[field])}
                          </td>
                        ))}
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <SectionHeader
                  icon={<Map size={20} />}
                  title='Realisasi Visit'
                  subtitle='Perbarui status setiap rencana visit dari plan'
                />
                <div className='overflow-x-auto p-5'>
                  <table className='w-full min-w-[850px] text-left text-sm'>
                    <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                      <tr>
                        {[
                          '#',
                          'Nama Sales',
                          'Segmentasi',
                          'Tipe Visit',
                          'Entity',
                          'Status *',
                          'Catatan Realisasi',
                        ].map((head) => (
                          <th key={head} className='px-3 py-3'>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.sales_visit.map((row, index) => (
                        <tr
                          key={`${row.nama_sales}-${row.nama_perusahaan}-${index}`}
                          className='border-t border-slate-200'
                        >
                          <td className='px-3 py-3 text-slate-400'>
                            {index + 1}
                          </td>
                          <td className='whitespace-nowrap px-3 py-3 font-semibold'>
                            {row.nama_sales}
                          </td>
                          <td className='px-3 py-3'>{row.segmentasi}</td>
                          <td className='px-3 py-3'>{row.tipe_visit}</td>
                          <td className='px-3 py-3 font-medium'>
                            {row.nama_perusahaan}
                          </td>
                          <td className='min-w-48 px-2 py-2'>
                            <select
                              aria-label={`Status visit ${row.nama_perusahaan}`}
                              value={visits[index]?.status ?? ''}
                              onChange={(event) =>
                                updateVisit(index, 'status', event.target.value)
                              }
                              className='h-10 w-full rounded-md border border-slate-300 bg-white px-2 outline-none focus:border-sky-600'
                            >
                              <option value=''>-- Pilih Status --</option>
                              {visitStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className='min-w-48 px-2 py-2'>
                            <input
                              aria-label={`Catatan visit ${row.nama_perusahaan}`}
                              value={visits[index]?.note ?? ''}
                              onChange={(event) =>
                                updateVisit(index, 'note', event.target.value)
                              }
                              placeholder='Opsional'
                              className='h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-sky-600'
                            />
                          </td>
                        </tr>
                      ))}
                      {!plan.sales_visit.length && (
                        <tr>
                          <td
                            colSpan={7}
                            className='p-8 text-center text-slate-500'
                          >
                            Tidak ada rencana visit di plan ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <SectionHeader
                  icon={<ClipboardList size={20} />}
                  title='Review & Simpan Realisasi'
                  subtitle='Periksa data realisasi sebelum disimpan'
                />
                <div className='space-y-6 p-5'>
                  <div className='rounded-xl border border-sky-300 bg-sky-50 p-5'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      Realisasi untuk kode plan
                    </p>
                    <p className='mt-1 font-mono text-lg font-bold text-sky-900'>
                      {plan.code_submit}
                    </p>
                    <p className='mt-1 text-sm text-slate-600'>
                      {plan.leaderName} | {plan.period} {plan.month} {plan.year}
                    </p>
                  </div>
                  <div>
                    <h3 className='mb-3 text-sm font-bold uppercase tracking-wide text-slate-500'>
                      Pencapaian Tim (Plan vs Realisasi)
                    </h3>
                    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                      <Metric
                        label='Visit'
                        plan={plan.visit_target}
                        actual={totals.visit}
                      />
                      <Metric
                        label='Demo'
                        plan={plan.demo_target}
                        actual={totals.demo}
                      />
                      <Metric
                        label='SPH'
                        plan={plan.sph_target}
                        actual={totals.sph}
                      />
                      <Metric
                        label='Closing'
                        plan={plan.sph_deal_target}
                        actual={totals.closing}
                      />
                      <Metric
                        label='Revenue'
                        plan={plan.revenue}
                        actual={totals.revenue}
                        money
                      />
                    </div>
                  </div>
                  <div className='overflow-x-auto'>
                    <h3 className='mb-3 text-sm font-bold uppercase tracking-wide text-slate-500'>
                      Realisasi Per Sales
                    </h3>
                    <table className='w-full min-w-[700px] text-left text-sm'>
                      <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                        <tr>
                          {[
                            '#',
                            'Nama Sales',
                            'R. Visit',
                            'R. Demo',
                            'R. SPH',
                            'R. Closing',
                            'R. Revenue',
                            'Catatan',
                          ].map((head) => (
                            <th key={head} className='px-3 py-3'>
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((row, index) => (
                          <tr
                            key={`${row.nama_sales}-${index}`}
                            className='border-t border-slate-200'
                          >
                            <td className='px-3 py-3 text-slate-400'>
                              {index + 1}
                            </td>
                            <td className='px-3 py-3 font-medium'>
                              {row.nama_sales}
                            </td>
                            <td className='px-3 py-3'>
                              {formatNumber(row.visit)}
                            </td>
                            <td className='px-3 py-3'>
                              {formatNumber(row.demo)}
                            </td>
                            <td className='px-3 py-3'>
                              {formatNumber(row.sph)}
                            </td>
                            <td className='px-3 py-3'>
                              {formatNumber(row.closing)}
                            </td>
                            <td className='px-3 py-3 text-sky-800'>
                              {formatRupiah(row.revenue)}
                            </td>
                            <td className='px-3 py-3'>{row.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className='overflow-x-auto'>
                    <h3 className='mb-3 text-sm font-bold uppercase tracking-wide text-slate-500'>
                      Status Visit ({visits.length} item)
                    </h3>
                    <table className='w-full min-w-[600px] text-left text-sm'>
                      <thead className='bg-slate-50 text-xs uppercase text-slate-600'>
                        <tr>
                          <th className='px-3 py-3'>#</th>
                          <th className='px-3 py-3'>Sales</th>
                          <th className='px-3 py-3'>Entity</th>
                          <th className='px-3 py-3'>Status</th>
                          <th className='px-3 py-3'>Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.sales_visit.map((row, index) => (
                          <tr
                            key={`${row.nama_sales}-${row.nama_perusahaan}-${index}`}
                            className='border-t border-slate-200'
                          >
                            <td className='px-3 py-3 text-slate-400'>
                              {index + 1}
                            </td>
                            <td className='px-3 py-3'>{row.nama_sales}</td>
                            <td className='px-3 py-3 font-medium'>
                              {row.nama_perusahaan}
                            </td>
                            <td className='px-3 py-3'>
                              {visits[index]?.status || '—'}
                            </td>
                            <td className='px-3 py-3'>
                              {visits[index]?.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {teamNote && (
                    <p className='text-sm text-slate-600'>
                      <strong>Catatan tim:</strong> {teamNote}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          <div className='mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5'>
            <button
              type='button'
              onClick={() => (step === 0 ? undefined : setStep(step - 1))}
              disabled={step === 0 || saving}
              className='inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
            >
              <ChevronLeft size={16} /> Kembali
            </button>
            {step < 3 ? (
              <button
                type='button'
                onClick={goNext}
                className='inline-flex h-11 items-center gap-2 rounded-lg bg-sky-800 px-5 text-sm font-semibold text-white shadow hover:bg-sky-900'
              >
                Lanjut: {steps[step + 1]} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type='button'
                onClick={saveRealization}
                disabled={saving || saved}
                className='inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60'
              >
                <Check size={16} />{' '}
                {saving
                  ? 'Menyimpan...'
                  : saved
                    ? 'Tersimpan'
                    : 'Simpan Realisasi'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
