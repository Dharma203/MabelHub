/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock SearchableSelect — just render a plain <select>
jest.mock('@/components/ui/SearchableSelect', () => {
  return function MockSearchableSelect(props: any) {
    return (
      <select
        data-testid={`select-${props.placeholder}`}
        value={props.value || ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      >
        <option value="">{props.placeholder}</option>
        {(props.options || []).map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
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

import DatabaseTrackingPage from '@/app/database-tracking/page'

/* ── helpers ── */
const mockB2GRows = [
  {
    _id: '1',
    kode: 'B2G-010125-001',
    satuanKerja: 'Dinas Kesehatan',
    institusiKerja: 'Kemenkes',
    klpd: 'Kementerian',
    segmentasi: 'Seg A',
    kota: 'Jakarta',
    ring: 'Ring 1',
    nama: 'Budi',
    jabatan: 'Kepala',
    role: 'Decision Maker',
    tipeKontak: 'Phone',
    noTelp: '081234567890',
    email: 'budi@test.com',
    provinsi: 'DKI Jakarta',
    alamat: 'Jl. Merdeka 1',
    salesInternal: 'Sales A',
    createdAt: '2025-01-01',
    updatedAt: '2025-06-01',
  },
  {
    _id: '2',
    kode: 'B2G-020225-002',
    satuanKerja: 'Dinas Pendidikan',
    institusiKerja: 'Kemendikbud',
    klpd: 'Kementerian',
    segmentasi: 'Seg B',
    kota: 'Bandung',
    ring: 'Ring 2',
    nama: 'Ani',
    jabatan: 'Staff',
    role: 'User',
    tipeKontak: 'Email',
    noTelp: '081987654321',
    email: 'ani@test.com',
    provinsi: 'Jawa Barat',
    alamat: 'Jl. Asia Afrika',
    salesInternal: 'Sales B',
    createdAt: '2025-02-01',
    updatedAt: '2025-07-01',
  },
]

const mockB2BRows = [
  {
    _id: '10',
    kode: 'B2B-010125-001',
    jenisEntitas: 'PT',
    namaEntitas: 'PT Maju Jaya',
    kota: 'Surabaya',
    ring: 'Ring 1',
    bidangUsaha: 'Teknologi',
    produkRelevan: 'Software',
    merekTayang: 'Brand X',
    merekLainnya: 'Brand Y',
    brandOwner: 'Owner X',
    sumberData: 'Web',
    linkProduk: 'https://produk.com',
    linkToko: 'https://toko.com',
    nama: 'Charlie',
    jabatan: 'Manager',
    role: 'Buyer',
    tipeKontak: 'WhatsApp',
    noTelp: '085111222333',
    email: 'charlie@test.com',
    provinsi: 'Jawa Timur',
    alamat: 'Jl. Tunjungan',
    salesInternal: 'Sales C',
    createdAt: '2025-03-01',
    updatedAt: '2025-08-01',
  },
]

function mockFetchForMode(mode: 'b2g' | 'b2b', rows: any[]) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    // Return B2B data when url contains mode=b2b
    if (url.includes('mode=b2b')) {
      return Promise.resolve({
        json: () => Promise.resolve({ rows: mode === 'b2b' ? rows : mockB2BRows, mode: 'b2b' }),
      })
    }
    // Default B2G
    return Promise.resolve({
      json: () => Promise.resolve({ rows: mode === 'b2g' ? rows : mockB2GRows, mode: 'b2g' }),
    })
  }) as any
}

function mockFetchSuccess(rows: any[]) {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ rows, mode: 'b2g' }),
  }) as any
}

function mockFetchError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any
}

