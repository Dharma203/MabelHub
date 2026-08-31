import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

/**
 * GET /api/input-database/history/[code]
 * Mengambil entri history terbaru dari input_database_history
 * berdasarkan code_input (e.g. "YTK-121225-0150")
 */
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
    const col = db.collection('input_database_history')

    // Ambil entri terbaru (sort revised_at descending, limit 1)
    const latest = await col
      .find({ code_input: code.trim() })
      .sort({ revised_at: -1 })
      .limit(1)
      .toArray()

    if (!latest || latest.length === 0) {
      return NextResponse.json(
        { found: false, message: 'Belum ada riwayat revisi untuk kode ini' },
        { status: 200 }
      )
    }

    const doc = latest[0]

    return NextResponse.json(
      {
        found: true,
        code_input: doc.code_input,
        revised_by: doc.revised_by ?? '-',
        revised_at: doc.revised_at ?? null,
        changed_fields: doc.changed_fields ?? [],
        snapshot_before: doc.snapshot_before ?? null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/input-database/history/[code]] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
