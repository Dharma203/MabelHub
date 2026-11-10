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

type SalesRealization = {
  nama_sales: string
  visit: number
  demo: number
  sph: number
  closing: number
  revenue: number
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
  realization: { sales: SalesRealization[] } | null
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
        const plans = await Promise.all(
          (data.plans ?? []).map(async (plan: Plan) => {
            const realizationResponse = await fetch(
              `/api/realisasi-plan?${new URLSearchParams({ code: plan.code_submit })}`,
              { signal: controller.signal, cache: 'no-store' },
            )
            const realizationData = await realizationResponse.json()
            if (!realizationResponse.ok) {
              throw new Error(
                realizationData.error || 'Gagal memuat data realisasi.',
              )
            }
            return { ...plan, realization: realizationData.realization }
          }),
        )
        setPlans(plans)
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
          actualRevenue:
            sum.actualRevenue +
            (plan.realization?.sales ?? []).reduce(
              (total, sale) => total + valueOf(sale.revenue),
              0,
            ),
          actualVisit:
            sum.actualVisit +
            (plan.realization?.sales ?? []).reduce(
              (total, sale) => total + valueOf(sale.visit),
              0,
            ),
          actualDemo:
            sum.actualDemo +
            (plan.realization?.sales ?? []).reduce(
              (total, sale) => total + valueOf(sale.demo),
              0,
            ),
          actualClosing:
            sum.actualClosing +
            (plan.realization?.sales ?? []).reduce(
              (total, sale) => total + valueOf(sale.closing),
              0,
            ),
        }),
        {
          revenue: 0,
          visit: 0,
          demo: 0,
          closing: 0,
          actualRevenue: 0,
          actualVisit: 0,
          actualDemo: 0,
          actualClosing: 0,
        },
      ),
    [shownPlans],
  )
  const salesRows = shownPlans.flatMap((plan) =>
    (plan.sales_targets ?? []).map((sales) => ({
      ...sales,
      plan,
      actual: plan.realization?.sales.find(
        (row) => row.nama_sales === sales.nama_sales,
      ),
    })),
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
      label: 'Total Kode Submit',
      value: formatNumber(shownPlans.length),
      icon: ClipboardList,
      tone: 'text-blue-700 bg-blue-100',
      detail: `${shownPlans.filter((plan) => plan.realization).length} ada realisasi`,
    },
    {
      label: 'Realisasi Revenue',
      value: formatRupiah(totals.actualRevenue),
      icon: DollarSign,
      tone: 'text-emerald-700 bg-emerald-100',
      detail: `Plan: ${formatRupiah(totals.revenue)} | Ach: ${totals.revenue ? Math.round((totals.actualRevenue / totals.revenue) * 100) : 0}%`,
    },
    {
      label: 'Realisasi Visit',
      value: formatNumber(totals.actualVisit),
      icon: Footprints,
      tone: 'text-amber-700 bg-amber-100',
      detail: `Plan: ${formatNumber(totals.visit)} | Ach: ${totals.visit ? Math.round((totals.actualVisit / totals.visit) * 100) : 0}%`,
    },
    {
      label: 'Realisasi Closing',
      value: formatNumber(totals.actualClosing),
      icon: Target,
      tone: 'text-violet-700 bg-violet-100',
      detail: `Plan: ${formatNumber(totals.closing)} | Ach: ${totals.closing ? Math.round((totals.actualClosing / totals.closing) * 100) : 0}%`,
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
            {loading ? 'Memuat data' : 'Data realisasi'}
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
          {stats.map(({ label, value, icon: Icon, tone, detail }) => (
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
                {loading ? 'Memuat...' : detail}
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
                Persentase realisasi terhadap target plan.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {[
              {
                label: 'Revenue',
                plan: totals.revenue,
                actual: totals.actualRevenue,
                money: true,
              },
              {
                label: 'Visit',
                plan: totals.visit,
                actual: totals.actualVisit,
              },
              {
                label: 'Demo',
                plan: totals.demo,
                actual: totals.actualDemo,
              },
              {
                label: 'Closing SPH',
                plan: totals.closing,
                actual: totals.actualClosing,
              },
            ].map(({ label, plan, actual, money }) => {
              const percent = plan ? Math.round((actual / plan) * 100) : 0
              return (
                <div key={label}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800">{label}</span>
                    <span className="flex gap-3">
                      <span className="text-emerald-600">
                        Plan: {money ? formatRupiah(plan) : formatNumber(plan)}
                      </span>
                      <span className="text-sky-800">
                        Real: {money ? formatRupiah(actual) : formatNumber(actual)}
                      </span>
                      <strong className="text-red-500">{percent}%</strong>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
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
                Daftar kode submit dan realisasi pada periode terpilih
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {['#', 'Kode Submit', 'Leader', 'Periode', 'Bulan / Tahun', 'Plan Revenue', 'Real Revenue', '% Ach Revenue', 'Plan Visit', 'Real Visit', '% Ach Visit', 'Status'].map((head) => (
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
                    <td className="whitespace-nowrap px-4 py-3">{plan.realization ? formatRupiah((plan.realization.sales ?? []).reduce((sum, sale) => sum + valueOf(sale.revenue), 0)) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">{plan.realization ? `${valueOf(plan.revenue) ? Math.round(((plan.realization.sales ?? []).reduce((sum, sale) => sum + valueOf(sale.revenue), 0) / valueOf(plan.revenue)) * 100) : 0}%` : '—'}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatNumber(valueOf(plan.visit_target))}</td>
                    <td className="px-4 py-3">{plan.realization ? formatNumber((plan.realization.sales ?? []).reduce((sum, sale) => sum + valueOf(sale.visit), 0)) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">{plan.realization ? `${valueOf(plan.visit_target) ? Math.round(((plan.realization.sales ?? []).reduce((sum, sale) => sum + valueOf(sale.visit), 0) / valueOf(plan.visit_target)) * 100) : 0}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${plan.realization ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        <CheckCircle2 size={12} /> {plan.realization ? 'Ada Realisasi' : 'Belum'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && shownPlans.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
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
                Perbandingan plan dan realisasi per sales
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  {['#', 'Nama Sales', 'Leader', 'Periode', 'P.Visit', 'R.Visit', '%', 'P.Revenue', 'R.Revenue', '%', 'Status'].map((head) => (
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
                    <td className="px-4 py-3">{row.actual ? formatNumber(valueOf(row.actual.visit)) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">{row.actual ? `${valueOf(row.visit_target) ? Math.round((valueOf(row.actual.visit) / valueOf(row.visit_target)) * 100) : 0}%` : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-700">{formatRupiah(valueOf(row.revenue))}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.actual ? formatRupiah(valueOf(row.actual.revenue)) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-500">{row.actual ? `${valueOf(row.revenue) ? Math.round((valueOf(row.actual.revenue) / valueOf(row.revenue)) * 100) : 0}%` : '—'}</td>
                    <td className="px-4 py-3">{row.actual ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">✓</span> : '—'}</td>
                  </tr>
                ))}
                {!loading && salesRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
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