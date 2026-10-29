import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { normalizeRing } from '@/lib/ring'

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Institusi, Satuan Kerja, and available city data from KLPD only.
export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const klpd = String(searchParams.get('klpd') ?? '').trim()
    const ring = normalizeRing(searchParams.get('ring'))
    const mode = searchParams.get('mode')
    const institusi = String(searchParams.get('institusi') ?? '').trim()
    const satuanKerja = String(searchParams.get('satuan_kerja') ?? '').trim()
    const q = String(searchParams.get('q') ?? '').trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 50)

    if (!klpd) {
      return NextResponse.json({ error: 'klpd wajib' }, { status: 400 })
    }

    const klpdExact = { $regex: `^${escapeRegex(klpd)}$`, $options: 'i' }
    const qRegex = q ? { $regex: escapeRegex(q), $options: 'i' } : null
    const institusiExact = institusi
      ? { $regex: `^${escapeRegex(institusi)}$`, $options: 'i' }
      : null
    const satuanKerjaExact = satuanKerja
      ? { $regex: `^${escapeRegex(satuanKerja)}$`, $options: 'i' }
      : null

    const db = (await clientPromise).db(getDbName())

    if (mode === 'institusi') {
      const institutions = await db.collection('KLPD').distinct('institusi_kerja', {
          klpd: klpdExact,
          institusi_kerja: qRegex
            ? { $nin: [null, ''], ...qRegex }
            : { $nin: [null, ''] },
        })
      const seen = new Map<string, string>()
      for (const raw of institutions) {
        if (typeof raw !== 'string') continue
        const value = raw.trim()
        if (value && !seen.has(value.toLowerCase())) {
          seen.set(value.toLowerCase(), value)
        }
      }
      return NextResponse.json({
        items: [...seen.values()]
          .sort((a, b) => a.localeCompare(b, 'id'))
          .slice(0, limit),
      })
    }

    if (mode === 'kota') {
      if (!institusi || !satuanKerja) {
        return NextResponse.json(
          { error: 'institusi dan satuan_kerja wajib' },
          { status: 400 },
        )
      }
      const filter: Record<string, unknown> = {
        klpd: klpdExact,
        institusi_kerja: institusiExact,
        satuan_kerja: satuanKerjaExact,
      }
      if (qRegex) {
        filter.$or = ['kota', 'kota_kab', 'kota_kabupaten', 'kotaKabupaten', 'city']
          .map((field) => ({ [field]: qRegex }))
      }
      const cityFields = ['kota', 'kota_kab', 'kota_kabupaten', 'kotaKabupaten', 'city']
      const cityValues = await Promise.all(
        cityFields.map((field) => db.collection('KLPD').distinct(field, filter)),
      )
      const seen = new Map<string, string>()
      for (const raw of cityValues.flat()) {
        if (typeof raw !== 'string') continue
        const value = raw.trim()
        if (value && !seen.has(value.toLowerCase())) {
          seen.set(value.toLowerCase(), value)
        }
      }
      return NextResponse.json({
        items: [...seen.values()]
          .sort((a, b) => a.localeCompare(b, 'id'))
          .slice(0, limit),
      })
    }

    const filterClauses: Record<string, unknown>[] = [{
      klpd: klpdExact,
      institusi_kerja: { $nin: [null, ''] },
      satuan_kerja: { $nin: [null, ''] },
    }]
    if (institusiExact) filterClauses[0].institusi_kerja = institusiExact
    if (ring) {
      filterClauses.push({ $or: [
        { ring },
        { status_ring: { $regex: `ring[\\s_-]*${ring.slice(-1)}`, $options: 'i' } },
      ] })
    }
    if (qRegex) {
      filterClauses.push({
        $or: institusiExact
          ? [{ satuan_kerja: qRegex }]
          : [{ institusi_kerja: qRegex }, { satuan_kerja: qRegex }],
      })
    }
    const klpdFilter =
      filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses }

    const rows = await db
      .collection('KLPD')
      .find(klpdFilter)
      .sort({ institusi_kerja: 1, satuan_kerja: 1 })
      .limit(limit)
      .project({
        institusi_kerja: 1,
        satuan_kerja: 1,
        klpd: 1,
        ring: 1,
        status_ring: 1,
        kota: 1,
        kota_kab: 1,
        kota_kabupaten: 1,
        kotaKabupaten: 1,
        city: 1,
        pic_default: 1,
      })
      .toArray()
    const seen = new Set<string>()
    const items = rows
      .map((row) => ({
        _id: String(row._id),
        source: 'klpd' as const,
        institusiKerja: String(row.institusi_kerja ?? ''),
        satuanKerja: String(row.satuan_kerja ?? ''),
        kota: String(
          row.kota ??
            row.kota_kab ??
            row.kota_kabupaten ??
            row.kotaKabupaten ??
            row.city ??
            '',
        ),
        klpd: String(row.klpd ?? ''),
        ring: normalizeRing(row.ring ?? row.status_ring),
        pic_default: row.pic_default ?? null,
      }))
      .filter((item) => {
        const key = `${item.institusiKerja}|${item.satuanKerja}`.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })

    return NextResponse.json({ items })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gagal mengambil data KLPD'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
