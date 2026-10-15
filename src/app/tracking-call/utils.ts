export function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

export function getPageWindow(
  current: number,
  totalPages: number,
  size: number
) {
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

export const BULAN_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
}

export function formatBulanData(val: string): string {
  const mm = val.split('-')
  if (!mm || mm.length < 2) return val
  return `${BULAN_NAMES[mm[1]] ?? mm[1]}`
}

export function formatBulan(val: string): string {
  const [yyyy, mm] = val.split('-')
  if (!yyyy || !mm) return val
  return `${BULAN_NAMES[mm] ?? mm}-${yyyy}`
}
