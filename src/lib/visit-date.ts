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
