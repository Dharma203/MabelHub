import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ListPlanPage from '../list-plan/page'
import RealisasiPlanPage from '../realisasi-plan/page'
import TrackingPage from '../tracking/page'
import SalesReportPage from './page'
import PlanSalesPage from './plan-sales/page'
import PlanTimPage from './plan-tim/page'
import PlanVisitPage from './plan-visit/page'
import ReviewSubmitPage from './review-submit/page'
import { planTimSalesNames } from '@/utils/planTimSales'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockBack = jest.fn()
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  back: mockBack,
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/components/ui/SearchableSelect', () => {
  return function MockSearchableSelect({
    options = [],
    value = '',
    onChange,
    placeholder,
    inputId,
    isDisabled,
  }: {
    options?: { value: string; label: string }[]
    value?: string | null
    onChange?: (value: string) => void
    placeholder?: string
    inputId?: string
    isDisabled?: boolean
  }) {
    return React.createElement(
      'select',
      {
        id: inputId,
        'aria-label': inputId || placeholder || 'Pilihan',
        'data-testid': 'searchable-select',
        value: value ?? '',
        disabled: isDisabled,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
          onChange?.(event.target.value),
      },
      [
        React.createElement(
          'option',
          { key: 'placeholder', value: '' },
          placeholder || '-- Pilih --',
        ),
        ...options.map((option: { value: string; label: string }, index: number) =>
          React.createElement(
            'option',
            { key: `${option.value}-${index}`, value: option.value },
            option.label,
          ),
        ),
      ],
    )
  }
})

jest.mock('@/components/ui/CardPlan', () => () => null)

const mockFetch = jest.fn()
const response = (data: unknown, ok = true) => ({
  ok,
  json: async () => data,
})

const plan = {
  code_submit: 'AMF-BL-X-JAN-2026',
  leaderName: 'Arie Muhamad Fajar',
  note: 'Catatan awal',
  period: 'Bulanan',
  periodOf: 'X',
  month: 'January',
  year: '2026',
  total_active_sales: '1',
  visit_target: '2',
  demo_target: '3',
  sph_target: '4',
  sph_deal_target: '5',
  revenue: '6000',
  sales_targets: [
    {
      nama_sales: 'Budi',
      visit_target: '2',
      demo_target: '3',
      sph_target: '4',
      sph_deal_target: '5',
      revenue: '6000',
      note: 'Target note',
    },
  ],
  sales_visit: [
    {
      nama_sales: 'Budi',
      segmentasi: 'B2B',
      tipe_visit: 'Visit',
      nama_perusahaan: 'PT Contoh',
      note: 'Visit note',
    },
  ],
}

