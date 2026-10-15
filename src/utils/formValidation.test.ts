import { validateFormFields, validateContactItems, type ContactItem } from '@/utils/formValidation'

describe('validateFormFields', () => {
  const validData = {
    requestor: 'John Doe',
    segmen: 'PT',
    namaPerusahaan: 'ABC Company',
    provinsi: 'Jawa Barat',
    kota: 'Bandung',
    alamat: 'Jl. Sudirman No. 123',
    bidangPerusahaan: 'Teknologi & Digital',
    segmentasi: 'B2B',
    produkRelevan: 'IFP',
    merekTayang: 'HDe',
    brandOwner: 'YA',
    sumberData: 'e-Katalog LKPP',
    linkProduk: 'https://example.com/produk',
    linkToko: 'https://example.com/toko',
    merekLainnya: '',
    salesInternal: '',
  }

  describe('valid data', () => {
    it('should return null for valid form data', () => {
      const result = validateFormFields(validData)
      expect(result).toBeNull()
    })

    it('should accept valid data with all fields filled', () => {
      const result = validateFormFields(validData)
      expect(result).toBeNull()
    })
  })

  describe('required field validation', () => {
    it('should fail when requestor is empty', () => {
      const data = { ...validData, requestor: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Requestor')
    })

    it('should fail when segmen is empty', () => {
      const data = { ...validData, segmen: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Segmen')
    })

    it('should fail when namaPerusahaan is empty', () => {
      const data = { ...validData, namaPerusahaan: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Nama Perusahaan')
    })

    it('should fail when provinsi is empty', () => {
      const data = { ...validData, provinsi: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Provinsi')
    })

    it('should fail when kota is empty', () => {
      const data = { ...validData, kota: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Kota')
    })

    it('should fail when alamat is empty', () => {
      const data = { ...validData, alamat: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Alamat')
    })

    it('should fail when bidangPerusahaan is empty', () => {
      const data = { ...validData, bidangPerusahaan: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Bidang Perusahaan')
    })

    it('should fail when segmentasi is empty', () => {
      const data = { ...validData, segmentasi: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Segmentasi')
    })

    it('should fail when produkRelevan is empty', () => {
      const data = { ...validData, produkRelevan: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Produk Relevan')
    })

    it('should fail when merekTayang is empty', () => {
      const data = { ...validData, merekTayang: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Merek Tayang')
    })

    it('should fail when brandOwner is empty', () => {
      const data = { ...validData, brandOwner: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Brand Owner')
    })

    it('should fail when sumberData is empty', () => {
      const data = { ...validData, sumberData: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Sumber Data')
    })

    it('should fail when linkProduk is empty', () => {
      const data = { ...validData, linkProduk: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Link Produk')
    })

    it('should fail when linkToko is empty', () => {
      const data = { ...validData, linkToko: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Link Toko')
    })
  })

  describe('conditional field validation', () => {
    it('should require merekLainnya when merekTayang is "Lainnya"', () => {
      const data = { ...validData, merekTayang: 'Lainnya', merekLainnya: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Merek Lainnya')
    })

    it('should not require merekLainnya when merekTayang is not "Lainnya"', () => {
      const data = { ...validData, merekTayang: 'HDe', merekLainnya: '' }
      const result = validateFormFields(data)
      expect(result).toBeNull()
    })

    it('should require salesInternal when sumberData is "Sales Internal"', () => {
      const data = { ...validData, sumberData: 'Sales Internal', salesInternal: '' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Sales Internal')
    })

    it('should not require salesInternal when sumberData is not "Sales Internal"', () => {
      const data = { ...validData, sumberData: 'e-Katalog LKPP', salesInternal: '' }
      const result = validateFormFields(data)
      expect(result).toBeNull()
    })

    it('should allow merekLainnya to be empty when merekTayang is "HDe"', () => {
      const data = { ...validData, merekTayang: 'HDe', merekLainnya: '' }
      const result = validateFormFields(data)
      expect(result).toBeNull()
    })
  })

  describe('whitespace handling', () => {
    it('should not accept fields with only whitespace', () => {
      const data = { ...validData, requestor: '   ' }
      const result = validateFormFields(data)
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Requestor')
    })

    it('should accept fields with whitespace trimmed correctly', () => {
      const data = { ...validData, requestor: '  John Doe  ' }
      const result = validateFormFields(data)
      expect(result).toBeNull()
    })
  })

  describe('error messages', () => {
    it('should return descriptive error message', () => {
      const data = { ...validData, requestor: '' }
      const result = validateFormFields(data)
      expect(result?.message).toContain('Requestor')
      expect(result?.message).toContain('wajib diisi')
    })

    it('should include field name in error message', () => {
      const data = { ...validData, provinsi: '' }
      const result = validateFormFields(data)
      expect(result?.message).toContain('Provinsi')
    })
  })
})

describe('validateContactItems', () => {
  const validContact: ContactItem = {
    nama: 'Budi Santoso',
    jabatan: 'Manager',
    tipeKontak: 'WhatsApp',
    noTelp: '081234567890',
    email: 'budi@example.com',
  }

  describe('valid contacts', () => {
    it('should return null for valid single contact', () => {
      const result = validateContactItems([validContact])
      expect(result).toBeNull()
    })

    it('should return null for multiple valid contacts', () => {
      const contacts = [
        validContact,
        { ...validContact, nama: 'Ahmad' },
        { ...validContact, nama: 'Siti' },
      ]
      const result = validateContactItems(contacts)
      expect(result).toBeNull()
    })
  })

  describe('required field validation', () => {
    it('should fail when contact name is empty', () => {
      const contact = { ...validContact, nama: '' }
      const result = validateContactItems([contact])
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Nama Lengkap')
      expect(result?.index).toBe(0)
    })

    it('should fail when tipeKontak is empty', () => {
      const contact = { ...validContact, tipeKontak: '' }
      const result = validateContactItems([contact])
      expect(result).not.toBeNull()
      expect(result?.field).toBe('Tipe Kontak')
      expect(result?.index).toBe(0)
    })

    it('should fail when noTelp is empty', () => {
      const contact = { ...validContact, noTelp: '' }
      const result = validateContactItems([contact])
      expect(result).not.toBeNull()
      expect(result?.field).toBe('No Kontak')
      expect(result?.index).toBe(0)
    })
  })

  describe('multiple contacts error detection', () => {
    it('should identify error in second contact', () => {
      const contacts = [
        validContact,
        { ...validContact, nama: '', jabatan: 'Manager' },
      ]
      const result = validateContactItems(contacts)
      expect(result).not.toBeNull()
      expect(result?.index).toBe(1)
    })

    it('should identify error in third contact', () => {
      const contacts = [
        validContact,
        { ...validContact, nama: 'Ahmad' },
        { ...validContact, tipeKontak: '', nama: 'Siti' },
      ]
      const result = validateContactItems(contacts)
      expect(result).not.toBeNull()
      expect(result?.index).toBe(2)
    })

    it('should return error for first invalid contact only', () => {
      const contacts = [
        validContact,
        { ...validContact, nama: '', jabatan: 'Manager' },
        { ...validContact, tipeKontak: '', nama: 'Siti' },
      ]
      const result = validateContactItems(contacts)
      expect(result?.index).toBe(1)
    })
  })

  describe('error messages', () => {
    it('should include contact number in error message', () => {
      const contact = { ...validContact, nama: '' }
      const result = validateContactItems([contact])
      expect(result?.message).toContain('Kontak 1')
    })

    it('should include field name in error message', () => {
      const contact = { ...validContact, nama: '' }
      const result = validateContactItems([contact])
      expect(result?.message).toContain('Nama Lengkap')
    })

    it('should include wajib diisi message', () => {
      const contact = { ...validContact, tipeKontak: '' }
      const result = validateContactItems([contact])
      expect(result?.message).toContain('wajib diisi')
    })
  })

  describe('whitespace handling', () => {
    it('should reject nama with only whitespace', () => {
      const contact = { ...validContact, nama: '   ' }
      const result = validateContactItems([contact])
      expect(result).not.toBeNull()
    })

    it('should accept nama with trimmed whitespace', () => {
      const contact = { ...validContact, nama: '  Budi Santoso  ' }
      const result = validateContactItems([contact])
      expect(result).toBeNull()
    })
  })

  describe('email and jabatan optional fields', () => {
    it('should accept contact without email', () => {
      const contact = { ...validContact, email: '' }
      const result = validateContactItems([contact])
      expect(result).toBeNull()
    })

    it('should accept contact without jabatan', () => {
      const contact = { ...validContact, jabatan: '' }
      const result = validateContactItems([contact])
      expect(result).toBeNull()
    })
  })
})
