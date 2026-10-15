'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/session/SessionProvider'

type Alert = {
  _id: string
  satuan_kerja: string
  consecutive_count: number
  severity: string
  status: string
}

export default function MissingPhoneBanner() {
  const { user } = useSession()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'SALES') return
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/api/alerts', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Gagal memuat alert')
        if (mounted) {
          setAlerts(
            (data.items || []).filter(
              (alert: Alert) => alert.status !== 'resolved',
            ),
          )
          setError('')
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Gagal memuat alert')
        }
      }
    }
    void load()
    const timer = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [user?.role])

  if (user?.role !== 'SALES') return null
  if (error) {
    return <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  }
  if (!alerts.length) return null

  const severityStyles: Record<string, string> = {
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
    critical: 'border-rose-300 bg-rose-50 text-rose-900',
  }

  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {alerts.map((alert) => (
        <div
          key={alert._id}
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${severityStyles[alert.severity] || severityStyles.warning}`}
        >
          ⚠️ Sudah {alert.consecutive_count}x berturut-turut tanpa nomor telepon
          {' '}di {alert.satuan_kerja}.
        </div>
      ))}
    </div>
  )
}
