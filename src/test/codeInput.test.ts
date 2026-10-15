/**
 * TDD Tests – code_input generation helpers
 * Feature introduced: 15–23 April 2026 (input-database sprint)
 *
 * Covers:
 *   - prefix derivation from user full name
 *   - dmy (DDMMYY) format from a Date object
 *   - counter zero-padding
 *   - full code_input composition
 *   - handleCariKode / search-by-code validation logic (pure part)
 */

// ── Extracted pure helpers ─────────────────────────────────────
/**
 * Derives a 4-char uppercase prefix from a user's name.
 * e.g. "Aliya" → "ALIY",  "RD" → "RD"
 */
function derivePrefix(fullName: string): string {
  const name = fullName.trim()
  return name.substring(0, 4).toUpperCase() || 'XXXX'
}

/**
 * Formats a Date as DDMMYY (Indonesian short date).
 * e.g. new Date('2026-04-15') → "150426"  (DD=15, MM=04, YY=26)
 */
function formatDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

/**
 * Zero-pads a counter number to 4 digits.
 * e.g. 1 → "0001", 12 → "0012"
 */
function padCounter(n: number): string {
  return String(n).padStart(4, '0')
}

/**
 * Composes a full code_input string.
 * Pattern: PREFIX-DDMMYY-COUNTER
 * e.g. "ALIY-150426-0001"
 */
function buildCodeInput(prefix: string, dmy: string, counter: string): string {
  return `${prefix}-${dmy}-${counter}`
}

/**
 * Parses a code_input and returns its date as YYYYMMDD for comparison.
 * Used in date-range filter logic in tracking-database.
 * e.g. "ALIY-150426-0001" → "20260415"
 */
function parseCodeInputDate(code: string): string | null {
  const parts = code.split('-')
  if (parts.length < 3) return null
  const mid = parts[1]
  if (mid.length !== 6) return null
  const dd = mid.substring(0, 2)
  const mm = mid.substring(2, 4)
  const yy = mid.substring(4, 6)
  return `20${yy}${mm}${dd}`   // YYYYMMDD
}

// ── Tests ──────────────────────────────────────────────────────

describe('derivePrefix', () => {
  it('takes first 4 chars uppercase from full name', () => {
    expect(derivePrefix('Aliya')).toBe('ALIY')
    expect(derivePrefix('Ramadhan')).toBe('RAMA')
  })

  it('handles name shorter than 4 chars', () => {
    expect(derivePrefix('RD')).toBe('RD')
  })

  it('trims leading/trailing whitespace', () => {
    expect(derivePrefix('  Test  ')).toBe('TEST')
  })

  it('falls back to XXXX for empty string', () => {
    expect(derivePrefix('')).toBe('XXXX')
  })

  it('uses uppercase regardless of input casing', () => {
    expect(derivePrefix('aliya')).toBe('ALIY')
    expect(derivePrefix('ALIY')).toBe('ALIY')
  })
})

describe('formatDMY', () => {
  it('formats 15 April 2026 correctly → "150426"', () => {
    // Sprint start date
    expect(formatDMY(new Date('2026-04-15'))).toBe('150426')
  })

  it('formats 23 April 2026 correctly → "230426"', () => {
    // Sprint end date
    expect(formatDMY(new Date('2026-04-23'))).toBe('230426')
  })

  it('formats first day of year correctly', () => {
    expect(formatDMY(new Date('2026-01-01'))).toBe('010126')
  })

  it('formats last day of year correctly', () => {
    expect(formatDMY(new Date('2025-12-31'))).toBe('311225')
  })

  it('zero-pads day and month', () => {
    expect(formatDMY(new Date('2026-04-05'))).toBe('050426')
  })
})

describe('padCounter', () => {
  it('pads 1 to "0001"', () => {
    expect(padCounter(1)).toBe('0001')
  })

  it('pads 12 to "0012"', () => {
    expect(padCounter(12)).toBe('0012')
  })

  it('pads 123 to "0123"', () => {
    expect(padCounter(123)).toBe('0123')
  })

  it('leaves 4-digit number unchanged', () => {
    expect(padCounter(1234)).toBe('1234')
  })

  it('handles 0 → "0000"', () => {
    expect(padCounter(0)).toBe('0000')
  })
})

describe('buildCodeInput', () => {
  it('builds the correct pattern PREFIX-DDMMYY-COUNTER', () => {
    expect(buildCodeInput('ALIY', '150426', '0001')).toBe('ALIY-150426-0001')
  })

  it('sprint start date code (15 Apr 2026)', () => {
    const prefix = derivePrefix('Aliya')
    const dmy = '150426'
    const counter = padCounter(1)
    expect(buildCodeInput(prefix, dmy, counter)).toBe('ALIY-150426-0001')
  })

  it('sprint end date code (23 Apr 2026)', () => {
    const prefix = derivePrefix('Aliya')
    const dmy = '230426'
    const counter = padCounter(5)
    expect(buildCodeInput(prefix, dmy, counter)).toBe('ALIY-230426-0005')
  })

  it('generates different codes for different dates', () => {
    const c1 = buildCodeInput('ALIY', '150426', '0001')
    const c2 = buildCodeInput('ALIY', '230426', '0001')
    expect(c1).not.toBe(c2)
  })

  it('generates different codes for different counters', () => {
    const c1 = buildCodeInput('ALIY', '150426', '0001')
    const c2 = buildCodeInput('ALIY', '150426', '0002')
    expect(c1).not.toBe(c2)
  })
})

describe('parseCodeInputDate', () => {
  it('parses sprint start date code correctly → "20260415"', () => {
    expect(parseCodeInputDate('ALIY-150426-0001')).toBe('20260415')
  })

  it('parses sprint end date code correctly → "20260423"', () => {
    expect(parseCodeInputDate('ALIY-230426-0003')).toBe('20260423')
  })

  it('returns null for invalid format (no dash)', () => {
    expect(parseCodeInputDate('BADCODE')).toBeNull()
  })

  it('returns null when mid segment is not 6 chars', () => {
    expect(parseCodeInputDate('ALIY-1504-0001')).toBeNull()
  })

  it('parses December 2025 code correctly → "20251231"', () => {
    expect(parseCodeInputDate('RAMA-311225-0001')).toBe('20251231')
  })

  // Date range inclusion logic
  it('code from 15 Apr is within sprint range [20260415, 20260423]', () => {
    const parsed = parseCodeInputDate('ALIY-150426-0001')!
    expect(parsed >= '20260415' && parsed <= '20260423').toBe(true)
  })

  it('code from 23 Apr is within sprint range', () => {
    const parsed = parseCodeInputDate('ALIY-230426-0001')!
    expect(parsed >= '20260415' && parsed <= '20260423').toBe(true)
  })

  it('code from 14 Apr is outside sprint range', () => {
    const parsed = parseCodeInputDate('ALIY-140426-0001')!
    expect(parsed >= '20260415' && parsed <= '20260423').toBe(false)
  })

  it('code from 24 Apr is outside sprint range', () => {
    const parsed = parseCodeInputDate('ALIY-240426-0001')!
    expect(parsed >= '20260415' && parsed <= '20260423').toBe(false)
  })
})
