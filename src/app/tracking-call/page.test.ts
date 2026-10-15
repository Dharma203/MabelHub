import { describe, it, expect } from '@jest/globals'
import { cn, getPageWindow, BULAN_NAMES, formatBulanData, formatBulan } from './utils'

// ============ TESTS ============

describe('cn - className combiner', () => {
  it('should filter falsy values and join strings with space', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('should filter out false, null, undefined', () => {
    expect(cn('p-1', false, null, undefined, 'bg-white')).toBe('p-1 bg-white')
  })

  it('should handle all falsy values', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('should handle empty array', () => {
    expect(cn()).toBe('')
  })

  it('should handle single class', () => {
    expect(cn('text-bold')).toBe('text-bold')
  })
})

describe('getPageWindow - pagination page range', () => {
  it('should return all pages when totalPages <= size', () => {
    expect(getPageWindow(1, 5, 10)).toEqual([1, 2, 3, 4, 5])
    expect(getPageWindow(3, 3, 10)).toEqual([1, 2, 3])
  })

  it('should center current page when in middle', () => {
    expect(getPageWindow(5, 20, 5)).toEqual([3, 4, 5, 6, 7])
  })

  it('should start at 1 when current page is near beginning', () => {
    expect(getPageWindow(2, 20, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('should end at totalPages when current page is near end', () => {
    expect(getPageWindow(19, 20, 5)).toEqual([16, 17, 18, 19, 20])
  })

  it('should handle current = 1', () => {
    expect(getPageWindow(1, 100, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('should return correct size', () => {
    const result = getPageWindow(50, 100, 10)
    expect(result.length).toBe(10)
  })
})

describe('formatBulanData - format month from YYYY-MM', () => {
  it('should extract month name from YYYY-MM format', () => {
    expect(formatBulanData('2024-01')).toBe('January')
    expect(formatBulanData('2024-12')).toBe('December')
  })

  it('should return unknown month as-is', () => {
    expect(formatBulanData('2024-13')).toBe('13')
  })

  it('should handle invalid format', () => {
    expect(formatBulanData('invalid')).toBe('invalid')
    expect(formatBulanData('')).toBe('')
  })

  it('should work with all months', () => {
    Object.entries(BULAN_NAMES).forEach(([num, name]) => {
      expect(formatBulanData(`2024-${num}`)).toBe(name)
    })
  })
})

describe('formatBulan - format as MM-YYYY', () => {
  it('should format YYYY-MM to MM-YYYY', () => {
    expect(formatBulan('2024-01')).toBe('January-2024')
    expect(formatBulan('2023-12')).toBe('December-2023')
  })

  it('should handle numeric month if not found', () => {
    expect(formatBulan('2024-13')).toBe('13-2024')
  })

  it('should return invalid format as-is', () => {
    expect(formatBulan('invalid')).toBe('invalid')
    expect(formatBulan('2024')).toBe('2024')
    expect(formatBulan('')).toBe('')
  })

  it('should work with all months', () => {
    Object.entries(BULAN_NAMES).forEach(([num, name]) => {
      expect(formatBulan(`2024-${num}`)).toBe(`${name}-2024`)
    })
  })
})
