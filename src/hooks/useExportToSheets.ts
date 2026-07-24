import { useState } from 'react'

export function useExportToSheets() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportToSheets = async (
    title: string,
    headers: string[],
    rows: (string | number | boolean | null)[][],
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/export-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, headers, rows }),
      })

      if (!response.ok) {
        const raw = await response.text()
        let message = 'Gagal membuat Google Sheet'
        try {
          message = JSON.parse(raw)?.error || message
        } catch {
          if (raw) message = raw.slice(0, 200)
        }
        throw new Error(message)
      }

      const { url } = await response.json()
      if (url) {
        window.open(url, '_blank')
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Gagal export ke Google Sheets. Cek console.'
      setError(message)
      console.error('Google Sheets export error:', err)
    } finally {
      setLoading(false)
    }
  }

  return { exportToSheets, loading, error }
}
