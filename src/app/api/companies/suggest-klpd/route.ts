import { NextResponse } from 'next/server'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Distinct KLPD values from VisitActivity + database_b2g (case-insensitive dedupe).
export async function GET(req: Request) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') ?? '').trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 100)

    const filter = q
      ? { klpd: { $regex: escapeRegex(q), $options: 'i' } }
      : { klpd: { $nin: [null, ''] } }

    const db = (await clientPromise).db(getDbName())
    const [b2g, visits] = await Promise.all([
      db.collection('database_b2g').distinct('klpd', filter),
      db.collection('VisitActivity').distinct('klpd', filter),
    ])

    // "Swasta" is always offered so the RING 4 path stays reachable.
    const seen = new Map<string, string>()
    for (const raw of [...b2g, ...visits, 'Swasta']) {
      if (typeof raw !== 'string') continue
      const v = raw.trim()
      const key = v.toLowerCase()
      if (v && !seen.has(key)) seen.set(key, v)
    }

    const needle = q.toLowerCase()
    const items = [...seen.values()]
      .filter((v) => !needle || v.toLowerCase().includes(needle))
      .sort((a, b) => a.localeCompare(b, 'id'))
      .slice(0, limit)

    return NextResponse.json({ items })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Gagal mengambil KLPD'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
