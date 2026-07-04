import { render, screen, fireEvent, act, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import PlanActivityPage from './page'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * CATATAN PENTING UNTUK MAINTAINER
 * ─────────────────────────────────────────────────────────────────────────
 * Karena hampir seluruh helper function di page.tsx (monthIndex,
 * parseVisitDateToTs, parseVisitDateToDate, parseCreatedAtToTs, dateToKey,
 * isSameDay, isToday, formatMonthYear, formatFullDate, getMonthGridDays,
 * getWeekDays, getViewDateRange, getStatusColor, dst) TIDAK di-export dari
 * module, function-function tersebut tidak bisa di-unit-test secara
 * terisolasi. File ini menguji function-function tersebut secara TIDAK
 * LANGSUNG lewat perilaku komponen yang dirender (behavioral testing):
 *
 *  - monthIndex, parseVisitDateToTs/Date, parseCreatedAtToTs
 *      -> diverifikasi lewat penempatan chip plan pada sel tanggal yang
 *         benar di Month/Week/Day view, serta urutan sort plans
 *  - dateToKey, isSameDay, isToday
 *      -> diverifikasi lewat badge "Hari Ini" & state kosong pada tanggal
 *         yang tidak memiliki plan
 *  - formatMonthYear, formatFullDate
 *      -> diverifikasi lewat teks header pada Month/Week/Day view
 *  - getMonthGridDays, getWeekDays, getViewDateRange
 *      -> diverifikasi lewat jumlah/isi grid serta parameter start & end
 *         yang dikirim ke /api/visits
 *  - getStatusColor
 *      -> diverifikasi lewat className badge status (bg-emerald-100,
 *         bg-blue-100, bg-amber-100, bg-purple-100)
 *
 * Tanggal sistem DIKUNCI ke Senin, 15 Juni 2026 (lihat FIXED_NOW) supaya
 * seluruh assertion yang bergantung pada "hari ini" bersifat deterministik.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─── 1. MOCK DEPENDENCIES ───────────────────────────────────────────────────

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockPrefetch = jest.fn()

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        prefetch: mockPrefetch,
    }),
}))

const mockUseSession = jest.fn()
jest.mock('@/components/session/SessionProvider', () => ({
    useSession: () => mockUseSession(),
}))

jest.mock('@/components/modals/EditVisitModal', () => {
    return function MockEditVisitModal(props: any) {
        if (!props.isOpen) return null
        return (
            <div data-testid="edit-visit-modal">
                <span data-testid="edit-visit-id">{props.editId}</span>
                <span data-testid="edit-visit-user-id">{props.currentUserId}</span>
                <span data-testid="edit-visit-user-role">{props.currentUserRole}</span>
                <button onClick={props.onClose}>close-modal</button>
                <button onClick={props.onSuccess}>success-modal</button>
            </div>
        )
    }
})

// ─── 2. MOCK DATA ────────────────────────────────────────────────────────────

type MockVisitRow = {
    _id: string
    visit_date?: string
    created_at?: string
    city?: string
    klpd?: string
    nama_sales?: string
    institusi_kerja?: string
    satuan_kerja?: string
    status_visit?: string
    visit_image?: string
    reschedule_date?: string
}

