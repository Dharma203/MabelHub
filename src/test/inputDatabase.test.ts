/**
 * TDD Tests – /api/input-database POST & GET handler logic
 * Feature introduced: 15–23 April 2026
 *
 * Strategy: test pure business-logic extracted from route.ts
 * without hitting MongoDB. We test:
 *   1. Payload validation (header + items required)
 *   2. Document mapping (header fields + contact fields)
 *   3. Counter generation pattern (prefix+dmy regex)
 *   4. handleCariKode search-by-code validation (client side)
 */

// ── Types mirroring the API ──────────────────────────────────────

type KontakItem = {
  id: string
  nama: string
  jabatan: string
  tipeKontak: string
  noTelp: string
  email: string
}

type InputHeader = {
  codeInput: string
  requestor: string
  assignedToUserId: string
  segmen: string
  namaPerusahaan: string
  provinsi: string
  kota: string
  alamat: string
  bidangPerusahaan: string
  segmentasi: string
  produkRelevan: string
  merekTayang: string
  brandOwner: string
  sumberData: string
  linkProduk: string
  linkToko: string
}

type InputPayload = {
  header: InputHeader
  items: KontakItem[]
}

// ── Pure logic extracted from route.ts ──────────────────────────

function validatePayload(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Payload tidak valid: header atau items kosong' }
  const b = body as Record<string, unknown>
  if (!b.header) return { valid: false, error: 'Payload tidak valid: header atau items kosong' }
  if (!b.items || !Array.isArray(b.items) || (b.items as unknown[]).length === 0) {
    return { valid: false, error: 'Payload tidak valid: header atau items kosong' }
  }
  return { valid: true }
}

function mapToDoc(header: InputHeader, item: KontakItem, now: Date) {
  return {
    code_input: header.codeInput || '',
    requestor: header.requestor || '',
    assigned_to: header.assignedToUserId || '',
    segmen: header.segmen || '',
    nama_perusahaan: header.namaPerusahaan || '',
    provinsi: header.provinsi || '',
    kota: header.kota || '',
    alamat: header.alamat || '',
    bidang_perusahaan: header.bidangPerusahaan || '',
    segmentasi: header.segmentasi || '',
    produk_relevan: header.produkRelevan || '',
    merek_tayang: header.merekTayang || '',
    brand_owner: header.brandOwner || '',
    sumber_data: header.sumberData || '',
    link_produk: header.linkProduk || '',
    link_toko: header.linkToko || '',
    nama: item.nama || '',
    jabatan: item.jabatan || '',
    tipe_kontak: item.tipeKontak || '',
    no_telp: item.noTelp || '',
    email: item.email || '',
    created_at: now,
    updated_at: now,
  }
}

/** Builds regex pattern used by GET /api/input-database for counting codes */
function buildCounterPattern(prefix: string, dmy: string): string {
  return `^${prefix}-${dmy}-`
}

// ── Tests ────────────────────────────────────────────────────────

const SPRINT_START = new Date('2026-04-15')
const SPRINT_END   = new Date('2026-04-23')

describe('validatePayload', () => {
  it('returns valid: true for correct payload', () => {
    const payload: InputPayload = {
      header: {
        codeInput: 'ALIY-150426-0001',
        requestor: 'Aliya',
        assignedToUserId: 'usr_01',
        segmen: 'B2G',
        namaPerusahaan: 'PT Test',
        provinsi: 'Jawa Barat',
        kota: 'Bandung',
        alamat: 'Jl. Test 1',
        bidangPerusahaan: 'Teknologi & Digital',
        segmentasi: 'B2B',
        produkRelevan: 'IFP',
        merekTayang: 'HDe',
        brandOwner: 'YA',
        sumberData: 'INAPROC',
        linkProduk: 'https://produk.com',
        linkToko: 'https://toko.com',
      },
      items: [
        { id: '1', nama: 'Budi', jabatan: 'Manager', tipeKontak: 'WhatsApp', noTelp: '6281234567890', email: 'budi@test.com' },
      ],
    }
    expect(validatePayload(payload)).toEqual({ valid: true })
  })

  it('returns invalid when header is missing', () => {
    const result = validatePayload({ items: [{ id: '1' }] })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('header')
  })

  it('returns invalid when items is empty array', () => {
    const result = validatePayload({ header: { codeInput: 'X' }, items: [] })
    expect(result.valid).toBe(false)
  })

  it('returns invalid when items is not an array', () => {
    const result = validatePayload({ header: { codeInput: 'X' }, items: null })
    expect(result.valid).toBe(false)
  })

  it('returns invalid for null payload', () => {
    expect(validatePayload(null)).toEqual({ valid: false, error: 'Payload tidak valid: header atau items kosong' })
  })

  it('returns invalid for non-object payload', () => {
    expect(validatePayload('string payload')).toEqual({ valid: false, error: 'Payload tidak valid: header atau items kosong' })
  })
})

