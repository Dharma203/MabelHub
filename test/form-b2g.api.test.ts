/**
 * @jest-environment node
 */
// Provide a fallback Mongo URI for modules that validate it at import-time
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test'

// Mock the underlying 'mongodb' package so lib/mongodb can construct a client
jest.doMock('mongodb', () => {
  const mConnect = jest.fn()
  const MongoClient = jest.fn().mockImplementation(() => ({ connect: mConnect }))
  return { MongoClient }
})

// Use the manual jest mock for '@/lib/mongodb' (defined at src/lib/__mocks__/mongodb.ts)
jest.mock('@/lib/mongodb')
const mockedLib = require('@/lib/mongodb')
const clientPromise = mockedLib.default

// Now require route modules after mocks are in place
const { GET: GET_COUNTER, POST, PUT } = require('../src/app/api/form-b2g/route')
const { GET: GET_BY_CODE } = require('../src/app/api/form-b2g/[code]/route')
const { GET: GET_HISTORY } = require('../src/app/api/form-b2g/history/[code]/route')

describe('/api/form-b2g (integration style unit tests)', () => {
  let mockDb: any
  let mockCollection: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockCollection = {
      insertMany: jest.fn(),
      deleteMany: jest.fn(),
      distinct: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    }

    const mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    }

    clientPromise.setClient(mockClient)
  })

  it('GET counter returns default when prefix/dmy missing', async () => {
    const req = new Request(new URL('http://localhost/api/form-b2g')) as any
    const res = await GET_COUNTER(req)
    const json = await res.json()
    expect(json.counter).toBeDefined()
  })

  it('POST rejects invalid payload', async () => {
    const req = new Request(new URL('http://localhost/api/form-b2g'), {
      method: 'POST',
      body: JSON.stringify({}),
    }) as any

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST inserts documents successfully', async () => {
    mockCollection.insertMany.mockResolvedValue({ insertedCount: 2 })

    const payload = {
      header: { codeInput: 'C1', requestor: 'A' },
      items: [
        { id: '1', nama: 'X', jabatan: 'J', tipeKontak: 'Phone', noTelp: '081', email: '' },
      ],
    }

    const req = new Request(new URL('http://localhost/api/form-b2g'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as any

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.inserted).toBe(2)
  })

  it('GET by code returns 404 when not found', async () => {
    mockCollection.find.mockReturnValue({ toArray: async () => [] })

    const res = await GET_BY_CODE(null as any, { params: Promise.resolve({ code: 'NOPE' }) } as any)
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.error).toBeDefined()
  })

  it('GET by code returns header and items when found', async () => {
    const doc = {
      code_input: 'C1',
      requestor: 'A',
      satuanKerja: 'SK',
      institusiKerja: 'I',
      segmentasi: 'S',
      provinsi: 'P',
      kota: 'K',
      alamat: 'A',
      klpd: 'KLPD',
      ring: 'R',
      salesInternal: 'S',
      nama: 'X',
      jabatan: 'J',
      role: 'R',
      tipe_kontak: 'Phone',
      no_telp: '081',
      email: 'a@a',
      _id: { toString: () => 'ID1' },
    }
    mockCollection.find.mockReturnValue({ toArray: async () => [doc] })

    const res = await GET_BY_CODE(null as any, { params: Promise.resolve({ code: 'C1' }) } as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.header.codeInput).toBe('C1')
    expect(Array.isArray(json.items)).toBe(true)
  })

  it('history GET returns not found when empty', async () => {
    mockCollection.find.mockReturnValue({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) })

    const res = await GET_HISTORY(null as any, { params: Promise.resolve({ code: 'C1' }) } as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.found).toBe(false)
  })

  it('history GET returns record when present', async () => {
    const hist = [{ code_input: 'C1', revised_by: 'A', revised_at: new Date(), changed_fields: [], snapshot_before: null }]
    mockCollection.find.mockReturnValue({ sort: () => ({ limit: () => ({ toArray: async () => hist }) }) })

    const res = await GET_HISTORY(null as any, { params: Promise.resolve({ code: 'C1' }) } as any)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.found).toBe(true)
  })
})
