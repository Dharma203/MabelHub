import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { normalizeRing } from '@/lib/ring'

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Institusi + Satuan Kerja + Kota combos bound to one KLPD,
// from database_b2g (master) first, then VisitActivity (history).
export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const klpd = String(searchParams.get('klpd') ?? '').trim()
    const ring = normalizeRing(searchParams.get('ring'))
    const q = String(searchParams.get('q') ?? '').trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 50)

    if (!klpd) {
      return NextResponse.json({ error: 'klpd wajib' }, { status: 400 })
    }

    const klpdExact = { $regex: `^${escapeRegex(klpd)}$`, $options: 'i' }
    const qRegex = q ? { $regex: escapeRegex(q), $options: 'i' } : null

    const b2gFilter: Record<string, unknown> = {
      klpd: klpdExact,
      institusiKerja: { $nin: [null, ''] },
      satuanKerja: { $nin: [null, ''] },
    }
    if (ring) b2gFilter.ring = ring
    if (qRegex) b2gFilter.$or = [{ institusiKerja: qRegex }, { satuanKerja: qRegex }]

    const visitMatch: Record<string, unknown> = {
      klpd: klpdExact,
      institusi_kerja: { $nin: [null, ''] },
      satuan_kerja: { $nin: [null, ''] },
    }
    if (ring) {
      visitMatch.status_ring = { $regex: `ring[\\s_-]*${ring.slice(-1)}`, $options: 'i' }
    }
    if (qRegex) visitMatch.$or = [{ institusi_kerja: qRegex }, { satuan_kerja: qRegex }]

    const db = (await clientPromise).db(getDbName())
    const [b2gRows, visitRows] = await Promise.all([
      db
        .collection('database_b2g')
        .find(b2gFilter)
        .sort({ institusiKerja: 1, satuanKerja: 1 })
        .limit(limit)
        .project({ institusiKerja: 1, satuanKerja: 1, kota: 1, klpd: 1, ring: 1, pic_default: 1 })
        .toArray(),
      db
        .collection('VisitActivity')
        .aggregate([
          { $match: visitMatch },
          { $sort: { created_at: -1 } },
          {
            $group: {
              _id: { i: '$institusi_kerja', s: '$satuan_kerja' },
              kota: { $first: '$city' },
              klpd: { $first: '$klpd' },
              ring: { $first: '$status_ring' },
              pic_name: { $first: '$pic_name' },
              pic_phone: { $first: '$pic_phone' },
              pic_position: { $first: '$pic_position' },
              pic_role: { $first: '$pic_role' },
            },
          },
          { $sort: { '_id.i': 1, '_id.s': 1 } },
          { $limit: limit },
        ])
        .toArray(),
    ])

    const merged = [
      ...b2gRows.map((x) => ({
        _id: String(x._id),
        source: 'b2g' as const,
        institusiKerja: String(x.institusiKerja ?? ''),
        satuanKerja: String(x.satuanKerja ?? ''),
        kota: String(x.kota ?? ''),
        klpd: String(x.klpd ?? ''),
        ring: normalizeRing(x.ring),
        pic_default: x.pic_default ?? null,
      })),
      ...visitRows.map((x) => ({
        _id: `visit:${x._id.i}|${x._id.s}`,
        source: 'visit' as const,
        institusiKerja: String(x._id.i ?? ''),
        satuanKerja: String(x._id.s ?? ''),
        kota: String(x.kota ?? ''),
        klpd: String(x.klpd ?? ''),
        ring: normalizeRing(x.ring),
        pic_default: {
          nama: x.pic_name ?? '',
          no_telp: x.pic_phone ?? '',
          jabatan: x.pic_position ?? '',
          role: x.pic_role ?? '',
        },
      })),
    ]

    const seen = new Set<string>()
    const items = merged
      .filter((it) => {
        const key = `${it.institusiKerja}|${it.satuanKerja}`.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, limit)

    return NextResponse.json({ items })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gagal mengambil data KLPD'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
