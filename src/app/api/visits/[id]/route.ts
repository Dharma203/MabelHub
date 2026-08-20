import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'
import { assertLoggedIn } from '@/lib/auth-server'
import { getLeaderAllowedUserIds, getUserLiteById } from '@/lib/visit-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

function isAdminRole(role: string) {
  return role === 'ADMIN' || role === 'SUPERADMIN'
}

/**
 * Check if a legacy doc (no user_id) belongs to a user by matching nama_sales.
 * Returns true if the doc has no user_id AND the nama_sales matches the user's fullName.
 */
function isLegacyOwner(doc: any, fullName: string | null): boolean {
  const namaSales = String(doc.nama_sales || '').trim().toLowerCase()
  const name = (fullName || '').trim().toLowerCase()
  return name !== '' && namaSales === name
}

/**
 * Check if a legacy doc belongs to any of the given user IDs,
 * by resolving their fullNames and matching against nama_sales.
 */
async function isLegacyTeamOwner(db: any, doc: any, userIds: string[]): Promise<boolean> {
  for (const uid of userIds) {
    const u = await getUserLiteById(db, uid)
    if (u?.fullName && isLegacyOwner(doc, u.fullName)) {
      return true
    }
  }
  return false
}

// whitelist field yang boleh diupdate dari client
function pickAllowedPatch(body: any) {
  const patch: Record<string, any> = {}

  // field yang memang wajar diedit setelah visit berjalan
  const allow = [
    'status_visit',
    'status_market',
    'descriptions',
    'tindak_lanjut',
    'kegiatan_status',
    'no_visit_per_month',
    'reschedule_date',
    'reschedule_note',
    'visit_image',
    'company_id',
    'pic_name',
    'pic_phone',
    'pic_position',
    'pic_role',
    'pic_changed',
    'previous_pic',
    'pic_changed_by',
    'pic_changed_at',

    // kalau kamu memang mau izinkan edit header plan:
    'visit_date',
    'city',
    'klpd',
    'institusi_kerja',
    'satuan_kerja',
    'status_ring',
  ]

  for (const k of allow) {
    if (body?.[k] !== undefined) patch[k] = body[k]
  }

  return patch
}

