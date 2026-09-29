/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

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

jest.mock('@/components/ui/SearchableSelect', () => {
  return function MockSearchableSelect(props: any) {
    return (
      <select
        data-testid={`select-${props.placeholder || 'unknown'}`}
        value={props.value || ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      >
        <option value="">{props.placeholder}</option>
        {(props.options || []).map((o: any) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    )
  }
})

jest.mock('@/components/modals/ExportExcelModal', () => {
  const MockExportModal = (props: any) => {
    if (!props.isOpen) return null
    return <div data-testid="export-modal">Export Modal</div>
  }
  return { __esModule: true, default: MockExportModal }
})

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

// Mock recharts for B2B chart components
jest.mock('recharts', () => {
  const MockComponent = ({ children, ...props }: any) => (
    <div data-testid={props['data-testid'] || 'recharts-mock'}>{children}</div>
  )
  return {
    ResponsiveContainer: MockComponent,
    BarChart: MockComponent,
    Bar: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    CartesianGrid: MockComponent,
    Tooltip: MockComponent,
    Legend: MockComponent,
    LabelList: MockComponent,
  }
})

jest.mock('@/lib/xlsx-loader', () => ({
  loadXLSX: jest.fn().mockResolvedValue({
    utils: { json_to_sheet: jest.fn(), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() },
    writeFile: jest.fn(),
  }),
}))

import TrackingB2BPage from '@/app/tracking-b2b/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const mockStatsResponse = {
  totalSatuanKerja: 35,
  totalVisit: 120,
  topSatker: 'PT Maju Jaya',
  topSatkerCount: 20,
  salesAktif: 6,
  byKlpd: [{ label: 'Swasta', value: 20 }],
  bySales: [{ label: 'Charlie', value: 12 }],
  byRing: [{ label: 'RING 4', value: 35 }],
}

const mockMetaResponse = {
  sales: ['Charlie', 'Diana'],
  cities: ['Surabaya', 'Malang'],
  satkers: ['PT Maju', 'CV Jaya'],
  klpd: ['Swasta'],
  status_visit: ['Visited', 'Not Visited'],
}

const mockMonthlyProgress = {
  months: ['Jan 2026', 'Feb 2026'],
  salesData: [
    {
      name: 'Charlie',
      color: '#3b82f6',
      months: {
        'Jan 2026': { total: 5, penambahan: 5 },
        'Feb 2026': { total: 8, penambahan: 3 },
      },
      grandTotal: 8,
    },
  ],
  grandTotal: {
    months: {
      'Jan 2026': { total: 5, penambahan: 5 },
      'Feb 2026': { total: 8, penambahan: 3 },
    },
    grandTotal: 8,
  },
}

const mockVisitRows = [
  {
    _id: 'v1',
    rank: 1,
    nama_sales: 'Charlie Brown',
    visit_date: '2026-09-15',
    status_visit: 'Visited',
    satuan_kerja: 'PT Maju Jaya',
    city: 'Surabaya',
    pic_name: 'Bapak Sardi',
    pic_phone: '085111222333',
    status_ring: 'RING 4',
    created_at: '2026-09-10',
    status_market: 'New',
    klpd: 'Swasta',
    reschedule: '-',
    institusi_kerja: 'PT Maju',
    pic_position: 'Manager',
    pic_role: 'Buyer',
    tindak_lanjut: 'Follow up',
    kegiatan_status: 'Active',
    descriptions: 'Meeting went well',
    total_visit: 15,
  },
  {
    _id: 'v2',
    rank: 2,
    nama_sales: 'Diana Prince',
    visit_date: '2026-09-14',
    status_visit: 'Not Visited',
    satuan_kerja: 'CV Jaya Abadi',
    city: 'Malang',
    pic_name: 'Ibu Sari',
    pic_phone: '085444555666',
    status_ring: 'RING 4',
    created_at: '2026-09-09',
    status_market: 'Existing',
    klpd: 'Swasta',
    reschedule: '2026-09-20',
    institusi_kerja: 'CV Jaya',
    pic_position: 'Owner',
    pic_role: 'Decision Maker',
    tindak_lanjut: 'Reschedule',
    kegiatan_status: 'Pending',
    descriptions: 'Need reschedule',
    total_visit: 7,
  },
]

// ─── 3. HELPERS ─────────────────────────────────────────────────────────────

function setupFetchMock(opts?: { visits?: any[]; statsError?: boolean; visitError?: boolean }) {
  const { visits = mockVisitRows, statsError = false, visitError = false } = opts ?? {}

  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/visits/stats')) {
      if (statsError) return Promise.reject(new Error('Stats error'))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStatsResponse),
      })
    }
    if (url.includes('/api/visits/monthly-progress')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMonthlyProgress),
      })
    }
    if (url.includes('/api/visits/meta')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMetaResponse),
      })
    }
    if (url.includes('/api/visits/by-satker')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })
    }
    if (url.includes('/api/visits')) {
      if (visitError) return Promise.reject(new Error('Network error'))
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: visits,
            pagination: { total: visits.length, totalPages: 1, page: 1 },
          }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  }) as any
}

