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

jest.mock('@/components/modals/NotificationMenu', () => {
  return function MockNotificationMenu() {
    return <div data-testid="notification-menu">Notifications</div>
  }
})

jest.mock('@/components/modals/SalesMap', () => {
  const MockSalesMap = (props: any) => (
    <div data-testid="sales-map">Map ({props.visits?.length ?? 0} visits)</div>
  )
  return { __esModule: true, default: MockSalesMap }
})

// Mock lucide-react icons to plain spans
jest.mock('lucide-react', () =>
  new Proxy({}, {
    get: (_target, name) => {
      const Icon = (props: any) => <span data-testid={`icon-${String(name)}`} {...props} />
      Icon.displayName = String(name)
      return Icon
    },
  }),
)

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock('recharts', () => {
  const MockComponent = ({ children, ...props }: any) => (
    <div data-testid={props['data-testid'] || 'recharts-mock'}>{children}</div>
  )
  return {
    ResponsiveContainer: MockComponent,
    PieChart: MockComponent,
    Pie: MockComponent,
    Cell: MockComponent,
    BarChart: MockComponent,
    Bar: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    CartesianGrid: MockComponent,
    Tooltip: MockComponent,
    Legend: MockComponent,
    AreaChart: MockComponent,
    Area: MockComponent,
    Label: MockComponent,
    Sector: MockComponent,
  }
})

import DashboardRequestPage from '@/app/dashboard-request/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const mockStatsResponse = {
  totalVisits: 150,
  visited: 80,
  stayOffice: 40,
  notVisited: 30,
  salesCount: 10,
  satkerCount: 25,
  cityCount: 8,
  ring: { ring1: 40, ring2: 35, ring3: 20, ring4: 5 },
  trend: [
    { date: '2026-09-01', count: 5 },
    { date: '2026-09-02', count: 8 },
  ],
  topVisit: [
    { name: 'Sales A', count: 20 },
    { name: 'Sales B', count: 15 },
  ],
  klpd: [
    { name: 'Kementerian', count: 50 },
    { name: 'BUMN', count: 30 },
  ],
}

const mockVisitRows = [
  {
    _id: 'v1',
    nama_sales: 'Budi Santoso',
    visit_date: '2026-09-15T00:00:00.000Z',
    status_visit: 'Visited',
    satuan_kerja: 'Dinas Kesehatan',
    city: 'Jakarta',
    pic_name: 'Andi',
    pic_phone: '081234567890',
    status_ring: 'RING 1',
    created_at: '2026-09-10',
    status_market: 'New',
    klpd: 'Kementerian',
    reschedule: '-',
    institusi_kerja: 'Kemenkes',
    pic_position: 'Kabag',
    pic_role: 'Decision Maker',
    tindak_lanjut: 'Follow up',
    kegiatan_status: 'Active',
    descriptions: 'Visit lapangan OK',
  },
  {
    _id: 'v2',
    nama_sales: 'Ani Wulandari',
    visit_date: '2026-09-14T00:00:00.000Z',
    status_visit: 'Not Visited',
    satuan_kerja: 'Dinas Pendidikan',
    city: 'Bandung',
    pic_name: 'Dewi',
    pic_phone: '081987654321',
    status_ring: 'RING 2',
    created_at: '2026-09-09',
    status_market: 'Existing',
    klpd: 'BUMN',
    reschedule: '2026-09-20',
    institusi_kerja: 'Kemendikbud',
    pic_position: 'Staff',
    pic_role: 'User',
    tindak_lanjut: 'Reschedule',
    kegiatan_status: 'Pending',
    descriptions: 'Belum bisa visit',
  },
]

// ─── 3. HELPERS ─────────────────────────────────────────────────────────────

