'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ExternalLink } from 'lucide-react'
import EditVisitModal from '@/components/modals/EditVisitModal'
import { useSession } from '@/components/session/SessionProvider'

type Alert = {
  _id: string
  user_id: string
  nama_sales: string
  satuan_kerja: string
  consecutive_count: number
  severity: 'warning' | 'danger' | 'critical'
  status: 'active' | 'resolved' | 'acknowledged'
  last_visit_id: string
  last_visit_date: string | null
  dismiss_reason?: string
}

const severityClass: Record<Alert['severity'], string> = {
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  critical: 'bg-rose-200 text-rose-900',
}
const emptyOptions: string[] = []

export default function MonitoringLeaderPage() {
  const { user, loading: sessionLoading } = useSession()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedVisitId, setSelectedVisitId] = useState('')
  const [tab, setTab] = useState<'active' | 'resolved'>('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [loadingRows, setLoadingRows] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const safePage = useMemo(
    () => Math.min(Math.max(1, page), Math.max(1, totalPages)),
    [page, totalPages],
  )
  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const showingTo = Math.min(total, safePage * pageSize)
  const gotoPage = (p: number) =>
    setPage(Math.min(Math.max(1, p), Math.max(1, totalPages)))

  const loadAlerts = useCallback(async () => {
    const response = await fetch('/api/alerts', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Gagal memuat alert')
    return (data.items || []) as Alert[]
  }, [])

  function getPageWindow(current: number, totalPages: number, size: number) {
    if (totalPages <= size)
      return Array.from({ length: totalPages }, (_, i) => i + 1)

    const half = Math.floor(size / 2)
    let start = Math.max(1, current - half)
    let end = start + size - 1

    if (end > totalPages) {
      end = totalPages
      start = end - size + 1
    }
    return Array.from({ length: size }, (_, i) => start + i)
  }

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.role || !['LEADER', 'SUPERADMIN'].includes(user.role)) {
      return
    }
    void loadAlerts()
      .then((items) => {
        setAlerts(items)
        setError('')
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Gagal memuat alert'),
      )
      .finally(() => setLoading(false))
  }, [loadAlerts, sessionLoading, user?.role])

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status !== 'resolved'),
    [alerts],
  )
  const resolvedAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === 'resolved'),
    [alerts],
  )
  const shownAlerts = tab === 'active' ? activeAlerts : resolvedAlerts
  const urgentCount = activeAlerts.filter(
    (alert) => alert.severity === 'danger' || alert.severity === 'critical',
  ).length
  const topSales = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const alert of activeAlerts) {
      const entry = counts.get(alert.user_id) || {
        name: alert.nama_sales,
        count: 0,
      }
      entry.count += 1
      counts.set(alert.user_id, entry)
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)[0]
  }, [activeAlerts])

  async function updateAlert(alert: Alert, action: 'acknowledge' | 'dismiss') {
    const reason =
      action === 'dismiss' ? window.prompt('Alasan dismiss alert:') : undefined
    if (action === 'dismiss' && !reason?.trim()) {
      setError('Alasan dismiss wajib diisi.')
      return
    }
    try {
      const response = await fetch(`/api/alerts/${alert._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui alert')
      setAlerts(await loadAlerts())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui alert')
    }
  }

  if (sessionLoading) {
    return (
      <main className='p-6 text-sm text-slate-500'>Memuat monitoring...</main>
    )
  }
  if (!user || !['LEADER', 'SUPERADMIN'].includes(user.role)) {
    return (
      <main className='p-6 text-sm text-red-700'>Akses tidak diizinkan.</main>
    )
  }
  if (loading) {
    return (
      <main className='p-6 text-sm text-slate-500'>Memuat monitoring...</main>
    )
  }

  return (
    <main className='min-h-screen bg-slate-50 p-4 md:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <header>
          <h1 className='text-2xl font-bold text-slate-900'>
            Monitoring Nomor Telepon
          </h1>
          <p className='mt-1 text-sm text-slate-600'>
            Kunjungan SALES berturut-turut tanpa nomor telepon PIC.
          </p>
        </header>

        {error && (
          <p
            role='alert'
            className='rounded-lg bg-red-50 p-3 text-sm text-red-700'
          >
            {error}
          </p>
        )}

        <section
          className='grid gap-4 sm:grid-cols-3'
          aria-label='Ringkasan alert'
        >
          <div className='rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200'>
            <p className='text-sm text-slate-500'>Alert aktif</p>
            <p className='mt-2 text-3xl font-bold'>{activeAlerts.length}</p>
          </div>
          <div className='rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200'>
            <p className='text-sm text-slate-500'>Danger / Critical</p>
            <p className='mt-2 flex items-center gap-2 text-3xl font-bold text-red-700'>
              <AlertTriangle aria-hidden='true' />
              {urgentCount}
            </p>
          </div>
          <div className='rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200'>
            <p className='text-sm text-slate-500'>
              Sales dengan alert terbanyak
            </p>
            <p className='mt-2 font-semibold'>
              {topSales ? `${topSales.name} (${topSales.count})` : '-'}
            </p>
          </div>
        </section>

        <section className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200'>
          <div className='flex gap-2 border-b border-slate-200 p-4'>
            <button
              type='button'
              onClick={() => setTab('active')}
              aria-pressed={tab === 'active'}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Aktif ({activeAlerts.length})
            </button>
            <button
              type='button'
              onClick={() => setTab('resolved')}
              aria-pressed={tab === 'resolved'}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'resolved' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Selesai ({resolvedAlerts.length})
            </button>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full min-w-225 text-left text-sm'>
              <thead className='bg-slate-50 text-xs uppercase text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Sales</th>
                  <th className='px-4 py-3'>Satuan Kerja</th>
                  <th className='px-4 py-3'>Berturut-turut</th>
                  <th className='px-4 py-3'>Kunjungan terakhir</th>
                  <th className='px-4 py-3'>Severity</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3'>Aksi</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {shownAlerts.map((alert) => {
                  return (
                    <tr key={alert._id}>
                      <td className='px-4 py-3 font-medium'>
                        {alert.nama_sales}
                      </td>
                      <td className='px-4 py-3'>{alert.satuan_kerja}</td>
                      <td className='px-4 py-3'>{alert.consecutive_count}x</td>
                      <td className='px-4 py-3'>
                        <button
                          type='button'
                          onClick={() =>
                            setSelectedVisitId(alert.last_visit_id)
                          }
                          className='inline-flex items-center gap-1 text-blue-700 hover:underline'
                        >
                          {alert.last_visit_date || 'Lihat kunjungan'}
                          <ExternalLink className='h-3.5 w-3.5' />
                        </button>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass[alert.severity]}`}
                        >
                          {alert.severity}
                        </span>
                        {alert.severity === 'critical' && (
                          <span className='ml-2 text-xs font-semibold text-rose-700'>
                            Perlu ditindaklanjuti
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {alert.status === 'acknowledged'
                          ? 'Ditindaklanjuti'
                          : alert.status}
                        {alert.dismiss_reason && (
                          <p className='mt-1 text-xs text-slate-500'>
                            {alert.dismiss_reason}
                          </p>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {tab === 'active' && (
                          <div className='flex gap-2'>
                            {alert.status === 'active' && (
                              <button
                                type='button'
                                onClick={() =>
                                  updateAlert(alert, 'acknowledge')
                                }
                                className='inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100'
                              >
                                <Check className='h-3.5 w-3.5' />
                                Tindak lanjuti
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={() => updateAlert(alert, 'dismiss')}
                              className='rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200'
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!loading && shownAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-4 py-12 text-center text-slate-500'
                    >
                      Tidak ada alert {tab === 'resolved' ? 'selesai' : 'aktif'}
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {/* pagination */}
        <section className='mt-4 sm:mt-6 flex flex-col gap-3 rounded-2xl bg-white px-3 sm:px-6 py-3 lg:py-4 shadow-sm ring-1 ring-blue-100'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <p className='text-xs sm:text-sm font-medium text-gray-700'>
              Showing <strong>{showingFrom}</strong> to{' '}
              <strong>{showingTo}</strong> of <strong>{total}</strong> entries
            </p>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className='h-8 sm:h-10 rounded-lg border border-blue-100 bg-white px-2 sm:px-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-200 w-full sm:w-auto'
            >
              <option value={10}>10 / Halaman</option>
              <option value={20}>20 / Halaman</option>
              <option value={50}>50 / Halaman</option>
              <option value={100}>100 / Halaman</option>
            </select>
          </div>
          <div className='flex items-center justify-center gap-1 sm:gap-2 flex-wrap'>
            <PageBtn onClick={() => gotoPage(1)} ariaLabel='First'>
              ⏮
            </PageBtn>
            <PageBtn onClick={() => gotoPage(page - 1)} ariaLabel='Previous'>
              ◀
            </PageBtn>

            {getPageWindow(safePage, totalPages, 5).map((p) => (
              <button
                key={p}
                type='button'
                onClick={() => gotoPage(p)}
                aria-label={p.toString()}
                className={`grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl border text-xs sm:text-sm ${
                  p === safePage
                    ? 'border-blue-500 bg-blue-600 text-white font-bold'
                    : 'border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40'
                }`}
              >
                {p}
              </button>
            ))}

            <PageBtn onClick={() => gotoPage(page + 1)} ariaLabel='Next'>
              ▶
            </PageBtn>
            <PageBtn onClick={() => gotoPage(totalPages)} ariaLabel='Last'>
              ⏭
            </PageBtn>
          </div>
        </section>
      </div>
      <EditVisitModal
        isOpen={Boolean(selectedVisitId)}
        editId={selectedVisitId}
        onClose={() => setSelectedVisitId('')}
        onSuccess={async () => {
          setSelectedVisitId('')
          try {
            setAlerts(await loadAlerts())
            setError('')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat alert')
          }
        }}
        posisiOptions={emptyOptions}
        statusKunjunganOptions={emptyOptions}
        kegiatanOptions={emptyOptions}
        currentUserId={user.userId}
        currentUserRole={user.role}
      />
    </main>
  )
}

function PageBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={ariaLabel}
      className='grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl border border-blue-100 bg-white text-gray-700 hover:bg-blue-50/40 text-xs sm:text-sm'
    >
      {children}
    </button>
  )
}
