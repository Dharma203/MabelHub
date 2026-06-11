import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

type TeamDoc = {
  leaderId: string; // string ObjectId user
  memberIds: string[]; // string ObjectId user
};

async function getLeaderAllowedUserIds(db: any, leaderId: string) {
  const team = (await db
    .collection("teams")
    .findOne({ leaderId })) as TeamDoc | null;

  const ids = [leaderId, ...(team?.memberIds ?? [])];
  return Array.from(new Set(ids));
}

function isAdminRole(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

// whitelist field yang boleh diupdate dari client
function pickAllowedPatch(body: any) {
  const patch: Record<string, any> = {};

  // field yang memang wajar diedit setelah visit berjalan
  const allow = [
    "status_visit",
    "status_market",
    "descriptions",
    "tindak_lanjut",
    "kegiatan_status",
    "no_visit_per_month",
    "reschedule_date",
    "reschedule_note",
    "visit_image",

    "pic_name",
    "pic_phone",
    "pic_position",
    "pic_role",

    // kalau kamu memang mau izinkan edit header plan:
    "visit_date",
    "city",
    "klpd",
    "institusi_kerja",
    "satuan_kerja",
    "status_ring",
  ];

  for (const k of allow) {
    if (body?.[k] !== undefined) patch[k] = body[k];
  }

  return patch;
}

// Helper to calculate Market Status based on kegiatan_status keywords
function calculateMarketStatus(
  kegiatan: string | undefined,
): "Hot" | "Warm" | "Cold" | null {
  if (!kegiatan) return null;
  const kw = kegiatan.toLowerCase();

  // Keyword Hot
  if (
    kw.includes("dealing") ||
    kw.includes("closing") ||
    kw.includes("negosiasi") ||
    kw.includes("po") ||
    kw.includes("kontrak") ||
    kw.includes("spk") ||
    kw.includes("approval") ||
    kw.includes("presentasi bod")
  ) {
    return "Hot";
  }

  // Keyword Warm
  if (
    kw.includes("prospek") ||
    kw.includes("follow up") ||
    kw.includes("penawaran") ||
    kw.includes("quotation") ||
    kw.includes("presentasi") ||
    kw.includes("demo") ||
    kw.includes("pertemuan lanjutan")
  ) {
    return "Warm";
  }

  // Keyword Cold
  return "Cold";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "MabelHub");
  const col = db.collection("VisitActivity");

  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  // =========================
  // ACCESS CHECK (ROLE)
  // =========================
  const ownerUserId = String((doc as any).user_id || "");

  if (session.role === "SALES") {
    if (ownerUserId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (session.role === "LEADER") {
    const allowed = await getLeaderAllowedUserIds(db, session.userId);
    if (!allowed.includes(ownerUserId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else {
    // ADMIN/SUPERADMIN allowed
  }

  return NextResponse.json({
    data: { ...doc, _id: String((doc as any)._id) },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "MabelHub");
  const col = db.collection("VisitActivity");

  // Ambil dokumen dulu untuk cek ownership/team
  const existing = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { user_id: 1 } },
  );

  if (!existing) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  const ownerUserId = String((existing as any).user_id || "");

  // =========================
  // ACCESS CHECK (ROLE)
  // =========================
  if (session.role === "SALES") {
    if (ownerUserId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (session.role === "LEADER") {
    const allowed = await getLeaderAllowedUserIds(db, session.userId);
    if (!allowed.includes(ownerUserId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // =========================
  // PATCH SANITIZE
  // =========================
  const patch = pickAllowedPatch(body);

  // Otomatis kalkulasi status_market berdasarkan kegiatan_status yang dikirim,
  // atau jika tidak dikirim (tapi field lain mungkin diisi) kita abaikan jika tdk ada di patch
  if (patch.kegiatan_status !== undefined) {
    const calculated = calculateMarketStatus(patch.kegiatan_status);
    if (calculated) {
      patch.status_market = calculated;
    }
  }

  // Jika reschedule_date terisi, otomatis update visit_date (convert ke format D-Mon-YYYY)
  // dan set status menjadi "Not Visited"
  if (patch.reschedule_date && String(patch.reschedule_date).trim() !== "") {
    const rd = new Date(patch.reschedule_date);
    if (!isNaN(rd.getTime())) {
      const day = rd.getDate();
      const mon = rd.toLocaleString("en-US", { month: "short" });
      const year = rd.getFullYear();
      patch.visit_date = `${day}-${mon}-${year}`;
      patch.status_visit = "Not Visited";
    }
  }

  // Kalau tidak ada field yang valid untuk diupdate
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada field yang bisa diupdate" },
      { status: 400 },
    );
  }

  // audit info
  patch.updated_by_user_id = session.userId;
  patch.updated_by_name = session.fullName || session.username;
  patch.updated_at = new Date().toISOString();

  const updated = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: patch },
    { returnDocument: "after" },
  );

  const doc = updated?.value || updated;
  if (!doc) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { ...doc, _id: String((doc as any)._id) },
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "MabelHub");
  const col = db.collection("VisitActivity");

  const existing = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { user_id: 1 } },
  );
  if (!existing) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  const ownerUserId = String((existing as any).user_id || "");

  // policy delete:
  // - SALES: boleh hapus miliknya (opsional, kalau mau batasi tinggal forbid)
  // - LEADER: boleh hapus data tim (opsional)
  // - ADMIN/SUPERADMIN: boleh
  if (session.role === "SALES") {
    if (ownerUserId !== session.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (session.role === "LEADER") {
    const allowed = await getLeaderAllowedUserIds(db, session.userId);
    if (!allowed.includes(ownerUserId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const del = await col.deleteOne({ _id: new ObjectId(id) });
  if (del.deletedCount === 0) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
