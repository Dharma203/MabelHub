/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import clientPromise from '@/lib/mongodb'

const mockVisitCount = { value: 3 }

jest.mock('@/lib/auth-server', () => ({
  assertLoggedIn: () => ({
    ok: true,
    session: { userId: 'user-1', fullName: 'Admin', username: 'admin' },
  }),
}))

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({
    db: jest.fn().mockReturnValue({
      collection: jest.fn((name: string) =>
        name === 'sales-report-system'
          ? { findOne: jest.fn().mockImplementation(() => mockPlan) }
          : name === 'VisitActivity'
            ? {
                aggregate: jest.fn(() => ({
                  toArray: jest.fn().mockImplementation(() =>
                    Promise.resolve(
                      mockVisitCount.value
                        ? [{ _id: 'Sales A', count: mockVisitCount.value }]
                        : [],
                    ),
                  ),
                })),
              }
            : { findOne: jest.fn().mockResolvedValue(null), insertOne: jest.fn().mockResolvedValue({ insertedId: 'realization-1' }) },
      ),
    }),
  }),
}))

const mockPlan = {
  code_submit: 'ARI-BL-X-NOV-2026',
  leaderName: 'Arie Muhamad Fajar',
  period: 'Bulanan',
  periodOf: 'X',
  month: 'November',
  year: '2026',
  visit_target: '10',
  demo_target: '2',
  sph_target: '3',
  sph_deal_target: '1',
  revenue: '1000000',
  sales_targets: [{ nama_sales: 'Sales A' }],
  sales_visit: [{
    nama_sales: 'Sales A',
    segmentasi: 'B2B',
    tipe_visit: 'Akuisisi',
    nama_perusahaan: 'Company A',
  }],
}

describe('GET /api/realisasi-plan', () => {
  beforeEach(() => {
    mockVisitCount.value = 3
  })

  it('counts VisitActivity by sales for the plan month and year', async () => {
    const response = await GET(new Request(
      `http://localhost/api/realisasi-plan?code=${mockPlan.code_submit}`,
    ))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      month: 'November',
      year: '2026',
      counts: { 'Sales A': 3 },
      sources: { 'Sales A': 'VisitActivity' },
    })
    const collection = (await clientPromise).db().collection
    expect(collection).toHaveBeenCalledWith('VisitActivity')
  })

  it('uses the plan visit count when the month has no VisitActivity records', async () => {
    mockVisitCount.value = 0
    const response = await GET(new Request(
      `http://localhost/api/realisasi-plan?code=${mockPlan.code_submit}`,
    ))

    expect(await response.json()).toMatchObject({
      counts: { 'Sales A': 1 },
      sources: { 'Sales A': 'Plan Visit' },
    })
  })
})

describe('POST /api/realisasi-plan', () => {
  it('stores realization values against the selected plan', async () => {
    const response = await POST(new Request('http://localhost/api/realisasi-plan', {
      method: 'POST',
      body: JSON.stringify({
        code_submit: mockPlan.code_submit,
        team_note: '',
        sales: [{ nama_sales: 'Sales A', visit: 4, demo: 1, sph: 1, closing: 0, revenue: 500, note: '' }],
        visits: [{ ...mockPlan.sales_visit[0], status: 'Terlaksana', note: '' }],
      }),
    }))

    expect(response.status).toBe(201)
    expect((await response.json()).success).toBe(true)
    expect((await clientPromise).db().collection).toHaveBeenCalledWith('sales-report-realizations')
  })

  it('rejects visit rows that do not match the selected plan', async () => {
    const response = await POST(new Request('http://localhost/api/realisasi-plan', {
      method: 'POST',
      body: JSON.stringify({
        code_submit: mockPlan.code_submit,
        team_note: '',
        sales: [{ nama_sales: 'Sales A', visit: 4, demo: 1, sph: 1, closing: 0, revenue: 500, note: '' }],
        visits: [{ ...mockPlan.sales_visit[0], nama_perusahaan: 'Other', status: 'Terlaksana', note: '' }],
      }),
    }))

    expect(response.status).toBe(400)
  })
})