// 4 plan pada tanggal yang sama (15 Juni 2026 = "hari ini") untuk menguji
// overflow "+N lainnya" (maxVisible = 3) dan urutan sort yang stabil.
const mockVisits: MockVisitRow[] = [
    {
        _id: 'v1',
        visit_date: '15-Jun-2026',
        created_at: '2026-06-10 08:00:00',
        city: 'Jakarta',
        klpd: 'Kementerian A',
        nama_sales: 'Budi Santoso',
        institusi_kerja: 'Dinas Pendidikan',
        satuan_kerja: 'Bagian Umum',
        status_visit: 'Visited',
        visit_image: 'data:image/png;base64,ABC123',
        reschedule_date: '',
    },
    {
        _id: 'v2',
        visit_date: '15-Jun-2026',
        created_at: '2026-06-11 09:00:00',
        city: 'Bandung',
        klpd: 'Kementerian B',
        nama_sales: 'Siti Aminah',
        institusi_kerja: 'Dinas Kesehatan',
        satuan_kerja: '',
        status_visit: 'Planned',
        visit_image: '',
        reschedule_date: '',
    },
    {
        _id: 'v3',
        visit_date: '15-Jun-2026',
        created_at: '2026-06-12 09:00:00',
        city: 'Surabaya',
        klpd: 'Kementerian C',
        nama_sales: 'Andi Wijaya',
        institusi_kerja: 'Dinas Sosial',
        satuan_kerja: '',
        status_visit: 'Reschedule',
        visit_image: '',
        reschedule_date: '20-Jun-2026',
    },
    {
        _id: 'v4',
        visit_date: '15-Jun-2026',
        created_at: '2026-06-13 09:00:00',
        city: 'Medan',
        klpd: 'Kementerian D',
        nama_sales: 'Rina Melati',
        institusi_kerja: 'Dinas Perhubungan',
        satuan_kerja: '',
        status_visit: 'Stay Office',
        visit_image: '',
        reschedule_date: '',
    },
    // Plan pada tanggal berbeda (10 Juni 2026) untuk menguji penempatan
    // sel grid yang tepat sesuai parsing visit_date.
    {
        _id: 'v5',
        visit_date: '10-Jun-2026',
        created_at: '2026-06-05 09:00:00',
        city: 'Yogyakarta',
        klpd: '',
        nama_sales: 'Dedi Kurniawan',
        institusi_kerja: 'Dinas Pariwisata',
        satuan_kerja: '',
        status_visit: '',
        visit_image: '',
        reschedule_date: '',
    },
]

const mockVisitHistory = {
    items: mockVisits,
    pagination: { total: mockVisits.length, totalPages: 1 },
}

const mockParametersResponse = {
    data: {
        posisi: ['Sales'],
        status_kunjungan: ['Visited', 'Planned', 'Reschedule'],
        kegiatan: ['Kunjungan'],
    },
}

// ─── 3. FETCH MOCK HELPERS ──────────────────────────────────────────────────

function createFetchMock(overrides?: { visits?: any; parameters?: any }) {
    return jest.fn().mockImplementation((url: unknown) => {
        const urlStr = String(url)

        if (urlStr.includes('/api/visits')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(overrides?.visits ?? mockVisitHistory),
            })
        }

        if (urlStr.includes('/api/parameters')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(overrides?.parameters ?? mockParametersResponse),
            })
        }

        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
        })
    })
}

// fetch /api/visits yang bisa dikontrol kapan resolve-nya, untuk menguji
// state loading secara deterministik.
function createDeferredFetchMock() {
    let resolveVisits: (value?: unknown) => void = () => {}
    const visitsPromise = new Promise((resolve) => {
        resolveVisits = resolve
    })

    const fetchMock = jest.fn().mockImplementation((url: unknown) => {
        const urlStr = String(url)

        if (urlStr.includes('/api/visits')) {
            return visitsPromise.then(() => ({
                ok: true,
                json: () => Promise.resolve(mockVisitHistory),
            }))
        }

        if (urlStr.includes('/api/parameters')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockParametersResponse),
            })
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    return { fetchMock, resolveVisits }
}

// Membantu men-flush microtask (resolusi fetch + state update) tanpa
// bergantung pada waitFor, karena waitFor tidak kompatibel secara langsung
// dengan fake timers yang dipakai untuk mengunci tanggal sistem.
async function flushPromises(times = 5) {
    for (let i = 0; i < times; i++) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
            await Promise.resolve()
        })
    }
}

// ─── 4. SUPPRESS "not wrapped in act" NOISE ─────────────────────────────────

const originalConsoleError = console.error.bind(console)
beforeAll(() => {
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return
        originalConsoleError(...args)
    }
})
afterAll(() => {
    console.error = originalConsoleError
})

// ─── 5. GLOBAL SETUP ─────────────────────────────────────────────────────────

// Senin, 15 Juni 2026, 10:00 — dikonstruksi lewat komponen Date lokal (bukan
// string ISO UTC) supaya getFullYear()/getMonth()/getDate() konsisten
// terlepas dari timezone mesin yang menjalankan test.
const FIXED_NOW = new Date(2026, 5, 15, 10, 0, 0)

const validUser = { userId: 'user123', role: 'ADMIN' }

beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)

    mockUseSession.mockReturnValue({ user: validUser, loading: false })
    global.fetch = createFetchMock()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.open = jest.fn().mockReturnValue({ document: { write: jest.fn() } }) as any
})

afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
})

// ─── 6. TEST SUITES ──────────────────────────────────────────────────────────

