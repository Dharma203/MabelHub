import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

type Segment = "RING 1" | "RING 2" | "RING 3" | "RING 4" | string;

type ProductItem = {
  id: string;
  merek: string;
  subKategori: string;
  qty: number;
  spesifikasi: string;
  paguPerItem: number | "";
  hargaTayang: number | "";
  linkInaproc: string;
  linkEcom: string;

  // Admin Response Fields per item
  statusBarangAdmin?: string;
  tayangInaprocAdmin?: string;
  catatanAdminItem?: string; // ✅ new per-item admin note
};

type AssignedTo = {
  userId: string;
  role: string;
  username: string;
  fullName: string;
};

type EProcDoc = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  segmen: Segment;
  deadlineUsulan: string;
  tanggalSubmit: string;
  catatan?: string;

  items: ProductItem[];

  createdBy: {
    userId: string;
    role: string;
    username: string;
    fullName: string;
  };

  // ✅ new
  assignedTo: AssignedTo;

  createdAt: Date;
  updatedAt: Date;

  takenByAdminId: string | null;
  takenByAdminName: string | null;
  takenAt: Date | null;
  statusUsulan: string | null;

  perusahaan?: string;
  catatanAdmin?: string; // TBD: will be obsoleted, kept for old data compat
  statusAkhir?: string;

  // ✅ New Finance / Contract tracking
  tanggalKontrak?: string;
  nominalKontrak?: number;

  tanggalPembayaran?: string;
  nominalPembayaran?: number;
};

type TeamDoc = { leaderId: string; memberIds: string[] };

async function getLeaderAllowedUserIds(db: any, leaderId: string) {
  const team = (await db
    .collection("teams")
    .findOne({ leaderId })) as TeamDoc | null;
  const ids = [leaderId, ...(team?.memberIds ?? [])];
  return Array.from(new Set(ids));
}

async function getUserLite(
  db: any,
  userId: string,
): Promise<AssignedTo | null> {
  if (!ObjectId.isValid(userId)) return null;
  const u = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { role: 1, username: 1, fullName: 1 } },
    );
  if (!u) return null;
  return {
    userId,
    role: String((u as any).role || ""),
    username: String((u as any).username || ""),
    fullName: String((u as any).fullName || ""),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __eproc_indexes_promise: Promise<void> | undefined;
}

async function ensureIndexes(db: any) {
  if (!global.__eproc_indexes_promise) {
    global.__eproc_indexes_promise = (async () => {
      const col = db.collection("eproc_requests");
      await col.createIndex({ requestId: 1 }, { unique: true });
      await col.createIndex({ takenByAdminId: 1, takenAt: -1 });
      await col.createIndex({ createdAt: -1 });
      await col.createIndex({ "createdBy.userId": 1, createdAt: -1 });

      // ✅ new indexes for assignment
      await col.createIndex({ "assignedTo.userId": 1, createdAt: -1 });
    })();
  }
  await global.__eproc_indexes_promise;
}