/* ── tests ── */
describe('DatabaseTrackingPage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ── Rendering ──
  it('renders header and mode toggle buttons', async () => {
    mockFetchSuccess([])
    render(<DatabaseTrackingPage />)

    expect(screen.getByText('Database Tracking')).toBeInTheDocument()
    expect(screen.getByText('Data B2G')).toBeInTheDocument()
    expect(screen.getByText('Data B2B')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => { })) as any // never resolves
    render(<DatabaseTrackingPage />)

    expect(screen.getByText(/Memuat data B2G/i)).toBeInTheDocument()
  })

  it('shows empty state when no rows', async () => {
    mockFetchSuccess([])
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada data B2G/i)).toBeInTheDocument()
    })
  })

  // ── Data rendering ──
  it('renders B2G rows in table after fetch', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
      expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument()
    })
  })

  it('displays correct column headers for B2G mode', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Satuan Kerja')).toBeInTheDocument()
      expect(screen.getByText('Institusi Kerja')).toBeInTheDocument()
      expect(screen.getByText('KLPD')).toBeInTheDocument()
    })
  })

  it('shows row numbers in table', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      // Find table rows — each data row starts with a number cell
      const rows = screen.getAllByRole('row')
      // Header row + 2 data rows = at least 3 rows
      expect(rows.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ── Mode switching ──
  it('switches to B2B mode and fetches new data', async () => {
    // Use smart mock that returns different data per mode
    mockFetchForMode('b2g', mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Data B2B'))

    await waitFor(() => {
      expect(screen.getByText('Jenis Entitas')).toBeInTheDocument()
      expect(screen.getByText('Nama Entitas')).toBeInTheDocument()
    })
  })

  it('resets search when switching modes', async () => {
    mockFetchForMode('b2g', mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Cari institusi/i) as HTMLInputElement
    await userEvent.type(searchInput, 'test search')
    expect(searchInput.value).toBe('test search')

    fireEvent.click(screen.getByText('Data B2B'))

    await waitFor(() => {
      const newInput = screen.getByPlaceholderText(/Cari entitas/i) as HTMLInputElement
      expect(newInput.value).toBe('')
    })
  })

  it('does nothing when clicking the already-active mode button', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const fetchCount = (global.fetch as jest.Mock).mock.calls.length
    fireEvent.click(screen.getByText('Data B2G'))

    // No additional fetch
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCount)
  })

  // ── Client-side search ──
  it('filters rows client-side by search query', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Cari institusi/i)
    await userEvent.type(searchInput, 'Pendidikan')

    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument()
    expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument()
  })

  it('shows summary count matching filtered results', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    // Check initial count shows 2
    const summaryDiv = screen.getByText(/Menampilkan/i)
    expect(summaryDiv.textContent).toContain('2')

    const searchInput = screen.getByPlaceholderText(/Cari institusi/i)
    await userEvent.type(searchInput, 'Pendidikan')

    // After filter, summary should show 1
    await waitFor(() => {
      const updatedSummary = screen.getByText(/Menampilkan/i)
      expect(updatedSummary.textContent).toContain('1')
    })
  })

  it('shows search term in summary bar', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Cari institusi/i)
    await userEvent.type(searchInput, 'Kesehatan')

    expect(screen.getByText('Kesehatan')).toBeInTheDocument()
  })

  // ── Expand/collapse detail row ──
  it('expands detail row on "Detail" button click', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByText('Detail')
    fireEvent.click(detailButtons[0])

    // Detail fields should now be visible
    await waitFor(() => {
      expect(screen.getByText('Nama PIC')).toBeInTheDocument()
      expect(screen.getByText('Budi')).toBeInTheDocument()
      expect(screen.getByText('budi@test.com')).toBeInTheDocument()
    })
  })

  it('collapses detail row on "Tutup" button click', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByText('Detail')
    fireEvent.click(detailButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Tutup')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Tutup'))

    await waitFor(() => {
      expect(screen.queryByText('Tutup')).not.toBeInTheDocument()
    })
  })

  it('toggles expand when clicking the table row directly', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    // Click the row cell
    fireEvent.click(screen.getByText('Dinas Kesehatan'))

    await waitFor(() => {
      expect(screen.getByText('Budi')).toBeInTheDocument()
    })

    // Click again to collapse
    fireEvent.click(screen.getByText('Dinas Kesehatan'))

    await waitFor(() => {
      expect(screen.queryByText('Nama PIC')).not.toBeInTheDocument()
    })
  })

  // ── Network error ──
  it('handles fetch error gracefully (shows empty state)', async () => {
    mockFetchError()
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada data B2G/i)).toBeInTheDocument()
    })
  })

  // ── Pagination ──
  it('renders pagination controls when data exceeds page size', async () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      ...mockB2GRows[0],
      _id: `row-${i}`,
      kode: `B2G-${String(i).padStart(6, '0')}-001`,
      satuanKerja: `Satuan ${i}`,
    }))
    mockFetchSuccess(manyRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Halaman/i)).toBeInTheDocument()
    })
  })

  it('navigates to next page via page number button', async () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      ...mockB2GRows[0],
      _id: `row-${i}`,
      kode: `B2G-${String(i).padStart(6, '0')}-001`,
      satuanKerja: `Satuan ${i}`,
    }))
    mockFetchSuccess(manyRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Satuan 0')).toBeInTheDocument()
    })

    // Find page 2 button — it's in the pagination area with specific min-w class
    const allButtons = screen.getAllByRole('button')
    const page2Btn = allButtons.find(btn => btn.textContent === '2' && btn.className.includes('min-w'))
    expect(page2Btn).toBeTruthy()
    fireEvent.click(page2Btn!)

    await waitFor(() => {
      expect(screen.getByText('Satuan 25')).toBeInTheDocument()
    })
  })

  it('resets page to 1 when search query changes', async () => {
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      ...mockB2GRows[0],
      _id: `row-${i}`,
      kode: `B2G-${String(i).padStart(6, '0')}-001`,
      satuanKerja: `Satuan ${i}`,
    }))
    mockFetchSuccess(manyRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByText('Satuan 0')).toBeInTheDocument()
    })

    // Go to page 2 via page number button
    const allButtons = screen.getAllByRole('button')
    const page2Btn = allButtons.find(btn => btn.textContent === '2' && btn.className.includes('min-w'))
    fireEvent.click(page2Btn!)

    await waitFor(() => {
      expect(screen.getByText('Satuan 25')).toBeInTheDocument()
    })

    // Type in search — should reset to page 1
    const searchInput = screen.getByPlaceholderText(/Cari institusi/i)
    await userEvent.type(searchInput, 'Satuan 1')

    // After search, should show filtered results from beginning
    await waitFor(() => {
      const halamanText = screen.getByText(/Halaman/i).textContent
      expect(halamanText).toContain('1')
    })
  })

  // ── Fetch URL params ──
  it('sends correct query params with filters', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('mode=b2g')
  })

  // ── B2B detail fields ──
  it('shows B2B-specific detail fields when expanded in B2B mode', async () => {
    mockFetchForMode('b2b', mockB2BRows)
    render(<DatabaseTrackingPage />)

    // Switch to B2B
    fireEvent.click(screen.getByText('Data B2B'))

    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })

    // Expand detail
    fireEvent.click(screen.getByText('Detail'))

    await waitFor(() => {
      expect(screen.getByText('Bidang Usaha')).toBeInTheDocument()
      expect(screen.getByText('Produk Relevan')).toBeInTheDocument()
      expect(screen.getByText('Brand Owner')).toBeInTheDocument()
      expect(screen.getByText('Link Produk')).toBeInTheDocument()
    })
  })

  // ── KLPD filter only in B2G ──
  it('shows KLPD filter in B2G mode', async () => {
    mockFetchSuccess(mockB2GRows)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('select-Semua KLPD')).toBeInTheDocument()
    })
  })

  it('hides KLPD filter in B2B mode', async () => {
    mockFetchForMode('b2b', mockB2BRows)
    render(<DatabaseTrackingPage />)

    fireEvent.click(screen.getByText('Data B2B'))

    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('select-Semua KLPD')).not.toBeInTheDocument()
  })

  // ── Placeholder text changes per mode ──
  it('shows B2G-specific search placeholder', async () => {
    mockFetchSuccess([])
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Cari institusi/i)).toBeInTheDocument()
    })
  })

  it('shows B2B-specific search placeholder after switching', async () => {
    mockFetchForMode('b2g', [])
    render(<DatabaseTrackingPage />)

    fireEvent.click(screen.getByText('Data B2B'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Cari entitas/i)).toBeInTheDocument()
    })
  })

  // ── Displays '-' for missing values ──
  it('renders dash for empty field values', async () => {
    const sparseRow = [{
      _id: '99',
      kode: 'B2G-010125-099',
      satuanKerja: '',
      institusiKerja: '',
      klpd: '',
      kota: '',
      ring: '',
    }]
    mockFetchSuccess(sparseRow)
    render(<DatabaseTrackingPage />)

    await waitFor(() => {
      const dashes = screen.getAllByText('-')
      expect(dashes.length).toBeGreaterThanOrEqual(4)
    })
  })
})