// ── 6.1 RENDER DASAR ─────────────────────────────────────────────────────────
describe('PlanActivityPage — Render dasar', () => {
    it('menampilkan judul dan deskripsi halaman', () => {
        render(<PlanActivityPage />)
        expect(screen.getByText('PLAN ACTIVITY')).toBeInTheDocument()
        expect(
            screen.getByText('Monitoring dan Pengelolaan Rencana Kunjungan Lapangan'),
        ).toBeInTheDocument()
    })

    it('menampilkan input pencarian', () => {
        render(<PlanActivityPage />)
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('menampilkan tombol ADD PLANS', () => {
        render(<PlanActivityPage />)
        expect(screen.getByText('ADD PLANS')).toBeInTheDocument()
    })

    it('menampilkan seluruh tab kalender', () => {
        render(<PlanActivityPage />)
        expect(screen.getByText('Day')).toBeInTheDocument()
        expect(screen.getByText('Week')).toBeInTheDocument()
        expect(screen.getByText('Month')).toBeInTheDocument()
        expect(screen.getByText('Reschedule')).toBeInTheDocument()
    })

    it('menampilkan legend status kunjungan', () => {
        render(<PlanActivityPage />)
        expect(screen.getAllByText('Visited').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Planned').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Reschedule').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Stay Office').length).toBeGreaterThan(0)
    })

    it('default view adalah Month, ditandai header hari Sen s.d. Min', () => {
        render(<PlanActivityPage />)
        expect(screen.getByText('Sen')).toBeInTheDocument()
        expect(screen.getByText('Sel')).toBeInTheDocument()
        expect(screen.getByText('Rab')).toBeInTheDocument()
        expect(screen.getByText('Kam')).toBeInTheDocument()
        expect(screen.getByText('Jum')).toBeInTheDocument()
        expect(screen.getByText('Sab')).toBeInTheDocument()
        expect(screen.getByText('Min')).toBeInTheDocument()
    })
})

// ── 6.2 SESSION & ROLE GUARD ─────────────────────────────────────────────────
describe('PlanActivityPage — Session & role guard', () => {
    it('tidak melakukan redirect ketika role user valid (SALES/LEADER/ADMIN/SUPERADMIN)', async () => {
        mockUseSession.mockReturnValue({ user: { userId: 'u1', role: 'SALES' }, loading: false })
        render(<PlanActivityPage />)
        await flushPromises()
        expect(mockReplace).not.toHaveBeenCalled()
    })

    it('melakukan redirect ke "/" ketika role user tidak valid', async () => {
        mockUseSession.mockReturnValue({ user: { userId: 'u1', role: 'GUEST' }, loading: false })
        render(<PlanActivityPage />)
        await flushPromises()
        expect(mockReplace).toHaveBeenCalledWith('/')
    })

    it('tidak memanggil /api/visits ketika session masih loading', async () => {
        mockUseSession.mockReturnValue({ user: null, loading: true })
        render(<PlanActivityPage />)
        await flushPromises()

        const visitsCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        )
        expect(visitsCalls.length).toBe(0)
    })

    it('tetap memanggil /api/parameters walau session masih loading', async () => {
        mockUseSession.mockReturnValue({ user: null, loading: true })
        render(<PlanActivityPage />)
        await flushPromises()

        const paramCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/parameters'),
        )
        expect(paramCalls.length).toBeGreaterThan(0)
    })
})

// ── 6.3 FETCH PLANS & LOADING INDICATOR ──────────────────────────────────────
describe('PlanActivityPage — Fetch plans & loading indicator', () => {
    it('memanggil /api/visits dengan limit, page, start, dan end saat mount (Month view)', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        const visitsCall = (global.fetch as jest.Mock).mock.calls.find(([url]) =>
            String(url).includes('/api/visits'),
        )
        expect(visitsCall).toBeDefined()

        const calledUrl = String(visitsCall![0])
        expect(calledUrl).toContain('limit=100000')
        expect(calledUrl).toContain('page=1')
        expect(calledUrl).toMatch(/start=\d{4}-\d{2}-\d{2}/)
        expect(calledUrl).toMatch(/end=\d{4}-\d{2}-\d{2}/)
    })

    it('menampilkan indikator loading saat data sedang dimuat, lalu menghilang setelah selesai', async () => {
        const { fetchMock, resolveVisits } = createDeferredFetchMock()
        global.fetch = fetchMock

        render(<PlanActivityPage />)
        await flushPromises(2)

        expect(screen.getByText('Memuat data...')).toBeInTheDocument()

        await act(async () => {
            resolveVisits()
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument()
    })

    it('tidak menampilkan data plan ketika response /api/visits tidak ok', async () => {
        global.fetch = jest.fn().mockImplementation((url: unknown) => {
            const urlStr = String(url)
            if (urlStr.includes('/api/visits')) {
                return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockParametersResponse) })
        })

        render(<PlanActivityPage />)
        await flushPromises()

        expect(screen.queryByText('Dinas Pendidikan')).not.toBeInTheDocument()
    })
})