function makeRequestId() {
  return `REQ-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toUpperCase();
}

export async function GET(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);

  // ✅ Ambil parameter dengan validation
  const statusUsulan = (searchParams.get("statusUsulan") ?? "").toLowerCase();
  const statusAkhir = (searchParams.get("statusAkhir") ?? "").toLowerCase();

  const validStatusUsulan = ["masuk", "proses", "done", "hold", "cancel"];
  const validStatusAkhir = ["barang terkirim ke user", "terbit bast"];
  // const mode = (searchParams.get("mode") ?? "takeable").toLowerCase();

  const client = await clientPromise;
  const db = client.db(getDbName());
  await ensureIndexes(db);

  const col = db.collection<EProcDoc>("eproc_requests");
  const filter: any = {};
  if (validStatusUsulan.includes(statusUsulan)) {
    filter.statusUsulan = { $regex: `^${statusUsulan}$`, $options: "i" }; // case-insensitive
  }

  if (validStatusAkhir.includes(statusAkhir)) {
    filter.statusAkhir = { $regex: `^${statusAkhir}$`, $options: "i" }; // case-insensitive
  }
  // if (mode === "takeable") {
  //   filter.takenByAdminId = null;
  // } else if (mode === "taken") {
  //   filter.takenByAdminId = { $ne: null };
  // } else if (mode === "mine") {
  //   // ✅ mine = createdBy OR assignedTo
  //   filter.$or = [
  //     { "createdBy.userId": auth.session.userId },
  //     { "assignedTo.userId": auth.session.userId },
  //   ];
  // } else if (mode === "all") {
  // //   // untuk halaman rekapitulasi & dashboard response
  // //   // SUPERADMIN & ADMIN: lihat semua e-proc
  //   if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN") {
  //     // Sales/Leader sees only their own or assigned
  //     filter.$or = [
  //       { "createdBy.userId": auth.session.userId },
  //       { "assignedTo.userId": auth.session.userId },
  //     ];
  //   }
  // } else {
  //   filter.takenByAdminId = null;
  // }

  const items = await col
    .find(filter, { projection: { _id: 0 } })
    .sort({ takenAt: -1, createdAt: -1 })
    .limit(500)
    .toArray();

  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const session = auth.session;

  // hanya role ini yang boleh create
  if (
    session.role !== "SALES" &&
    session.role !== "LEADER" &&
    session.role !== "SUPERADMIN" &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const header = body?.header ?? {};
  const items: ProductItem[] = Array.isArray(body?.items) ? body.items : [];

  const requestor = String(header.requestor ?? "").trim();
  const pemohon = String(header.pemohon ?? "").trim();
  const segmen = String(header.segmen ?? "").trim();
  const deadlineUsulan = String(header.deadline ?? "").trim();
  const lokasi = String(header.lokasi ?? "").trim();
  const catatan = String(header.catatanHeader ?? "").trim();

  // ✅ assignee input (opsional)
  const assignedToUserIdRaw =
    String(header.assignedToUserId ?? "").trim() ||
    String(body?.assignedToUserId ?? "").trim();

  if (!requestor || !pemohon || !segmen) {
    return NextResponse.json(
      { error: "Header wajib: requestor, pemohon, segmen" },
      { status: 400 },
    );
  }

  if (!deadlineUsulan) {
    return NextResponse.json(
      { error: "Deadline usulan wajib diisi" },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dlDate = new Date(deadlineUsulan);
  dlDate.setHours(0, 0, 0, 0);

  if (isNaN(dlDate.getTime())) {
    return NextResponse.json(
      { error: "Format deadline tidak valid" },
      { status: 400 },
    );
  }

  const diffTime = dlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 3) {
    return NextResponse.json(
      { error: "Deadline usulan minimal 3 hari dari hari ini" },
      { status: 400 },
    );
  }

  const client = await clientPromise;
  const db = client.db(getDbName());
  await ensureIndexes(db);

  // =========================
  // Resolve target assignment
  // =========================
  let targetUserId = session.userId;

  if (assignedToUserIdRaw) {
    if (session.role === "SALES") {
      return NextResponse.json(
        { error: "FORBIDDEN: sales tidak boleh assign user lain" },
        { status: 403 },
      );
    }

    if (session.role === "LEADER") {
      const allowed = await getLeaderAllowedUserIds(db, session.userId);
      if (!allowed.includes(assignedToUserIdRaw)) {
        return NextResponse.json(
          { error: "FORBIDDEN: target bukan anggota team leader" },
          { status: 403 },
        );
      }
    }

    if (session.role === "SUPERADMIN" || session.role === "ADMIN") {
      if (assignedToUserIdRaw !== session.userId) {
        const u = await getUserLite(db, assignedToUserIdRaw);
        if (!u)
          return NextResponse.json(
            { error: "Target user tidak ditemukan" },
            { status: 404 },
          );
        if (u.role !== "SALES" && u.role !== "LEADER") {
          return NextResponse.json(
            {
              error: `FORBIDDEN: ${session.role} hanya boleh assign ke SALES/LEADER`,
            },
            { status: 403 },
          );
        }
      }
    }

    targetUserId = assignedToUserIdRaw;
  }

  const assignedTo = (await getUserLite(db, targetUserId)) || {
    userId: targetUserId,
    role: "",
    username: "",
    fullName: "",
  };

  const requestId = makeRequestId();
  const now = new Date();

  const doc: EProcDoc = {
    requestId,
    requestor,
    pemohon,
    lokasi,
    statusUsulan: "masuk",
    segmen,
    deadlineUsulan: deadlineUsulan || "",
    tanggalSubmit: now.toISOString(),
    catatan: catatan || "",

    items,

    createdBy: {
      userId: session.userId,
      role: session.role,
      username: session.username,
      fullName: session.fullName,
    },

    assignedTo,

    createdAt: now,
    updatedAt: now,

    takenByAdminId: null,
    takenByAdminName: null,
    takenAt: null,
  };

  await db.collection<EProcDoc>("eproc_requests").insertOne(doc);
  return NextResponse.json({ data: doc }, { status: 201 });
}
