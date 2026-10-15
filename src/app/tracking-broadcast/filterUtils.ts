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

export function formatBulan(val: string): string {
    const [yyyy, mm] = val.split('-')
    if (!yyyy || !mm) return val
    return `${BULAN_NAMES[mm] ?? mm}-${yyyy}`
}

export type FilterId = 'Bulan' | 'Perusahaan' | 'Produk' | 'Provinsi' | 'Kota' | 'Status Wa' | 'Ke Sales'

export interface FilterState {
    bulan: string[]
    perusahaan: string[]
    produk: string[]
    provinsi: string[]
    kota: string[]
    status_wa: string[]
    ke_sales: string[]
}

export function getFilterArr(id: FilterId, state: FilterState): string[] {
    switch (id) {
        case 'Bulan':
            return state.bulan
        case 'Perusahaan':
            return state.perusahaan
        case 'Produk':
            return state.produk
        case 'Provinsi':
            return state.provinsi
        case 'Kota':
            return state.kota
        case 'Status Wa':
            return state.status_wa
        case 'Ke Sales':
            return state.ke_sales
    }
}

export function toggleFilterVal(current: string[], val: string): string[] {
    return current.includes(val)
        ? current.filter(v => v !== val)
        : [...current, val]
}

export function selectAllFilter(opts: string[]): string[] {
    return [...opts]
}

export function searchOptions(opts: string[], search: string, isBulan: boolean): string[] {
    if (!search) return opts
    const q = search.toLowerCase()
    return opts.filter(o => {
        const display = isBulan ? formatBulan(o) : o
        return display.toLowerCase().includes(q)
    })
}

export function hasAnyFilter(state: FilterState): boolean {
    return Object.values(state).some(arr => arr.length > 0)
}

export function clearFilter(state: FilterState, id: FilterId): FilterState {
    return { ...state, [id.toLowerCase()]: [] }
}

export function resetAllFilters(): FilterState {
    return {
        bulan: [],
        perusahaan: [],
        produk: [],
        provinsi: [],
        kota: [],
        status_wa: [],
        ke_sales: [],
    }
}

export function filterButton() {
    return [
        { id: 'bulan', label: 'Bulan' },
        { id: 'perusahaan', label: 'Perusahaan' },
        { id: 'produk', label: 'Produk' },
        { id: 'provinsi', label: 'Provinsi' },
        { id: 'kota', label: 'Kota' },
        { id: 'status_wa', label: 'Status Wa' },
        { id: 'ke_sales', label: 'Ke Sales' },
    ]
}