// ── 6.4 NAVIGASI KALENDER ────────────────────────────────────────────────────
describe('PlanActivityPage — Navigasi kalender', () => {
    it('menampilkan header bulan & tahun saat ini pada Month view', async () => {
        render(<PlanActivityPage />)
        await flushPromises()
        expect(screen.getByText('Juni 2026')).toBeInTheDocument()
    })

    it('tombol Next memajukan bulan, tombol Prev memundurkan bulan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        const leftNavContainer = screen.getByRole('button', { name: 'Hari Ini' }).closest('div')!
        const [, , prevBtn, nextBtn] = within(leftNavContainer).getAllByRole('button')

        fireEvent.click(nextBtn)
        await flushPromises()
        expect(screen.getByText('Juli 2026')).toBeInTheDocument()

        fireEvent.click(prevBtn)
        await flushPromises()
        fireEvent.click(prevBtn)
        await flushPromises()
        expect(screen.getByText('Mei 2026')).toBeInTheDocument()
    })

    it('tombol Hari Ini mengembalikan kalender ke bulan berjalan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        const hariIniBtn = screen.getByRole('button', { name: 'Hari Ini' })
        const leftNavContainer = hariIniBtn.closest('div')!
        const [, , , nextBtn] = within(leftNavContainer).getAllByRole('button')

        fireEvent.click(nextBtn)
        await flushPromises()
        expect(screen.getByText('Juli 2026')).toBeInTheDocument()

        fireEvent.click(hariIniBtn)
        await flushPromises()
        expect(screen.getByText('Juni 2026')).toBeInTheDocument()
    })

    it('berpindah ke Week view menampilkan rentang tanggal seminggu yang benar', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Week'))
        await flushPromises()

        expect(screen.getByText('15 - 21 Juni 2026')).toBeInTheDocument()
    })

    it('berpindah ke Day view menampilkan tanggal lengkap & badge Hari Ini', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Day'))
        await flushPromises()

        expect(screen.getByText('Senin, 15 Juni 2026')).toBeInTheDocument()
        // "Hari Ini" muncul minimal 2x: tombol toolbar + badge tanggal aktif
        expect(screen.getAllByText('Hari Ini').length).toBeGreaterThanOrEqual(2)
    })

    it('berpindah ke Reschedule view menampilkan catatan filter khusus', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Reschedule'))
        await flushPromises()

        expect(
            screen.getByText('⚡ Menampilkan hanya plan berstatus Reschedule'),
        ).toBeInTheDocument()
    })

    it('tab yang aktif mendapat styling berbeda dari tab lain', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        const monthTab = screen.getByText('Month')
        const dayTab = screen.getByText('Day')

        expect(monthTab.className).toContain('bg-white')
        expect(dayTab.className).not.toContain('bg-white')

        fireEvent.click(dayTab)
        await flushPromises()

        expect(screen.getByText('Day').className).toContain('bg-white')
        expect(screen.getByText('Month').className).not.toContain('bg-white')
    })
})

// ── 6.5 MONTH VIEW — GRID & CHIP ─────────────────────────────────────────────
describe('PlanActivityPage — Month view (grid & chip)', () => {
    it('menampilkan chip plan pada tanggal yang sesuai, maksimal 3 + indikator overflow', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument()
        expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
        expect(screen.getByText('Dinas Sosial')).toBeInTheDocument()
        expect(screen.queryByText('Dinas Perhubungan')).not.toBeInTheDocument()
        expect(screen.getByText('+1 lainnya')).toBeInTheDocument()
    })

    it('menampilkan plan pada sel tanggal 10 Juni sesuai parsing visit_date', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        expect(screen.getByText('Dinas Pariwisata')).toBeInTheDocument()
    })

    it('menampilkan badge jumlah plan pada sel tanggal yang memiliki 4 plan', async () => {
        const { container } = render(<PlanActivityPage />)
        await flushPromises()

        const badge = Array.from(container.querySelectorAll('span')).find(
            (el) =>
                el.textContent === '4' &&
                el.className.includes('bg-gray-100') &&
                el.className.includes('rounded-full'),
        )
        expect(badge).toBeTruthy()
    })
})

