/**
 * @jest-environment node
 */
import { GET, PUT } from './route'
import clientPromise from '@/lib/mongodb'

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        find: jest.fn(),
        updateOne: jest.fn(),
      }),
    }),
  }),
}))

describe('PUT /api/list-plan', () => {
  const existing = {
    _id: 'plan-id',
    code_submit: 'ARI-BL-X-OCT-2026',
    period: 'Bulanan',
    periodOf: 'X',
    month: 'October',
    year: '2026',
    leaderName: 'Arie Muhamad Fajar',
    total_active_sales: '2',
    sales_targets: [{}, {}],
  }
  let updateOne: jest.Mock

  beforeEach(async () => {
    jest.clearAllMocks()
    const client = await clientPromise
    const collection = client.db().collection()
    const cursor = {
      sort: jest.fn(),
      limit: jest.fn(),
      next: jest.fn(),
      toArray: jest.fn().mockResolvedValue([]),
    }
    cursor.sort.mockReturnValue(cursor)
    cursor.limit.mockReturnValue(cursor)
    collection.find.mockImplementation(({ code_submit }) => {
      cursor.next.mockResolvedValue(
        code_submit === existing.code_submit ? existing : null,
      )
      return cursor
    })
    updateOne = collection.updateOne
    updateOne.mockResolvedValue({ matchedCount: 1 })
  })

  it('filters plans by year, period, and leader', async () => {
    const find = (await clientPromise).db().collection().find
    const response = await GET(
      new Request(
        'http://localhost/api/list-plan?year=2026&period=Bulanan&leaderName=Arie',
      ),
    )

    expect(find.mock.calls[0][0]).toEqual({
      year: '2026',
      period: 'Bulanan',
      leaderName: 'Arie',
    })
    expect(response.status).toBe(200)
  })

  it('updates editable fields and keeps team targets in sync', async () => {
    const response = await PUT(
      new Request('http://localhost/api/list-plan', {
        method: 'PUT',
        body: JSON.stringify({
          code_submit: existing.code_submit,
          new_code_submit: 'ARI-BL-X-NOV-2026',
          note: 'Revisi catatan',
          period: 'Mingguan',
          periodOf: '2',
          month: 'January',
          year: '2027',
          leaderName: 'Nama lain',
          total_active_sales: '1',
          sales_targets: [
            {
              nama_sales: 'Sales A',
              visit_target: '10',
              demo_target: '2',
              sph_target: '1',
              sph_deal_target: '1',
              revenue: '1000',
              note: '',
            },
            {
              nama_sales: 'Sales B',
              visit_target: '5',
              demo_target: '3',
              sph_target: '2',
              sph_deal_target: '1',
              revenue: '500',
              note: 'Prioritas',
            },
          ],
          sales_visit: [],
        }),
      }),
    )
    const [, update] = updateOne.mock.calls[0]

    expect(response.status).toBe(200)
    expect(update.$set).toMatchObject({
      note: 'Revisi catatan',
      code_submit: 'ARI-BL-X-NOV-2026',
      visit_target: '15',
      demo_target: '5',
      sph_target: '3',
      sph_deal_target: '2',
      revenue: '1500',
    })
    expect(update.$set).not.toHaveProperty('period')
    expect(update.$set).not.toHaveProperty('periodOf')
    expect(update.$set).not.toHaveProperty('month')
    expect(update.$set).not.toHaveProperty('year')
    expect(update.$set).not.toHaveProperty('leaderName')
    expect(update.$set).not.toHaveProperty('total_active_sales')
    expect(updateOne.mock.calls[0][0]).toEqual({ _id: existing._id })
  })

  it('rejects a changed sales count without updating the plan', async () => {
    const response = await PUT(
      new Request('http://localhost/api/list-plan', {
        method: 'PUT',
        body: JSON.stringify({
          code_submit: existing.code_submit,
          note: '',
          sales_targets: [],
          sales_visit: [],
        }),
      }),
    )

    expect(response.status).toBe(400)
    expect(updateOne).not.toHaveBeenCalled()
  })
})
