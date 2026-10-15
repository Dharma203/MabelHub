/**
 * Test file for utility functions used in tracking pages
 * Functions: getPageWindow, cn, formatBulan, date utilities
 */

function getPageWindow(current: number, totalPages: number, size: number) {
  if (totalPages <= size)
    return Array.from({ length: totalPages }, (_, i) => i + 1)

  const half = Math.floor(size / 2)
  let start = Math.max(1, current - half)
  let end = start + size - 1

  if (end > totalPages) {
    end = totalPages
    start = end - size + 1
  }
  return Array.from({ length: size }, (_, i) => start + i)
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

const BULAN_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
}

function formatBulan(val: string): string {
  const [yyyy, mm] = val.split('-')
  if (!yyyy || !mm) return val
  return `${BULAN_NAMES[mm] ?? mm}-${yyyy}`
}

describe('getPageWindow', () => {
  it('should return all pages when total <= size', () => {
    const result = getPageWindow(2, 3, 5)
    expect(result).toEqual([1, 2, 3])
  })

  it('should return correct window around current page', () => {
    const result = getPageWindow(5, 20, 5)
    expect(result.length).toBe(5)
    expect(result).toContain(5)
    expect(result[2]).toBe(5) // Current page in middle
  })

  it('should adjust window at the start', () => {
    const result = getPageWindow(1, 20, 5)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it('should adjust window at the end', () => {
    const result = getPageWindow(20, 20, 5)
    expect(result).toEqual([16, 17, 18, 19, 20])
  })

  it('should handle size of 1', () => {
    const result = getPageWindow(5, 10, 1)
    expect(result).toEqual([5])
  })

  it('should handle totalPages equal to size', () => {
    const result = getPageWindow(3, 5, 5)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })
})

describe('cn (className utility)', () => {
  it('should concatenate truthy strings', () => {
    const result = cn('bg-blue-50', 'px-4', 'py-2')
    expect(result).toBe('bg-blue-50 px-4 py-2')
  })

  it('should filter out false values', () => {
    const result = cn('bg-blue-50', false, 'px-4')
    expect(result).toBe('bg-blue-50 px-4')
  })

  it('should filter out null values', () => {
    const result = cn('bg-blue-50', null, 'px-4')
    expect(result).toBe('bg-blue-50 px-4')
  })

  it('should filter out undefined values', () => {
    const result = cn('bg-blue-50', undefined, 'px-4')
    expect(result).toBe('bg-blue-50 px-4')
  })

  it('should handle all falsy values', () => {
    const result = cn(false, null, undefined)
    expect(result).toBe('')
  })

  it('should handle empty array', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('should handle conditional classes when false', () => {
    const isActive = false
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class')
  })
})

describe('formatBulan', () => {
  it('should format valid month-year string', () => {
    const result = formatBulan('2025-12')
    expect(result).toBe('December-2025')
  })

  it('should format January correctly', () => {
    const result = formatBulan('2025-01')
    expect(result).toBe('January-2025')
  })

  it('should format all months correctly', () => {
    const months = [
      ['2025-01', 'January-2025'],
      ['2025-02', 'February-2025'],
      ['2025-03', 'March-2025'],
      ['2025-04', 'April-2025'],
      ['2025-05', 'May-2025'],
      ['2025-06', 'June-2025'],
      ['2025-07', 'July-2025'],
      ['2025-08', 'August-2025'],
      ['2025-09', 'September-2025'],
      ['2025-10', 'October-2025'],
      ['2025-11', 'November-2025'],
      ['2025-12', 'December-2025'],
    ]

    months.forEach(([input, expected]) => {
      expect(formatBulan(input)).toBe(expected)
    })
  })

  it('should return original value for invalid format', () => {
    const result = formatBulan('invalid')
    expect(result).toBe('invalid')
  })

  it('should return original value for missing month', () => {
    const result = formatBulan('2025')
    expect(result).toBe('2025')
  })

  it('should handle unknown month code', () => {
    const result = formatBulan('2025-99')
    expect(result).toBe('99-2025')
  })
})

describe('Filter utilities', () => {
  describe('validatePageNumber', () => {
    const validatePageNumber = (page: string | null | undefined) =>
      Math.max(1, Number(page ?? 1))

    it('should ensure minimum page of 1', () => {
      expect(validatePageNumber('0')).toBe(1)
      expect(validatePageNumber('-5')).toBe(1)
    })

    it('should accept valid page numbers', () => {
      expect(validatePageNumber('1')).toBe(1)
      expect(validatePageNumber('5')).toBe(5)
      expect(validatePageNumber('100')).toBe(100)
    })

    it('should handle null/undefined as page 1', () => {
      expect(validatePageNumber(null)).toBe(1)
      expect(validatePageNumber(undefined)).toBe(1)
    })

    it('should handle non-numeric strings', () => {
      const result = validatePageNumber('abc')
      expect(isNaN(result)).toBe(true)
    })
  })

  describe('validateLimit', () => {
    const validateLimit = (limit: string | null | undefined, max = 500) =>
      Math.min(max, Math.max(1, Number(limit ?? 10)))

    it('should enforce minimum limit of 1', () => {
      expect(validateLimit('0')).toBe(1)
      expect(validateLimit('-5')).toBe(1)
    })

    it('should enforce maximum limit', () => {
      expect(validateLimit('1000')).toBe(500)
      expect(validateLimit('600')).toBe(500)
    })

    it('should accept valid limits', () => {
      expect(validateLimit('10')).toBe(10)
      expect(validateLimit('25')).toBe(25)
      expect(validateLimit('500')).toBe(500)
    })

    it('should use default limit of 10', () => {
      expect(validateLimit(null)).toBe(10)
      expect(validateLimit(undefined)).toBe(10)
    })
  })

  describe('parseMultiSelectParam', () => {
    const parseMultiSelectParam = (
      params: URLSearchParams,
      key: string,
    ): string[] => params.getAll(key)

    it('should parse single value', () => {
      const params = new URLSearchParams('produk=Furniture')
      const result = parseMultiSelectParam(params, 'produk')
      expect(result).toEqual(['Furniture'])
    })

    it('should parse multiple values', () => {
      const params = new URLSearchParams(
        'produk=Furniture&produk=Fixtures&produk=Decor',
      )
      const result = parseMultiSelectParam(params, 'produk')
      expect(result).toEqual(['Furniture', 'Fixtures', 'Decor'])
    })

    it('should return empty array for missing param', () => {
      const params = new URLSearchParams()
      const result = parseMultiSelectParam(params, 'produk')
      expect(result).toEqual([])
    })

    it('should preserve order', () => {
      const params = new URLSearchParams(
        'bulan=2025-12&bulan=2025-11&bulan=2025-10',
      )
      const result = parseMultiSelectParam(params, 'bulan')
      expect(result).toEqual(['2025-12', '2025-11', '2025-10'])
    })
  })
})

describe('Date utilities', () => {
  describe('parseDateRange', () => {
    const parseDateRange = (startDate: string | null, endDate: string | null) => {
      return {
        startDate: startDate ? startDate.replace(/-/g, '') : null,
        endDate: endDate ? endDate.replace(/-/g, '') : null,
      }
    }

    it('should parse single start date', () => {
      const result = parseDateRange('2025-12-01', null)
      expect(result.startDate).toBe('20251201')
      expect(result.endDate).toBe(null)
    })

    it('should parse single end date', () => {
      const result = parseDateRange(null, '2025-12-31')
      expect(result.startDate).toBe(null)
      expect(result.endDate).toBe('20251231')
    })

    it('should parse date range', () => {
      const result = parseDateRange('2025-12-01', '2025-12-31')
      expect(result.startDate).toBe('20251201')
      expect(result.endDate).toBe('20251231')
    })

    it('should handle null dates', () => {
      const result = parseDateRange(null, null)
      expect(result.startDate).toBe(null)
      expect(result.endDate).toBe(null)
    })
  })

  describe('parseMonthString', () => {
    const parseMonthString = (monthStr: string) => {
      const [yyyy, mm] = monthStr.split('-')
      return { year: yyyy, month: mm }
    }

    it('should parse valid month string', () => {
      const result = parseMonthString('2025-12')
      expect(result.year).toBe('2025')
      expect(result.month).toBe('12')
    })

    it('should handle different years', () => {
      const result = parseMonthString('2026-01')
      expect(result.year).toBe('2026')
      expect(result.month).toBe('01')
    })

    it('should handle invalid format', () => {
      const result = parseMonthString('invalid')
      expect(result.year).toBe('invalid')
      expect(result.month).toBeUndefined()
    })
  })
})
