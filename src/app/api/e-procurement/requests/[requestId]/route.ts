import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { assertLoggedIn } from "@/lib/auth-server";

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
  statusBarangAdmin?: string; // e.g Todo, Progress, Hold, Cancel, Done
  tayangInaprocAdmin?: string; // e.g Ya, Tidak
};

type EProcDoc = {
  requestId: string;
  requestor: string;
  pemohon: string;
  lokasi: string;
  statusUsulan: string;
  segmen: string;
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

  assignedTo?: {
    userId: string;
    role: string;
    username: string;
    fullName: string;
  };

  createdAt: Date;
  updatedAt: Date;

  takenByAdminId: string | null;
  takenByAdminName: string | null;
  takenAt: Date | null;

  // Admin Response Fields
  perusahaan?: string;
  catatanAdmin?: string;
  statusAkhir?: string; // Computed automatically
  // History tracking
  history?: {
    action: string;
    actor: string;
    timestamp: Date;
    details: string[];
  }[];
};

async function getParams<T>(ctx: { params: T | Promise<T> }) {
  return await Promise.resolve(ctx.params);
}

function canAccess(session: any, doc: EProcDoc) {
  if (session.role === "SUPERADMIN" || session.role === "ADMIN") return true;
  if (doc.createdBy?.userId === session.userId) return true;
  if (doc.assignedTo?.userId === session.userId) return true;
  return false;
}

async function getLeaderAllowedUserIds(db: any, leaderId: string) {
  const team = await db.collection("teams").findOne({ leaderId });
  const ids = [leaderId, ...(team?.memberIds ?? [])];
  return Array.from(new Set(ids));
}

async function getUserLite(db: any, userId: string) {
  const { ObjectId } = require("mongodb");
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
    role: String(u.role || ""),
    username: String(u.username || ""),
    fullName: String(u.fullName || ""),
  };
}

