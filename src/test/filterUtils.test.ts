/**
 * TDD Tests – tracking-database/filterUtils.ts
 * Covers commits: 15 Apr 2026 → 23 Apr 2026
 *
 * Scope:
 *   formatBulan, BULAN_NAMES,
 *   getFilterArr, toggleFilterVal,
 *   selectAllFilter, searchOptions,
 *   hasAnyFilter, clearFilter, resetAllFilters
 */
import {
  formatBulan,
  BULAN_NAMES,
  getFilterArr,
  toggleFilterVal,
  selectAllFilter,
  searchOptions,
  hasAnyFilter,
  clearFilter,
  resetAllFilters,
} from './filterUtils'
import type {
  FilterId,
  FilterState,
} from './filterUtils'

// ──────────────────────────────────────────────────────────────
// SECTION 1: formatBulan
// ──────────────────────────────────────────────────────────────
describe('formatBulan', () => {
  it('converts YYYY-MM to MonthName-YYYY for all 12 months', () => {
    expect(formatBulan('2026-01')).toBe('January-2026')
    expect(formatBulan('2026-02')).toBe('February-2026')
    expect(formatBulan('2026-03')).toBe('March-2026')
    expect(formatBulan('2026-04')).toBe('April-2026') // ← April 2026 (sprint window)
    expect(formatBulan('2026-05')).toBe('May-2026')
    expect(formatBulan('2026-06')).toBe('June-2026')
    expect(formatBulan('2026-07')).toBe('July-2026')
    expect(formatBulan('2026-08')).toBe('August-2026')
    expect(formatBulan('2026-09')).toBe('September-2026')
    expect(formatBulan('2026-10')).toBe('October-2026')
    expect(formatBulan('2026-11')).toBe('November-2026')
    expect(formatBulan('2026-12')).toBe('December-2026')
  })

  it('returns original value when format is invalid (no dash)', () => {
    expect(formatBulan('202604')).toBe('202604')
  })

  it('returns original value when empty string', () => {
    expect(formatBulan('')).toBe('')
  })

  it('uses MM as fallback label when month key not in BULAN_NAMES', () => {
    expect(formatBulan('2026-99')).toBe('99-2026')
  })

  it('handles different year values correctly', () => {
    expect(formatBulan('2025-12')).toBe('December-2025')
    expect(formatBulan('2024-01')).toBe('January-2024')
  })

  it('BULAN_NAMES contains exactly 12 entries', () => {
    expect(Object.keys(BULAN_NAMES)).toHaveLength(12)
  })

  // --- date-range window used in sprint (15-23 April 2026) ---
  it('formats sprint window months correctly (April 2026)', () => {
    expect(formatBulan('2026-04')).toBe('April-2026')
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 2: getFilterArr
// ──────────────────────────────────────────────────────────────
describe('getFilterArr', () => {
  const mockState: FilterState = {
    bulan: ['2026-04'],
    produk: ['GENSET'],
    merek: ['ACER', 'ASUS'],
    perusahaan: ['PT ABC'],
    provinsi: ['Jawa Barat'],
    kota: ['Bandung'],
    tipe: ['WhatsApp'],
  }

  const ids: FilterId[] = [
    'Bulan',
    'Produk',
    'Merek',
    'Perusahaan',
    'Provinsi',
    'Kota',
    'Tipe',
  ]
  const expected = [
    mockState.bulan,
    mockState.produk,
    mockState.merek,
    mockState.perusahaan,
    mockState.provinsi,
    mockState.kota,
    mockState.tipe,
  ]

  ids.forEach((id, i) => {
    it(`returns correct array for filter id: ${id}`, () => {
      expect(getFilterArr(id, mockState)).toEqual(expected[i])
    })
  })

  it('returns empty array for unknown id', () => {
    // @ts-expect-error: testing unknown id
    expect(getFilterArr('Unknown', mockState)).toEqual([])
  })

  it('returns reference to original array (not a copy)', () => {
    const arr = getFilterArr('Merek', mockState)
    expect(arr).toBe(mockState.merek)
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 3: toggleFilterVal
// ──────────────────────────────────────────────────────────────
describe('toggleFilterVal', () => {
  it('adds value when not in current array', () => {
    expect(toggleFilterVal(['ACER'], 'ASUS')).toEqual(['ACER', 'ASUS'])
  })

  it('removes value when already in current array', () => {
    expect(toggleFilterVal(['ACER', 'ASUS'], 'ACER')).toEqual(['ASUS'])
  })

  it('adds to empty array', () => {
    expect(toggleFilterVal([], 'GENSET')).toEqual(['GENSET'])
  })

  it('removes last item leaving empty array', () => {
    expect(toggleFilterVal(['GENSET'], 'GENSET')).toEqual([])
  })

  it('does not mutate the original array', () => {
    const original = ['ACER', 'ASUS']
    toggleFilterVal(original, 'ACER')
    expect(original).toEqual(['ACER', 'ASUS'])
  })

  it('is case-sensitive', () => {
    expect(toggleFilterVal(['ACER'], 'acer')).toEqual(['ACER', 'acer'])
  })

  // multi-select scenarios from the sprint
  it('can select multiple produk values independently', () => {
    let state: string[] = []
    state = toggleFilterVal(state, 'IFP')
    state = toggleFilterVal(state, 'MRS')
    state = toggleFilterVal(state, 'VIDEOTRON')
    expect(state).toEqual(['IFP', 'MRS', 'VIDEOTRON'])
    state = toggleFilterVal(state, 'MRS')
    expect(state).toEqual(['IFP', 'VIDEOTRON'])
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 4: selectAllFilter
// ──────────────────────────────────────────────────────────────
describe('selectAllFilter', () => {
  it('returns a copy of all options', () => {
    const opts = ['ACER', 'ASUS', 'ISUZU']
    expect(selectAllFilter(opts)).toEqual(opts)
  })

  it('returns a new array (not the same reference)', () => {
    const opts = ['ACER']
    expect(selectAllFilter(opts)).not.toBe(opts)
  })

  it('returns empty array when opts is empty', () => {
    expect(selectAllFilter([])).toEqual([])
  })

  it('selecting all and then toggling off one works correctly', () => {
    const opts = ['IFP', 'MRS', 'VIDEOTRON', 'AIO']
    let selected = selectAllFilter(opts)
    selected = toggleFilterVal(selected, 'MRS')
    expect(selected).toEqual(['IFP', 'VIDEOTRON', 'AIO'])
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 5: searchOptions
// ──────────────────────────────────────────────────────────────
describe('searchOptions', () => {
  const merekOpts = ['ACER', 'AIO', 'ASUS', 'AUROMAGE', 'CUMMINS']
  const bulanOpts = ['2026-04', '2026-03', '2025-12', '2025-11']

  describe('non-Bulan filter (isBulan = false)', () => {
    it('returns all opts when search is empty', () => {
      expect(searchOptions(merekOpts, '', false)).toEqual(merekOpts)
    })

    it('filters case-insensitively by raw option value', () => {
      expect(searchOptions(merekOpts, 'ac', false)).toEqual(['ACER'])
    })

    it('matches partial substring', () => {
      expect(searchOptions(merekOpts, 'au', false)).toEqual(['AUROMAGE'])
    })

    it('returns empty array when no match', () => {
      expect(searchOptions(merekOpts, 'xyz', false)).toEqual([])
    })

    it('is case-insensitive (lowercase query matches uppercase options)', () => {
      expect(searchOptions(merekOpts, 'asus', false)).toEqual(['ASUS'])
    })
  })

  describe('Bulan filter (isBulan = true)', () => {
    it('returns all when search is empty', () => {
      expect(searchOptions(bulanOpts, '', true)).toEqual(bulanOpts)
    })

    it('finds by month name (April) — sprint window month', () => {
      expect(searchOptions(bulanOpts, 'april', true)).toEqual(['2026-04'])
    })

    it('finds by month name (March) — sprint start month', () => {
      expect(searchOptions(bulanOpts, 'mar', true)).toEqual(['2026-03'])
    })

    it('finds by month name (December)', () => {
      expect(searchOptions(bulanOpts, 'dec', true)).toEqual(['2025-12'])
    })

    it('finds by year string', () => {
      const result = searchOptions(bulanOpts, '2025', true)
      expect(result).toEqual(['2025-12', '2025-11'])
    })

    it('search is case-insensitive for month names', () => {
      expect(searchOptions(bulanOpts, 'APRIL', true)).toEqual(['2026-04'])
    })

    it('returns empty when no match', () => {
      expect(searchOptions(bulanOpts, 'February', true)).toEqual([])
    })
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 6: hasAnyFilter
// ──────────────────────────────────────────────────────────────
describe('hasAnyFilter', () => {
  const emptyState: FilterState = {
    bulan: [],
    produk: [],
    merek: [],
    perusahaan: [],
    provinsi: [],
    kota: [],
    tipe: [],
  }

  it('returns false when all filters are empty', () => {
    expect(hasAnyFilter(emptyState)).toBe(false)
  })

  it('returns true when at least one filter has a value', () => {
    expect(hasAnyFilter({ ...emptyState, merek: ['ACER'] })).toBe(true)
  })

  it('returns true when bulan has a value', () => {
    expect(hasAnyFilter({ ...emptyState, bulan: ['2026-04'] })).toBe(true)
  })

  it('returns true when multiple filters have values', () => {
    expect(
      hasAnyFilter({ ...emptyState, produk: ['GENSET'], kota: ['Bandung'] }),
    ).toBe(true)
  })

  it('returns false after resetAllFilters()', () => {
    const filled: FilterState = {
      bulan: ['2026-04'],
      produk: ['IFP'],
      merek: [],
      perusahaan: [],
      provinsi: [],
      kota: [],
      tipe: [],
    }
    const reset = resetAllFilters()
    expect(hasAnyFilter(filled)).toBe(true)
    expect(hasAnyFilter(reset)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 7: clearFilter
// ──────────────────────────────────────────────────────────────
describe('clearFilter', () => {
  const filledState: FilterState = {
    bulan: ['2026-04'],
    produk: ['GENSET'],
    merek: ['ACER'],
    perusahaan: ['PT ABC'],
    provinsi: ['Jawa Barat'],
    kota: ['Bandung'],
    tipe: ['WhatsApp'],
  }

  it('clears bulan and keeps other filters intact', () => {
    const result = clearFilter(filledState, 'Bulan')
    expect(result.bulan).toEqual([])
    expect(result.produk).toEqual(['GENSET'])
    expect(result.merek).toEqual(['ACER'])
  })

  it('clears merek and keeps others', () => {
    const result = clearFilter(filledState, 'Merek')
    expect(result.merek).toEqual([])
    expect(result.bulan).toEqual(['2026-04'])
  })

  it('does not mutate original state', () => {
    clearFilter(filledState, 'Produk')
    expect(filledState.produk).toEqual(['GENSET'])
  })

  it('clearing provinsi keeps kota intact', () => {
    const result = clearFilter(filledState, 'Provinsi')
    expect(result.provinsi).toEqual([])
    expect(result.kota).toEqual(['Bandung'])
  })

  it('clearing tipe keeps WhatsApp filter untouched in other fields', () => {
    const result = clearFilter(filledState, 'Tipe')
    expect(result.tipe).toEqual([])
    expect(result.merek).toEqual(['ACER'])
  })
})

// ──────────────────────────────────────────────────────────────
// SECTION 8: resetAllFilters
// ──────────────────────────────────────────────────────────────
describe('resetAllFilters', () => {
  it('returns state with all filters empty', () => {
    const result = resetAllFilters()
    expect(result.bulan).toEqual([])
    expect(result.produk).toEqual([])
    expect(result.merek).toEqual([])
    expect(result.perusahaan).toEqual([])
    expect(result.provinsi).toEqual([])
    expect(result.kota).toEqual([])
    expect(result.tipe).toEqual([])
  })

  it('hasAnyFilter returns false after resetAllFilters', () => {
    expect(hasAnyFilter(resetAllFilters())).toBe(false)
  })

  it('returns a new object each call', () => {
    expect(resetAllFilters()).not.toBe(resetAllFilters())
  })
})
