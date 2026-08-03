/**
 * Pure utility functions extracted from tracking-database/page.tsx
 * so they can be unit tested without Next.js or React dependencies.
 */

// ---- formatBulan ----
export const BULAN_NAMES: Record<string, string> = {
  '01': 'January',  '02': 'February', '03': 'March',    '04': 'April',
  '05': 'May',      '06': 'June',     '07': 'July',     '08': 'August',
  '09': 'September','10': 'October',  '11': 'November', '12': 'December',
}

/**
 * Converts "YYYY-MM" to "MonthName-YYYY"
 * e.g. "2026-04" → "April-2026"
 */
export function formatBulan(val: string): string {
  const [yyyy, mm] = val.split('-')
  if (!yyyy || !mm) return val
  return `${BULAN_NAMES[mm] ?? mm}-${yyyy}`
}

// ---- Filter state helpers ----

export type FilterId = 'Bulan' | 'Produk' | 'Merek' | 'Perusahaan' | 'Provinsi' | 'Kota' | 'Tipe'

export interface FilterState {
  bulan: string[]
  produk: string[]
  merek: string[]
  perusahaan: string[]
  provinsi: string[]
  kota: string[]
  tipe: string[]
}

/**
 * Returns the current array for a given filter id.
 */
export function getFilterArr(id: FilterId, state: FilterState): string[] {
  switch (id) {
    case 'Bulan':      return state.bulan
    case 'Produk':     return state.produk
    case 'Merek':      return state.merek
    case 'Perusahaan': return state.perusahaan
    case 'Provinsi':   return state.provinsi
    case 'Kota':       return state.kota
    case 'Tipe':       return state.tipe
    default:           return []
  }
}

/**
 * Toggles a value in a filter array (add if absent, remove if present).
 */
export function toggleFilterVal(current: string[], val: string): string[] {
  return current.includes(val)
    ? current.filter(v => v !== val)
    : [...current, val]
}

/**
 * Returns opts with all items selected (select-all).
 */
export function selectAllFilter(opts: string[]): string[] {
  return [...opts]
}

/**
 * Searches options — for Bulan filter, searches against the formatted display value.
 */
export function searchOptions(opts: string[], search: string, isBulan: boolean): string[] {
  if (!search) return opts
  const q = search.toLowerCase()
  return opts.filter(o => {
    const display = isBulan ? formatBulan(o) : o
    return display.toLowerCase().includes(q)
  })
}

/**
 * Returns true when at least one filter has a value selected.
 */
export function hasAnyFilter(state: FilterState): boolean {
  return Object.values(state).some(arr => arr.length > 0)
}

/**
 * Returns a new state with a specific filter cleared.
 */
export function clearFilter(state: FilterState, id: FilterId): FilterState {
  return { ...state, [id.toLowerCase()]: [] }
}

/**
 * Returns a completely reset filter state.
 */
export function resetAllFilters(): FilterState {
  return {
    bulan: [], produk: [], merek: [],
    perusahaan: [], provinsi: [], kota: [], tipe: [],
  }
}

export function filterButton() {
  return [
    { id: 'bulan', label: 'Bulan' },
    { id: 'produk', label: 'Produk' },
    { id: 'merek', label: 'Merek' },
    { id: 'perusahaan', label: 'Perusahaan' },
    { id: 'provinsi', label: 'Provinsi' },
    { id: 'kota', label: 'Kota' },
    { id: 'tipe', label: 'Tipe' },
  ]
}

export function data() {
  return [
    {
      id: 1,
      kota: 'Kota Bandung',
      provinsi: 'Jawa Barat',
      status: 'Visited',
      tipe: 'WhatsApp',
    },
    {
      id: 2,
      kota: 'Kota Jakarta',
      provinsi: 'DKI Jakarta',
      status: 'Not Visited',
      tipe: 'WhatsApp',
    },
    {
      id: 3,
      kota: 'Kota Surabaya',
      provinsi: 'Jawa Timur',
      status: 'Visited',
      tipe: 'Email',
    },
    {
      id: 4,
      kota: 'Kota Bandung',
      provinsi: 'Jawa Barat',
      status: 'Visited',
      tipe: 'WhatsApp',
    },
    {
      id: 5,
      kota: 'Kota Jakarta',
      provinsi: 'DKI Jakarta',
      status: 'Not Visited',
      tipe: 'WhatsApp',
    },
    {
      id: 6,
      kota: 'Kota Surabaya',
      provinsi: 'Jawa Timur',
      status: 'Visited',
      tipe: 'Email',
    },
  ]
}