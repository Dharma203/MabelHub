/**
 * @jest-environment node
 */
import {
  validateFormFieldsB2B,
  validateContactItemsB2B,
} from '@/utils/formValidationB2B'

describe('formValidationB2B (test folder)', () => {
  it('returns error when required header missing', () => {
    const res = validateFormFieldsB2B({
      requestor: '',
      jenisEntitas: 'PT',
      namaEntitas: '',
      bidangUsaha: 'X',
      provinsi: 'P',
      kota: 'K',
      alamat: 'A',
      ring: 'R',
      produkRelevan: 'PR',
      merekTayang: 'M',
      brandOwner: 'B',
      sumberData: 'S',
      linkProduk: '',
      linkToko: '',
      salesInternal: '',
    })

    expect(res).not.toBeNull()
    expect(res?.field).toBe('Penginput')
  })

  it('requires salesInternal when requestor === "Sales Internal"', () => {
    const res = validateFormFieldsB2B({
      requestor: 'Sales Internal',
      jenisEntitas: 'PT',
      namaEntitas: 'N',
      bidangUsaha: 'B',
      provinsi: 'P',
      kota: 'K',
      alamat: 'A',
      ring: 'R',
      produkRelevan: 'PR',
      merekTayang: 'M',
      brandOwner: 'B',
      sumberData: 'S',
      linkProduk: '',
      linkToko: '',
      salesInternal: '',
    })

    expect(res).not.toBeNull()
    expect(res?.field).toBe('Sales Internal')
  })

  it('validates contact items and returns null for valid items', () => {
    const items = [
      { nama: 'A', jabatan: 'J', role: 'R', tipeKontak: 'Phone', noTelp: '8123', email: '' },
    ]

    const res = validateContactItemsB2B(items as any)
    expect(res).toBeNull()
  })

  it('returns contact error when noTelp missing', () => {
    const items = [
      { nama: 'Name', jabatan: 'J', role: 'R', tipeKontak: 'Phone', noTelp: '', email: '' },
    ]

    const res = validateContactItemsB2B(items as any)
    expect(res).not.toBeNull()
    expect(res?.field).toBe('No Kontak')
  })
})
