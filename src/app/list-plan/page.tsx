'use client'

import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  Download,
  FolderOpen,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { sumPlanTimSalesTargets } from '@/utils/planTimSales'

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
  total_active_sales: string
  sales_targets: SalesTarget[]
  sales_visit: SalesVisit[]
}

const formatNumber = (value: string | number) =>
  Number(value || 0).toLocaleString('id-ID')

const formatRupiah = (value: string | number) => `Rp ${formatNumber(value)}`

const escapeHtml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  )

function ListPlanContent() {
  const leaderName = 'Arie Muhamad Fajar'
  const [period, setPeriod] = useState('')
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [codeSubmit, setCodeSubmit] = useState('')
  const [originalCode, setOriginalCode] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [draftPlan, setDraftPlan] = useState<Plan | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const updateSalesTarget = (
    index: number,
    field: keyof SalesTarget,
    value: string,
  ) => {
    setDraftPlan((current) => {
      if (!current) return current
      const sales_targets = current.sales_targets.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      )
      const totals = sumPlanTimSalesTargets(
        sales_targets.map((row, rowIndex) => ({ ...row, id: String(rowIndex) })),
      )
      return {
        ...current,
        sales_targets,
        visit_target: String(totals.visit_target),
        demo_target: String(totals.demo_target),
        sph_target: String(totals.sph_target),
        sph_deal_target: String(totals.sph_deal_target),
        revenue: String(totals.revenue),
      }
    })
  }

  const saveRevision = async () => {
    if (!draftPlan) return
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch('/api/list-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_submit: originalCode,
          new_code_submit: draftPlan.code_submit,
          note: draftPlan.note,
          sales_targets: draftPlan.sales_targets,
          sales_visit: draftPlan.sales_visit,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan revisi.')
      setPlan(draftPlan)
      setOriginalCode(draftPlan.code_submit)
      setCodeSubmit(draftPlan.code_submit)
      setPlans((current) =>
        current.map((item) =>
          item.code_submit === originalCode
            ? { ...item, code_submit: draftPlan.code_submit, revised: true }
            : item,
        ),
      )
      setDraftPlan(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Gagal menyimpan revisi plan.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const exportPlan = (plan: Plan) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Izinkan pop-up untuk mengekspor plan ke PDF.')
      return
    }

    const salesRows = plan.sales_targets
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="strong">${escapeHtml(row.nama_sales)}</td>
            <td class="number">${formatNumber(row.visit_target)}</td>
            <td class="number">${formatNumber(row.demo_target)}</td>
            <td class="number">${formatNumber(row.sph_target)}</td>
            <td class="number">${formatNumber(row.sph_deal_target)}</td>
            <td class="money">${formatRupiah(row.revenue)}</td>
            <td>${escapeHtml(row.note || '—')}</td>
          </tr>`,
      )
      .join('')
    const visitRows = plan.sales_visit
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="strong">${escapeHtml(row.nama_sales)}</td>
            <td>${escapeHtml(row.segmentasi)}</td>
            <td>${escapeHtml(row.tipe_visit)}</td>
            <td class="strong">${escapeHtml(row.nama_perusahaan)}</td>
            <td>${escapeHtml(row.note || '—')}</td>
          </tr>`,
      )
      .join('')

    printWindow.document.write(`<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Laporan Plan — ${escapeHtml(plan.code_submit)}</title>
          <style>
            @page { size: letter portrait; margin: 0.5in; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #172033; font: 10px Arial, sans-serif; }
            .header { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding-bottom: 12px; border-bottom: 3px solid #2563eb; }
            .eyebrow { margin: 0 0 7px; color: #374151; font-size: 9px; font-weight: 700; letter-spacing: .5px; }
            h1 { margin: 0; color: #1e3a5f; font-size: 22px; }
            .subtitle { margin: 7px 0 0; color: #475569; font-size: 11px; }
            .code { min-width: 185px; padding: 12px; border: 1px solid #93c5fd; border-radius: 9px; color: #1d4ed8; text-align: center; }
            .code small { display: block; margin-bottom: 6px; font-size: 8px; font-weight: 700; letter-spacing: .6px; }
            .code strong { font-size: 14px; }
            .details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 16px; }
            .card { padding: 10px 12px; border: 1px solid #dbe1e8; border-radius: 8px; }
            .card small { display: block; margin-bottom: 5px; color: #374151; font-size: 8px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; }
            .card strong { font-size: 11px; }
            .note { grid-column: 1 / -1; }
            .section { margin-top: 20px; }
            .section-title { margin: 0; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1; color: #334155; font-size: 12px; }
            .targets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 9px; }
            .target { padding: 12px 6px; border: 1px solid; border-radius: 9px; text-align: center; }
            .target small { display: block; margin-bottom: 6px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
            .target strong { font-size: 15px; }
            .green { border-color: #86efac; color: #15803d; }
            .blue { border-color: #93c5fd; color: #1d4ed8; }
            .orange { border-color: #fdba74; color: #c2410c; }
            .purple { border-color: #e879f9; color: #a21caf; }
            .teal { border-color: #6ee7b7; color: #047857; }
            table { width: 100%; margin-top: 9px; border-collapse: collapse; font-size: 8px; }
            th { padding: 7px 5px; border-bottom: 1px solid #94a3b8; color: #334155; text-align: left; font-size: 7px; letter-spacing: .2px; text-transform: uppercase; }
            td { padding: 6px 5px; border-bottom: 1px solid #dbe1e8; vertical-align: top; }
            .number, .money { text-align: right; white-space: nowrap; }
            .money { color: #1d4ed8; font-weight: 700; }
            .strong { font-weight: 700; }
            tfoot td { border-top: 1px solid #93c5fd; color: #1d4ed8; font-weight: 700; }
            tr { break-inside: avoid; }
            thead { display: table-header-group; }
            .empty { padding: 16px; color: #64748b; text-align: center; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <header class="header">
            <div>
              <p class="eyebrow">SALES REPORT SYSTEM V3.0</p>
              <h1>📋 Laporan Plan Tim</h1>
              <p class="subtitle">${escapeHtml(plan.leaderName)} &nbsp;·&nbsp; ${escapeHtml(plan.period)} — ${escapeHtml(plan.month)} ${escapeHtml(plan.year)}</p>
            </div>
            <div class="code"><small>KODE SUBMIT</small><strong>${escapeHtml(plan.code_submit)}</strong></div>
          </header>
          <div class="details">
            <div class="card"><small>Nama Leader</small><strong>${escapeHtml(plan.leaderName)}</strong></div>
            <div class="card"><small>Periode</small><strong>${escapeHtml(plan.period)}</strong></div>
            <div class="card"><small>Bulan / Tahun</small><strong>${escapeHtml(plan.month)} / ${escapeHtml(plan.year)}</strong></div>
            <div class="card"><small>Jumlah Sales Aktif</small><strong>${escapeHtml(plan.total_active_sales)} orang</strong></div>
            <div class="card note"><small>Catatan</small>${escapeHtml(plan.note || '—')}</div>
          </div>
          <section class="section">
            <h2 class="section-title">🎯 Target Tim ${escapeHtml(plan.period)} ${escapeHtml(plan.month)}</h2>
            <div class="targets">
              <div class="target green"><small>Target Visit</small><strong>${formatNumber(plan.visit_target)}</strong></div>
              <div class="target blue"><small>Target Demo</small><strong>${formatNumber(plan.demo_target)}</strong></div>
              <div class="target orange"><small>Target SPH</small><strong>${formatNumber(plan.sph_target)}</strong></div>
              <div class="target purple"><small>Target Closing</small><strong>${formatNumber(plan.sph_deal_target)}</strong></div>
              <div class="target teal"><small>Target Revenue</small><strong>${formatRupiah(plan.revenue)}</strong></div>
            </div>
          </section>
          <section class="section">
            <h2 class="section-title">👤 Target Per Sales ${escapeHtml(plan.period)} ${escapeHtml(plan.month)}</h2>
            <table>
              <thead><tr><th>#</th><th>Nama Sales</th><th>Target Visit</th><th>Target Demo</th><th>Target SPH</th><th>Target Closing</th><th>Target Revenue</th><th>Catatan</th></tr></thead>
              <tbody>${salesRows || '<tr><td class="empty" colspan="8">Tidak ada target sales.</td></tr>'}</tbody>
              <tfoot><tr><td colspan="2">Σ TOTAL TIM</td><td class="number">${formatNumber(plan.visit_target)}</td><td class="number">${formatNumber(plan.demo_target)}</td><td class="number">${formatNumber(plan.sph_target)}</td><td class="number">${formatNumber(plan.sph_deal_target)}</td><td class="money">${formatRupiah(plan.revenue)}</td><td></td></tr></tfoot>
            </table>
          </section>
          <section class="section">
            <h2 class="section-title">🗺️ Prioritas Visit (${plan.sales_visit.length} item)</h2>
            <table>
              <thead><tr><th>#</th><th>Nama Sales</th><th>Segmentasi</th><th>Tipe Visit</th><th>Entity / Perusahaan</th><th>Catatan</th></tr></thead>
              <tbody>${visitRows || '<tr><td class="empty" colspan="6">Tidak ada rencana visit.</td></tr>'}</tbody>
            </table>
          </section>
        </body>
      </html>`)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 300)
  }

  const handleCariKode = async () => {
    setIsSearching(true)
    setError('')
    setPlans([])
    setCodeSubmit('')
    setOriginalCode('')
    setPlan(null)
    setDraftPlan(null)

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
      setOriginalCode(data.plan.code_submit)
      setDraftPlan(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Gagal membuka data plan.',
      )
    } finally {
      setIsOpening(false)
    }
  }

  const shownPlan = draftPlan ?? plan

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
            <Search
              className='rounded-lg bg-sky-700 p-2 text-white'
              size={38}
            />
            <div>
              <h2 className='font-bold text-slate-900'>Cari Data Plan</h2>
              <p className='text-xs text-slate-500'>
                Filter berdasarkan leader dan periode untuk memilih kode submit
              </p>
            </div>
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
                disabled={isSearching || Boolean(draftPlan) || isSaving}
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
                  disabled={!codeSubmit || isOpening || Boolean(draftPlan) || isSaving}
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

        {shownPlan && (
          <div className='mt-5 space-y-5'>
            <section className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  {draftPlan ? (
                    <label className='block text-xs font-medium text-slate-500'>
                      Kode Submit
                      <input
                        value={draftPlan.code_submit}
                        onChange={(event) =>
                          setDraftPlan({
                            ...draftPlan,
                            code_submit: event.target.value,
                          })
                        }
                        className='mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-base font-bold text-slate-900'
                      />
                    </label>
                  ) : (
                    <h2 className='text-xl font-bold text-slate-900'>
                      {shownPlan.code_submit}
                    </h2>
                  )}
                  <p className='mt-1 text-sm text-slate-500'>
                    {shownPlan.leaderName} · {shownPlan.period} · {shownPlan.month} {shownPlan.year}
                  </p>
                </div>
                <div className='flex gap-2'>
                  {draftPlan ? (
                    <>
                      <button
                        type='button'
                        onClick={() => setDraftPlan(null)}
                        disabled={isSaving}
                        className='inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
                      >
                        <X size={16} /> Batal
                      </button>
                      <button
                        type='button'
                        onClick={saveRevision}
                        disabled={isSaving}
                        className='inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50'
                      >
                        <Save size={16} />
                        {isSaving ? 'Menyimpan...' : 'Simpan Revisi'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type='button'
                        onClick={() => {
                          setDraftPlan({
                            ...shownPlan,
                            sales_targets: shownPlan.sales_targets.map((row) => ({ ...row })),
                            sales_visit: shownPlan.sales_visit.map((row) => ({ ...row })),
                          })
                          setError('')
                        }}
                        className='inline-flex items-center gap-2 rounded-lg border border-sky-700 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50'
                      >
                        <Pencil size={16} /> Revisi Plan
                      </button>
                      <button
                        type='button'
                        onClick={() => exportPlan(shownPlan)}
                        className='inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800'
                      >
                        <Download size={16} /> Export PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className='mt-5 grid grid-cols-2 gap-3 md:grid-cols-4'>
                {[
                  ['Periode', shownPlan.period],
                  ['Periode Ke', shownPlan.periodOf],
                  ['Bulan / Tahun', `${shownPlan.month} / ${shownPlan.year}`],
                  ['Nama Leader', shownPlan.leaderName],
                  ['Jumlah Sales Aktif', shownPlan.total_active_sales],
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
                {/* <div className='col-span-full rounded-lg border border-slate-200 px-4 py-3'>
                  <label className='text-xs font-medium uppercase text-slate-400'>
                    Catatan
                  </label>
                  {draftPlan ? (
                    <input
                      value={draftPlan.note}
                      onChange={(event) =>
                        setDraftPlan({ ...draftPlan, note: event.target.value })
                      }
                      className='mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm'
                    />
                  ) : (
                    <p className='mt-1 font-bold text-slate-800'>
                      {shownPlan.note || '—'}
                    </p>
                  )}
                </div> */}
                {(
                  [
                    ['Target Visit', shownPlan.visit_target],
                    ['Target Demo', shownPlan.demo_target],
                    ['Target SPH', shownPlan.sph_target],
                    ['Catatan', shownPlan.note],
                    ['Target Closing', shownPlan.sph_deal_target],
                    ['Target Revenue', shownPlan.revenue],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className='rounded-lg border border-slate-200 px-4 py-3'
                  >
                    <p className='text-xs font-medium uppercase text-slate-400'>
                      {label}
                    </p>
                    <p className='mt-1 font-bold text-slate-800'>
                      {label === 'Target Revenue' ? formatRupiah(value) : formatNumber(value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex items-center gap-3 border-b border-slate-200 bg-sky-50 px-5 py-4'>
                <Users className='text-sky-700' size={22} />
                <div>
                  <h2 className='font-bold text-slate-900'>Target Per Sales</h2>
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
                    {shownPlan.sales_targets.map((row, index) => (
                      <tr key={`${row.nama_sales}-${index}`}>
                        <td className='px-3 py-2 text-slate-500'>
                          {index + 1}
                        </td>
                        <td className='px-3 py-2 font-medium'>
                          {draftPlan ? (
                            <input
                              aria-label={`Nama sales ${index + 1}`}
                              value={row.nama_sales}
                              onChange={(event) =>
                                updateSalesTarget(index, 'nama_sales', event.target.value)
                              }
                              className='h-9 w-40 rounded border border-slate-200 px-2'
                            />
                          ) : row.nama_sales}
                        </td>
                        {(
                          [
                            ['visit_target', row.visit_target],
                            ['demo_target', row.demo_target],
                            ['sph_target', row.sph_target],
                            ['sph_deal_target', row.sph_deal_target],
                            ['revenue', row.revenue],
                          ] as const
                        ).map(([field, value]) => (
                          <td key={field} className='px-3 py-2'>
                            {draftPlan ? (
                              <input
                                aria-label={`${field} ${row.nama_sales}`}
                                type='number'
                                min='0'
                                step='any'
                                value={value}
                                onChange={(event) =>
                                  updateSalesTarget(index, field, event.target.value)
                                }
                                className='h-9 w-28 rounded border border-slate-200 px-2'
                              />
                            ) : field === 'revenue' ? (
                              formatRupiah(value)
                            ) : (
                              formatNumber(value)
                            )}
                          </td>
                        ))}
                        <td className='px-3 py-2 text-slate-500'>
                          {draftPlan ? (
                            <input
                              aria-label={`Catatan sales ${index + 1}`}
                              value={row.note}
                              onChange={(event) =>
                                updateSalesTarget(index, 'note', event.target.value)
                              }
                              className='h-9 w-36 rounded border border-slate-200 px-2'
                            />
                          ) : row.note || '—'}
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
                    Daftar rencana kunjungan ({shownPlan.sales_visit.length} item)
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
                      {draftPlan && <th className='px-3 py-3'>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {shownPlan.sales_visit.length ? (
                      shownPlan.sales_visit.map((row, index) => (
                        <tr key={`${row.nama_sales}-${index}`}>
                          <td className='px-3 py-2 text-slate-500'>
                            {index + 1}
                          </td>
                          {(
                            [
                              ['nama_sales', row.nama_sales],
                              ['segmentasi', row.segmentasi],
                              ['tipe_visit', row.tipe_visit],
                              ['nama_perusahaan', row.nama_perusahaan],
                              ['note', row.note],
                            ] as const
                          ).map(([field, value]) => (
                            <td key={field} className='px-3 py-2'>
                              {draftPlan ? (
                                <input
                                  aria-label={`${field} visit ${index + 1}`}
                                  value={value}
                                  onChange={(event) =>
                                    setDraftPlan((current) =>
                                      current
                                        ? {
                                            ...current,
                                            sales_visit: current.sales_visit.map(
                                              (visit, visitIndex) =>
                                                visitIndex === index
                                                  ? { ...visit, [field]: event.target.value }
                                                  : visit,
                                            ),
                                          }
                                        : current,
                                    )
                                  }
                                  className='h-9 min-w-32 rounded border border-slate-200 px-2'
                                />
                              ) : (
                                value || '—'
                              )}
                            </td>
                          ))}
                          {draftPlan && (
                            <td className='px-2 py-2'>
                              <button
                                type='button'
                                aria-label={`Hapus rencana visit ${index + 1}`}
                                onClick={() =>
                                  setDraftPlan({
                                    ...draftPlan,
                                    sales_visit: draftPlan.sales_visit.filter(
                                      (_, visitIndex) => visitIndex !== index,
                                    ),
                                  })
                                }
                                className='rounded p-2 text-rose-600 hover:bg-rose-50'
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={draftPlan ? 7 : 6}
                          className='px-3 py-8 text-center text-slate-400'
                        >
                          Tidak ada rencana visit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {draftPlan && (
                  <button
                    type='button'
                    onClick={() =>
                      setDraftPlan({
                        ...draftPlan,
                        sales_visit: [
                          ...draftPlan.sales_visit,
                          {
                            nama_sales: '',
                            segmentasi: '',
                            tipe_visit: '',
                            nama_perusahaan: '',
                            note: '',
                          },
                        ],
                      })
                    }
                    className='mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-700 px-4 py-2 text-sm font-semibold text-sky-700'
                  >
                    <Plus size={16} /> Tambah Visit
                  </button>
                )}
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
