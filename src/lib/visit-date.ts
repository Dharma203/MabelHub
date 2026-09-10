export const DEFAULT_VISIT_START_DATE = '2026-01-01'

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export function getVisitDateRange(searchParams: URLSearchParams) {
  const startValue = searchParams.get('start') || DEFAULT_VISIT_START_DATE
  const endValue = searchParams.get('end') || getTodayDateString()
  const validDate = /^\d{4}-\d{2}-\d{2}$/

  const start = validDate.test(startValue)
    ? new Date(`${startValue}T00:00:00.000Z`)
    : new Date(`${DEFAULT_VISIT_START_DATE}T00:00:00.000Z`)
  const end = validDate.test(endValue)
    ? new Date(`${endValue}T23:59:59.999Z`)
    : new Date(`${getTodayDateString()}T23:59:59.999Z`)

  return { start, end }
}

// "2025-12-03" -> "3-Dec-2025"
export function toVisitDateStr(yyyyMmDd: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd)
  if (!match) return ''
  const [, year, month, day] = match
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    d.getUTCFullYear() !== Number(year) ||
    d.getUTCMonth() !== Number(month) - 1 ||
    d.getUTCDate() !== Number(day)
  ) {
    return ''
  }
  const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) // Dec
  return `${day}-${mon}-${year}`
}

// Date -> "YYYY-MM-DD HH:mm:ss" (local time)
export function toCreatedAtStr(dt: Date) {
  const pad = (x: number) => String(x).padStart(2, '0')
  const y = dt.getFullYear()
  const m = pad(dt.getMonth() + 1)
  const d = pad(dt.getDate())
  const hh = pad(dt.getHours())
  const mm = pad(dt.getMinutes())
  const ss = pad(dt.getSeconds())
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

// Date -> "YYYY-MM-DD HH:mm:ss" (UTC, used by bulk route)
export function toCreatedAtStrUTC(dt: Date) {
  return dt.toISOString().slice(0, 19).replace('T', ' ')
}