// Helper to calculate Market Status based on kegiatan_status keywords
function calculateMarketStatus(
  kegiatan: string | undefined,
): 'Hot' | 'Warm' | 'Cold' | null {
  if (!kegiatan) return null
  const kw = kegiatan.toLowerCase()

  // Keyword Hot
  if (
    kw.includes('dealing') ||
    kw.includes('closing') ||
    kw.includes('negosiasi') ||
    kw.includes('po') ||
    kw.includes('kontrak') ||
    kw.includes('spk') ||
    kw.includes('approval') ||
    kw.includes('presentasi bod')
  ) {
    return 'Hot'
  }

  // Keyword Warm
  if (
    kw.includes('prospek') ||
    kw.includes('follow up') ||
    kw.includes('penawaran') ||
    kw.includes('quotation') ||
    kw.includes('presentasi') ||
    kw.includes('demo') ||
    kw.includes('pertemuan lanjutan')
  ) {
    return 'Warm'
  }

  // Keyword Cold
  return 'Cold'
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  const doc = await col.findOne({ _id: new ObjectId(id) })
  if (!doc) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  // =========================
  // ACCESS CHECK (ROLE)
  // =========================
  const ownerUserId = String((doc as any).user_id || '')
  const hasUserId = ownerUserId !== ''

  if (session.role === 'SALES') {
    if (hasUserId) {
      if (ownerUserId !== session.userId) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: fallback to nama_sales matching
      if (!isLegacyOwner(doc, session.fullName || null)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)
    if (hasUserId) {
      if (!allowed.includes(ownerUserId)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: check if nama_sales matches any team member
      if (!await isLegacyTeamOwner(db, doc, allowed)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else {
    // ADMIN/SUPERADMIN allowed
  }

  return NextResponse.json({
    data: { ...doc, _id: String((doc as any)._id) },
  })
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  // Ambil dokumen lengkap untuk cek ownership + data PIC lama
  const existing = await col.findOne({ _id: new ObjectId(id) })

  if (!existing) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  const existingDoc = existing as any
  const ownerUserId = String(existingDoc.user_id || '')

  // =========================
  // ACCESS CHECK (ROLE)
  // =========================
  const hasUserId = ownerUserId !== ''

  if (session.role === 'SALES') {
    if (hasUserId) {
      if (ownerUserId !== session.userId) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: fallback to nama_sales matching
      if (!isLegacyOwner(existingDoc, session.fullName || null)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)
    if (hasUserId) {
      if (!allowed.includes(ownerUserId)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: check if nama_sales matches any team member
      if (!await isLegacyTeamOwner(db, existingDoc, allowed)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  // =========================
  // PATCH SANITIZE
  // =========================
  const patch = pickAllowedPatch(body)

  // Convert base64 visit_image to a file in /uploads/
  if (patch.visit_image && typeof patch.visit_image === 'string') {
    const imgStr = patch.visit_image as string
    // Match data:image/xxx;base64,... pattern (may have URL prefix)
    const b64Match = imgStr.match(/data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
    if (b64Match) {
      try {
        const ext = b64Match[1] === 'jpeg' || b64Match[1] === 'jpg' ? 'jpeg' : b64Match[1]
        const base64Data = b64Match[2]
        const buffer = Buffer.from(base64Data, 'base64')
        const filename = `visit_${Date.now()}.${ext}`
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        await mkdir(uploadsDir, { recursive: true })
        await writeFile(path.join(uploadsDir, filename), buffer)
        patch.visit_image = `/uploads/${filename}`
      } catch (err) {
        console.error('Failed to save visit image as file:', err)
        // Keep as-is if file save fails
      }
    }
  }

  // Otomatis kalkulasi status_market berdasarkan kegiatan_status yang dikirim,
  // atau jika tidak dikirim (tapi field lain mungkin diisi) kita abaikan jika tdk ada di patch
  if (patch.kegiatan_status !== undefined) {
    const calculated = calculateMarketStatus(patch.kegiatan_status)
    if (calculated) {
      patch.status_market = calculated
    }
  }

  // Jika reschedule_date terisi, otomatis update visit_date (convert ke format D-Mon-YYYY)
  // dan set status menjadi "Not Visited"
  if (patch.reschedule_date && String(patch.reschedule_date).trim() !== '') {
    const rd = new Date(patch.reschedule_date)
    if (!isNaN(rd.getTime())) {
      const day = rd.getDate()
      const mon = rd.toLocaleString('en-US', { month: 'short' })
      const year = rd.getFullYear()
      patch.visit_date = `${day}-${mon}-${year}`
      patch.status_visit = 'Not Visited'
    }
  }

  // Kalau tidak ada field yang valid untuk diupdate
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Tidak ada field yang bisa diupdate' },
      { status: 400 },
    )
  }

  // audit info
  patch.updated_by_user_id = session.userId
  patch.updated_by_name = session.fullName || session.username
  patch.updated_at = new Date().toISOString()

  // =========================
  // PIC CHANGE HISTORY
  // =========================
  // Deteksi perubahan PIC dan record riwayat di database
  let picHistoryRecord: Record<string, any> | null = null

  if (body.pic_changed === true) {
    const picFields = [
      { key: 'pic_name', label: 'Nama PIC' },
      { key: 'pic_phone', label: 'Nomor PIC' },
      { key: 'pic_role', label: 'Jabatan' },
      { key: 'pic_position', label: 'Posisi' },
    ]

    // Build detail perubahan per-field
    const changes: Array<{
      field: string
      label: string
      old_value: string
      new_value: string
    }> = []

    for (const f of picFields) {
      const oldVal = String(existingDoc[f.key] || '')
      const newVal = String(patch[f.key] ?? oldVal)
      if (oldVal !== newVal) {
        changes.push({
          field: f.key,
          label: f.label,
          old_value: oldVal,
          new_value: newVal,
        })
      }
    }

    if (changes.length > 0) {
      picHistoryRecord = {
        visit_id: id,
        visit_object_id: new ObjectId(id),
        changed_at: new Date().toISOString(),
        changed_by_user_id: session.userId,
        changed_by_name: session.fullName || session.username,
        changed_by_role: session.role,
        previous_pic: {
          pic_name: existingDoc.pic_name || '',
          pic_phone: existingDoc.pic_phone || '',
          pic_role: existingDoc.pic_role || '',
          pic_position: existingDoc.pic_position || '',
        },
        new_pic: {
          pic_name: patch.pic_name ?? existingDoc.pic_name ?? '',
          pic_phone: patch.pic_phone ?? existingDoc.pic_phone ?? '',
          pic_role: patch.pic_role ?? existingDoc.pic_role ?? '',
          pic_position: patch.pic_position ?? existingDoc.pic_position ?? '',
        },
        changes, // detail per-field yang berubah
      }

      // Simpan ke collection terpisah PicChangeHistory
      const historyCol = db.collection('PicChangeHistory')
      await historyCol.insertOne({ ...picHistoryRecord })
    }
  }

  // Update visit document — juga push riwayat PIC ke array embedded
  const updateOps: Record<string, any> = { $set: patch }

  if (picHistoryRecord) {
    // Hapus visit_object_id dari embedded record (redundan di dalam dokumen sendiri)
    const embeddedRecord = { ...picHistoryRecord }
    delete embeddedRecord.visit_id
    delete embeddedRecord.visit_object_id

    updateOps.$push = { pic_change_history: embeddedRecord }
  }

  const updated = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    updateOps,
    { returnDocument: 'after' },
  )

  const doc = updated?.value || updated
  if (!doc) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({
    data: { ...doc, _id: String((doc as any)._id) },
  })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const session = auth.session

  const { id } = await ctx.params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB || 'MabelHubStaging')
  const col = db.collection('VisitActivity')

  const existing = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { user_id: 1 } },
  )
  if (!existing) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  const ownerUserId = String((existing as any).user_id || '')
  const hasUserId = ownerUserId !== ''

  // policy delete:
  // - SALES: boleh hapus miliknya (opsional, kalau mau batasi tinggal forbid)
  // - LEADER: boleh hapus data tim (opsional)
  // - ADMIN/SUPERADMIN: boleh
  if (session.role === 'SALES') {
    if (hasUserId) {
      if (ownerUserId !== session.userId) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: fallback to nama_sales matching
      if (!isLegacyOwner(existing, session.fullName || null)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else if (session.role === 'LEADER') {
    const allowed = await getLeaderAllowedUserIds(db, session.userId)
    if (hasUserId) {
      if (!allowed.includes(ownerUserId)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      // Legacy doc: check if nama_sales matches any team member
      if (!await isLegacyTeamOwner(db, existing, allowed)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }
  } else if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const del = await col.deleteOne({ _id: new ObjectId(id) })
  if (del.deletedCount === 0) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
