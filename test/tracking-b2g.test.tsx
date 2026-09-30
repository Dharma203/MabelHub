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

jest.mock('@/components/ui/TableCard', () => {
  return function MockTableCard(props: any) {
    return <div data-testid="table-card">{props.title}</div>
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

jest.mock('@/lib/xlsx-loader', () => ({
  loadXLSX: jest.fn().mockResolvedValue({
    utils: { json_to_sheet: jest.fn(), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() },
    writeFile: jest.fn(),
  }),
}))

import TrackingB2GPage from '@/app/tracking-b2g/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const mockStatsResponse = {
  totalSatuanKerja: 40,
  totalVisit: 180,
  topSatker: 'Dinas Kesehatan Pusat',
  topSatkerCount: 30,
  salesAktif: 8,
  byKlpd: [{ label: 'Kementerian', value: 25 }],
  bySales: [{ label: 'Budi', value: 15 }],
  byRing: [{ label: 'RING 1', value: 20 }],
}

const mockMetaResponse = {
  sales: ['Budi', 'Ani'],
  cities: ['Jakarta', 'Bandung'],
  satkers: ['Dinas Kesehatan', 'Dinas Pendidikan'],
  klpd: ['Kementerian', 'BUMN'],
  status_visit: ['Visited', 'Not Visited'],
  namaEntitas: [],
  jenisEntitas: [],
}

const mockVisitRows = [
  {
    _id: 'v1',
    rank: 1,
    nama_sales: 'Budi Santoso',
    visit_date: '2026-09-15',
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
    descriptions: 'OK',
    total_visit: 12,
  },
  {
    _id: 'v2',
    rank: 2,
    nama_sales: 'Ani Wulandari',
    visit_date: '2026-09-14',
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
    descriptions: 'Pending',
    total_visit: 3,
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
    if (url.includes('/api/visits/meta')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMetaResponse),
      })
    }
    if (url.includes('/api/parameters')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: { status_kunjungan: ['Visited'], ring: ['RING 1', 'RING 2'] },
        }),
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
  return render(<TrackingB2GPage />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('TrackingB2GPage', () => {
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
      expect(screen.getByText('Tracking Visit B2G')).toBeInTheDocument()
    })
  })

  // ── Stats Cards ──

  it('displays total satuan kerja stat', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument()
    })
  })

  it('displays total visit stat', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('180')).toBeInTheDocument()
    })
  })

  it('shows top satker name', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText(/Dinas Kesehatan Pusat/i)).toBeInTheDocument()
    })
  })

  // ── Table ──

  it('renders visit rows in table', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Dinas Kesehatan').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Dinas Pendidikan').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows visit counts per row', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
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
    render(<TrackingB2GPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('allows ADMIN SALES access', async () => {
    setupFetchMock()
    renderWithSession('ADMIN SALES')

    await waitFor(() => {
      expect(screen.getAllByText('Dinas Kesehatan').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ── API call correctness ──

  it('calls stats API with filterStatsB2G=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const statsCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits/stats'),
      )
      expect(statsCall).toBeTruthy()
      expect(statsCall[0]).toContain('filterStatsB2G=true')
    })
  })

  it('calls visits API with filterStatsB2G=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const visitCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits?'),
      )
      expect(visitCall).toBeTruthy()
      expect(visitCall[0]).toContain('filterStatsB2G=true')
    })
  })

  it('calls meta API with filterStatsB2G=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const metaCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits/meta'),
      )
      expect(metaCall).toBeTruthy()
      expect(metaCall[0]).toContain('filterStatsB2G=true')
    })
  })

  // ── Session Loading ──

  it('does not fetch while session is loading', () => {
    mockUseSession.mockReturnValue({ user: null, loading: true })
    setupFetchMock()
    render(<TrackingB2GPage />)

    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    const visitCalls = fetchCalls.filter(
      (c: any) => c[0].includes('/api/visits?') || c[0].includes('/api/visits/stats'),
    )
    expect(visitCalls.length).toBe(0)
  })
})