function renderWithSession(role = 'ADMIN') {
  mockUseSession.mockReturnValue({
    user: { _id: 'u1', name: 'Test User', role },
    loading: false,
  })
  return render(<TrackingB2BPage />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('TrackingB2BPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Rendering ──

  it('renders page title', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Tracking Visit B2B')).toBeInTheDocument()
    })
  })

  // ── Stats Cards ──

  it('displays total satuan kerja stat', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('35').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('displays total visit stat', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument()
    })
  })

  it('shows top entity name', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText(/PT Maju Jaya/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Table ──

  it('renders visit rows in table', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Charlie Brown').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Diana Prince').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows total visit counts', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('shows city names in table', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Surabaya').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Malang').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Empty State ──

  it('shows empty message when no data', async () => {
    setupFetchMock({ visits: [] })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText(/Tidak ada data/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Error Handling ──

  it('handles stats error gracefully', async () => {
    setupFetchMock({ statsError: true })
    renderWithSession()

    await waitFor(() => {
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles visit fetch error gracefully', async () => {
    setupFetchMock({ visitError: true })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText(/Tidak ada data/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Role Guard ──

  it('redirects unauthorized role to /', async () => {
    setupFetchMock()
    mockUseSession.mockReturnValue({
      user: { _id: 'u1', name: 'Test', role: 'VIEWER' },
      loading: false,
    })
    render(<TrackingB2BPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('allows SALES access', async () => {
    setupFetchMock()
    renderWithSession('SALES')

    await waitFor(() => {
      expect(screen.getAllByText('Charlie Brown').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ── API call correctness ──

  it('calls stats API with filterStatsB2B=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const statsCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits/stats'),
      )
      expect(statsCall).toBeTruthy()
      expect(statsCall[0]).toContain('filterStatsB2B=true')
    })
  })

  it('calls visits API with filterStatsB2B=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const visitCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits?'),
      )
      expect(visitCall).toBeTruthy()
      expect(visitCall[0]).toContain('filterStatsB2B=true')
    })
  })

  it('fetches monthly progress data', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const monthlyCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits/monthly-progress'),
      )
      expect(monthlyCall).toBeTruthy()
      expect(monthlyCall[0]).toContain('filterStatsB2B=true')
    })
  })

  // ── Session Loading ──

  it('does not fetch while session is loading', () => {
    mockUseSession.mockReturnValue({ user: null, loading: true })
    setupFetchMock()
    render(<TrackingB2BPage />)

    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    const visitCalls = fetchCalls.filter(
      (c: any) =>
        c[0].includes('/api/visits?') ||
        c[0].includes('/api/visits/stats') ||
        c[0].includes('/api/visits/monthly-progress'),
    )
    expect(visitCalls.length).toBe(0)
  })
})