function setupFetchMock(opts?: {
  stats?: any
  visits?: any
  statsError?: boolean
  visitsError?: boolean
}) {
  const {
    stats = mockStatsResponse,
    visits = mockVisitRows,
    statsError = false,
    visitsError = false,
  } = opts ?? {}

  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/dashboard-request')) {
      if (statsError) return Promise.reject(new Error('Stats error'))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(stats),
      })
    }
    if (url.includes('/api/visits')) {
      if (visitsError) return Promise.reject(new Error('Visits error'))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: visits }),
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
    user: { _id: 'u1', name: 'Test User', role },
    loading: false,
  })
  return render(<DashboardRequestPage />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('DashboardRequestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Rendering ──

  it('renders the page title "VISIT DASHBOARD"', async () => {
    setupFetchMock()
    renderWithSession()

    expect(screen.getByText('VISIT DASHBOARD')).toBeInTheDocument()
  })

  it('renders subtitle monitoring text', async () => {
    setupFetchMock()
    renderWithSession()

    expect(
      screen.getByText('Monitoring dan Analisis Aktivitas Visit Lapangan'),
    ).toBeInTheDocument()
  })

  // ── Stats Cards ──

  it('displays stat cards with correct values after loading', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // totalVisits
    })

    expect(screen.getByText('TOTAL VISITS')).toBeInTheDocument()
    expect(screen.getByText('STAY OFFICE')).toBeInTheDocument()
    expect(screen.getAllByText('NOT VISITED').length).toBeGreaterThanOrEqual(1)
  })

  it('displays market coverage stats', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      // salesCount=10 may appear in multiple places, use getAllByText
      const tens = screen.getAllByText('10')
      expect(tens.length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('MARKET COVERAGE').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Satker')).toBeInTheDocument()
    expect(screen.getAllByText('City').length).toBeGreaterThanOrEqual(1)
  })

  it('displays ring distribution values', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      // ring1=40 also matches stayOffice=40, use getAllByText
      const forties = screen.getAllByText('40')
      expect(forties.length).toBeGreaterThanOrEqual(2) // stayOffice + ring1
    })

    expect(screen.getAllByText('RING DISTRIBUTION').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Ring 1')).toBeInTheDocument()
    expect(screen.getByText('Ring 2')).toBeInTheDocument()
    expect(screen.getByText('Ring 3')).toBeInTheDocument()
    expect(screen.getByText('Ring 4')).toBeInTheDocument()
  })

  // ── Table ──

  it('renders recent visits table with data', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    expect(screen.getByText('RECENT VISITS')).toBeInTheDocument()
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    expect(screen.getByText('Jakarta')).toBeInTheDocument()
  })

  it('shows "Tidak ada data visit." when no visits', async () => {
    setupFetchMock({ visits: [] })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Tidak ada data visit.')).toBeInTheDocument()
    })
  })

  it('shows "See All" button that navigates to /rekapitulasi-visit', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('See All')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('See All'))
    expect(mockPush).toHaveBeenCalledWith('/rekapitulasi-visit')
  })

  // ── Search ──

  it('filters table rows by search input', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, 'Ani')

    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument()
    expect(screen.getByText('Ani Wulandari')).toBeInTheDocument()
  })

  it('filters by city name in search', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, 'Bandung')

    expect(screen.queryByText('Jakarta')).not.toBeInTheDocument()
    expect(screen.getByText('Bandung')).toBeInTheDocument()
  })

  // ── Detail Expand ──

  it('expands visit detail when clicking a table row', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Budi Santoso'))

    await waitFor(() => {
      expect(screen.getByText('Detail Kunjungan')).toBeInTheDocument()
      expect(screen.getByText('Kemenkes')).toBeInTheDocument()
      expect(screen.getByText('Decision Maker')).toBeInTheDocument()
    })
  })

  it('collapses detail when clicking the same row again', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Expand
    fireEvent.click(screen.getByText('Budi Santoso'))
    await waitFor(() => {
      expect(screen.getByText('Detail Kunjungan')).toBeInTheDocument()
    })

    // Collapse
    fireEvent.click(screen.getByText('Budi Santoso'))
    await waitFor(() => {
      expect(screen.queryByText('Detail Kunjungan')).not.toBeInTheDocument()
    })
  })

  // ── Error Handling ──

  it('handles stats fetch error gracefully', async () => {
    setupFetchMock({ statsError: true })
    renderWithSession()

    // Should not crash — stats will be null, cards show "-"
    await waitFor(() => {
      const dashes = screen.getAllByText('-')
      expect(dashes.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles visits fetch error gracefully', async () => {
    setupFetchMock({ visitsError: true })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Tidak ada data visit.')).toBeInTheDocument()
    })
  })

  // ── Session Loading ──

  it('does not fetch data while session is loading', () => {
    mockUseSession.mockReturnValue({ user: null, loading: true })
    setupFetchMock()
    render(<DashboardRequestPage />)

    // fetch should not have been called for stats/visits since sessionLoading is true
    // (initial useEffect returns early)
    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    expect(fetchCalls.length).toBe(0)
  })

  // ── Status Pill ──

  it('renders StatusPill with correct styling for "Visited"', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    // Find the StatusPill inside the table (not the stat card title)
    const allVisited = screen.getAllByText('VISITED')
    const pillElement = allVisited.find((el) => el.className.includes('rounded-full'))
    expect(pillElement).toBeTruthy()
    expect(pillElement!.className).toContain('bg-green-100')
  })

  it('renders StatusPill with gray styling for "NOT VISITED"', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Ani Wulandari')).toBeInTheDocument()
    })

    // Find the StatusPill in the table (not the stat card title "NOT VISITED")
    const allNotVisited = screen.getAllByText('NOT VISITED')
    const pillElement = allNotVisited.find((el) => el.className.includes('rounded-full'))
    expect(pillElement).toBeTruthy()
    expect(pillElement!.className).toContain('bg-gray-100')
  })

  // ── Charts Section Headers ──

  it('renders chart section headers', async () => {
    setupFetchMock()
    renderWithSession()

    expect(screen.getByText('VISITS OVERVIEW')).toBeInTheDocument()
    expect(screen.getByText('VISITS TREND (14 DAYS)')).toBeInTheDocument()
    expect(screen.getByText('TOP VISIT PERFORMANCE')).toBeInTheDocument()
    expect(screen.getByText('KLPD DISTRIBUTION')).toBeInTheDocument()
  })

  // ── Date Filters ──

  it('renders date filter inputs', async () => {
    setupFetchMock()
    renderWithSession()

    const startDateInput = screen.getByTitle('Start Date')
    const endDateInput = screen.getByTitle('End Date')

    expect(startDateInput).toBeInTheDocument()
    expect(endDateInput).toBeInTheDocument()
  })

  // ── Filter Clearing ──

  it('clears all filters when "Clear All" is clicked', async () => {
    setupFetchMock()
    renderWithSession()

    // Set a date to trigger filter indicator
    const startDateInput = screen.getByTitle('Start Date')
    fireEvent.change(startDateInput, { target: { value: '2026-09-01' } })

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Clear All'))

    await waitFor(() => {
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
    })
  })
})
