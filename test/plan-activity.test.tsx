/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ─── 1. MOCK DEPENDENCIES ──────────────────────────────────────────────────

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
}))

const mockUseSession = jest.fn()
jest.mock('@/components/session/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}))

jest.mock('next/image', () => {
  return function MockImage(props: any) {
    return <img alt={props.alt || ''} src={props.src || ''} data-testid="next-image" />
  }
})

jest.mock('lucide-react', () =>
  new Proxy({}, {
    get: (_target, name) => {
      const Icon = (props: any) => <span data-testid={`icon-${String(name)}`} {...props} />
      Icon.displayName = String(name)
      return Icon
    },
  }),
)

jest.mock('@/components/modals/EditVisitModal', () => {
  const MockEditModal = (props: any) => {
    if (!props.isOpen) return null
    return (
      <div data-testid="edit-visit-modal">
        <button onClick={() => props.onClose?.()}>close-modal</button>
        <button onClick={() => props.onSuccess?.()}>save-modal</button>
      </div>
    )
  }
  return { __esModule: true, default: MockEditModal }
})

import PlanActivityPage from '@/app/plan-activity/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
const todayDay = String(today.getDate()).padStart(2, '0')
const todayDateStr = `${todayYear}-${todayMonth}-${todayDay}`

const mockVisits = [
  {
    _id: 'p1',
    visit_date: todayDateStr,
    created_at: `${todayDateStr} 10:00:00`,
    city: 'Jakarta',
    klpd: 'Kementerian',
    nama_sales: 'Budi Santoso',
    institusi_kerja: 'Dinas Kesehatan Jakarta',
    jenisEntitas: 'Pemerintah',
    namaEntitas: 'Dinas Kesehatan Jakarta',
    satuan_kerja: 'Satker Jakarta',
    status_visit: 'Visited',
    visit_image: 'image1.jpg',
    status_ring: 'Ring 1',
    pic_name: 'Pak Ahmad',
    pic_phone: '081234567890',
    pic_role: 'Decision Maker',
    pic_position: 'Kabag',
    kegiatan_status: 'Presentasi',
    descriptions: 'Kunjungan berjalan lancar',
    tindak_lanjut: 'Kirim proposal',
  },
  {
    _id: 'p2',
    visit_date: todayDateStr,
    created_at: `${todayDateStr} 14:00:00`,
    city: 'Bandung',
    klpd: 'Provinsi',
    nama_sales: 'Ani Wulandari',
    institusi_kerja: 'Dinas Pendidikan Jabar',
    jenisEntitas: 'Pemerintah',
    namaEntitas: 'Dinas Pendidikan Jabar',
    satuan_kerja: 'Satker Bandung',
    status_visit: 'Reschedule',
    reschedule_date: '2026-10-01',
    status_ring: 'Ring 2',
    pic_name: 'Ibu Siti',
    pic_phone: '081987654321',
    pic_role: 'Staff',
    pic_position: 'Staf TU',
    kegiatan_status: 'Koordinasi',
    descriptions: 'Minta jadwal ulang',
    tindak_lanjut: 'Follow up minggu depan',
  },
]

// ─── 3. HELPERS ─────────────────────────────────────────────────────────────

function setupFetchMock(opts?: { visits?: any[]; fetchError?: boolean }) {
  const { visits = mockVisits, fetchError = false } = opts ?? {}

  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/parameters')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              posisi: ['Kabag', 'Staff'],
              status_kunjungan: ['Visited', 'Planned', 'Reschedule', 'Stay Office'],
              kegiatan: ['Presentasi', 'Koordinasi'],
            },
          }),
      })
    }
    if (url.includes('/api/visits')) {
      if (fetchError) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: visits,
            pagination: { total: visits.length, totalPages: 1, page: 1 },
          }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  }) as any
}