export async function GET(
  req: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { requestId } = await getParams(ctx);
  const rid = decodeURIComponent(requestId);

  const client = await clientPromise;
  const db = client.db(getDbName());
  const col = db.collection<EProcDoc>("eproc_requests");

  const doc = await col.findOne({ requestId: rid }, { projection: { _id: 0 } });
  if (!doc) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }

  if (!canAccess(auth.session, doc)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // ✅ Satu-satunya kondisi yang mengunci revisi
  const statusAkhirNow = (doc.statusAkhir || "").trim().toLowerCase();
  if (statusAkhirNow === "rilis kontrak") {
    return NextResponse.json(
      { error: "Request sudah rilis kontrak, tidak bisa direvisi" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    data: {
      header: {
        requestor: doc.requestor,
        pemohon: doc.pemohon,
        segmen: doc.segmen,
        deadline: doc.deadlineUsulan,
        lokasi: doc.lokasi,
        catatanHeader: doc.catatan ?? "",
        assignedToUserId: doc.assignedTo?.userId ?? doc.createdBy?.userId ?? "",
      },
      items: doc.items ?? [],
      infoId: doc.requestId,
      tanggalSubmit: doc.tanggalSubmit,
    },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: { requestId: string } | Promise<{ requestId: string }> },
) {
  const auth = assertLoggedIn(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { requestId } = await getParams(ctx);
  const rid = decodeURIComponent(requestId);

  const body = await req.json().catch(() => ({}));
  const header = body?.header ?? {};
  const items: ProductItem[] = Array.isArray(body?.items) ? body.items : [];

  const requestor = String(header.requestor ?? "").trim();
  const pemohon = String(header.pemohon ?? "").trim();
  const segmen = String(header.segmen ?? "").trim();
  const deadlineUsulan = String(header.deadline ?? "").trim();
  const lokasi = String(header.lokasi ?? "").trim();
  const catatan = String(header.catatanHeader ?? "").trim();

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
  const col = db.collection<EProcDoc>("eproc_requests");

  const existing = await col.findOne(
    { requestId: rid },
    { projection: { _id: 0 } },
  );
  if (!existing) {
    return NextResponse.json(
      { error: "Request tidak ditemukan" },
      { status: 404 },
    );
  }

  if (!canAccess(auth.session, existing)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }


  const statusAkhirNow = (existing.statusAkhir || "").trim().toLowerCase();
  if (statusAkhirNow === "rilis kontrak") {
    return NextResponse.json(
      { error: "Request sudah rilis kontrak, tidak bisa di edit" },
      { status: 409 },
    );
  }

  const now = new Date();

  // =========================
  // Resolve target assignment
  // =========================
  const assignedToUserIdRaw = String(header.assignedToUserId ?? "").trim();
  let assignedTo = existing.assignedTo;

  if (assignedToUserIdRaw) {
    if (auth.session.role === "LEADER") {
      const allowed = await getLeaderAllowedUserIds(db, auth.session.userId);
      if (!allowed.includes(assignedToUserIdRaw)) {
        return NextResponse.json(
          { error: "FORBIDDEN: target bukan anggota team leader" },
          { status: 403 },
        );
      }
    }

    if (auth.session.role === "SUPERADMIN" || auth.session.role === "ADMIN") {
      if (assignedToUserIdRaw !== auth.session.userId) {
        const u = await getUserLite(db, assignedToUserIdRaw);
        if (!u)
          return NextResponse.json(
            { error: "Target user tidak ditemukan" },
            { status: 404 },
          );
        if (u.role !== "SALES" && u.role !== "LEADER") {
          return NextResponse.json(
            {
              error: `FORBIDDEN: ${auth.session.role} hanya boleh assign ke SALES/LEADER`,
            },
            { status: 403 },
          );
        }
      }
    }

    const u = await getUserLite(db, assignedToUserIdRaw);
    if (u) {
      assignedTo = u;
    }
  }

  // TRACK HISTORY
  const historyDetails: string[] = [];

  if (existing.requestor !== requestor) {
    historyDetails.push(`Requestor: "${existing.requestor}" -> "${requestor}"`);
  }
  if (existing.pemohon !== pemohon) {
    historyDetails.push(`Pemohon: "${existing.pemohon}" -> "${pemohon}"`);
  }
  if (existing.segmen !== segmen) {
    historyDetails.push(`Segmen: "${existing.segmen}" -> "${segmen}"`);
  }
  if ((existing.lokasi || "") !== lokasi) {
    historyDetails.push(`Lokasi: "${existing.lokasi || ""}" -> "${lokasi}"`);
  }
  if ((existing.deadlineUsulan || "") !== deadlineUsulan) {
    historyDetails.push(
      `Deadline: "${existing.deadlineUsulan || ""}" -> "${deadlineUsulan}"`,
    );
  }
  if ((existing.catatan || "") !== catatan) {
    historyDetails.push(
      `Catatan Header: "${existing.catatan || ""}" -> "${catatan}"`,
    );
  }

  // Items tracking
  const oldItems = existing.items || [];
  const newItems = items || [];

  const oldMap = new Map(oldItems.map((i) => [i.id, i]));
  const newMap = new Map(newItems.map((i) => [i.id, i]));

  // Check new and updated items
  newItems.forEach((nItem) => {
    const oItem = oldMap.get(nItem.id);
    if (!oItem) {
      if (nItem.qty > 0) {
        historyDetails.push(
          `Item Ditambahkan: "${nItem.merek}" (Kategori: ${nItem.subKategori}, Qty: ${nItem.qty})`,
        );
      }
    } else {
      if (oItem.qty > 0 && nItem.qty === 0) {
        historyDetails.push(`Item Dihapus (Qty -> 0): "${nItem.merek}"`);
      } else if (nItem.qty > 0) {
        // Did fields change?
        const itemChanges = [];
        if (oItem.merek !== nItem.merek)
          itemChanges.push(`Merek ("${oItem.merek}" -> "${nItem.merek}")`);
        if (oItem.subKategori !== nItem.subKategori)
          itemChanges.push(
            `Kategori ("${oItem.subKategori}" -> "${nItem.subKategori}")`,
          );
        if (oItem.qty !== nItem.qty)
          itemChanges.push(`Qty (${oItem.qty} -> ${nItem.qty})`);
        if (oItem.paguPerItem !== nItem.paguPerItem)
          itemChanges.push(
            `Pagu (${oItem.paguPerItem} -> ${nItem.paguPerItem})`,
          );

        if (itemChanges.length > 0) {
          historyDetails.push(
            `Item Diubah ("${oItem.merek || nItem.merek}"): ${itemChanges.join(", ")}`,
          );
        }
      }
    }
  });

  const updateDoc: any = {
    $set: {
      requestor,
      pemohon,
      segmen,
      deadlineUsulan,
      lokasi,
      catatan,
      items,
      updatedAt: now,
    },
  };

  if (historyDetails.length > 0) {
    const actorName = auth.session.fullName || auth.session.username || "User";
    updateDoc.$push = {
      history: {
        action: "Revisi Request",
        actor: actorName,
        timestamp: now,
        details: historyDetails,
      },
    };
  }

  const rawResult = await col.findOneAndUpdate(
    {
      requestId: rid,
    },
    updateDoc,
    {
      returnDocument: "after",
      projection: { _id: 0 },
    } as any,
  );

  const updated = (rawResult as any)?.value ?? rawResult ?? null;

  if (!updated) {
    return NextResponse.json(
      { error: "Tidak bisa revisi (sudah diambil admin / tidak ditemukan)" },
      { status: 409 },
    );
  }

  // Notifikasi untuk revisi (jika ada perubahan)
  if (historyDetails.length > 0) {
    try {
      const usersCol = db.collection("users");
      const notifCol = db.collection("notifications");

      const admins = await usersCol
        .find({ role: { $in: ["SUPERADMIN", "ADMIN"] } })
        .toArray();

      if (admins.length > 0) {
        const title = `Revisi Request E-Procurement (${rid})`;
        const message = `Ada revisi pada request e-procurement dari ${updated.requestor || "User"}. ${historyDetails.length} perubahan dicatat.`;
        const actionUrl = `/rekapitulasi-response`;

        const notifs = admins.map((admin) => ({
          userId: String(admin._id),
          title,
          message,
          actionUrl,
          isRead: false,
          createdAt: now,
        }));
        await notifCol.insertMany(notifs);
      }
    } catch (err) {
      console.error("Gagal mengirim notifikasi revisi e-proc:", err);
    }
  }

  return NextResponse.json({ data: updated });
}
