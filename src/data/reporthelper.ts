const rawData: {
  nama_leader: string
  nama_sales: string
  status: string
  active_date: Date
  inactive_date: Date
  target_revenue: string
  realisasi_revenue: string
}[] = [
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Arie Muhamad Fajar',
    status: 'Active',
    active_date: new Date('03-03-2021'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Beffry Rizkana',
    status: 'Active',
    active_date: new Date('02-06-2025'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Ferrie Ferdinal',
    status: 'Active',
    active_date: new Date('26-01-2026'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Toni Ramdan',
    status: 'Active',
    active_date: new Date('16-11-2025'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Hery Nugraha',
    status: 'Active',
    active_date: new Date('15-06-2024'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Hendri',
    status: 'Active',
    active_date: new Date('01-05-2024'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Mugi Khairul',
    status: 'Active',
    active_date: new Date('06-04-2026'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
  {
    nama_leader: 'Arie Muhamad Fajar',
    nama_sales: 'Meiliany Anggraini',
    status: 'Active',
    active_date: new Date('13-07-2026'),
    inactive_date: new Date(''),
    target_revenue: '',
    realisasi_revenue: '',
  },
]

export type TargetData = {
    nama_leader: string
    nama_sales: string
    status: string
    active_date: Date
    inactive_date: Date
    target_revenue: string
    realisasi_revenue: string
}

export const listTargetData: TargetData[] = rawData

export function getTargetOptions() {
    return [
        { value: '', label: '--Pilih Leader--'},
        ...Array.from(new Set(rawData.map((w) => w.nama_leader)))
        .sort()
        .map((s) => ({ value: s, label: s }))
    ]
}

export function getSalesOptions(selectedLeader: string) {
    const filtered = selectedLeader
    ? rawData.filter((w) => w.nama_leader === selectedLeader)
    : rawData
    return [
        { value: '', label: '--Pilih Sales--'},
        ...filtered.map((w) => ({
            value: w.nama_sales,
            label: w.nama_sales,
        }))
    ]
}

export function getStatusOptions(selectedLeader: string, selectedSales: string) {
    const filtered = selectedLeader && selectedSales
        ? rawData.filter((w) => w.nama_leader === selectedLeader && w.nama_sales === selectedSales)
        : []
    return [
        { value: '', label: '--Pilih Status--' },
        ...filtered.map((w) => ({ value: w.status, label: w.status }))
    ]
}

export function getActiveDate(selectedLeader: string, selectedSales: string, selectedStatus: string) {
    const filtered = selectedLeader && selectedSales && selectedStatus
        ? rawData.filter((w) => w.nama_leader === selectedLeader && w.nama_sales === selectedSales && w.status === selectedStatus)
        : []
    return filtered.map((w) => ({
        active_date: w.active_date,
        inactive_date: w.inactive_date
    }))
}

export function getActiveInactiveDateOptions(selectedLeader: string, selectedSales: string, selectedStatus: string) {
    const filtered = selectedLeader && selectedSales && selectedStatus
        ? rawData.filter((w) => w.nama_leader === selectedLeader && w.nama_sales === selectedSales && w.status === selectedStatus)
        : []
    return filtered.map((w) => ({
        active_date: w.active_date,
        inactive_date: w.inactive_date
    }))
}

export function getTargetRealisasi(selectedLeader: string, selectedSales: string, selectedStatus: string) {
    const filtered = selectedLeader && selectedSales && selectedStatus
        ? rawData.filter((w) => w.nama_leader === selectedLeader && w.nama_sales === selectedSales && w.status === selectedStatus)
        : []
    return filtered.map((w) => ({
        target_revenue: w.target_revenue,
        realisasi_revenue: w.realisasi_revenue
    }))
}

export function getTargetRealisasiOptions(selectedLeader: string, selectedSales: string, selectedStatus: string) {
    const filtered = selectedLeader && selectedSales && selectedStatus
        ? rawData.filter((w) => w.nama_leader === selectedLeader && w.nama_sales === selectedSales && w.status === selectedStatus)
        : []
    return filtered.map((w) => ({
        target_revenue: w.target_revenue,
        realisasi_revenue: w.realisasi_revenue
    }))
}