function renderWithSession(role = 'ADMIN') {
  mockUseSession.mockReturnValue({
    user: { _id: 'u1', name: 'Test User', role, userId: 'u1' },
    loading: false,
  })
  return render(<PlanActivityPage />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('PlanActivityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Header & Layout ──

  it('renders the page title "PLAN ACTIVITY"', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
    })
    expect(screen.getByText(/Monitoring dan Pengelolaan Rencana Kunjungan Lapangan/i)).toBeInTheDocument()
  })

  it('renders the search input with placeholder "Search..."', async () => {
    setupFetchMock()
    renderWithSession()

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('renders "ADD PLANS" button and navigates to /plan-activity/add', async () => {
    setupFetchMock()
    renderWithSession()

    const addBtn = screen.getByText('ADD PLANS')
    expect(addBtn).toBeInTheDocument()

    fireEvent.click(addBtn)
    expect(mockPush).toHaveBeenCalledWith('/plan-activity/add')
  })

  // ── View Tabs ──

  it('renders view tabs (Day, Week, Month, Reschedule)', async () => {
    setupFetchMock()
    renderWithSession()

    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument()
  })

  it('defaults to Month view and switches to Day view when tab clicked', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText(/Dinas Kesehatan/i).length).toBeGreaterThanOrEqual(1)
    })

    const dayTab = screen.getByRole('button', { name: 'Day' })
    fireEvent.click(dayTab)

    await waitFor(() => {
      expect(screen.getByText(/aktivitas hari ini/i)).toBeInTheDocument()
    })
  })

  it('switches to Week view when Week tab is clicked', async () => {
    setupFetchMock()
    renderWithSession()

    const weekTab = screen.getByRole('button', { name: 'Week' })
    fireEvent.click(weekTab)

    await waitFor(() => {
      // Week days header (Sen, Sel, Rab, Kam, Jum, Sab, Min)
      expect(screen.getByText('Sen')).toBeInTheDocument()
      expect(screen.getByText('Jum')).toBeInTheDocument()
    })
  })

  it('switches to Reschedule view and displays banner indicator', async () => {
    setupFetchMock()
    renderWithSession()

    const reschedTab = screen.getByRole('button', { name: 'Reschedule' })
    fireEvent.click(reschedTab)

    await waitFor(() => {
      expect(screen.getByText(/Menampilkan hanya plan berstatus Reschedule/i)).toBeInTheDocument()
    })
  })

  // ── Navigation Buttons ──

  it('renders "Hari Ini" navigation button', async () => {
    setupFetchMock()
    renderWithSession()

    const todayBtn = screen.getByText('Hari Ini')
    expect(todayBtn).toBeInTheDocument()
    fireEvent.click(todayBtn)
  })

  // ── Legend ──

  it('renders status legend items', async () => {
    setupFetchMock()
    renderWithSession()

    expect(screen.getByText('Visited')).toBeInTheDocument()
    expect(screen.getByText('Planned')).toBeInTheDocument()
    expect(screen.getByText('Rescheduled')).toBeInTheDocument()
    expect(screen.getByText('Stay Office')).toBeInTheDocument()
  })

  // ── Role Guard ──

  it('redirects unauthorized role to /', async () => {
    setupFetchMock()
    mockUseSession.mockReturnValue({
      user: { _id: 'u1', name: 'Viewer User', role: 'VIEWER', userId: 'u1' },
      loading: false,
    })
    render(<PlanActivityPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('allows SALES role access without redirecting', async () => {
    setupFetchMock()
    renderWithSession('SALES')

    await waitFor(() => {
      expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('allows LEADER role access without redirecting', async () => {
    setupFetchMock()
    renderWithSession('LEADER')

    await waitFor(() => {
      expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('allows SUPERADMIN role access without redirecting', async () => {
    setupFetchMock()
    renderWithSession('SUPERADMIN')

    await waitFor(() => {
      expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ── Session Loading ──

  it('does not fetch plans while session is loading', () => {
    mockUseSession.mockReturnValue({ user: null, loading: true })
    setupFetchMock()
    render(<PlanActivityPage />)

    // Main visits fetch should not happen while sessionLoading is true
    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    const visitCalls = fetchCalls.filter((c: any) => c[0].includes('/api/visits?'))
    expect(visitCalls.length).toBe(0)
  })

  // ── Error Handling ──

  it('handles API fetch error gracefully without crashing', async () => {
    setupFetchMock({ fetchError: true })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
    })
  })

  // ── Day View Activity Details & Empty State ──

  it('shows empty state in Day view when there are no activities', async () => {
    setupFetchMock({ visits: [] })
    renderWithSession()

    const dayTab = screen.getByRole('button', { name: 'Day' })
    fireEvent.click(dayTab)

    await waitFor(() => {
      expect(screen.getByText('Tidak ada aktivitas')).toBeInTheDocument()
      expect(screen.getByText('Belum ada plan untuk tanggal ini')).toBeInTheDocument()
    })
  })

  it('renders activities in Day view when available', async () => {
    setupFetchMock()
    renderWithSession()

    const dayTab = screen.getByRole('button', { name: 'Day' })
    fireEvent.click(dayTab)

    await waitFor(() => {
      expect(screen.getAllByText(/Dinas Kesehatan Jakarta/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Dinas Pendidikan Jabar/i).length).toBeGreaterThanOrEqual(1)
    })
  })
})
