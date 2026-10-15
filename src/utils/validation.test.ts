import { computeChangedFields } from '@/utils/validation'

describe('computeChangedFields', () => {
  describe('null snapshot handling', () => {
    it('should return empty array when oldSnap is null', () => {
      const result = computeChangedFields(null, { requestor: 'John' }, [])
      expect(result).toEqual([])
    })
  })

  describe('header field changes', () => {
    it('should detect single field change', () => {
      const oldSnap = {
        header: { requestor: 'John', segmen: 'PT', namaPerusahaan: 'ABC Corp' },
        items: [],
      }
      const newHeader = { requestor: 'Jane', segmen: 'PT', namaPerusahaan: 'ABC Corp' }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result).toContainEqual({
        field: 'Penginput',
        oldValue: 'John',
        newValue: 'Jane',
      })
    })

    it('should detect multiple field changes', () => {
      const oldSnap = {
        header: {
          requestor: 'John',
          provinsi: 'Jawa Barat',
          alamat: 'Jl. A',
        },
        items: [],
      }
      const newHeader = {
        requestor: 'Jane',
        provinsi: 'Jawa Timur',
        alamat: 'Jl. B',
      }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result.length).toBe(3)
    })

    it('should not detect changes for identical values', () => {
      const oldSnap = {
        header: { requestor: 'John', segmen: 'PT' },
        items: [],
      }
      const newHeader = { requestor: 'John', segmen: 'PT' }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result).toEqual([])
    })

    it('should handle empty string to value change', () => {
      const oldSnap = {
        header: { requestor: '', alamat: 'Jl. A' },
        items: [],
      }
      const newHeader = { requestor: 'John', alamat: 'Jl. A' }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result).toContainEqual({
        field: 'Penginput',
        oldValue: '',
        newValue: 'John',
      })
    })

    it('should handle value to empty string change', () => {
      const oldSnap = {
        header: { requestor: 'John', alamat: 'Jl. A' },
        items: [],
      }
      const newHeader = { requestor: '', alamat: 'Jl. A' }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result).toContainEqual({
        field: 'Penginput',
        oldValue: 'John',
        newValue: '',
      })
    })

    it('should handle null/undefined values as empty strings', () => {
      const oldSnap = {
        header: { requestor: undefined as any, alamat: 'Jl. A' },
        items: [],
      }
      const newHeader = { requestor: 'John', alamat: 'Jl. A' }

      const result = computeChangedFields(oldSnap, newHeader, [])
      expect(result).toContainEqual({
        field: 'Penginput',
        oldValue: '',
        newValue: 'John',
      })
    })
  })

  describe('contact item additions', () => {
    it('should detect new contact added', () => {
      const oldSnap = { header: {}, items: [] }
      const newItems = [{ nama: 'Budi', jabatan: 'Manager', tipeKontak: '', noTelp: '', email: '' }]

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result).toContainEqual({
        field: 'Kontak 1',
        oldValue: '(tidak ada)',
        newValue: 'Budi – Manager',
      })
    })

    it('should detect multiple contacts added', () => {
      const oldSnap = { header: {}, items: [] }
      const newItems = [
        { nama: 'Budi', jabatan: 'Manager', tipeKontak: '', noTelp: '', email: '' },
        { nama: 'Ani', jabatan: 'Staff', tipeKontak: '', noTelp: '', email: '' },
      ]

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result.length).toBe(2)
      expect(result[0].field).toBe('Kontak 1')
      expect(result[1].field).toBe('Kontak 2')
    })
  })

  describe('contact item deletions', () => {
    it('should detect contact removed', () => {
      const oldSnap = {
        header: {},
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: '', noTelp: '', email: '' },
        ],
      }
      const newItems: any[] = []

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result).toContainEqual({
        field: 'Kontak 1',
        oldValue: 'Budi – Manager',
        newValue: '(dihapus)',
      })
    })
  })

  describe('contact field changes', () => {
    it('should detect contact name change', () => {
      const oldSnap = {
        header: {},
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
        ],
      }
      const newItems = [
        { nama: 'Ahmad', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
      ]

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result).toContainEqual({
        field: 'Kontak 1 – Nama',
        oldValue: 'Budi',
        newValue: 'Ahmad',
      })
    })

    it('should detect multiple contact field changes', () => {
      const oldSnap = {
        header: {},
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
        ],
      }
      const newItems = [
        { nama: 'Ahmad', jabatan: 'Direktur', tipeKontak: 'WhatsApp', noTelp: '081234567890', email: 'budi@mail.com' },
      ]

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result.length).toBe(3) // nama, jabatan, tipeKontak
    })

    it('should not report changes for identical contacts', () => {
      const oldSnap = {
        header: {},
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
        ],
      }
      const newItems = [
        { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
      ]

      const result = computeChangedFields(oldSnap, {}, newItems)
      expect(result).toEqual([])
    })
  })

  describe('complex scenarios', () => {
    it('should handle header and contact changes together', () => {
      const oldSnap = {
        header: { requestor: 'John', alamat: 'Jl. A' },
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
        ],
      }
      const newHeader = { requestor: 'Jane', alamat: 'Jl. A' }
      const newItems = [
        { nama: 'Ahmad', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
      ]

      const result = computeChangedFields(oldSnap, newHeader, newItems)
      expect(result.length).toBe(2) // requestor change + nama contact change
    })

    it('should handle full revision with additions and deletions', () => {
      const oldSnap = {
        header: { requestor: 'John' },
        items: [
          { nama: 'Budi', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
          { nama: 'Ani', jabatan: 'Staff', tipeKontak: 'WhatsApp', noTelp: '082345678901', email: 'ani@mail.com' },
        ],
      }
      const newHeader = { requestor: 'Jane' }
      const newItems = [
        { nama: 'Ahmad', jabatan: 'Manager', tipeKontak: 'Office', noTelp: '081234567890', email: 'budi@mail.com' },
      ]

      const result = computeChangedFields(oldSnap, newHeader, newItems)
      // requestor change, nama contact 1 change, contact 2 deletion
      expect(result.length).toBe(3)
    })
  })
})
