import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function text(v: unknown) {
  return typeof v === 'string' ? v : ''
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const rawRing = searchParams.get('ring')
    const institusi = String(searchParams.get('institusi') ?? '').trim()
    const q = String(searchParams.get('q') ?? '').trim()
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') ?? '10'), 1),
      50,
    )

    if (!rawRing) {
      return NextResponse.json(
        { error: 'ring wajib' },
        { status: 400 },
      )
    }

    const ring = rawRing.toUpperCase().replace(/\s+/g, ' ').trim()
    const institusiRegex = institusi
      ? { $regex: escapeRegex(institusi), $options: 'i' }
      : null

    const client = await clientPromise
    const db = client.db(getDbName())

    const qRegex = q ? { $regex: escapeRegex(q), $options: 'i' } : null

    // --- B2G ---
    const b2gFilter: Record<string, unknown> = {
      ring,
      satuanKerja: { $exists: true, $ne: '' },
    }
    if (institusiRegex) b2gFilter.institusiKerja = institusiRegex
    if (qRegex) b2gFilter.satuanKerja = qRegex

    // --- B2B ---
    const b2bFilter: Record<string, unknown> = {
      ring,
      namaEntitas: { $exists: true, $ne: '' },
    }
    if (institusiRegex) b2bFilter.namaEntitas = institusiRegex
    if (qRegex) {
      b2bFilter.$or = [{ namaEntitas: qRegex }]
    }

    // --- VisitActivity ---
    const visitMatch: Record<string, unknown>[] = [
      { $or: [{ ring }, { status_ring: ring }] },
    ]
    if (institusiRegex) {
      visitMatch.push({
        $or: [
          { institusi_kerja: institusiRegex },
          { institusiKerja: institusiRegex },
          { namaEntitas: institusiRegex },
        ],
      })
    }
    if (qRegex) {
      visitMatch.push({
        $or: [
          { satuan_kerja: qRegex },
          { satuanKerja: qRegex },
          { namaEntitas: qRegex },
        ],
      })
    }

    const [b2gItems, b2bItems, visitItems] = await Promise.all([
      db
        .collection('database_b2g')
        .find(b2gFilter)
        .sort({ satuanKerja: 1 })
        .limit(limit)
        .project({
          satuanKerja: 1,
          institusiKerja: 1,
          kota: 1,
          klpd: 1,
          ring: 1,
          pic_default: 1,
        })
        .toArray(),
      db
        .collection('database_b2b')
        .find(b2bFilter)
        .sort({ namaEntitas: 1 })
        .limit(limit)
        .project({ namaEntitas: 1, kota: 1, ring: 1, pic_default: 1 })
        .toArray(),
      db
        .collection('VisitActivity')
        .find({ $and: visitMatch })
        .sort({ satuan_kerja: 1, satuanKerja: 1 })
        .limit(limit)
        .project({
          satuanKerja: 1,
          satuan_kerja: 1,
          institusiKerja: 1,
          institusi_kerja: 1,
          namaEntitas: 1,
          kota: 1,
          city: 1,
          klpd: 1,
          ring: 1,
          status_ring: 1,
          pic_default: 1,
        })
        .toArray(),
    ])

    type Row = Record<string, unknown>

    const merged = [
      ...b2gItems.map((row: Row) => ({
        _id: String(row._id ?? ''),
        satuanKerja: text(row.satuanKerja),
        institusiKerja: text(row.institusiKerja),
        kota: text(row.kota),
        klpd: text(row.klpd),
        ring: text(row.ring),
        pic_default: row.pic_default ?? null,
      })),
      ...b2bItems.map((row: Row) => ({
        _id: String(row._id ?? ''),
        satuanKerja: text(row.namaEntitas),
        institusiKerja: '',
        kota: text(row.kota),
        klpd: '',
        ring: text(row.ring),
        pic_default: row.pic_default ?? null,
      })),
      ...visitItems.map((row: Row) => ({
        _id: String(row._id ?? ''),
        satuanKerja:
          text(row.satuanKerja) || text(row.satuan_kerja) || text(row.namaEntitas),
        institusiKerja:
          text(row.institusiKerja) || text(row.institusi_kerja),
        namaEntitas: text(row.namaEntitas),
        kota: text(row.kota) || text(row.city),
        klpd: text(row.klpd),
        ring: text(row.ring) || text(row.status_ring),
        pic_default: row.pic_default ?? null,
      })),
    ]

    const seen = new Set<string>()
    const unique = merged
      .filter((item) => {
        const key = item.satuanKerja.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, limit)

    return NextResponse.json({ items: unique })
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Gagal mengambil satuan kerja'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
