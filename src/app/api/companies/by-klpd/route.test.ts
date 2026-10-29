/**
 * @jest-environment node
 */
import { GET } from './route'

const mockDistinct = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({
    db: jest.fn(() => ({ collection: mockCollection })),
  }),
  getDbName: () => 'MabelHub',
}))

jest.mock('@/lib/auth-server', () => ({
  assertLoggedIn: () => ({ ok: true }),
}))

describe('GET /api/companies/by-klpd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCollection.mockImplementation(() => ({ distinct: mockDistinct }))
  })

  it('suggests institutions from KLPD only', async () => {
    mockDistinct
      .mockResolvedValueOnce(['Dinas Provinsi'])

    const response = await GET(
      new Request(
        'http://localhost/api/companies/by-klpd?klpd=Provinsi&mode=institusi&q=Dinas',
      ),
    )
    const body = await response.json()

    expect(body.items).toContain('Dinas Provinsi')
    expect(mockCollection.mock.calls.map(([name]) => name)).toEqual(['KLPD'])
    expect(mockDistinct.mock.calls[0][1]).toMatchObject({
      institusi_kerja: { $regex: 'Dinas', $options: 'i' },
    })
  })

  it('limits city suggestions to the selected KLPD, institution, and satker', async () => {
    mockDistinct
      .mockResolvedValueOnce(['Kabupaten A'])
      .mockResolvedValueOnce(['Kabupaten B'])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const response = await GET(
      new Request(
        'http://localhost/api/companies/by-klpd?klpd=Provinsi&institusi=Dinas+X&satuan_kerja=Satker+Y&mode=kota',
      ),
    )

    expect(await response.json()).toEqual({
      items: ['Kabupaten A', 'Kabupaten B'],
    })
    expect(mockDistinct.mock.calls[0][1]).toMatchObject({
      klpd: { $regex: '^Provinsi$', $options: 'i' },
      institusi_kerja: { $regex: '^Dinas X$', $options: 'i' },
      satuan_kerja: { $regex: '^Satker Y$', $options: 'i' },
    })
    expect(mockDistinct.mock.calls.map(([field]) => field)).toEqual([
      'kota',
      'kota_kab',
      'kota_kabupaten',
      'kotaKabupaten',
      'city',
    ])
    expect(mockCollection.mock.calls.every(([name]) => name === 'KLPD')).toBe(true)
  })
})
