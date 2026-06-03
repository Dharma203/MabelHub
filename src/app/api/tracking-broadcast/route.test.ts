/**
 * @jest-environment node
 */
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import clientPromise from '@/lib/mongodb'

jest.mock('@/lib/mongodb')

describe('POST /api/tracking-broadcast', () => {
  let mockDb: any
  let mockCollection: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockCollection = {
      insertMany: jest.fn(),
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    }

    const mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    }

    ;(clientPromise as jest.Mock).mockResolvedValue(mockClient)
  })

  it('should reject request without body', async () => {
    const req = new Request(new URL('http://localhost/api/tracking-broadcast'), {
      method: 'POST',
      body: null,
    }) as any

    const response = await POST(req)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('tidak valid')
  })

  it('should reject request with missing header', async () => {
    const req = new Request(new URL('http://localhost/api/tracking-broadcast'), {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: '1',
            nama_perusahaan: 'PT Test',
            produk_relevan: 'Test Product',
            alamat: 'Test Address',
            nama: 'John',
            no_telp: '0812345678',
          },
        ],
      }),
    }) as any

    const response = await POST(req)
    const json = await response.json()

    expect(response.status).toBe(400)
  })

  it('should reject request with empty items array', async () => {
    const req = new Request(new URL('http://localhost/api/tracking-broadcast'), {
      method: 'POST',
      body: JSON.stringify({
        header: {
          namaPerusahaan: 'PT Test',
          produkRelevan: 'Product',
          alamat: 'Address',
          nama: 'John',
          noTelp: '0812345678',
        },
        items: [],
      }),
    }) as any

    const response = await POST(req)
    const json = await response.json()

    expect(response.status).toBe(400)
  })

  it('should successfully insert broadcast data', async () => {
    const payload = {
      header: {
        namaPerusahaan: 'PT Test',
        produkRelevan: 'Test Product',
        alamat: 'Test Address',
        nama: 'John Doe',
        noTelp: '0812345678',
      },
      items: [
        {
          id: '1',
          nama_perusahaan: 'PT Test',
          produk_relevan: 'Test Product',
          alamat: 'Test Address',
          nama: 'John',
          no_telp: '0812345678',
        },
      ],
    }

    mockCollection.insertMany.mockResolvedValue({
      insertedCount: 1,
    })

    const req = new Request(new URL('http://localhost/api/tracking-broadcast'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as any

    const response = await POST(req)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.inserted).toBe(1)
  })

  it('should handle database insertion errors', async () => {
    mockCollection.insertMany.mockRejectedValue(new Error('DB Error'))

    const req = new Request(new URL('http://localhost/api/tracking-broadcast'), {
      method: 'POST',
      body: JSON.stringify({
        header: {
          namaPerusahaan: 'PT Test',
          produkRelevan: 'Product',
          alamat: 'Address',
          nama: 'John',
          noTelp: '0812345678',
        },
        items: [
          {
            id: '1',
            nama_perusahaan: 'PT Test',
            produk_relevan: 'Test Product',
            alamat: 'Test Address',
            nama: 'John',
            no_telp: '0812345678',
          },
        ],
      }),
    }) as any

    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})

describe('GET /api/tracking-broadcast', () => {
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
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    }

    const mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    }

    ;(clientPromise as jest.Mock).mockResolvedValue(mockClient)
  })

  it('should return default pagination when not specified', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-broadcast')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.pagination.page).toBe(1)
    expect(json.pagination.limit).toBe(10)
  })

  it('should enforce maximum limit of 500', async () => {
    mockAggregation.toArray.mockResolvedValue([])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-broadcast?limit=1000')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.pagination.limit).toBe(500)
  })

  it('should filter by single month', async () => {
    mockAggregation.toArray.mockResolvedValue([
      { total: 10 },
      [],
      [],
      [],
      [],
    ])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-broadcast?bulan=2025-12')
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should filter by multiple months', async () => {
    mockAggregation.toArray.mockResolvedValue([
      { total: 10 },
      [],
      [],
      [],
      [],
    ])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL(
      'http://localhost/api/tracking-broadcast?bulan=2025-12&bulan=2025-11',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should handle date range filtering', async () => {
    mockAggregation.toArray.mockResolvedValue([
      { total: 5 },
      [],
      [],
      [],
      [],
    ])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL(
      'http://localhost/api/tracking-broadcast?startDate=2025-12-01&endDate=2025-12-31',
    )
    const req = new NextRequest(url)

    const response = await GET(req)
    expect(response.status).toBe(200)
  })

  it('should return WA status summary', async () => {
    mockAggregation.toArray.mockResolvedValue([
      { total: 100 },
      [],
      [
        { _id: 'Terkirim(1C)', count: 30 },
        { _id: 'Diterima(2C)', count: 20 },
      ],
      [],
      [],
    ])
    mockCollection.distinct.mockResolvedValue([])

    const url = new URL('http://localhost/api/tracking-broadcast')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.statusWaSummary).toBeDefined()
    expect(json.statusWaSummary.terkirim).toBe(30)
    expect(json.statusWaSummary.diterima).toBe(20)
  })

  it('should return summary statistics', async () => {
    mockAggregation.toArray.mockResolvedValue([
      { total: 100 },
      [],
      [],
      [],
      [],
    ])
    mockCollection.distinct.mockResolvedValue([
      'phone1',
      'phone2',
      'phone3',
    ])

    const url = new URL('http://localhost/api/tracking-broadcast')
    const req = new NextRequest(url)

    const response = await GET(req)
    const json = await response.json()

    expect(json.summaryStats).toBeDefined()
    expect(json.summaryStats.total_no_telp).toBe(3)
  })

  it('should handle database errors gracefully', async () => {
    mockAggregation.toArray.mockRejectedValue(new Error('DB Error'))

    const url = new URL('http://localhost/api/tracking-broadcast')
    const req = new NextRequest(url)

    const response = await GET(req)

    expect(response.status).toBe(500)
  })
})
