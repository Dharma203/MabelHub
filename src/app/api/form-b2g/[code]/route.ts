import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.trim() === '') {
      return NextResponse.json(
        { error: 'Kode tidak boleh kosong' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('database_b2g')

    const docs = await col.find({ code_input: code.trim() }).toArray()

    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: `Data dengan kode "${code}" tidak ditemukan` },
        { status: 404 }
      )
    }

    // Ambil header dari dokumen pertama (semua dokumen satu kode punya header yang sama)
    const first = docs[0]
    const header = {
      codeInput: first.code_input,
      requestor: first.requestor,
      satuanKerja: first.satuanKerja,
      institusiKerja: first.institusiKerja,
      segmentasi: first.segmentasi,
      provinsi: first.provinsi,
      kota: first.kota,
      alamat: first.alamat,
      klpd: first.klpd,
      ring: first.ring,
      salesInternal: first.salesInternal,
    }

    // Map setiap dokumen sebagai item kontak
    const items = docs.map((doc) => ({
      id: doc._id?.toString() ?? String(Date.now()),
      nama: doc.nama ?? '',
      jabatan: doc.jabatan ?? '',
      role: doc.role ?? '',
      tipeKontak: doc.tipe_kontak ?? '',
      noTelp: doc.no_telp ?? '',
      email: doc.email ?? '',
    }))

    return NextResponse.json({ header, items }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/database_b2g/[code]] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
