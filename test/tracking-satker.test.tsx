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

jest.mock('@/lib/xlsx-loader', () => ({
  loadXLSX: jest.fn().mockResolvedValue({
    utils: { json_to_sheet: jest.fn(), book_new: jest.fn(() => ({})), book_append_sheet: jest.fn() },
    writeFile: jest.fn(),
  }),
}))

import TrackingSatuanKerja from '@/app/tracking-satker/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const mockStatsResponse = {
  totalSatuanKerja: 50,
  totalVisit: 200,
  topSatker: 'Dinas Kesehatan Jakarta',
  topSatkerCount: 25,
}

const mockMetaResponse = {
  sales: ['Budi', 'Ani'],
  cities: ['Jakarta', 'Bandung'],
  satkers: ['Dinas Kesehatan', 'Dinas Pendidikan'],
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
    namaEntitas: '',
    jenisEntitas: '',
    reschedule: '-',
    institusi_kerja: 'Kemenkes',
    pic_position: 'Kabag',
    pic_role: 'Decision Maker',
    tindak_lanjut: 'Follow up',
    kegiatan_status: 'Active',
    descriptions: 'OK',
    total_visit: 10,
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
    namaEntitas: '',
    jenisEntitas: '',
    reschedule: '-',
    institusi_kerja: 'Kemendikbud',
    pic_position: 'Staff',
    pic_role: 'User',
    tindak_lanjut: 'Reschedule',
    kegiatan_status: 'Pending',
    descriptions: 'Pending',
    total_visit: 5,
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
  return render(<TrackingSatuanKerja />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('TrackingSatuanKerja', () => {
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
      expect(screen.getByText(/Tracking Satuan Kerja/i)).toBeInTheDocument()
    })
  })

  // ── Stats Cards ──

  it('displays stat cards with fetched values', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument() // totalSatuanKerja
      expect(screen.getByText('200')).toBeInTheDocument() // totalVisit
    })
  })

  it('shows top satker name in stats', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText(/Dinas Kesehatan Jakarta/i)).toBeInTheDocument()
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

  it('shows rank numbers', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows total visit counts', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1) // total_visit for v1
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)  // total_visit for v2
    })
  })

  // ── Empty State ──

  it('shows empty message when no rows', async () => {
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

    // Stats should show 0 or dash
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

  it('redirects unauthorized role', async () => {
    setupFetchMock()
    mockUseSession.mockReturnValue({
      user: { _id: 'u1', name: 'Test', role: 'VIEWER' },
      loading: false,
    })
    render(<TrackingSatuanKerja />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('allows SUPERADMIN access', async () => {
    setupFetchMock()
    renderWithSession('SUPERADMIN')

    await waitFor(() => {
      expect(screen.getAllByText('Dinas Kesehatan').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('allows LEADER access', async () => {
    setupFetchMock()
    renderWithSession('LEADER')

    await waitFor(() => {
      expect(screen.getAllByText('Dinas Kesehatan').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ── API call correctness ──

  it('calls stats API with excludeOffice=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const statsCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits/stats'),
      )
      expect(statsCall).toBeTruthy()
      expect(statsCall[0]).toContain('excludeOffice=true')
    })
  })

  it('calls visits API with groupBySatker=true', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const visitCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits?'),
      )
      expect(visitCall).toBeTruthy()
      expect(visitCall[0]).toContain('groupBySatker=true')
    })
  })

  // ── Session Loading ──

  it('does not fetch while session is loading', () => {
    mockUseSession.mockReturnValue({ user: null, loading: true })
    setupFetchMock()
    render(<TrackingSatuanKerja />)

    // No calls to visits or stats endpoint (meta/parameters may still be called)
    const fetchCalls = (global.fetch as jest.Mock).mock.calls
    const visitCalls = fetchCalls.filter(
      (c: any) => c[0].includes('/api/visits?') || c[0].includes('/api/visits/stats'),
    )
    expect(visitCalls.length).toBe(0)
  })
})
