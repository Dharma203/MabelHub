/**
 * @jest-environment node
 */
import { computeChangedFields } from '@/utils/validation'

describe('computeChangedFields (test folder)', () => {
  it('returns empty when oldSnap is null', () => {
    const res = computeChangedFields(null, {}, [])
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(0)
  })

  it('detects header field changes', () => {
    const oldSnap = { header: { provinsi: 'A' }, items: [] }
    const newHeader = { provinsi: 'B' }

    const res = computeChangedFields(oldSnap as any, newHeader as any, [])
    expect(res.some((c) => c.field === 'Provinsi')).toBe(true)
  })

  it('detects added and removed contacts and field diffs', () => {
    const oldSnap = {
      header: {},
      items: [
        { nama: 'Old', jabatan: 'Head', tipeKontak: 'Phone', noTelp: '081', email: 'a@a' },
      ],
    }
    const newItems = [
      { nama: 'New', jabatan: 'Staff', tipeKontak: 'WhatsApp', noTelp: '082', email: 'b@b' },
    ]

    const res = computeChangedFields(oldSnap as any, {}, newItems as any)
    expect(res.find((c) => c.field.includes('Kontak 1'))).toBeDefined()
  })
})
