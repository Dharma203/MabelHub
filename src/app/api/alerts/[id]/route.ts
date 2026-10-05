import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise, { getDbName } from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { canManageMissingPhoneAlert } from '@/lib/missing-phone-alert'

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { session } = auth
  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  let input: unknown
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON tidak valid' }, { status: 400 })
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }
  const body = input as Record<string, unknown>
  const action = body.action
  if (
    typeof action !== 'string' ||
    !['acknowledge', 'dismiss'].includes(action)
  ) {
    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (action === 'dismiss' && !reason) {
    return NextResponse.json(
      { error: 'Alasan dismiss wajib diisi' },
      { status: 400 },
    )
  }
  if (reason.length > 1000) {
    return NextResponse.json(
      { error: 'Alasan dismiss maksimal 1000 karakter' },
      { status: 400 },
    )
  }

  const client = await clientPromise
  const db = client.db(getDbName())
  const alerts = db.collection('MissingPhoneAlert')
  const alert = await alerts.findOne({ _id: new ObjectId(id) })
  if (!alert) {
    return NextResponse.json({ error: 'Alert tidak ditemukan' }, { status: 404 })
  }
  if (
    !(await canManageMissingPhoneAlert(
      db,
      session.role,
      session.userId,
      String(alert.user_id),
    ))
  ) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  if (alert.status === 'resolved') {
    return NextResponse.json(
      { error: 'Alert sudah selesai' },
      { status: 409 },
    )
  }

  const now = new Date()
  if (action === 'acknowledge') {
    await alerts.updateOne(
      { _id: alert._id },
      {
        $set: {
          status: 'acknowledged',
          acknowledged_by: new ObjectId(session.userId),
        },
      },
    )
  } else {
    await alerts.updateOne(
      { _id: alert._id },
      {
        $set: {
          status: 'resolved',
          resolved_at: now,
          resolved_by: 'admin_dismissed',
          dismiss_reason: reason,
        },
      },
    )
    await db.collection('notifications').updateMany(
      {
        type: 'MISSING_PHONE',
        link: {
          $in: [
            `/plan-activity?missingPhoneAlert=${alert._id}`,
            `/monitoring-leader?tab=missing-phone&alertId=${alert._id}`,
          ],
        },
      },
      { $set: { isRead: true, updatedAt: now } },
    )
  }

  return NextResponse.json({ ok: true })
}
