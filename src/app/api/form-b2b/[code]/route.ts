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
    const col = db.collection('database_b2b')

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
      jenisEntitas: first.jenisEntitas,
      namaEntitas: first.namaEntitas,
      provinsi: first.provinsi,
      kota: first.kota,
      alamat: first.alamat,
      bidangUsaha: first.bidangUsaha,
      ring: first.ring,
      produkRelevan: first.produkRelevan,
      merekTayang: first.merekTayang,
      merekLainnya: first.merekLainnya,
      brandOwner: first.brandOwner,
      sumberData: first.sumberData,
      linkProduk: first.linkProduk,
      linkToko: first.linkToko,
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
    console.error('[GET /api/database_b2b/[code]] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
