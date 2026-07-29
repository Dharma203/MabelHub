// "2025-12-03" -> "3-Dec-2025"
export function toVisitDateStr(yyyyMmDd: string) {
  const d = new Date(yyyyMmDd)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.getDate()
  const mon = d.toLocaleString('en-US', { month: 'short' }) // Dec
  const year = d.getFullYear()
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
