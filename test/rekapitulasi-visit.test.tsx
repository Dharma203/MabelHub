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

// Mock SearchableSelect
jest.mock('@/components/ui/SearchableSelect', () => {
  return function MockSearchableSelect(props: any) {
    return (
      <select
        data-testid={`select-${props.placeholder || props.label || 'unknown'}`}
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

// Mock ExportExcelModal
jest.mock('@/components/modals/ExportExcelModal', () => {
  const MockExportModal = (props: any) => {
    if (!props.isOpen) return null
    return (
      <div data-testid="export-modal">
        <button onClick={() => props.onClose?.()}>close-export</button>
      </div>
    )
  }
  MockExportModal.displayName = 'MockExportExcelModal'
  return {
    __esModule: true,
    default: MockExportModal,
  }
})

// Mock lucide-react icons
jest.mock('lucide-react', () =>
  new Proxy({}, {
    get: (_target, name) => {
      const Icon = (props: any) => <span data-testid={`icon-${String(name)}`} {...props} />
      Icon.displayName = String(name)
      return Icon
    },
  }),
)

// Mock xlsx-loader
jest.mock('@/lib/xlsx-loader', () => ({
  loadXLSX: jest.fn().mockResolvedValue({
    utils: {
      json_to_sheet: jest.fn(),
      book_new: jest.fn(() => ({})),
      book_append_sheet: jest.fn(),
    },
    writeFile: jest.fn(),
  }),
}))

import RekapitulasiVisitPage from '@/app/rekapitulasi-visit/page'

// ─── 2. MOCK DATA ───────────────────────────────────────────────────────────

const mockMetaResponse = {
  sales: ['Budi', 'Ani'],
  cities: ['Jakarta', 'Bandung'],
  satkers: ['Dinas Kesehatan', 'Dinas Pendidikan'],
  namaEntitas: ['PT Maju'],
}

const mockVisitRows = [
  {
    _id: 'v1',
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
    descriptions: 'Visit OK',
    visit_image: '',
    namaEntitas: '',
    jenisEntitas: '',
    no_visit_per_month: '1',
  },
  {
    _id: 'v2',
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
    descriptions: 'Belum bisa visit',
    visit_image: '',
    namaEntitas: '',
    jenisEntitas: '',
    no_visit_per_month: '1',
  },
]

const mockStatsResponse = {
  totalVisits: 100,
  visited: 60,
  stayOffice: 20,
  notVisited: 20,
  salesCount: 5,
  satkerCount: 10,
  cityCount: 4,
  ring: { ring1: 30, ring2: 25, ring3: 15, ring4: 10 },
}

// ─── 3. HELPERS ─────────────────────────────────────────────────────────────

function setupFetchMock(opts?: {
  visits?: any[]
  stats?: any
  visitError?: boolean
}) {
  const { visits = mockVisitRows, stats = mockStatsResponse, visitError = false } = opts ?? {}

  global.fetch = jest.fn().mockImplementation((url: string) => {
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
          data: { status_kunjungan: ['Visited', 'Not Visited'], ring: ['RING 1', 'RING 2'] },
        }),
      })
    }
    if (url.includes('/api/dashboard-request')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(stats),
      })
    }
    if (url.includes('/api/visits')) {
      if (visitError) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed' }),
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
    user: { _id: 'u1', name: 'Test User', role },
    loading: false,
  })
  return render(<RekapitulasiVisitPage />)
}

// ─── 4. TESTS ───────────────────────────────────────────────────────────────

describe('RekapitulasiVisitPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Rendering ──

  it('renders the page heading "VISIT DASHBOARD"', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('VISIT DASHBOARD')).toBeInTheDocument()
    })
  })

  // ── Data Loading ──

  it('renders visit rows after fetch', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Ani Wulandari').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders table column headers', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThanOrEqual(1)
    })

    // Check for common column headers
    expect(screen.getByText('NAMA SALES')).toBeInTheDocument()
    expect(screen.getByText('VISIT DATE')).toBeInTheDocument()
    expect(screen.getAllByText('CITY').length).toBeGreaterThanOrEqual(1)
  })

  // ── Empty State ──

  it('shows empty message when no visits exist', async () => {
    setupFetchMock({ visits: [] })
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText(/Tidak ada data/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Error Handling ──

  it('handles fetch error gracefully', async () => {
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
    render(<RekapitulasiVisitPage />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('does not redirect ADMIN role', async () => {
    setupFetchMock()
    renderWithSession('ADMIN')

    await waitFor(() => {
      expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect SALES role', async () => {
    setupFetchMock()
    renderWithSession('SALES')

    await waitFor(() => {
      expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThanOrEqual(1)
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ── Export Modal ──

  it('renders export excel button', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getByText('Export Excel')).toBeInTheDocument()
    })
  })

  // ── StatusPill ──

  it('renders visited status with green styling', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const pills = screen.getAllByText('VISITED')
      const pill = pills.find((el) => el.className.includes('rounded-full'))
      expect(pill).toBeTruthy()
      expect(pill!.className).toContain('bg-green-100')
    })
  })

  it('renders not visited status with gray styling', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const pills = screen.getAllByText('NOT VISITED')
      const pill = pills.find((el) => el.className.includes('rounded-full'))
      expect(pill).toBeTruthy()
      expect(pill!.className).toContain('bg-gray-100')
    })
  })

  // ── API calls with correct parameters ──

  it('fetches visits with correct query params on mount', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const visitCall = fetchCalls.find((c: any) =>
        c[0].includes('/api/visits?'),
      )
      expect(visitCall).toBeTruthy()
      expect(visitCall[0]).toContain('limit=25')
      expect(visitCall[0]).toContain('page=1')
    })
  })

  // ── Format date ──

  it('formats dates in Indonesian locale', async () => {
    setupFetchMock()
    renderWithSession()

    await waitFor(() => {
      expect(screen.getAllByText('Budi Santoso').length).toBeGreaterThanOrEqual(1)
    })

    // The visit_date should be formatted by formatDateID
    // "2026-09-15" -> "15 Sep 2026" (id-ID)
    // We check it doesn't show the raw ISO string
    expect(screen.queryByText('2026-09-15')).not.toBeInTheDocument()
  })
})
