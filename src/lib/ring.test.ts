import { normalizeRing } from './ring'

describe('normalizeRing', () => {
  it.each([
    ['B2G-RING 1', 'RING 1'],
    ['ring2:', 'RING 2'],
    ['prefix_RING-3_suffix', 'RING 3'],
    ['RING 4', 'RING 4'],
  ])('normalizes %s', (value, expected) => {
    expect(normalizeRing(value)).toBe(expected)
  })

  it('rejects unsupported values', () => {
    expect(normalizeRing('B2G-RING 5')).toBe('')
  })
})
