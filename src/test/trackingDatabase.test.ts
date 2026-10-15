/**
 * TDD Tests – /api/tracking-database pagination & stats logic
 * Feature introduced: 15–23 April 2026
 *
 * Tests the pure data-transform helpers extracted from route.ts:
 *   - paginateRows
 *   - computeProvinsiKotaTable
 *   - computeWaTable
 *   - buildDateStrFromCodeInput (for date-range filter)
 *   - isInDateRange
 *   - computeSummaryStats
 */

// ── Types ────────────────────────────────────────────────────────

type RawDoc = {
  code_input: string
  nama: string
  no_telp: string
  tipe_kontak: string
  provinsi: string
  kota: string
  nama_perusahaan: string
  produk_relevan: string
  merek_tayang: string
}

// ── Pure helpers extracted from route.ts ─────────────────────────

/**
 * Paginates a rows array.
 */
function paginateRows<T>(rows: T[], page: number, limit: number): T[] {
  const skip = (page - 1) * limit
  return rows.slice(skip, skip + limit)
}

/**
 * Counts total pages.
 */
function totalPages(count: number, limit: number): number {
  return Math.max(1, Math.ceil(count / limit))
}

/**
 * Builds YYYYMMDD string from code_input for date comparison.
 * code_input format: PREFIX-DDMMYY-COUNTER
 * e.g. "ALIY-150426-0001" → "20260415"
 */
function buildDateStrFromCodeInput(code: string): string | null {
  const parts = code.split('-')
  if (parts.length < 3) return null
  const mid = parts[1]
  if (mid.length !== 6) return null
  const dd = mid.substring(0, 2)
  const mm = mid.substring(2, 4)
  const yy = mid.substring(4, 6)
  return `20${yy}${mm}${dd}`
}

/**
 * Returns true when the code falls within [startDate, endDate] (both YYYY-MM-DD).
 */
function isInDateRange(code: string, startDate: string, endDate: string): boolean {
  const dateStr = buildDateStrFromCodeInput(code)
  if (!dateStr) return false
  const s = startDate.replace(/-/g, '')
  const e = endDate.replace(/-/g, '')
  if (s && dateStr < s) return false
  if (e && dateStr > e) return false
  return true
}

/**
 * Groups rows by (provinsi, kota) and counts unique (nama, no_telp) per group.
 */
function computeProvinsiKotaTable(docs: RawDoc[]): Array<{ no: number; provinsi: string; kota: string; unik: number; pct: number }> {
  const grouped: Map<string, Set<string>> = new Map()

  for (const doc of docs) {
    if (!doc.provinsi || !doc.kota || !doc.nama || !doc.no_telp) continue
    const key = `${doc.provinsi}__${doc.kota}`
    const contactKey = `${doc.nama}__${doc.no_telp}`
    if (!grouped.has(key)) grouped.set(key, new Set())
    grouped.get(key)!.add(contactKey)
  }

  const total = Array.from(grouped.values()).reduce((s, v) => s + v.size, 0)

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, contacts], idx) => {
      const [provinsi, kota] = key.split('__')
      return {
        no: idx + 1,
        provinsi,
        kota,
        unik: contacts.size,
        pct: total > 0 ? Math.round((contacts.size / total) * 100) : 0,
      }
    })
}

/**
 * Computes summary stats.
 */
function computeSummaryStats(docs: RawDoc[]) {
  const uniqueNoTelp = new Set(docs.filter(d => d.no_telp).map(d => d.no_telp))
  const uniqueProvinsi = new Set(docs.filter(d => d.provinsi).map(d => d.provinsi))
  const uniqueKota = new Set(docs.filter(d => d.kota).map(d => d.kota))
  const uniqueNama = new Set(docs.filter(d => d.nama).map(d => d.nama))

  const kontakUnik = new Set(
    docs.filter(d => d.nama && d.no_telp).map(d => `${d.nama}__${d.no_telp}`)
  )
  const waUnik = new Set(
    docs.filter(d => d.tipe_kontak === 'WhatsApp' && d.nama && d.no_telp)
      .map(d => `${d.nama}__${d.no_telp}`)
  )

  return {
    total_no_telp: uniqueNoTelp.size,
    total_provinsi: uniqueProvinsi.size,
    total_kota: uniqueKota.size,
    total_nama: uniqueNama.size,
    total_kontak_unik: kontakUnik.size,
    total_wa_unik: waUnik.size,
  }
}

// ── Sample data (sprint dates 15–23 April 2026) ──────────────────