// ── 6.6 WEEK VIEW ─────────────────────────────────────────────────────────────
describe('PlanActivityPage — Week view', () => {
    it('menampilkan plan yang berada dalam rentang minggu berjalan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Week'))
        await flushPromises()

        expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument()
        expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
    })

    it('tidak menampilkan plan yang berada di luar rentang minggu berjalan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Week'))
        await flushPromises()

        // v5 (10 Juni) berada di luar minggu 15-21 Juni
        expect(screen.queryByText('Dinas Pariwisata')).not.toBeInTheDocument()
    })
})

// ── 6.7 DAY VIEW ──────────────────────────────────────────────────────────────
describe('PlanActivityPage — Day view', () => {
    it('menampilkan seluruh plan hari ini tanpa batas maxVisible', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Day'))
        await flushPromises()

        expect(screen.getByText('4 aktivitas hari ini')).toBeInTheDocument()
        expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument()
        expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument()
        expect(screen.getByText('Dinas Sosial')).toBeInTheDocument()
        expect(screen.getByText('Dinas Perhubungan')).toBeInTheDocument()
    })

    it('menampilkan state kosong saat tidak ada plan pada tanggal terpilih', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Day'))
        await flushPromises()

        const leftNavContainer = screen.getByRole('button', { name: 'Hari Ini' }).closest('div')!
        const [, , , nextBtn] = within(leftNavContainer).getAllByRole('button')

        // maju satu hari ke 16 Juni, tidak ada plan mock pada tanggal ini
        fireEvent.click(nextBtn)
        await flushPromises()

        expect(screen.getByText('Tidak ada aktivitas')).toBeInTheDocument()
        expect(screen.getByText('Belum ada plan untuk tanggal ini')).toBeInTheDocument()
    })
})

// ── 6.8 RESCHEDULE VIEW — FILTER STATUS ──────────────────────────────────────
describe('PlanActivityPage — Reschedule view (filter status)', () => {
    it('hanya menampilkan plan berstatus Reschedule', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Reschedule'))
        await flushPromises()

        expect(screen.getByText('Dinas Sosial')).toBeInTheDocument() // status Reschedule
        expect(screen.queryByText('Dinas Pendidikan')).not.toBeInTheDocument() // Visited
        expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument() // Planned
        expect(screen.queryByText('Dinas Perhubungan')).not.toBeInTheDocument() // Stay Office
    })
})

// ── 6.9 WARNA BADGE STATUS ────────────────────────────────────────────────────
describe('PlanActivityPage — Warna badge status', () => {
    it('menerapkan kelas warna berbeda sesuai status pada Day view', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Day'))
        await flushPromises()

        function findBadge(label: string, bgClass: string) {
            return screen.getAllByText(label).find((el) => el.className.includes(bgClass))
        }

        expect(findBadge('Visited', 'bg-emerald-100')).toBeTruthy()
        expect(findBadge('Planned', 'bg-blue-100')).toBeTruthy()
        expect(findBadge('Reschedule', 'bg-amber-100')).toBeTruthy()
        expect(findBadge('Stay Office', 'bg-purple-100')).toBeTruthy()
    })
})

