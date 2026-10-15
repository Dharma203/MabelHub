import { exactText, statusText } from './visit-filter-utils'

describe('visit filter utilities', () => {
  it('matches exact text without case sensitivity or regex injection', () => {
    const query = exactText('  Abhitama.Engineering  ')

    expect(query.$regex).toEqual(/^Abhitama\.Engineering$/i)
    expect(query.$regex.test('ABHITAMA.ENGINEERING')).toBe(true)
    expect(query.$regex.test('AbhitamaXEngineering')).toBe(false)
  })

  it.each(['Not Visited', 'NOT VISITED', 'not_visited', 'NOT-VISIT'])(
    'matches not visited variant: %s',
    (value) => {
      const query = statusText(value)

      expect(query.$regex.test('Not Visited')).toBe(true)
      expect(query.$regex.test('NOT_VISITED')).toBe(true)
      expect(query.$regex.test('Belum Visited')).toBe(true)
      expect(query.$regex.test('Visited')).toBe(false)
    },
  )

  it('matches ordinary statuses with flexible separators', () => {
    const query = statusText('Stay Office')

    expect(query.$regex.test('stay_office')).toBe(true)
    expect(query.$regex.test('STAY-OFFICE')).toBe(true)
    expect(query.$regex.test('Stay Office Extra')).toBe(false)
  })
})
