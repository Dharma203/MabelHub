import { getDetailOptions, listStatusUpdate, listStatusByUpdate } from '@/data/statusupdatebroadcast'

describe('getDetailOptions', () => {
  describe('cascading filter functionality', () => {
    it('should return all detail options when selectedStatus is empty', () => {
      const result = getDetailOptions('')
      expect(result[0]).toEqual({ value: '', label: '-- Pilih Detail --' })
      expect(result.length).toBe(listStatusUpdate.length + 1)
    })

    it('should filter options for "Respon Positif" status', () => {
      const result = getDetailOptions('Respon Positif')
      const positiveUpdates = listStatusUpdate.filter((w) => w.status === 'Respon Positif')

      expect(result[0]).toEqual({ value: '', label: '-- Pilih Detail --' })
      expect(result.length).toBe(positiveUpdates.length + 1)
    })

    it('should filter options for "Respon Negatif" status', () => {
      const result = getDetailOptions('Respon Negatif')
      const negativeUpdates = listStatusUpdate.filter((w) => w.status === 'Respon Negatif')

      expect(result[0]).toEqual({ value: '', label: '-- Pilih Detail --' })
      expect(result.length).toBe(negativeUpdates.length + 1)
    })

    it('should filter options for "Respon Netral" status', () => {
      const result = getDetailOptions('Respon Netral')
      const neutralUpdates = listStatusUpdate.filter((w) => w.status === 'Respon Netral')

      expect(result[0]).toEqual({ value: '', label: '-- Pilih Detail --' })
      expect(result.length).toBe(neutralUpdates.length + 1)
    })
  })

  describe('returned option format', () => {
    it('should return objects with value and label properties', () => {
      const result = getDetailOptions('Respon Positif')
      result.forEach((option) => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })

    it('should have placeholder as first option', () => {
      const result = getDetailOptions('Respon Positif')
      expect(result[0].value).toBe('')
      expect(result[0].label).toBe('-- Pilih Detail --')
    })
  })

  describe('edge cases', () => {
    it('should return all options including placeholder for null status', () => {
      const result = getDetailOptions('')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should return consistent results for same status', () => {
      const result1 = getDetailOptions('Respon Positif')
      const result2 = getDetailOptions('Respon Positif')
      expect(result1).toEqual(result2)
    })

    it('should return empty filtered list for non-existent status', () => {
      const result = getDetailOptions('NonExistentStatus')
      expect(result).toEqual([{ value: '', label: '-- Pilih Detail --' }])
    })
  })

  describe('data integrity', () => {
    it('should preserve all detail updates for Respon Positif status', () => {
      const result = getDetailOptions('Respon Positif')
      const positiveUpdates = listStatusUpdate
        .filter((w) => w.status === 'Respon Positif')
        .map((w) => w.update)

      const resultValues = result.slice(1).map((o) => o.value)
      expect(resultValues).toEqual(positiveUpdates)
    })

    it('should not include updates from other statuses', () => {
      const result = getDetailOptions('Respon Positif')
      const negativeUpdate = listStatusUpdate.find((w) => w.status === 'Respon Negatif')

      if (negativeUpdate) {
        const hasNegativeUpdate = result.some((o) => o.value === negativeUpdate.update)
        expect(hasNegativeUpdate).toBe(false)
      }
    })
  })
})

describe('listStatusByUpdate', () => {
  describe('unique statuses', () => {
    it('should contain only unique status values', () => {
      const statuses = listStatusByUpdate.slice(1).map((o) => o.value)
      const uniqueStatuses = new Set(statuses)
      expect(statuses.length).toBe(uniqueStatuses.size)
    })

    it('should include placeholder as first option', () => {
      expect(listStatusByUpdate[0]).toEqual({ value: '', label: '-- Pilih Status --' })
    })

    it('should be sorted alphabetically', () => {
      const statuses = listStatusByUpdate.slice(1).map((o) => o.value)
      const sortedStatuses = [...statuses].sort()
      expect(statuses).toEqual(sortedStatuses)
    })
  })
})