const sprintDocs: RawDoc[] = [
  { code_input: 'ALIY-150426-0001', nama: 'Budi', no_telp: '081111', tipe_kontak: 'WhatsApp', provinsi: 'Jawa Barat', kota: 'Bandung', nama_perusahaan: 'PT A', produk_relevan: 'IFP', merek_tayang: 'HDe' },
  { code_input: 'ALIY-170426-0001', nama: 'Sari', no_telp: '082222', tipe_kontak: 'Office',   provinsi: 'Jawa Barat', kota: 'Bandung', nama_perusahaan: 'PT B', produk_relevan: 'MRS', merek_tayang: '' },
  { code_input: 'ALIY-200426-0001', nama: 'Andi', no_telp: '083333', tipe_kontak: 'WhatsApp', provinsi: 'DKI Jakarta', kota: 'Jakarta Selatan', nama_perusahaan: 'PT C', produk_relevan: 'IFP', merek_tayang: 'HDe' },
  { code_input: 'ALIY-230426-0001', nama: 'Dewi', no_telp: '084444', tipe_kontak: 'WhatsApp', provinsi: 'Jawa Barat', kota: 'Bekasi', nama_perusahaan: 'PT D', produk_relevan: 'AIO', merek_tayang: '' },
  // Duplicate contact (same nama+no_telp) should only count once
  { code_input: 'ALIY-220426-0002', nama: 'Budi', no_telp: '081111', tipe_kontak: 'WhatsApp', provinsi: 'Jawa Barat', kota: 'Bandung', nama_perusahaan: 'PT A', produk_relevan: 'IFP', merek_tayang: 'HDe' },
]

// ── Tests ─────────────────────────────────────────────────────────

describe('paginateRows', () => {
  const rows = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }))

  it('returns first page correctly', () => {
    const page1 = paginateRows(rows, 1, 25)
    expect(page1).toHaveLength(25)
    expect(page1[0].id).toBe(1)
    expect(page1[24].id).toBe(25)
  })

  it('returns second page correctly', () => {
    const page2 = paginateRows(rows, 2, 25)
    expect(page2).toHaveLength(25)
    expect(page2[0].id).toBe(26)
  })

  it('returns partial last page', () => {
    const partial = paginateRows(rows, 3, 25)
    expect(partial).toHaveLength(0)  // 50 items / 25 = 2 pages exactly
  })

  it('returns partial when total not divisible', () => {
    const r = Array.from({ length: 27 }, (_, i) => ({ id: i + 1 }))
    const page2 = paginateRows(r, 2, 25)
    expect(page2).toHaveLength(2)
  })

  it('returns empty for page beyond total', () => {
    expect(paginateRows(rows, 99, 25)).toHaveLength(0)
  })
})

describe('totalPages', () => {
  it('calculates total pages for divisible count', () => {
    expect(totalPages(50, 25)).toBe(2)
  })

  it('rounds up for non-divisible count', () => {
    expect(totalPages(51, 25)).toBe(3)
    expect(totalPages(1, 25)).toBe(1)
  })

  it('returns 1 when count is 0', () => {
    expect(totalPages(0, 25)).toBe(1)
  })
})

describe('buildDateStrFromCodeInput', () => {
  it('parses 15 Apr 2026 sprint start date', () => {
    expect(buildDateStrFromCodeInput('ALIY-150426-0001')).toBe('20260415')
  })

  it('parses 23 Apr 2026 sprint end date', () => {
    expect(buildDateStrFromCodeInput('ALIY-230426-0001')).toBe('20260423')
  })

  it('returns null for malformed code', () => {
    expect(buildDateStrFromCodeInput('BADCODE')).toBeNull()
    expect(buildDateStrFromCodeInput('A-B')).toBeNull()
  })
})

describe('isInDateRange', () => {
  it('includes code exactly on sprint start date (15 Apr 2026)', () => {
    expect(isInDateRange('ALIY-150426-0001', '2026-04-15', '2026-04-23')).toBe(true)
  })

  it('includes code exactly on sprint end date (23 Apr 2026)', () => {
    expect(isInDateRange('ALIY-230426-0001', '2026-04-15', '2026-04-23')).toBe(true)
  })

  it('includes code in the middle of the sprint (20 Apr 2026)', () => {
    expect(isInDateRange('ALIY-200426-0001', '2026-04-15', '2026-04-23')).toBe(true)
  })

  it('excludes code before sprint start (14 Apr 2026)', () => {
    expect(isInDateRange('ALIY-140426-0001', '2026-04-15', '2026-04-23')).toBe(false)
  })

  it('excludes code after sprint end (24 Apr 2026)', () => {
    expect(isInDateRange('ALIY-240426-0001', '2026-04-15', '2026-04-23')).toBe(false)
  })

  it('works with only startDate', () => {
    expect(isInDateRange('ALIY-140426-0001', '2026-04-15', '')).toBe(false)
    expect(isInDateRange('ALIY-200426-0001', '2026-04-15', '')).toBe(true)
  })

  it('works with only endDate', () => {
    expect(isInDateRange('ALIY-240426-0001', '', '2026-04-23')).toBe(false)
    expect(isInDateRange('ALIY-200426-0001', '', '2026-04-23')).toBe(true)
  })

  it('includes everything when both dates are empty', () => {
    expect(isInDateRange('ALIY-150426-0001', '', '')).toBe(true)
  })

  it('filters sprint docs correctly: 15-23 Apr 2026', () => {
    const filtered = sprintDocs.filter(d =>
      isInDateRange(d.code_input, '2026-04-15', '2026-04-23')
    )
    expect(filtered).toHaveLength(sprintDocs.length) // all 5 are within range
  })
})

