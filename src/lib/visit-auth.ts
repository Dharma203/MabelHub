import { type SessionPayload } from './jwt'
import { ObjectId } from 'mongodb'

export async function getLeaderAllowedUserIds(db: any, leaderId: string) {
  const team = await db.collection('teams').findOne({ leaderId })
  const ids = [leaderId, ...(team?.memberIds ?? [])]
  return Array.from(new Set(ids)) as string[]
}

export async function getUserLiteById(db: any, userId: string) {
  if (!ObjectId.isValid(userId)) return null
  const u = await db
    .collection('users')
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { _id: 1, role: 1, username: 1, fullName: 1 } },
    )
  if (!u) return null
  return {
    userId: String(u._id),
    role: String(u.role || ''),
    username: String(u.username || ''),
    fullName: String(u.fullName || ''),
  }
}

/**
 * Build a MongoDB match condition to filter VisitActivity documents
 * based on the user's role (SALES, LEADER, ADMIN/SUPERADMIN).
 *
 * Returns { match } on success or { error } on failure.
 */
export async function getVisitAuthMatch(
  db: any,
  session: SessionPayload,
  assignedTo?: string | null,
): Promise<{ match?: any; error?: string }> {
  const match: any = {}

  const NO_USER_ID = {
    $or: [{ user_id: { $exists: false } }, { user_id: null }],
  }

  function ownerFilter(userId: string, fullName: string | null) {
    const conditions: any[] = [{ user_id: userId }]
    if (fullName) {
      conditions.push({
        $and: [{ nama_sales: fullName }, NO_USER_ID],
      })
    }
    return { $or: conditions }
  }

  function multiOwnerFilter(userIds: string[], fullNames: string[]) {
    const conditions: any[] = [{ user_id: { $in: userIds } }]
    if (fullNames.length > 0) {
      conditions.push({
        $and: [{ nama_sales: { $in: fullNames } }, NO_USER_ID],
      })
    }
    return { $or: conditions }
  }

  function applyOwnerFilter(ownerCondition: any) {
    if (!match.$and) match.$and = []
    match.$and.push(ownerCondition)
  }

  if (session.role === 'SALES') {
    applyOwnerFilter(ownerFilter(session.userId, session.fullName || null))
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)

    if (assignedTo) {
      if (!allowed.includes(assignedTo)) {
        return { error: 'FORBIDDEN: bukan anggota tim' }
      }
      const targetUser = await getUserLiteById(db, assignedTo)
      applyOwnerFilter(ownerFilter(assignedTo, targetUser?.fullName || null))
    } else {
      const fullNames: string[] = []
      for (const uid of allowed) {
        const u = await getUserLiteById(db, uid)
        if (u?.fullName) fullNames.push(u.fullName)
      }
      applyOwnerFilter(multiOwnerFilter(allowed, fullNames))
    }
  } else {
    // ADMIN/SUPERADMIN — sees everything
    if (assignedTo) {
      const targetUser = await getUserLiteById(db, assignedTo)
      applyOwnerFilter(ownerFilter(assignedTo, targetUser?.fullName || null))
    }
    // else: no filter — admin sees all
  }

  return { match }
}