beforeEach(() => {
  sessionStorage.clear()
  mockPush.mockReset()
  mockReplace.mockReset()
  mockBack.mockReset()
  mockFetch.mockReset().mockResolvedValue(response({ plans: [] }))
  global.fetch = mockFetch as unknown as typeof fetch
  jest.spyOn(window, 'alert').mockImplementation(() => undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Lihat & Revisi Plan', () => {
  it('menampilkan form pencarian dan memberi pesan saat plan tidak ditemukan', async () => {
    render(<ListPlanPage />)

    expect(
      screen.getByRole('heading', { name: 'Lihat & Revisi Plan' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Data plan tidak ditemukan',
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/list-plan?'),
    )
  })

  it('mencari plan, membuka detail, merevisi target dan visit, lalu menyimpan', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return Promise.resolve(response({ success: true }))
      if (url.includes('code=')) return Promise.resolve(response({ plan }))
      return Promise.resolve(
        response({
          plans: [
            {
              code_submit: plan.code_submit,
              leaderName: plan.leaderName,
              period: plan.period,
              month: plan.month,
              year: plan.year,
              revised: false,
            },
          ],
        }),
      )
    })
    render(<ListPlanPage />)

    fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
      target: { value: 'Bulanan' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    expect(await screen.findByText(/AMF-BL-X-JAN-2026/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Pilih kode submit' }), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    expect(await screen.findByRole('heading', { name: plan.code_submit })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revisi Plan' }))

    fireEvent.change(screen.getByLabelText('visit_target Budi'), {
      target: { value: '9' },
    })
    expect(screen.getByText('9')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('note visit 1'), {
      target: { value: 'Visit yang diperbarui' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Visit' }))
    expect(screen.getByLabelText('nama_sales visit 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hapus rencana visit 2' }))
    fireEvent.change(screen.getByLabelText('Kode Submit'), {
      target: { value: 'KODE-REVISI' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Revisi' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      '/api/list-plan',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"new_code_submit":"KODE-REVISI"'),
      }),
    ))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'KODE-REVISI' })).toBeInTheDocument())
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/list-plan',
      expect.objectContaining({
        body: expect.stringContaining('"visit_target":"9"'),
      }),
    )
  })

  it('membatalkan revisi dan memberi error jika popup ekspor diblokir', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        response(url.includes('code=')
          ? { plan }
          : { plans: [{ ...plan, revised: false }] }),
      ),
    )
    jest.spyOn(window, 'open').mockReturnValue(null)
    render(<ListPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Pilih kode submit' }), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    await screen.findByRole('heading', { name: plan.code_submit })

    fireEvent.click(screen.getByRole('button', { name: 'Revisi Plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(screen.getByText('Target Per Sales')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Izinkan pop-up untuk mengekspor plan ke PDF.',
    )
  })

  it('mengekspor laporan HTML yang meng-escape data dan membuka dialog print', async () => {
    const unsafePlan = {
      ...plan,
      sales_targets: [{ ...plan.sales_targets[0], nama_sales: '<script>alert(1)</script>' }],
    }
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes('code=')
        ? response({ plan: unsafePlan })
        : response({ plans: [{ ...plan, revised: false }] })),
    )
    const printWindow = {
      document: { write: jest.fn(), close: jest.fn() },
      focus: jest.fn(),
      print: jest.fn(),
    } as unknown as Window
    jest.spyOn(window, 'open').mockReturnValue(printWindow)
    render(<ListPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Pilih kode submit' }), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    await screen.findByRole('heading', { name: plan.code_submit })
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    const html = (printWindow.document.write as jest.Mock).mock.calls[0][0] as string
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(printWindow.document.close).toHaveBeenCalled()
    expect(printWindow.focus).toHaveBeenCalled()
  })

  it('menampilkan error API saat pencarian, membuka, dan menyimpan revisi gagal', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return Promise.resolve(response({ error: 'Revisi ditolak' }, false))
      if (url.includes('code=')) return Promise.resolve(response({ error: 'Plan gagal dibuka' }, false))
      return Promise.resolve(response({ error: 'Pencarian gagal' }, false))
    })
    render(<ListPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Pencarian gagal')

    cleanup()
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes('code=') ? response({ error: 'Plan gagal dibuka' }, false) : response({ plans: [{ ...plan, revised: false }] })),
    )
    render(<ListPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByRole('combobox', { name: 'Pilih kode submit' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Pilih kode submit' }), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Plan gagal dibuka')

    cleanup()
    mockFetch.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PUT'
          ? response({ error: 'Revisi ditolak' }, false)
          : url.includes('code=')
            ? response({ plan })
            : response({ plans: [{ ...plan, revised: false }] }),
      ),
    )
    render(<ListPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByRole('combobox', { name: 'Pilih kode submit' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Pilih kode submit' }), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    await screen.findByRole('heading', { name: plan.code_submit })
    fireEvent.click(screen.getByRole('button', { name: 'Revisi Plan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Revisi' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Revisi ditolak')
  })
})

describe('Input Realisasi', () => {
  it('menampilkan pilihan periode dan menangani pencarian plan kosong', async () => {
    render(<RealisasiPlanPage />)

    expect(
      screen.getByRole('heading', { name: 'Input Realisasi' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('plan-period'), {
      target: { value: 'Bulanan' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cari Kode' })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Data plan tidak ditemukan',
    )
  })

  it('menampilkan error ketika plan gagal dimuat', async () => {
    render(<RealisasiPlanPage />)

    mockFetch.mockResolvedValue(response({ plans: [{ ...plan }] }))
    fireEvent.change(screen.getByLabelText('plan-period'), {
      target: { value: 'Bulanan' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cari Kode' })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByLabelText('plan-code')
    fireEvent.change(screen.getByLabelText('plan-code'), {
      target: { value: plan.code_submit },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Buka Plan' })).toBeEnabled(),
    )
    mockFetch.mockResolvedValue(response({ error: 'Tidak dapat memuat plan' }, false))
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tidak dapat memuat plan')
  })

  it('menampilkan error jika API realisasi gagal dimuat', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/api/realisasi-plan?')
          ? response({ error: 'Realisasi gagal dimuat' }, false)
          : url.includes('code=')
            ? response({ plan })
            : response({ plans: [{ ...plan }] }),
      ),
    )
    render(<RealisasiPlanPage />)
    fireEvent.change(screen.getByLabelText('plan-period'), {
      target: { value: 'Bulanan' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByLabelText('plan-code')
    fireEvent.change(screen.getByLabelText('plan-code'), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Realisasi gagal dimuat')
  })

  it('mengisi realisasi, menolak angka/status invalid, lalu menyimpan seluruh langkah', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(response({ success: true }))
      if (url.includes('/api/realisasi-plan?')) {
        return Promise.resolve(response({ counts: { Budi: 1 }, sources: { Budi: 'VisitActivity' } }))
      }
      if (url.includes('code=')) return Promise.resolve(response({ plan }))
      return Promise.resolve(response({ plans: [{ ...plan }] }))
    })
    render(<RealisasiPlanPage />)
    fireEvent.change(screen.getByLabelText('plan-period'), {
      target: { value: 'Bulanan' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByLabelText('plan-code')
    fireEvent.change(screen.getByLabelText('plan-code'), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    await screen.findByText('Informasi Realisasi Tim')
    fireEvent.change(document.getElementById('team-note')!, {
      target: { value: 'Catatan realisasi tim' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Per Sales/ }))
    expect(await screen.findByRole('heading', { name: 'Realisasi Per Sales' })).toBeInTheDocument()
    expect(screen.getByLabelText('visit Budi')).toHaveValue(1)
    fireEvent.click(screen.getByRole('button', { name: 'Kembali' }))
    expect(await screen.findByRole('heading', { name: 'Informasi Realisasi Tim' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Per Sales/ }))
    fireEvent.change(screen.getByLabelText('demo Budi'), {
      target: { value: '-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Visit/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Isi seluruh realisasi dengan angka nol atau lebih.',
    )
    fireEvent.change(screen.getByLabelText('demo Budi'), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText('sph Budi'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('closing Budi'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('revenue Budi'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Catatan Budi'), {
      target: { value: 'Catatan sales' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Visit/ }))
    expect(await screen.findByRole('heading', { name: 'Realisasi Visit' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Review & Simpan/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pilih status untuk setiap rencana visit.',
    )
    fireEvent.change(screen.getByLabelText('Status visit PT Contoh'), {
      target: { value: 'Terlaksana' },
    })
    fireEvent.change(screen.getByLabelText('Catatan visit PT Contoh'), {
      target: { value: 'Sukses' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Review & Simpan/ }))
    expect(await screen.findByRole('heading', { name: 'Review & Simpan Realisasi' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Realisasi' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Realisasi berhasil disimpan.',
    )
    const post = mockFetch.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(post![1].body as string)).toEqual({
      code_submit: plan.code_submit,
      team_note: 'Catatan realisasi tim',
      sales: [
        {
          nama_sales: 'Budi',
          visit: 1,
          visitSource: 'VisitActivity',
          demo: 2,
          sph: 3,
          closing: 4,
          revenue: 500,
          note: 'Catatan sales',
        },
      ],
      visits: [{ ...plan.sales_visit[0], status: 'Terlaksana', note: 'Sukses' }],
    })
    expect(screen.getByRole('button', { name: 'Tersimpan' })).toBeDisabled()
  })

  it('menyampaikan error saat API gagal menyimpan realisasi', async () => {
    mockFetch.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? response({ error: 'Penyimpanan ditolak' }, false)
          : url.includes('/api/realisasi-plan?')
            ? response({ counts: {}, sources: {} })
            : url.includes('code=')
              ? response({ plan: { ...plan, sales_visit: [] } })
              : response({ plans: [{ ...plan, sales_visit: [] }] }),
      ),
    )
    render(<RealisasiPlanPage />)
    fireEvent.change(screen.getByLabelText('plan-period'), {
      target: { value: 'Bulanan' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cari Kode' }))
    await screen.findByLabelText('plan-code')
    fireEvent.change(screen.getByLabelText('plan-code'), {
      target: { value: plan.code_submit },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buka Plan' }))
    await screen.findByRole('heading', { name: 'Informasi Realisasi Tim' })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Per Sales/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Realisasi Visit/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lanjut: Review & Simpan/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Realisasi' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Penyimpanan ditolak')
    expect(screen.getByRole('button', { name: 'Simpan Realisasi' })).toBeEnabled()
  })
})

describe('Tracking & Analitik', () => {
  it('memuat ringkasan tracking dari API plan', async () => {
    render(<TrackingPage />)

    expect(
      screen.getByRole('heading', { name: 'Tracking & Analitik' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Data realisasi')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/list-plan\?year=/),
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(screen.getByText('Total Kode Submit')).toBeInTheDocument()
  })

  it('menghitung ringkasan/detail, menerapkan filter dan mereset filter', async () => {
    const trackedPlan = {
      ...plan,
      realization: null,
    }
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/api/realisasi-plan')
        ? response({ realization: { sales: [{ nama_sales: 'Budi', visit: 1, demo: 2, closing: 1, revenue: 3000 }] } })
        : response({ plans: [trackedPlan] })),
    )
    render(<TrackingPage />)

    expect(await screen.findByText('AMF-BL-X-JAN-2026')).toBeInTheDocument()
    expect(screen.getByText('Budi')).toBeInTheDocument()
    expect(screen.getByText('Ada Realisasi')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nama Leader'), {
      target: { value: plan.leaderName },
    })
    fireEvent.change(screen.getByLabelText('Periode'), {
      target: { value: 'Semua' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('leaderName=Arie'),
      expect.anything(),
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining(`year=${new Date().getFullYear()}&period=Bulanan`),
      expect.anything(),
    ))
  })

  it('menampilkan error API dari daftar plan dan data realisasi', async () => {
    mockFetch.mockResolvedValue(response({ error: 'Plan API error' }, false))
    render(<TrackingPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Plan API error')

    cleanup()
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(url.includes('/api/realisasi-plan')
        ? response({ error: 'Realisasi API error' }, false)
        : response({ plans: [{ ...plan }] })),
    )
    render(<TrackingPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Realisasi API error')
  })
})

describe('Sales Report System', () => {
  it('menampilkan halaman pemilihan form sales report', () => {
    render(<SalesReportPage />)

    expect(
      screen.getByRole('heading', { name: 'Sales Report Page' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Silahkan Pilih Page')).toBeInTheDocument()
  })
})

describe('Plan Sales', () => {
  it('menampilkan form dan memvalidasi leader yang wajib diisi', () => {
    render(<PlanSalesPage />)

    expect(
      screen.getByRole('heading', { name: 'Plan Tim' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Informasi PIC & Tambahan')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])

    expect(window.alert).toHaveBeenCalledWith(
      'Field "Leader Name" wajib diisi.',
    )
  })

  it.each([
    ['Nama Leader', 'Field "Leader Name" wajib diisi.'],
    ['Target Visit', 'Field "Visit Target" wajib diisi.'],
    ['Target Demo / Presentasi', 'Field "Demo Target" wajib diisi.'],
    ['Target SPH', 'Field "SPH Target" wajib diisi.'],
    ['Target Revenue Total', 'Field "Revenue" wajib diisi.'],
  ])('memvalidasi field wajib: %s', (missing, expected) => {
    render(<PlanSalesPage />)
    const numberInputs = screen.getAllByPlaceholderText('Contoh 120')
    const textInputs = screen.getAllByPlaceholderText('Nama Leader')
    const fields = new Map<string, HTMLElement>([
      ['Target Visit', numberInputs[0]],
      ['Target Demo / Presentasi', numberInputs[1]],
      ['Target SPH', numberInputs[2]],
      ['Target Revenue Total', numberInputs[4]],
      ['Nama Leader', textInputs[0]],
    ])
    for (const [label, input] of fields) {
      if (label !== missing) fireEvent.change(input, { target: { value: '1' } })
    }
    fireEvent.click(screen.getAllByRole('button').at(-1)!)
    expect(window.alert).toHaveBeenCalledWith(expected)
  })
})

describe('Plan Tim', () => {
  it('menampilkan target tim dan memvalidasi periode wajib', () => {
    render(<PlanTimPage />)

    expect(
      screen.getByRole('heading', { name: 'Form Submit Plan Sales' }),
    ).toBeInTheDocument()
    expect(screen.getByText('TOTAL TIM')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah Sales' })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])

    expect(window.alert).toHaveBeenCalledWith(
      'Periode, Periode Ke, Bulan, dan Tahun wajib dipilih.',
    )
  })

  it('menghitung total, menyimpan draft lengkap, dan berpindah ke Plan Visit', () => {
    render(<PlanTimPage />)
    fireEvent.change(screen.getByLabelText('Target Visit Arie Muhamad Fajar'), {
      target: { value: '100' },
    })
    expect(screen.getByText('TOTAL TIM').parentElement).toHaveTextContent('1220')
    fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
      target: { value: 'Bulanan' },
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[2], {
      target: { value: 'January' },
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[3], {
      target: { value: '2026' },
    })
    fireEvent.change(screen.getByPlaceholderText('Tulis catatan (opsional)'), {
      target: { value: 'Catatan tim' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const draft = JSON.parse(sessionStorage.getItem('sales-report-plan-tim-draft')!)
    expect(draft).toMatchObject({
      leaderName: 'Arie Muhamad Fajar',
      note: 'Catatan tim',
      period: 'Bulanan',
      periodOf: 'X',
      month: 'January',
      year: '2026',
      total_active_sales: '9',
      visit_target: '1220',
    })
    expect(mockPush).toHaveBeenCalledWith('/sales-report-system/plan-visit')
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('Data Plan Tim disimpan sementara'),
    )
  })

  it('menambah/menghapus baris sales dan menangani error sessionStorage', () => {
    render(<PlanTimPage />)
    expect(screen.getByRole('button', { name: 'Tambah Sales' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris sales 9' }))
    expect(screen.getAllByRole('button', { name: /Hapus baris sales/ })).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Sales' }))
    expect(screen.getAllByRole('button', { name: /Hapus baris sales/ })).toHaveLength(9)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris sales 9' }))
    expect(screen.getAllByRole('button', { name: /Hapus baris sales/ })).toHaveLength(8)

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[0], {
      target: { value: 'Bulanan' },
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[2], {
      target: { value: 'January' },
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[3], {
      target: { value: '2026' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(window.alert).toHaveBeenCalledWith(
      'Gagal menyimpan data Plan Tim sementara di browser.',
    )
  })

  it('menampilkan pilihan periode yang sesuai dan menolak menyimpan tanpa sales', () => {
    render(<PlanTimPage />)
    const [period, periodOf, month] = screen.getAllByTestId('searchable-select')
    fireEvent.change(period, { target: { value: 'Mingguan' } })
    expect(periodOf).not.toBeDisabled()
    expect(
      Array.from(periodOf.querySelectorAll('option')).map((option) => option.value),
    ).toContain('5')

    fireEvent.change(period, { target: { value: 'Triwulan' } })
    expect(month).toBeDisabled()
    while (screen.queryByRole('button', { name: 'Hapus baris sales 1' })) {
      fireEvent.click(screen.getByRole('button', { name: 'Hapus baris sales 1' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(window.alert).toHaveBeenCalledWith(
      'Pilih nama sales untuk setiap baris atau hapus baris kosong.',
    )
  })
})

describe('Plan Visit', () => {
  it('memuat nama sales dari draft Plan Tim dan memvalidasi data visit', async () => {
    const salesName = planTimSalesNames[0]
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify({ sales_targets: [{ nama_sales: salesName }] }),
    )
    render(<PlanVisitPage />)

    expect(
      await screen.findByLabelText(`Nama perusahaan ${salesName}`),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan data visit' }))

    expect(window.alert).toHaveBeenCalledWith(
      'Baris 1: Field "Segmentasi" wajib diisi.',
    )
  })

  it('mengalihkan jika draft kosong, rusak, atau tidak mempunyai sales valid', async () => {
    const cases: Array<[string | null, string]> = [
      [null, 'Isi Plan Tim terlebih dahulu.'],
      ['{bad json', 'Data target sales tidak valid. Silakan isi ulang Plan Tim.'],
      [JSON.stringify({ sales_targets: [{ nama_sales: 'Tidak dikenal' }] }), 'Data target sales tidak valid. Silakan isi ulang Plan Tim.'],
    ]
    for (const [raw, alert] of cases) {
      sessionStorage.clear()
      mockReplace.mockClear()
      if (raw !== null) sessionStorage.setItem('sales-report-plan-tim-draft', raw)
      const { unmount } = render(<PlanVisitPage />)
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sales-report-system/plan-tim'))
      expect(window.alert).toHaveBeenCalledWith(alert)
      if (raw !== null) expect(sessionStorage.getItem('sales-report-plan-tim-draft')).toBeNull()
      unmount()
    }
  })

  it('mengubah data, menghapus baris, menyimpan data valid dan menangani storage failure', async () => {
    const salesName = planTimSalesNames[0]
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify({ sales_targets: [{ nama_sales: salesName }] }),
    )
    render(<PlanVisitPage />)
    await screen.findByLabelText(`Nama perusahaan ${salesName}`)
    const selects = screen.getAllByTestId('searchable-select')
    fireEvent.change(selects[1], { target: { value: 'B2B' } })
    fireEvent.change(selects[2], { target: { value: 'Visit' } })
    fireEvent.change(screen.getByLabelText(`Nama perusahaan ${salesName}`), {
      target: { value: 'PT Visit' },
    })
    fireEvent.change(screen.getByLabelText(`Catatan ${salesName}`), {
      target: { value: 'Catatan visit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan data visit' }))
    expect(mockPush).toHaveBeenCalledWith('/sales-report-system/review-submit')
    expect(JSON.parse(sessionStorage.getItem('sales-report-plan-visit-draft')!)).toEqual([
      {
        nama_sales: salesName,
        segmentasi: 'B2B',
        tipe_visit: 'Visit',
        nama_perusahaan: 'PT Visit',
        note: 'Catatan visit',
      },
    ])

  })

  it('menolak menyimpan setelah semua rencana visit dihapus', async () => {
    const salesName = planTimSalesNames[0]
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify({ sales_targets: [{ nama_sales: salesName }] }),
    )
    render(<PlanVisitPage />)
    await screen.findByLabelText(`Nama perusahaan ${salesName}`)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris sales 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan data visit' }))
    expect(window.alert).toHaveBeenCalledWith('Tambahkan minimal satu rencana visit.')
  })

  it('menangani error penyimpanan draft visit', async () => {
    const salesName = planTimSalesNames[0]
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify({ sales_targets: [{ nama_sales: salesName }] }),
    )
    render(<PlanVisitPage />)
    await screen.findByLabelText(`Nama perusahaan ${salesName}`)
    fireEvent.change(screen.getAllByTestId('searchable-select')[1], {
      target: { value: 'B2B' },
    })
    fireEvent.change(screen.getAllByTestId('searchable-select')[2], {
      target: { value: 'Visit' },
    })
    fireEvent.change(screen.getByLabelText(`Nama perusahaan ${salesName}`), {
      target: { value: 'PT Visit' },
    })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan data visit' }))
    expect(window.alert).toHaveBeenCalledWith('Gagal menyimpan data sementara. Silakan coba lagi.')
  })
})

describe('Review & Submit', () => {
  it('menampilkan draft dan mengirimnya sebelum menghapus data sementara', async () => {
    const draft = {
      code_submit: 'AMF-BL-X-2026',
      leaderName: 'Arie Muhamad Fajar',
      note: '',
      period: 'Bulanan',
      periodOf: '1',
      month: 'January',
      year: '2026',
      total_active_sales: '1',
      visit_target: '2',
      demo_target: '3',
      sph_target: '4',
      sph_deal_target: '5',
      revenue: '6000',
      sales_targets: [
        {
          nama_sales: 'Sales A',
          visit_target: '2',
          demo_target: '3',
          sph_target: '4',
          sph_deal_target: '5',
          revenue: '6000',
          note: '',
        },
      ],
    }
    const visits = [
      {
        nama_sales: 'Sales A',
        segmentasi: 'B2B',
        tipe_visit: 'Visit',
        nama_perusahaan: 'PT Contoh',
        note: '',
      },
    ]
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify(draft),
    )
    sessionStorage.setItem(
      'sales-report-plan-visit-draft',
      JSON.stringify(visits),
    )
    mockFetch.mockResolvedValue(response({}))
    render(<ReviewSubmitPage />)

    expect(await screen.findByText(draft.code_submit)).toBeInTheDocument()
    expect(screen.getByText('PT Contoh')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Data' }))

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/sales-report-system'),
    )
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/plan-tim',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ header: draft, sales_visit: visits }),
      }),
    )
    expect(sessionStorage.getItem('sales-report-plan-tim-draft')).toBeNull()
    expect(sessionStorage.getItem('sales-report-plan-visit-draft')).toBeNull()
  })

  it('mengalihkan saat draft tidak ada atau JSON tidak valid', async () => {
    const { unmount } = render(<ReviewSubmitPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sales-report-system/plan-tim'))
    expect(window.alert).toHaveBeenCalledWith(
      'Belum ada data untuk direview. Isi Plan Tim terlebih dahulu.',
    )
    unmount()

    mockReplace.mockClear()
    sessionStorage.setItem('sales-report-plan-tim-draft', '{broken')
    render(<ReviewSubmitPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sales-report-system/plan-tim'))
    expect(sessionStorage.getItem('sales-report-plan-tim-draft')).toBeNull()
    expect(window.alert).toHaveBeenCalledWith(
      'Data Plan Tim tidak valid. Silakan isi kembali.',
    )
  })

  it('menyediakan rencana visit kosong dan kembali ke halaman sebelumnya', async () => {
    sessionStorage.setItem(
      'sales-report-plan-tim-draft',
      JSON.stringify({ ...plan, sales_visit: undefined }),
    )
    sessionStorage.setItem('sales-report-plan-visit-draft', '{broken')
    render(<ReviewSubmitPage />)

    expect(await screen.findByText('Tidak ada rencana visit ditambahkan')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '← Kembali' }))
    expect(mockBack).toHaveBeenCalled()
  })

  it('mempertahankan draft saat submit gagal dan menampilkan pesan API', async () => {
    const draft = {
      ...plan,
      sales_visit: undefined,
    }
    sessionStorage.setItem('sales-report-plan-tim-draft', JSON.stringify(draft))
    mockFetch.mockResolvedValue(response({ error: 'Submit ditolak' }, false))
    render(<ReviewSubmitPage />)
    await screen.findByText(draft.code_submit)
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Data' }))

    expect(await screen.findByRole('button', { name: 'Kirim Data' })).toBeInTheDocument()
    expect(window.alert).toHaveBeenCalledWith('Submit ditolak')
    expect(sessionStorage.getItem('sales-report-plan-tim-draft')).toBe(JSON.stringify(draft))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
