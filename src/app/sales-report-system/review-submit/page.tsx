'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { User, ClipboardList, Target, Users, MapPin, Send } from 'lucide-react'

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

type PlanTimDraft = {
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
  sales_targets: SalesTarget[]
}

function ReviewSubmitContent() {
  const router = useRouter()
  const [draft, setDraft] = useState<PlanTimDraft | null>(null)
  const [visits, setVisits] = useState<SalesVisit[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('sales-report-plan-tim-draft')
    if (!raw) {
      alert('Belum ada data untuk direview. Isi Plan Tim terlebih dahulu.')
      router.replace('/sales-report-system/plan-tim')
      return
    }
    try {
      const parsed = JSON.parse(raw) as PlanTimDraft
      setDraft(parsed)
    } catch {
      sessionStorage.removeItem('sales-report-plan-tim-draft')
      alert('Data Plan Tim tidak valid. Silakan isi kembali.')
      router.replace('/sales-report-system/plan-tim')
      return
    }

    const rawVisit = sessionStorage.getItem('sales-report-plan-visit-draft')
    if (rawVisit) {
      try {
        setVisits(JSON.parse(rawVisit) as SalesVisit[])
      } catch {
        /* visit data optional at review stage */
      }
    }
  }, [router])

  const handleSubmit = async () => {
    if (!draft) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/plan-tim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: draft,
          sales_visit: visits,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || 'Gagal menyimpan data.')
      }

      sessionStorage.removeItem('sales-report-plan-tim-draft')
      sessionStorage.removeItem('sales-report-plan-visit-draft')
      alert('Data berhasil dikirim!')
      router.push('/sales-report-system')
    } catch (error) {
      console.error('Error submitting review:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menyimpan data.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!draft) {
    return (
      <div className='min-h-screen bg-blue-50 flex items-center justify-center'>
        <p className='text-slate-500'>Memuat data...</p>
      </div>
    )
  }

  const formatRupiah = (value: string | number) =>
    `Rp ${Number(value || 0).toLocaleString('id-ID')}`

  const salesCount = draft.sales_targets?.length ?? 0

  return (
    <div className='min-h-screen bg-blue-50'>
      <div className='mx-auto'>
        <div className='flex-1 p-4'>
          {/* Page Header */}
          <div className='bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-100'>
            <div className='flex flex-col'>
              <h1 className='text-3xl pl-4 font-extrabold text-black drop-shadow-sm'>
                Review &amp; Submit
              </h1>
              <div className='text-sm ml-4 mt-2 text-slate-500 font-medium'>
                Periksa semua data sebelum dikirim
              </div>
            </div>
          </div>

          {/* ===== HEADER CARD: Kode Submit & Penginput ===== */}
          <section className='rounded-2xl bg-white p-6 shadow-sm ring-1 ring-blue-200 border-l-4 border-blue-500 mb-6'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              {/* Left: Code Submit */}
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>
                  Kode Submit
                </p>
                <p className='mt-1 text-2xl font-extrabold text-slate-800 tracking-wide'>
                  {draft.code_submit}
                </p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {[
                    draft.leaderName?.split(' ')[0],
                    draft.period,
                    draft.periodOf,
                    draft.month,
                    draft.year,
                  ]
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={i}
                        className='rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200'
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
              {/* Right: Penginput */}
              <div className='text-right'>
                <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>
                  Penginput
                </p>
                <div className='mt-1 flex items-center justify-end gap-2'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700'>
                    <User size={18} />
                  </div>
                  <span className='text-sm font-bold text-slate-800'>
                    {draft.leaderName}
                  </span>
                </div>
                <p className='mt-1 text-xs text-slate-400'>
                  {new Date().toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}{' '}
                  &bull;{' '}
                  {new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <span className='mt-1 inline-block rounded-full bg-green-50 px-3 py-0.5 text-xs font-bold text-green-600 ring-1 ring-green-200'>
                  ✓ Submitted
                </span>
              </div>
            </div>
          </section>

          {/* ===== INFORMASI PERIODE & TIM ===== */}
          <div className='mb-6 flex items-center justify-center gap-2'>
            <ClipboardList size={16} className='text-blue-500' />
            <span className='text-xs font-bold uppercase tracking-widest text-blue-600'>
              Informasi Periode &amp; Tim
            </span>
          </div>

          <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <InfoCard label='Periode' value={draft.period} />
            <InfoCard label='Periode Ke' value={draft.periodOf} />
            <InfoCard
              label='Bulan / Tahun'
              value={`${draft.month} — ${draft.year}`}
            />
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <InfoCard label='Nama Leader' value={draft.leaderName} />
            <InfoCard
              label='Jumlah Sales Aktif'
              value={`${draft.total_active_sales} orang`}
            />
            <InfoCard label='Catatan' value={draft.note || '—'} />
          </div>

          {/* ===== TARGET TIM (Otomatis dari Sales) ===== */}
          <div className='mb-6 flex items-center justify-center gap-2'>
            <Target size={16} className='text-emerald-500' />
            <span className='text-xs font-bold uppercase tracking-widest text-emerald-600'>
              Target Tim (Otomatis dari Sales)
            </span>
          </div>

          <div className='mb-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
            <InfoCard label='Target Visit' value={draft.visit_target} />
            <InfoCard label='Target Demo' value={draft.demo_target} />
            <InfoCard label='Target SPH' value={draft.sph_target} />
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
            <InfoCard
              label='Target Closing'
              value={draft.sph_deal_target}
            />
            <InfoCard
              label='Target Revenue Total'
              value={formatRupiah(draft.revenue)}
              highlight
            />
          </div>

          {/* ===== TARGET PER SALES ===== */}
          <div className='mb-6 flex items-center justify-center gap-2'>
            <Users size={16} className='text-blue-500' />
            <span className='text-xs font-bold uppercase tracking-widest text-blue-600'>
              Target Per Sales ({salesCount} orang)
            </span>
          </div>

          <section className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-175 text-left text-sm'>
                <thead>
                  <tr className='bg-slate-50 text-xs uppercase text-slate-500'>
                    <th className='px-4 py-3'>#</th>
                    <th className='px-4 py-3'>Nama Sales</th>
                    <th className='px-4 py-3'>Visit</th>
                    <th className='px-4 py-3'>Demo</th>
                    <th className='px-4 py-3'>SPH</th>
                    <th className='px-4 py-3'>Closing</th>
                    <th className='px-4 py-3'>Revenue</th>
                    <th className='px-4 py-3'>Catatan</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {draft.sales_targets.map((row, index) => (
                    <tr
                      key={index}
                      className={
                        index % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/50'
                      }
                    >
                      <td className='px-4 py-3 text-slate-400'>
                        {index + 1}
                      </td>
                      <td className='px-4 py-3 font-medium text-slate-800'>
                        {row.nama_sales}
                      </td>
                      <td className='px-4 py-3 text-blue-600 font-semibold'>
                        {row.visit_target}
                      </td>
                      <td className='px-4 py-3'>{row.demo_target}</td>
                      <td className='px-4 py-3'>{row.sph_target}</td>
                      <td className='px-4 py-3'>
                        {row.sph_deal_target}
                      </td>
                      <td className='px-4 py-3 font-semibold'>
                        {formatRupiah(row.revenue)}
                      </td>
                      <td className='px-4 py-3 text-slate-400'>
                        {row.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== RENCANA VISIT ===== */}
          <div className='mb-6 flex items-center justify-center gap-2'>
            <MapPin size={16} className='text-emerald-500' />
            <span className='text-xs font-bold uppercase tracking-widest text-emerald-600'>
              Rencana Visit ({visits.length} item)
            </span>
          </div>

          <section className='mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-175 text-left text-sm'>
                <thead>
                  <tr className='bg-slate-50 text-xs uppercase text-slate-500'>
                    <th className='px-4 py-3'>#</th>
                    <th className='px-4 py-3'>Nama Sales</th>
                    <th className='px-4 py-3'>Segmentasi</th>
                    <th className='px-4 py-3'>Tipe Visit</th>
                    <th className='px-4 py-3'>Entity</th>
                    <th className='px-4 py-3'>Catatan</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {visits.length > 0 ? (
                    visits.map((row, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/50'
                        }
                      >
                        <td className='px-4 py-3 text-slate-400'>
                          {index + 1}
                        </td>
                        <td className='px-4 py-3 font-medium text-slate-800'>
                          {row.nama_sales}
                        </td>
                        <td className='px-4 py-3'>{row.segmentasi}</td>
                        <td className='px-4 py-3'>{row.tipe_visit}</td>
                        <td className='px-4 py-3'>
                          {row.nama_perusahaan}
                        </td>
                        <td className='px-4 py-3 text-slate-400'>
                          {row.note || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className='px-4 py-8 text-center text-sm text-slate-400'
                      >
                        Tidak ada rencana visit ditambahkan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== TOMBOL SUBMIT ===== */}
          <div className='flex items-center justify-center gap-4 pb-8'>
            <button
              type='button'
              onClick={() => router.back()}
              className='flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all'
            >
              ← Kembali
            </button>
            <button
              type='button'
              onClick={handleSubmit}
              disabled={isSaving}
              className='flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-blue-700 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
            >
              <Send size={16} />
              {isSaving ? 'Mengirim...' : 'Kirim Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== Komponen InfoCard (Read-only field) ===== */
function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        highlight
          ? 'border-slate-200 bg-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${
          highlight ? 'text-slate-800' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export default function ReviewSubmitPage() {
  return (
    <Suspense fallback={<div className='p-8 text-center'>Loading....</div>}>
      <ReviewSubmitContent />
    </Suspense>
  )
}
