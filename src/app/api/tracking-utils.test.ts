/**
 * Integration tests for filter building logic
 * Tests the core filtering and aggregation pipeline construction
 */

describe('Filter Building Logic', () => {
  describe('buildMonthFilter', () => {
    const buildMonthFilter = (bulanArr: string[]) => {
      if (bulanArr.length === 0) return {}

      const midExpr = { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] }

      const monthConditions = bulanArr
        .map((m) => {
          const [yyyy, mm] = m.split('-')
          if (!yyyy || !mm) return null
          const yy = yyyy.slice(2)
          return {
            $and: [
              { $eq: [{ $substr: [midExpr, 2, 2] }, mm] },
              { $eq: [{ $substr: [midExpr, 4, 2] }, yy] },
            ],
          }
        })
        .filter(Boolean)

      if (monthConditions.length === 1) return monthConditions[0]
      if (monthConditions.length > 1) return { $or: monthConditions }
      return {}
    }

    it('should return empty object for empty array', () => {
      const result = buildMonthFilter([])
      expect(result).toEqual({})
    })

    it('should build single month condition', () => {
      const result = buildMonthFilter(['2025-12'])
      expect(result.$and).toBeDefined()
      expect(result.$and.length).toBe(2)
    })

    it('should build OR expression for multiple months', () => {
      const result = buildMonthFilter(['2025-12', '2025-11'])
      expect(result.$or).toBeDefined()
      expect(result.$or.length).toBe(2)
    })

    it('should handle invalid month format', () => {
      const result = buildMonthFilter(['invalid', '2025-12'])
      expect(result.$and).toBeDefined()
      expect(result.$and.length).toBe(2)
    })
  })

  describe('buildDateRangeFilter', () => {
    const buildDateRangeFilter = (startDate: string | null, endDate: string | null) => {
      if (!startDate && !endDate) return null

      const midExpr = { $arrayElemAt: [{ $split: ['$code_input', '-'] }, 1] }
      const dateStrExpr = {
        $concat: [
          '20',
          { $substr: [midExpr, 4, 2] },
          { $substr: [midExpr, 2, 2] },
          { $substr: [midExpr, 0, 2] },
        ],
      }

      const conditions: any[] = []
      if (startDate) {
        const s = startDate.replace(/-/g, '')
        conditions.push({ $gte: [dateStrExpr, s] })
      }
      if (endDate) {
        const e = endDate.replace(/-/g, '')
        conditions.push({ $lte: [dateStrExpr, e] })
      }

      return conditions.length === 1 ? conditions[0] : { $and: conditions }
    }

    it('should return null for no dates', () => {
      const result = buildDateRangeFilter(null, null)
      expect(result).toBeNull()
    })

    it('should build >= condition for start date only', () => {
      const result = buildDateRangeFilter('2025-12-01', null)
      expect(result.$gte).toBeDefined()
    })

    it('should build <= condition for end date only', () => {
      const result = buildDateRangeFilter(null, '2025-12-31')
      expect(result.$lte).toBeDefined()
    })

    it('should build AND condition for date range', () => {
      const result = buildDateRangeFilter('2025-12-01', '2025-12-31')
      expect(result.$and).toBeDefined()
      expect(result.$and.length).toBe(2)
    })

    it('should format dates correctly (YYYYMMDD)', () => {
      const result = buildDateRangeFilter('2025-12-01', '2025-12-31') as any
      const startCondition = result.$and[0]
      const endCondition = result.$and[1]

      expect(startCondition.$gte[1]).toBe('20251201')
      expect(endCondition.$lte[1]).toBe('20251231')
    })
  })

  describe('buildMultiSelectFilter', () => {
    const buildMultiSelectFilter = (
      fieldName: string,
      values: string[],
    ): Record<string, any> => {
      if (values.length === 0) return {}
      if (values.length === 1) return { [fieldName]: values[0] }
      return { [fieldName]: { $in: values } }
    }

    it('should return empty object for empty values', () => {
      const result = buildMultiSelectFilter('produk', [])
      expect(result).toEqual({})
    })

    it('should build equality filter for single value', () => {
      const result = buildMultiSelectFilter('produk', ['Furniture'])
      expect(result.produk).toBe('Furniture')
    })

    it('should build $in filter for multiple values', () => {
      const result = buildMultiSelectFilter('produk', ['Furniture', 'Fixtures'])
      expect(result.produk.$in).toBeDefined()
      expect(result.produk.$in).toEqual(['Furniture', 'Fixtures'])
    })

    it('should work with different field names', () => {
      const result = buildMultiSelectFilter('merek', ['BrandA', 'BrandB', 'BrandC'])
      expect(result.merek.$in.length).toBe(3)
    })
  })

  describe('buildStatusWaFilter', () => {
    const buildStatusWaFilter = (statusWaArr: string[]) => {
      if (statusWaArr.length === 0) return {}

      const hasKosong = statusWaArr.includes('')
      const nonKosong = statusWaArr.filter((s) => s !== '')

      if (hasKosong && nonKosong.length > 0) {
        return {
          $or: [
            { broadcast: { $in: nonKosong } },
            { broadcast: { $in: ['', null] } },
            { broadcast: null },
          ],
        }
      } else if (hasKosong) {
        return {
          $or: [
            { broadcast: { $in: ['', null] } },
            { broadcast: null },
          ],
        }
      } else {
        return { broadcast: { $in: nonKosong } }
      }
    }

    it('should return empty object for empty array', () => {
      const result = buildStatusWaFilter([])
      expect(result).toEqual({})
    })

    it('should handle only non-empty statuses', () => {
      const result = buildStatusWaFilter(['Terkirim(1C)', 'Diterima(2C)'])
      expect(result.broadcast.$in).toEqual(['Terkirim(1C)', 'Diterima(2C)'])
    })

    it('should handle only empty status', () => {
      const result = buildStatusWaFilter([''])
      expect(result.$or).toBeDefined()
      expect(result.$or.length).toBe(2)
    })

    it('should handle mixed statuses (empty + non-empty)', () => {
      const result = buildStatusWaFilter(['', 'Terkirim(1C)'])
      expect(result.$or).toBeDefined()
      expect(result.$or.length).toBe(3)
    })
  })

  describe('calculatePagination', () => {
    const calculatePagination = (
      totalCount: number,
      page: number,
      limit: number,
    ) => {
      return {
        page,
        limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        skip: (page - 1) * limit,
      }
    }

    it('should calculate correct skip value', () => {
      const result = calculatePagination(100, 2, 10)
      expect(result.skip).toBe(10)
    })

    it('should calculate correct total pages', () => {
      const result = calculatePagination(100, 1, 10)
      expect(result.totalPages).toBe(10)
    })

    it('should return at least 1 page', () => {
      const result = calculatePagination(0, 1, 10)
      expect(result.totalPages).toBe(1)
    })

    it('should handle non-divisible counts', () => {
      const result = calculatePagination(95, 1, 10)
      expect(result.totalPages).toBe(10) // ceil(95/10) = 10
    })

    it('should handle exact division', () => {
      const result = calculatePagination(100, 1, 25)
      expect(result.totalPages).toBe(4)
    })
  })

  describe('transformRowData', () => {
    const transformRowData = (row: any) => ({
      _id: row._id?.toString() ?? '',
      kode: row.code_input ?? '',
      nama_perusahaan: row.nama_perusahaan ?? '',
      segmen: row.segmen ?? '',
      status_wa: row.broadcast?.status_wa ?? '',
      ke_sales: row.broadcast?.ke_sales ?? '',
      updated_at: row.updated_at
        ? new Date(row.updated_at).toLocaleDateString('id-ID')
        : '',
    })

    it('should handle missing fields gracefully', () => {
      const input = {}
      const result = transformRowData(input)

      expect(result._id).toBe('')
      expect(result.kode).toBe('')
      expect(result.nama_perusahaan).toBe('')
    })

    it('should extract broadcast nested fields', () => {
      const input = {
        broadcast: {
          status_wa: 'Terkirim(1C)',
          ke_sales: 'Arie',
        },
      }
      const result = transformRowData(input)

      expect(result.status_wa).toBe('Terkirim(1C)')
      expect(result.ke_sales).toBe('Arie')
    })

    it('should convert _id to string', () => {
      const input = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
      }
      const result = transformRowData(input)

      expect(result._id).toBe('507f1f77bcf86cd799439011')
    })

    it('should format date to Indonesian locale', () => {
      const input = {
        updated_at: '2025-12-01T10:30:00Z',
      }
      const result = transformRowData(input)

      expect(result.updated_at).not.toBe('')
      expect(typeof result.updated_at).toBe('string')
    })
  })
})