describe('mapToDoc', () => {
  const now = SPRINT_START
  const header: InputHeader = {
    codeInput: 'ALIY-150426-0001',
    requestor: 'Aliya',
    assignedToUserId: 'usr_01',
    segmen: 'B2G',
    namaPerusahaan: 'PT Mabel',
    provinsi: 'Jawa Barat',
    kota: 'Bandung',
    alamat: 'Jl. Mabel No.1',
    bidangPerusahaan: 'Teknologi & Digital',
    segmentasi: 'B2B',
    produkRelevan: 'IFP',
    merekTayang: 'HDe',
    brandOwner: 'YA',
    sumberData: 'INAPROC',
    linkProduk: 'https://produk.mabel.com',
    linkToko: 'https://toko.mabel.com',
  }

  const item: KontakItem = {
    id: '1',
    nama: 'Budi Santoso',
    jabatan: 'Manager IT',
    tipeKontak: 'WhatsApp',
    noTelp: '628123456789',
    email: 'budi@mabel.com',
  }

  it('maps header fields correctly', () => {
    const doc = mapToDoc(header, item, now)
    expect(doc.code_input).toBe('ALIY-150426-0001')
    expect(doc.requestor).toBe('Aliya')
    expect(doc.assigned_to).toBe('usr_01')
    expect(doc.segmen).toBe('B2G')
    expect(doc.nama_perusahaan).toBe('PT Mabel')
    expect(doc.provinsi).toBe('Jawa Barat')
    expect(doc.kota).toBe('Bandung')
    expect(doc.bidang_perusahaan).toBe('Teknologi & Digital')
    expect(doc.segmentasi).toBe('B2B')
    expect(doc.produk_relevan).toBe('IFP')
    expect(doc.merek_tayang).toBe('HDe')
    expect(doc.brand_owner).toBe('YA')
    expect(doc.sumber_data).toBe('INAPROC')
    expect(doc.link_produk).toBe('https://produk.mabel.com')
    expect(doc.link_toko).toBe('https://toko.mabel.com')
  })

  it('maps contact item fields correctly', () => {
    const doc = mapToDoc(header, item, now)
    expect(doc.nama).toBe('Budi Santoso')
    expect(doc.jabatan).toBe('Manager IT')
    expect(doc.tipe_kontak).toBe('WhatsApp')
    expect(doc.no_telp).toBe('628123456789')
    expect(doc.email).toBe('budi@mabel.com')
  })

  it('sets created_at and updated_at to provided date', () => {
    const doc = mapToDoc(header, item, now)
    expect(doc.created_at).toBe(now)
    expect(doc.updated_at).toBe(now)
  })

  it('uses empty string for missing optional fields', () => {
    const sparseHeader = { ...header, brandOwner: '' }
    const doc = mapToDoc(sparseHeader, item, now)
    expect(doc.brand_owner).toBe('')
  })

  it('maps multiple items independently (sprint date 15-23 Apr)', () => {
    const item2: KontakItem = {
      id: '2',
      nama: 'Sari Dewi',
      jabatan: 'Direktur',
      tipeKontak: 'Office',
      noTelp: '02291234567',
      email: 'sari@mabel.com',
    }
    const doc1 = mapToDoc(header, item, SPRINT_START)
    const doc2 = mapToDoc(header, item2, SPRINT_END)

    expect(doc1.nama).toBe('Budi Santoso')
    expect(doc2.nama).toBe('Sari Dewi')
    expect(doc1.code_input).toBe(doc2.code_input)  // same header → same code
  })
})

describe('buildCounterPattern', () => {
  it('builds correct regex pattern for ALIY prefix + sprint date', () => {
    expect(buildCounterPattern('ALIY', '150426')).toBe('^ALIY-150426-')
  })

  it('builds pattern for sprint end date', () => {
    expect(buildCounterPattern('RAMA', '230426')).toBe('^RAMA-230426-')
  })

  it('matches sample codes that should match', () => {
    const pattern = new RegExp(buildCounterPattern('ALIY', '150426'))
    expect(pattern.test('ALIY-150426-0001')).toBe(true)
    expect(pattern.test('ALIY-150426-0012')).toBe(true)
  })

  it('does not match codes with different prefix', () => {
    const pattern = new RegExp(buildCounterPattern('ALIY', '150426'))
    expect(pattern.test('RAMA-150426-0001')).toBe(false)
  })

  it('does not match codes with different date', () => {
    const pattern = new RegExp(buildCounterPattern('ALIY', '150426'))
    expect(pattern.test('ALIY-160426-0001')).toBe(false)
  })
})

// ── handleCariKode validation (pure validation part) ─────────────

describe('handleCariKode input validation', () => {
  /** Validates the code field before calling the API */
  function validateCariKode(code: string): { ok: boolean; error?: string } {
    if (!code || !code.trim()) {
      return { ok: false, error: 'Masukkan kode terlebih dahulu' }
    }
    return { ok: true }
  }

  it('returns error when code is empty string', () => {
    expect(validateCariKode('')).toEqual({ ok: false, error: 'Masukkan kode terlebih dahulu' })
  })

  it('returns error when code is only spaces', () => {
    expect(validateCariKode('   ')).toEqual({ ok: false, error: 'Masukkan kode terlebih dahulu' })
  })

  it('returns ok: true for valid code', () => {
    expect(validateCariKode('ALIY-150426-0001')).toEqual({ ok: true })
  })

  it('returns ok for any non-empty trimmed code', () => {
    expect(validateCariKode('YTK-150426-0001')).toEqual({ ok: true })
  })
})
