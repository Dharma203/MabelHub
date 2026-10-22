import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams
  const code = searchParams.get('code')?.trim()
  const period = searchParams.get('period')?.trim()
  const leaderName = searchParams.get('leaderName')?.trim()

  if (code) {
    try {
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB || 'MabelHub')
      const plan = await db
        .collection('sales-report-system')
        .find({ code_submit: code })
        .sort({ created_at: -1 })
        .limit(1)
        .next()

      if (!plan) {
        return NextResponse.json({ error: 'Data plan tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json({ plan })
    } catch (error) {
      console.error('[GET /api/list-plan] Error loading plan:', error)
      return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
    }
  }

  if (!period && !leaderName) {
    return NextResponse.json(
      { error: 'Pilih periode atau leader untuk mencari plan' },
      { status: 400 },
    )
  }

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'MabelHub')
    const plans = await db
      .collection('sales-report-system')
      .find(
        {
          ...(period ? { period } : {}),
          ...(leaderName ? { leaderName } : {}),
        },
        {
          projection: {
            code_submit: 1,
            leaderName: 1,
            period: 1,
            month: 1,
            year: 1,
            created_at: 1,
            revised_at: 1,
          },
        },
      )
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      plans: plans.map(({ _id, ...plan }) => ({
        ...plan,
        id: String(_id),
        revised: Boolean(plan.revised_at),
      })),
    })
  } catch (error) {
    console.error('[GET /api/list-plan] Error searching plans:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
