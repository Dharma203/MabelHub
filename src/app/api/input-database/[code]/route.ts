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
    const db = client.db('MabelHub')
    const col = db.collection('input_database')

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
      assignedToUserId: first.assigned_to,
      segmen: first.segmen,
      namaPerusahaan: first.nama_perusahaan,
      provinsi: first.provinsi,
      kota: first.kota,
      alamat: first.alamat,
      bidangPerusahaan: first.bidang_perusahaan,
      segmentasi: first.segmentasi,
      produkRelevan: first.produk_relevan,
      merekTayang: first.merek_tayang,
      merekLainnya: first.merek_lainnya,
      brandOwner: first.brand_owner,
      sumberData: first.sumber_data,
      salesInternal: first.sales_internal,
      linkProduk: first.link_produk,
      linkToko: first.link_toko,
    }

    // Map setiap dokumen sebagai item kontak
    const items = docs.map((doc) => ({
      id: doc._id?.toString() ?? String(Date.now()),
      nama: doc.nama ?? '',
      jabatan: doc.jabatan ?? '',
      tipeKontak: doc.tipe_kontak ?? '',
      noTelp: doc.no_telp ?? '',
      email: doc.email ?? '',
    }))

    return NextResponse.json({ header, items }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/input-database/[code]] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