// ── 6.10 POPUP DAFTAR PLAN & DETAIL ──────────────────────────────────────────
describe('PlanActivityPage — Popup daftar plan & detail', () => {
    it('klik tanggal membuka popup daftar plan pada tanggal tersebut', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        expect(screen.getByText('Senin, 15 Juni 2026')).toBeInTheDocument()
        expect(screen.getByText('4 Aktivitas')).toBeInTheDocument()
        expect(screen.getByText('Dinas Perhubungan')).toBeInTheDocument() // popup tidak batasi maxVisible
    })

    it('klik tanggal yang sama sekali lagi menutup popup', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()
        expect(screen.getByText('4 Aktivitas')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()
        expect(screen.queryByText('4 Aktivitas')).not.toBeInTheDocument()
    })

    it('klik ikon Eye pada item popup membuka detail plan dengan data yang benar', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        const detailButtons = screen.getAllByTitle('Lihat Detail')
        fireEvent.click(detailButtons[0])
        await flushPromises()

        expect(screen.getByText('Detail Aktivitas')).toBeInTheDocument()
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument() // nama_sales
        expect(screen.getByText('Jakarta')).toBeInTheDocument() // kota
        expect(screen.getByText('Kementerian A')).toBeInTheDocument() // klpd
        expect(screen.getByText('Bagian Umum')).toBeInTheDocument() // satuan_kerja
    })

    it('klik ikon Pen pada item popup membuka modal edit dengan id yang benar', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        const editButtons = screen.getAllByTitle('Edit Kunjungan')
        fireEvent.click(editButtons[0])
        await flushPromises()

        expect(screen.getByTestId('edit-visit-modal')).toBeInTheDocument()
        expect(screen.getByTestId('edit-visit-id')).toHaveTextContent('v1')
        expect(screen.getByTestId('edit-visit-user-id')).toHaveTextContent('user123')
        expect(screen.getByTestId('edit-visit-user-role')).toHaveTextContent('ADMIN')
    })

    it('sukses edit pada modal memicu refetch data plans dan menutup modal', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        const editButtons = screen.getAllByTitle('Edit Kunjungan')
        fireEvent.click(editButtons[0])
        await flushPromises()

        const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length

        fireEvent.click(screen.getByText('success-modal'))
        await flushPromises()

        const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length

        expect(callsAfter).toBeGreaterThan(callsBefore)
        expect(screen.queryByTestId('edit-visit-modal')).not.toBeInTheDocument()
    })

    it('menutup modal edit tanpa refetch saat tombol close ditekan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        const editButtons = screen.getAllByTitle('Edit Kunjungan')
        fireEvent.click(editButtons[0])
        await flushPromises()

        const callsBefore = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length

        fireEvent.click(screen.getByText('close-modal'))
        await flushPromises()

        const callsAfter = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length

        expect(callsAfter).toBe(callsBefore)
        expect(screen.queryByTestId('edit-visit-modal')).not.toBeInTheDocument()
    })
})

// ── 6.11 PENCARIAN DENGAN DEBOUNCE ───────────────────────────────────────────
describe('PlanActivityPage — Pencarian dengan debounce', () => {
    it('tidak langsung fetch ulang saat mengetik, baru fetch setelah 350ms', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        const callsBeforeTyping = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length

        const searchInput = screen.getByPlaceholderText('Search...')
        fireEvent.change(searchInput, { target: { value: 'Jakarta' } })

        // sebelum 350ms, belum ada fetch tambahan
        await act(async () => {
            jest.advanceTimersByTime(200)
            await Promise.resolve()
        })
        const callsDuringDebounce = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        ).length
        expect(callsDuringDebounce).toBe(callsBeforeTyping)

        // setelah melewati 350ms total, fetch dengan query q= terpanggil
        await act(async () => {
            jest.advanceTimersByTime(200)
            await Promise.resolve()
            await Promise.resolve()
        })

        const visitsCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
            String(url).includes('/api/visits'),
        )
        const lastCallUrl = String(visitsCalls[visitsCalls.length - 1][0])
        expect(lastCallUrl).toContain('q=Jakarta')
    })
})

// ── 6.12 AKSI LAINNYA ─────────────────────────────────────────────────────────
describe('PlanActivityPage — Aksi lainnya', () => {
    it('tombol ADD PLANS mengarahkan ke halaman tambah plan', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('ADD PLANS'))
        expect(mockPush).toHaveBeenCalledWith('/plan-activity/add')
    })

    it('klik thumbnail bukti kunjungan membuka jendela baru berisi gambar', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        fireEvent.click(screen.getByText('Dinas Pendidikan'))
        await flushPromises()

        const detailButtons = screen.getAllByTitle('Lihat Detail')
        fireEvent.click(detailButtons[0])
        await flushPromises()

        const thumbnail = screen.getByTitle('Lihat foto bukti')
        fireEvent.click(thumbnail)

        expect(window.open).toHaveBeenCalledWith('')
    })

    it('tidak menampilkan thumbnail bukti kunjungan saat visit_image kosong', async () => {
        render(<PlanActivityPage />)
        await flushPromises()

        // v2 (Dinas Kesehatan) tidak memiliki visit_image
        fireEvent.click(screen.getByText('Dinas Kesehatan'))
        await flushPromises()

        const detailButtons = screen.getAllByTitle('Lihat Detail')
        fireEvent.click(detailButtons[1]) // index 1 = v2 pada urutan popup
        await flushPromises()

        expect(screen.getByText('Detail Aktivitas')).toBeInTheDocument()
        expect(screen.queryByTitle('Lihat foto bukti')).not.toBeInTheDocument()
    })
})