'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Footprints,
  RotateCcw,
  Target,
  Users,
} from 'lucide-react'

type SalesTarget = {
  nama_sales: string
  visit_target: string
  demo_target: string
  sph_target: string
  sph_deal_target: string
  revenue: string
}

type Plan = {
  code_submit: string
  leaderName: string
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
  revised: boolean
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const valueOf = (value: string | number | undefined) => Number(value) || 0
const formatNumber = (value: number) => value.toLocaleString('id-ID')
const formatRupiah = (value: number) => `Rp ${formatNumber(value)}`

export default function TrackingPage() {
  const currentYear = String(new Date().getFullYear())
  const [year, setYear] = useState(currentYear)
  const [leader, setLeader] = useState('')
  const [period, setPeriod] = useState('Bulanan')
  const [appliedFilters, setAppliedFilters] = useState({
    leader: '',
    period: 'Bulanan',
    year: currentYear,
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ year: appliedFilters.year })
    if (appliedFilters.leader) params.set('leaderName', appliedFilters.leader)
    if (appliedFilters.period !== 'Semua') params.set('period', appliedFilters.period)

    fetch(`/api/list-plan?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Gagal memuat data plan.')
        setPlans(data.plans ?? [])
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === 'AbortError') return
        setError(
          caught instanceof Error ? caught.message : 'Gagal memuat data plan.',
        )
        setPlans([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appliedFilters])

  const leaders = useMemo(
    () => [...new Set(plans.map((plan) => plan.leaderName))].sort(),
    [plans],
  )
  const periods = useMemo(
    () => [...new Set(plans.map((plan) => plan.period))].sort(),
    [plans],
  )
  const shownPlans = useMemo(
    () => [...plans].sort(
      (a, b) =>
        MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month) ||
        a.month.localeCompare(b.month),
    ),
    [plans],
  )
  const totals = useMemo(
    () =>
      shownPlans.reduce(
        (sum, plan) => ({
          revenue: sum.revenue + valueOf(plan.revenue),
          visit: sum.visit + valueOf(plan.visit_target),
          demo: sum.demo + valueOf(plan.demo_target),
          closing: sum.closing + valueOf(plan.sph_deal_target),
        }),
        { revenue: 0, visit: 0, demo: 0, closing: 0 },
      ),
    [shownPlans],
  )
  const salesRows = shownPlans.flatMap((plan) =>
    (plan.sales_targets ?? []).map((sales) => ({ ...sales, plan })),
  )
  const yearOptions = Array.from({ length: 3 }, (_, index) =>
    String(Number(currentYear) - index),
  )

  const resetFilters = () => {
    setLeader('')
    setPeriod('Bulanan')
    setAppliedFilters({ leader: '', period: 'Bulanan', year: currentYear })
    setLoading(true)
    setError('')
    setYear(currentYear)
  }

  const stats = [
    {
      label: 'Total Plan Submit',
      value: formatNumber(shownPlans.length),
      icon: ClipboardList,
      tone: 'text-blue-700 bg-blue-100',
    },
    {
      label: 'Target Revenue',
      value: formatRupiah(totals.revenue),
      icon: DollarSign,
      tone: 'text-emerald-700 bg-emerald-100',
    },
    {
      label: 'Target Visit',
      value: formatNumber(totals.visit),
      icon: Footprints,
      tone: 'text-amber-700 bg-amber-100',
    },
    {
      label: 'Target Closing',
      value: formatNumber(totals.closing),
      icon: Target,
      tone: 'text-violet-700 bg-violet-100',
    },
  ]

  return (
    <main className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Home&nbsp; › &nbsp;Sales</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Tracking &amp; Analitik
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? 'Memuat data' : 'Data plan'}
          </span>
        </div>

        <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(120px,.8fr)_auto] md:items-end">
          <label className="block text-xs font-semibold text-slate-600">
            Nama Leader
            <select
              value={leader}
              onChange={(event) => setLeader(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Semua Leader</option>
              {leaders.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Periode
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="Semua">Semua Periode</option>
              {periods.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Tahun
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAppliedFilters({ leader, period, year })
                setLoading(true)
                setError('')
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800"
            >
              <BarChart3 size={16} />
              Tampilkan
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <article
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className={`mb-4 inline-flex rounded-lg p-2 ${tone}`}>
                <Icon size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-400">
                {loading ? 'Memuat...' : `${shownPlans.length} plan terpilih`}
              </p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
            <span className="rounded-lg bg-sky-600 p-2 text-white">
              <Target size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">
                Pencapaian Tim (Plan &amp; Realisasi)
              </h2>
              <p className="text-xs text-slate-500">
                Target berasal dari plan submit. Data realisasi belum tersedia.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Revenue', formatRupiah(totals.revenue)],
              ['Visit', formatNumber(totals.visit)],
              ['Demo', formatNumber(totals.demo)],
              ['Closing SPH', formatNumber(totals.closing)],
            ].map(([label, target]) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span className="text-xs text-slate-400">Realisasi —</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200" />
                <p className="mt-2 text-xs text-slate-500">
                  Target: <span className="font-semibold text-emerald-700">{target}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
            <span className="rounded-lg bg-sky-700 p-2 text-white">
              <CalendarDays size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">
                Tabel Ringkasan Per Periode
              </h2>
              <p className="text-xs text-slate-500">
                Daftar submit plan dan target tim pada periode terpilih
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {['#', 'Kode Submit', 'Leader', 'Periode', 'Bulan / Tahun', 'Target Revenue', 'Target Visit', 'Target Demo', 'Target Closing', 'Status'].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shownPlans.map((plan, index) => (
                  <tr key={plan.code_submit} className="text-slate-700 hover:bg-sky-50/50">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-sky-800">{plan.code_submit}</td>
                    <td className="whitespace-nowrap px-4 py-3">{plan.leaderName}</td>
                    <td className="px-4 py-3">{plan.period}</td>
                    <td className="whitespace-nowrap px-4 py-3">{plan.month} {plan.year}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-700">{formatRupiah(valueOf(plan.revenue))}</td>
                    <td className="px-4 py-3">{formatNumber(valueOf(plan.visit_target))}</td>
                    <td className="px-4 py-3">{formatNumber(valueOf(plan.demo_target))}</td>
                    <td className="px-4 py-3">{formatNumber(valueOf(plan.sph_deal_target))}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                        <CheckCircle2 size={12} /> {plan.revised ? 'Direvisi' : 'Ada Plan'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && shownPlans.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      Tidak ada plan pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white px-5 py-4">
            <span className="rounded-lg bg-sky-700 p-2 text-white">
              <Users size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Detail Per Sales</h2>
              <p className="text-xs text-slate-500">
                Perbandingan target per sales dari plan yang dipilih
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {['#', 'Nama Sales', 'Leader', 'Periode', 'Target Visit', 'Target Demo', 'Target SPH', 'Target Closing', 'Target Revenue', 'Realisasi'].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesRows.map((row, index) => (
                  <tr key={`${row.plan.code_submit}-${row.nama_sales}`} className="text-slate-700 hover:bg-sky-50/50">
                    <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{row.nama_sales}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.plan.leaderName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.plan.period} {row.plan.month} {row.plan.year}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatNumber(valueOf(row.visit_target))}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatNumber(valueOf(row.demo_target))}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatNumber(valueOf(row.sph_target))}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatNumber(valueOf(row.sph_deal_target))}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-700">{formatRupiah(valueOf(row.revenue))}</td>
                    <td className="px-4 py-3 text-slate-400">—</td>
                  </tr>
                ))}
                {!loading && salesRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      Belum ada rincian target sales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}