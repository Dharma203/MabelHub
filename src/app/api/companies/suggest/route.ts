import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type SuggestionItem = {
  _id: string
  institusiKerja: string
  namaEntitas?: string
  jenisEntitas?: string
  kota: string
  klpd: string
  satuanKerja: string
  ring: string
  pic_default: unknown
}

type RawSuggestion = Record<string, unknown>

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const rawRing = searchParams.get('ring')
    const q = String(searchParams.get('q') ?? '').trim()
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') ?? '10'), 1),
      50,
    )

    if (!rawRing) {
      return NextResponse.json({ error: 'Query ring wajib' }, { status: 400 })
    }

    const ring = rawRing.toUpperCase().replace(/\s+/g, ' ').trim()
    const qRegex = q ? escapeRegex(q) : ''

    const client = await clientPromise
    const db = client.db(getDbName())

    // --- B2G ---
    const filterB2G: Record<string, unknown> = {
      ring,
      institusiKerja: { $exists: true, $ne: '' },
    }
    if (q) {
      filterB2G.institusiKerja = {
        $exists: true,
        $ne: '',
        $regex: qRegex,
        $options: 'i',
      }
    }

    const b2gItems = await db
      .collection('database_b2g')
      .find(filterB2G)
      .sort({ institusiKerja: 1 })
      .limit(limit)
      .project({
        institusiKerja: 1,
        kota: 1,
        klpd: 1,
        satuanKerja: 1,
        ring: 1,
        pic_default: 1,
      })
      .toArray()

    // --- B2B ---
    const filterB2B: Record<string, unknown> = {
      ring,
      namaEntitas: { $exists: true, $ne: '' },
    }
    if (q) {
      filterB2B.namaEntitas = {
        $exists: true,
        $ne: '',
        $regex: qRegex,
        $options: 'i',
      }
    }

    const b2bItems = await db
      .collection('database_b2b')
      .find(filterB2B)
      .sort({ namaEntitas: 1 })
      .limit(limit)
      .project({
        namaEntitas: 1,
        jenisEntitas: 1,
        kota: 1,
        ring: 1,
        pic_default: 1,
      })
      .toArray()

    const visitItems =
      b2gItems.length === 0 && b2bItems.length === 0
        ? await db
            .collection('VisitActivity')
            .find({
              $and: [
                {
                  $or: [{ ring }, { status_ring: ring }],
                },
                q
                  ? {
                      $or: [
                        { institusi_kerja: { $regex: qRegex, $options: 'i' } },
                        { institusiKerja: { $regex: qRegex, $options: 'i' } },
                        { satuan_kerja: { $regex: qRegex, $options: 'i' } },
                        { satuanKerja: { $regex: qRegex, $options: 'i' } },
                        { namaEntitas: { $regex: qRegex, $options: 'i' } },
                        { jenisEntitas: { $regex: qRegex, $options: 'i' } },
                      ],
                    }
                  : {},
              ],
            })
            .sort({ institusi_kerja: 1, namaEntitas: 1 })
            .limit(limit)
            .project({
              institusiKerja: 1,
              institusi_kerja: 1,
              satuanKerja: 1,
              satuan_kerja: 1,
              namaEntitas: 1,
              nama_entitas: 1,
              jenisEntitas: 1,
              jenis_entitas: 1,
              jenis: 1,
              kota: 1,
              kota_kab: 1,
              city: 1,
              ring: 1,
              status_ring: 1,
              pic_default: 1,
            })
            .toArray()
        : []

    // Normalize ke shape yang sama
    const merged: SuggestionItem[] = [
      ...b2gItems.map((x: RawSuggestion) => ({
        _id: String(x._id),
        institusiKerja: text(x.institusiKerja),
        kota: text(x.kota),
        klpd: text(x.klpd),
        satuanKerja: text(x.satuanKerja),
        ring: text(x.ring),
        pic_default: x.pic_default || null,
      })),
      ...b2bItems.map((x: RawSuggestion) => ({
        _id: String(x._id),
        institusiKerja: text(x.namaEntitas),
        namaEntitas: text(x.namaEntitas),
        jenisEntitas: text(x.jenisEntitas),
        kota: text(x.kota),
        klpd: '',
        satuanKerja: '',
        ring: text(x.ring),
        pic_default: x.pic_default || null,
      })),
      ...visitItems.map((x: RawSuggestion) => ({
        _id: String(x._id),
        institusiKerja:
          text(x.institusiKerja) ||
          text(x.institusi_kerja) ||
          text(x.namaEntitas),
        satuanKerja: text(x.satuanKerja) || text(x.satuan_kerja),
        namaEntitas: text(x.namaEntitas) || text(x.nama_entitas),
        jenisEntitas:
          text(x.jenisEntitas) || text(x.jenis_entitas) || text(x.jenis),
        kota: text(x.kota) || text(x.kota_kab) || text(x.city),
        klpd: '',
        ring: text(x.ring) || text(x.status_ring),
        pic_default: x.pic_default || null,
      })),
    ]

    // Dedupe by institusiKerja (case-insensitive), keep first, cap to limit
    const seen = new Set<string>()
    const unique = merged
      .filter((item) => {
        const key = (item.institusiKerja || item.namaEntitas || '').toLowerCase()
        if (!key) return false
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, limit)

    return NextResponse.json({ items: unique })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gagal mengambil suggestion'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
