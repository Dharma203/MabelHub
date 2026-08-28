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
    const col = db.collection('database_b2g')

    // Cari nama_perusahaan yang mengandung kata kunci, case-insensitive
    // distinct supaya tidak muncul duplikat
    const institusiList = await col.distinct('institusiKerja', {
      institusiKerja: {
        $regex: search.trim(),
        $options: 'i',
      },
    })

    // Format response sesuai type Perusahaan di hook
    const result = institusiList
      .filter(Boolean) // buang string kosong
      .map((nama: string, index: number) => ({
        id: index,
        nama,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/institusiKerja] Error:', error)
    return NextResponse.json([])
  }
}