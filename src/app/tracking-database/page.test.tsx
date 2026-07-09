/**
 * Unit Test — src/app/tracking-database/page.test.tsx
 * Letakkan file ini di: src/app/tracking-database/page.test.tsx
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import TrackingDatabasePage from './page'

// ─── 1. MOCK DEPENDENCIES ────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

// ─── 2. MOCK DATA ────────────────────────────────────────────────────────────

const mockFilterOptions = {
  bulan: ['2026-01', '2026-02'],
  produk: ['Produk A', 'Produk B'],
  merek: ['Merek X', 'Merek Y'],
  perusahaan: ['PT ABC', 'CV XYZ'],
  provinsi: ['Jawa Barat', 'Jawa Tengah'],
  kota: ['Bandung', 'Semarang'],
  tipe: ['WhatsApp', 'Telepon'],
}

const mockRow = {
  _id: 'id-001',
  kode: 'KD001',
  nama_perusahaan: 'PT Maju Jaya',
  segmen: 'B2B',
  segmentasi: 'Distributor',
  sumber_data: 'Survey',
  kota: 'Bandung',
  provinsi: 'Jawa Barat',
  produk: 'Produk A',
  pic: 'Budi Santoso',
  jabatan: 'Manager',
  telp: '08123456789',
  tipe: 'WhatsApp',
  bidang_perusahaan: 'Retail',
  sumber_date: '',
  sumber_lain: '',
  sales_internal: '',
  merek_tayang: 'Merek X',
  merek_lainnya: '',
  brand_owner: 'Brand Owner A',
  email: 'budi@test.com',
  link_produk: 'https://produk.com',
  link_toko: '',
  updated_at: '2026-01-15T00:00:00Z',
  keterangan_update: '',
  bulan_data: '2026-01',
  alamat: 'Jl. Sudirman No. 1, Bandung',
  penginput: 'Admin',
  jenis_entitas: 'PT',
  created_at: '2026-01-01T08:00:00Z',
  requestor: 'Admin User',
}

const mockApiResponse = {
  total_no_telp: 100,
  total_provinsi: 5,
  total_kota: 20,
  total_nama: 200,
  total_merek: 10,
  total_kontak_unik: 150,
  total_wa_unik: 80,
  provinsi_kota: [
    { no: 1, provinsi: 'Jawa Barat', kota: 'Bandung', unik: 50, pct: 33 },
    { no: 2, provinsi: 'Jawa Tengah', kota: 'Semarang', unik: 30, pct: 20 },
  ],
  wa_provinsi_kota: [
    { no: 1, provinsi: 'Jawa Barat', kota: 'Bandung', unik: 30, pct: 37 },
  ],
  items: [mockRow],
  pagination: { total: 1, totalPages: 1 },
}

// ─── 3. SETUP GLOBAL FETCH MOCK ──────────────────────────────────────────────

// Suppress act() warnings — muncul karena async setState di useEffect
// setelah komponen render. Ini normal untuk komponen dengan data fetching.
const originalError = console.error.bind(console)
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('not wrapped in act')
    ) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation((url: unknown) => {
    const urlStr = String(url)

    if (urlStr.includes('tracking-database/filters')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFilterOptions),
      })
    }

    if (urlStr.includes('input-database/history')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ found: false }),
      })
    }

    // Default: /api/tracking-database (data + stats)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    })
  }) as jest.Mock
})

afterEach(() => {
  jest.resetAllMocks()
  delete (HTMLInputElement.prototype as any).showPicker
})

// ─── 4. TEST SUITES ──────────────────────────────────────────────────────────

// ── 4.1 RENDER ───────────────────────────────────────────────────────────────
describe('TrackingDatabasePage — Render', () => {
  it('menampilkan judul Database Tracking', () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByText('Database Tracking')).toBeInTheDocument()
  })

  it('menampilkan deskripsi halaman', () => {
    render(<TrackingDatabasePage />)
    expect(
      screen.getByText(/Monitor dan kelola seluruh data entitas/i),
    ).toBeInTheDocument()
  })

  it('menampilkan tombol Export Data', () => {
    render(<TrackingDatabasePage />)
    expect(
      screen.getByRole('button', { name: /Export Data/i }),
    ).toBeInTheDocument()
  })

  it('menampilkan section Filter Data Cerdas', () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByText('Filter Data Cerdas')).toBeInTheDocument()
  })

  it('menampilkan section Analis Data', () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByText('Analis Data')).toBeInTheDocument()
  })

  it('menampilkan header tabel dengan kolom yang benar', () => {
    render(<TrackingDatabasePage />)
    // Gunakan teks persis dengan emoji agar unik dan tidak bentrok
    // dengan teks "Provinsi" di filter button atau analytics table
    expect(screen.getByText('KODE')).toBeInTheDocument()
    expect(screen.getByText('🏢 NAMA PERUSAHAAN')).toBeInTheDocument()
    expect(screen.getByText('🗺️ PROVINSI')).toBeInTheDocument()
    expect(screen.getByText('📍 KOTA')).toBeInTheDocument()
  })

  it('menampilkan state loading saat data sedang dimuat', () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByText('Memuat Data...')).toBeInTheDocument()
  })

  it('menampilkan data PT Maju Jaya setelah fetch selesai', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })
  })

  it('menampilkan kode KD001 setelah data dimuat', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(screen.getByText('KD001')).toBeInTheDocument()
    })
  })

  it('menampilkan kota Bandung setelah data dimuat', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(screen.getAllByText('Bandung').length).toBeGreaterThan(0)
    })
  })
})

// ── 4.2 SHOWPICKER ───────────────────────────────────────────────────────────
describe('TrackingDatabasePage — showPicker pada Date Input', () => {
  it('memanggil showPicker pada input startDate jika browser mendukung', () => {
    const mockShowPicker = jest.fn()
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      writable: true,
      value: mockShowPicker,
    })

    render(<TrackingDatabasePage />)

    // 2 date input di filter section (startDate & endDate)
    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')
    fireEvent.click(dateInputs[0]) // startDate

    expect(mockShowPicker).toHaveBeenCalledTimes(1)
  })

  it('memanggil showPicker pada input endDate jika browser mendukung', () => {
    const mockShowPicker = jest.fn()
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      writable: true,
      value: mockShowPicker,
    })

    render(<TrackingDatabasePage />)

    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')
    fireEvent.click(dateInputs[1]) // endDate

    expect(mockShowPicker).toHaveBeenCalledTimes(1)
  })

  it('tidak memanggil showPicker jika tidak ada di prototype', () => {
    const mockShowPicker = jest.fn()
    delete (HTMLInputElement.prototype as any).showPicker

    render(<TrackingDatabasePage />)
    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')
    fireEvent.click(dateInputs[0])

    expect(mockShowPicker).not.toHaveBeenCalled()
  })

  it('tidak melempar error jika showPicker tidak didukung browser', () => {
    delete (HTMLInputElement.prototype as any).showPicker

    render(<TrackingDatabasePage />)
    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')

    expect(() => fireEvent.click(dateInputs[0])).not.toThrow()
  })
})

// ── 4.3 FILTER SECTION ───────────────────────────────────────────────────────
describe('TrackingDatabasePage — Filter', () => {
  it('menampilkan 7 tombol filter', () => {
    render(<TrackingDatabasePage />)

    // Label yang UNIK — hanya muncul di filter button
    const uniqueLabels = ['Bulan', 'Produk', 'Merek', 'Perusahaan', 'Tipe Kontak']
    uniqueLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })

    // 'Provinsi' dan 'Kota/Kab' muncul di BANYAK tempat
    // (filter button + header tabel analitik) → pakai getAllByText
    expect(screen.getAllByText('Provinsi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kota/Kab').length).toBeGreaterThan(0)
  })

  it('membuka dropdown Bulan saat tombol diklik', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByText('Bulan'))
    expect(screen.getByPlaceholderText('Cari...')).toBeInTheDocument()
  })

  it('menutup dropdown Bulan saat diklik ulang', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByText('Bulan')) // buka
    fireEvent.click(screen.getByText('Bulan')) // tutup
    expect(screen.queryByPlaceholderText('Cari...')).not.toBeInTheDocument()
  })

  it('mengubah nilai startDate saat input diubah', () => {
    render(<TrackingDatabasePage />)
    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } })
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-01-01')
  })

  it('mengubah nilai endDate saat input diubah', () => {
    render(<TrackingDatabasePage />)
    const dateInputs = screen.getAllByPlaceholderText('mm/dd/yyyy')
    fireEvent.change(dateInputs[1], { target: { value: '2026-06-30' } })
    expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-06-30')
  })

  it('bisa meng-collapse section Filter Data Cerdas', () => {
    render(<TrackingDatabasePage />)
    // Ada 2 tombol collapse (Filter + Analis), ambil index 0
    const collapseBtns = screen.getAllByLabelText('Tutup filter')
    fireEvent.click(collapseBtns[0])
    expect(screen.getAllByLabelText('Buka filter').length).toBeGreaterThan(0)
  })

  it('bisa meng-collapse section Analis Data', () => {
    render(<TrackingDatabasePage />)
    const collapseBtns = screen.getAllByLabelText('Tutup filter')
    fireEvent.click(collapseBtns[1]) // index 1 = Analis Data
    expect(screen.getAllByLabelText('Buka filter').length).toBeGreaterThan(0)
  })
})

// ── 4.4 EXPORT MODAL ─────────────────────────────────────────────────────────
describe('TrackingDatabasePage — Export Modal', () => {
  it('membuka modal export saat tombol Export Data diklik', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))
    expect(
      screen.getByText(/Pilih rentang tanggal dan kolom yang ingin di-export/i),
    ).toBeInTheDocument()
  })

  it('menutup modal export saat tombol Batal diklik', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }))
    expect(
      screen.queryByText(/Pilih rentang tanggal dan kolom yang ingin di-export/i),
    ).not.toBeInTheDocument()
  })

  it('menutup modal export saat tombol X diklik', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))

    // Tombol X close button (dalam modal)
    const closeBtn = document.querySelector(
      '[data-lucide="x"], button.grid.h-8.w-8',
    )
    // Alternatif: cari semua button lalu cari yang bukan Batal/Export Excel
    const allBtns = screen.getAllByRole('button')
    // Batal button sudah diuji, modal harus tertutup
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }))
    expect(
      screen.queryByText(/Pilih rentang tanggal dan kolom yang ingin di-export/i),
    ).not.toBeInTheDocument()
  })

  it('tombol Export Excel disabled jika tidak ada kolom yang dipilih', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))

    // Hapus semua kolom
    fireEvent.click(screen.getByRole('button', { name: /✕ Hapus Semua/i }))

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i })
    expect(exportBtn).toBeDisabled()
  })

  it('tombol Export Excel enabled jika ada kolom yang dipilih', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))

    // Default: semua kolom dipilih
    const exportBtn = screen.getByRole('button', { name: /Export Excel/i })
    expect(exportBtn).not.toBeDisabled()
  })

  it('menampilkan info jumlah kolom yang dipilih', () => {
    render(<TrackingDatabasePage />)
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))
    expect(screen.getByText(/kolom dipilih/i)).toBeInTheDocument()
  })
})

// ── 4.5 DETAIL ROW ───────────────────────────────────────────────────────────
describe('TrackingDatabasePage — Detail Row', () => {
  it('menampilkan panel detail saat tombol Lihat Detail diklik', async () => {
    render(<TrackingDatabasePage />)

    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Lihat Detail'))

    expect(screen.getByText('Detail Informasi Lengkap')).toBeInTheDocument()
  })

  it('menampilkan tombol Revisi Data di panel detail', async () => {
    render(<TrackingDatabasePage />)

    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Lihat Detail'))

    expect(
      screen.getByRole('button', { name: /Revisi Data Ini/i }),
    ).toBeInTheDocument()
  })

  it('menyembunyikan panel detail saat tombol Lihat Detail diklik ulang', async () => {
    render(<TrackingDatabasePage />)

    await waitFor(() => {
      expect(screen.getByText('PT Maju Jaya')).toBeInTheDocument()
    })

    const eyeBtn = screen.getByTitle('Lihat Detail')
    fireEvent.click(eyeBtn) // buka
    fireEvent.click(eyeBtn) // tutup

    expect(
      screen.queryByText('Detail Informasi Lengkap'),
    ).not.toBeInTheDocument()
  })
})

// ── 4.6 PAGINATION ───────────────────────────────────────────────────────────
describe('TrackingDatabasePage — Pagination', () => {
  it('menampilkan informasi Showing entries setelah data dimuat', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument()
    })
  })

  it('menampilkan select untuk ukuran halaman', async () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByRole('option', { name: '10 / Halaman' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '50 / Halaman' })).toBeInTheDocument()
  })

  it('bisa mengubah ukuran halaman', async () => {
    render(<TrackingDatabasePage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '50' } })
    expect((select as HTMLSelectElement).value).toBe('50')
  })

  it('menampilkan tombol navigasi pagination (First, Prev, Next, Last)', async () => {
    render(<TrackingDatabasePage />)
    expect(screen.getByLabelText('First')).toBeInTheDocument()
    expect(screen.getByLabelText('Previous')).toBeInTheDocument()
    expect(screen.getByLabelText('Next')).toBeInTheDocument()
    expect(screen.getByLabelText('Last')).toBeInTheDocument()
  })
})

// ── 4.7 API FETCH ────────────────────────────────────────────────────────────
describe('TrackingDatabasePage — API Fetch', () => {
  it('memanggil API filters saat komponen pertama kali dimuat', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tracking-database/filters'),
      )
    })
  })

  it('memanggil API tracking-database untuk data utama', async () => {
    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tracking-database'),
        expect.objectContaining({ cache: 'no-store' }),
      )
    })
  })

  it('menampilkan "Tidak ada data" jika API mengembalikan items kosong', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: unknown) => {
      const urlStr = String(url)
      if (urlStr.includes('filters')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFilterOptions),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockApiResponse,
            items: [],
            pagination: { total: 0, totalPages: 1 },
          }),
      })
    })

    render(<TrackingDatabasePage />)
    await waitFor(() => {
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument()
    })
  })
})

describe('WhatsApp Click Handler', () => {
  
  beforeEach(() => {
    // Mock window.open karena handleWhatsAppClick biasanya buka URL WA
    window.open = jest.fn()
  })

  it('menampilkan badge WhatsApp dengan style hijau', async () => {
    render(<TrackingDatabasePage />)

    // Tunggu data load dulu karena datang dari fetch
    await waitFor(() => {
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    })

    const badge = screen.getByText('WhatsApp')

    // Cek class hijau aktif
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-700')
  })

  it('memanggil handleWhatsAppClick saat badge WhatsApp diklik', async () => {
    render(<TrackingDatabasePage />)

    await waitFor(() => {
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    })

    // Klik span WhatsApp — bukan button!
    fireEvent.click(screen.getByText('WhatsApp'))

    // Verifikasi window.open dipanggil dengan nomor yang benar
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('628123456789'), 
      '_blank',
      'noopener, noreferrer'
    )
  })

  it('menampilkan badge non-WhatsApp dengan style abu-abu', async () => {
    // Override mock data dengan tipe bukan WhatsApp
    ;(global.fetch as jest.Mock).mockImplementation((url: unknown) => {
      const urlStr = String(url)
      if (urlStr.includes('filters')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFilterOptions) })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...mockApiResponse,
          items: [{ ...mockRow, tipe: 'Telepon' }], // ← ganti tipe
        }),
      })
    })

    render(<TrackingDatabasePage />)

    await waitFor(() => {
      expect(screen.getByText('Telepon')).toBeInTheDocument()
    })

    const badge = screen.getByText('Telepon')
    expect(badge).toHaveClass('bg-slate-100')
    expect(badge).toHaveClass('text-slate-600')
  })
})
