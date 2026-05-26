/**
 * @jest-environment node
 */
import { GET } from './route'
import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

jest.mock('@/lib/mongodb')

describe('GET /api/tracking-database', () => {
  let mockDb: any
  let mockCollection: any
  let mockAggregation: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockAggregation = {
      toArray: jest.fn(),
    }

    mockCollection = {
      aggregate: jest.fn().mockReturnValue(mockAggregation),
      distinct: jest.fn(),
      countDocuments: jest.fn(),
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    }

    const mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    }

    ;(clientPromise as jest.Mock).mockResolvedValue(mockClient)
  })

  it('should return stats without pagination when no page/limit params', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-database')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.rows).toBeDefined()
    expect(json.pagination).toBeUndefined()
  })

  it('should return paginated results when page param is provided', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(100)
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-database?page=1&limit=10')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.items).toBeDefined()
    expect(json.pagination).toBeDefined()
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.limit).toBe(10)
    expect(json.pagination.total).toBe(100)
  })

  it('should enforce minimum page of 1', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(0)
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-database?page=0')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.pagination.page).toBe(1)
  })

  it('should enforce minimum limit of 1 and maximum of 500', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(0)
    mockCollection.distinct.mockResolvedValue([])

    // Test minimum
    const url1 = new URL(
      'http://localhost/api/tracking-database?page=1&limit=0',
    )
    const req1 = new NextRequest(url1)
    const res1 = await GET(req1)
    const json1 = await res1.json()
    expect(json1.pagination.limit).toBe(1)

    // Test maximum
    jest.clearAllMocks()
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(0)
    mockCollection.distinct.mockResolvedValue([])

    const url2 = new URL(
      'http://localhost/api/tracking-database?page=1&limit=1000',
    )
    const req2 = new NextRequest(url2)
    const res2 = await GET(req2)
    const json2 = await res2.json()
    expect(json2.pagination.limit).toBe(500)
  })

  it('should filter by single month', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(10)

    const url = new URL('http://localhost/api/tracking-database?bulan=2025-12')
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by multiple months', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(10)

    const url = new URL(
      'http://localhost/api/tracking-database?bulan=2025-12&bulan=2025-11',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by single product', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(5)

    const url = new URL(
      'http://localhost/api/tracking-database?produk=Furniture',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by multiple products', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(8)

    const url = new URL(
      'http://localhost/api/tracking-database?produk=Furniture&produk=Fixtures',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by single brand', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(3)

    const url = new URL('http://localhost/api/tracking-database?merek=BrandA')
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by date range', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(15)

    const url = new URL(
      'http://localhost/api/tracking-database?startDate=2025-12-01&endDate=2025-12-31',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by single province', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(20)

    const url = new URL(
      'http://localhost/api/tracking-database?provinsi=Jakarta',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by multiple provinces', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(25)

    const url = new URL(
      'http://localhost/api/tracking-database?provinsi=Jakarta&provinsi=Bandung',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by city', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(12)

    const url = new URL('http://localhost/api/tracking-database?kota=Jakarta')
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by contact type', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(18)

    const url = new URL(
      'http://localhost/api/tracking-database?tipe=WhatsApp',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should return summary statistics', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue(['phone1', 'phone2', 'phone3'])
    mockCollection.countDocuments.mockResolvedValue(50)

    const url = new URL('http://localhost/api/tracking-database')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.total_no_telp).toBe(3)
    expect(json.total_provinsi).toBeDefined()
    expect(json.total_kota).toBeDefined()
    expect(json.total_nama).toBeDefined()
    expect(json.total_merek).toBeDefined()
  })

  it('should calculate pagination correctly', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(100)
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-database?page=2&limit=10')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.pagination.page).toBe(2)
    expect(json.pagination.total).toBe(100)
    expect(json.pagination.totalPages).toBe(10)
  })

  it('should handle combined filters', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(5)

    const url = new URL(
      'http://localhost/api/tracking-database?page=1&limit=25&bulan=2025-12&produk=Furniture&provinsi=Jakarta',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should handle database errors gracefully', async () => {
    mockAggregation.toArray.mockRejectedValue(new Error('DB Error'))

    const url = new URL('http://localhost/api/tracking-database')
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(500)
  })

  it('should include provinsi_kota analytics in response', async () => {
    mockAggregation.toArray.mockResolvedValue([
      [
        { no: 1, provinsi: 'Jakarta', kota: 'Jakarta', unik: 50, pct: 100 },
      ],
    ])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(50)

    const url = new URL('http://localhost/api/tracking-database')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.provinsi_kota).toBeDefined()
    expect(Array.isArray(json.provinsi_kota)).toBe(true)
  })

  it('should include wa_provinsi_kota analytics in response', async () => {
    mockAggregation.toArray.mockResolvedValue([
      [],
      [
        { no: 1, provinsi: 'Jakarta', kota: 'Jakarta', unik: 30, pct: 100 },
      ],
    ])
    mockCollection.distinct.mockResolvedValue([])
    mockCollection.countDocuments.mockResolvedValue(30)

    const url = new URL('http://localhost/api/tracking-database')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.wa_provinsi_kota).toBeDefined()
    expect(Array.isArray(json.wa_provinsi_kota)).toBe(true)
  })
})
