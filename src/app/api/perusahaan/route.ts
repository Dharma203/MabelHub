import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''

    if (!search || search.trim().length < 2) {
      return NextResponse.json([])
    }

    const client = await clientPromise
    const db = client.db('MabelHubStaging')
    const col = db.collection('input_database')

    // Cari nama_perusahaan yang mengandung kata kunci, case-insensitive
    // distinct supaya tidak muncul duplikat
    const namaList = await col.distinct('nama_perusahaan', {
      nama_perusahaan: {
        $regex: search.trim(),
        $options: 'i',
      },
    })

    // Format response sesuai type Perusahaan di hook
    const result = namaList
      .filter(Boolean) // buang string kosong
      .map((nama: string, index: number) => ({
        id: index,
        nama,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/perusahaan] Error:', error)
    return NextResponse.json([])
  }
}