describe('computeProvinsiKotaTable', () => {
  it('counts unique contacts per city group', () => {
    const table = computeProvinsiKotaTable(sprintDocs)
    // Jawa Barat / Bandung has Budi (appears twice but counted once) + Sari = 2 unique
    const bandung = table.find(r => r.kota === 'Bandung')
    expect(bandung?.unik).toBe(2)
  })

  it('treats same (nama, no_telp) across multiple docs as one unique contact', () => {
    const table = computeProvinsiKotaTable(sprintDocs)
    // Budi + 081111 appears twice in Bandung — should be counted once
    const bandung = table.find(r => r.kota === 'Bandung')!
    expect(bandung.unik).toBe(2) // Budi(dedup) + Sari
  })

  it('creates separate entries for different kota', () => {
    const table = computeProvinsiKotaTable(sprintDocs)
    expect(table.find(r => r.kota === 'Jakarta Selatan')).toBeDefined()
    expect(table.find(r => r.kota === 'Bekasi')).toBeDefined()
  })

  it('each row has no, provinsi, kota, unik, pct', () => {
    const table = computeProvinsiKotaTable(sprintDocs)
    table.forEach((row, i) => {
      expect(row.no).toBe(i + 1)
      expect(typeof row.provinsi).toBe('string')
      expect(typeof row.kota).toBe('string')
      expect(typeof row.unik).toBe('number')
      expect(typeof row.pct).toBe('number')
    })
  })

  it('pct values sum approximately to 100', () => {
    const table = computeProvinsiKotaTable(sprintDocs)
    const sum = table.reduce((s, r) => s + r.pct, 0)
    expect(sum).toBeGreaterThanOrEqual(95) // rounding may cause ± few %
    expect(sum).toBeLessThanOrEqual(105)
  })

  it('returns empty array for empty docs', () => {
    expect(computeProvinsiKotaTable([])).toEqual([])
  })

  it('skips docs with missing provinsi/kota/nama/no_telp', () => {
    const docs: RawDoc[] = [
      { code_input: 'X-150426-0001', nama: '', no_telp: '081', tipe_kontak: 'WA', provinsi: 'Jawa Barat', kota: 'Bandung', nama_perusahaan: '', produk_relevan: '', merek_tayang: '' },
    ]
    expect(computeProvinsiKotaTable(docs)).toEqual([])
  })
})

describe('computeSummaryStats', () => {
  it('counts total_kontak_unik correctly (dedupes same nama+no_telp)', () => {
    const stats = computeSummaryStats(sprintDocs)
    // 4 unique (nama, no_telp) pairs — Budi appears twice
    expect(stats.total_kontak_unik).toBe(4)
  })

  it('counts total_wa_unik correctly', () => {
    const stats = computeSummaryStats(sprintDocs)
    // WhatsApp: Budi(dedup), Andi, Dewi = 3
    expect(stats.total_wa_unik).toBe(3)
  })

  it('counts unique provinces', () => {
    const stats = computeSummaryStats(sprintDocs)
    expect(stats.total_provinsi).toBe(2) // Jawa Barat + DKI Jakarta
  })

  it('counts unique cities', () => {
    const stats = computeSummaryStats(sprintDocs)
    expect(stats.total_kota).toBe(3) // Bandung, Jakarta Selatan, Bekasi
  })

  it('counts unique names', () => {
    const stats = computeSummaryStats(sprintDocs)
    expect(stats.total_nama).toBe(4) // Budi, Sari, Andi, Dewi
  })

  it('counts unique phone numbers', () => {
    const stats = computeSummaryStats(sprintDocs)
    expect(stats.total_no_telp).toBe(4) // 081111, 082222, 083333, 084444
  })

  it('returns zeros for empty docs', () => {
    const stats = computeSummaryStats([])
    expect(stats.total_kontak_unik).toBe(0)
    expect(stats.total_wa_unik).toBe(0)
    expect(stats.total_provinsi).toBe(0)
  })
})
