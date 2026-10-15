/**
 * @jest-environment node
 */
import {
  validateFormFieldsB2G,
  validateContactItemsB2G,
} from '@/utils/formValidationB2G'

describe('formValidationB2G (test folder)', () => {
  it('returns error when required header missing', () => {
    const res = validateFormFieldsB2G({
      requestor: '',
      satuanKerja: '',
      institusiKerja: 'Inst',
      provinsi: 'P',
      kota: 'K',
      alamat: 'A',
      klpd: 'KLPD',
      ring: 'R',
      salesInternal: '',
    })

    expect(res).not.toBeNull()
    expect(res?.field).toBe('Penginput')
  })

  it('requires salesInternal when requestor === "Sales Internal"', () => {
    const res = validateFormFieldsB2G({
      requestor: 'Sales Internal',
      satuanKerja: 'S',
      institusiKerja: 'I',
      provinsi: 'P',
      kota: 'K',
      alamat: 'A',
      klpd: 'KLPD',
      ring: 'R',
      salesInternal: '',
    })

    expect(res).not.toBeNull()
    expect(res?.field).toBe('Sales Internal')
  })

  it('validates contact items and returns null for valid items', () => {
    const items = [
      { nama: 'A', jabatan: 'J', role: 'R', tipeKontak: 'WhatsApp', noTelp: '8123', email: '' },
    ]

    const res = validateContactItemsB2G(items as any)
    expect(res).toBeNull()
  })

  it('returns contact error when nama missing', () => {
    const items = [
      { nama: '', jabatan: 'J', role: 'R', tipeKontak: 'WhatsApp', noTelp: '8123', email: '' },
    ]

    const res = validateContactItemsB2G(items as any)
    expect(res).not.toBeNull()
    expect(res?.field).toBe('Nama Lengkap')
  })
})
