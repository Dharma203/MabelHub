import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { assertSuperadmin } from "@/lib/auth-server";

type UserRole = "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES" | "TELEMARKETING";

type UserDoc = {
  fullName: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
};

function normalizeRole(role: string): UserRole | null {
  const r = role.toUpperCase().trim();
  if (r === "SUPERADMIN") return "SUPERADMIN";
  if (r === "ADMIN") return "ADMIN";
  if (r === "LEADER") return "LEADER";
  if (r === "SALES") return "SALES";
  if (r === "TELEMARKETING") return "TELEMARKETING";
  return null;
}

// helper: params bisa object atau Promise
async function getParams<T>(p: T | Promise<T>) {
  return await Promise.resolve(p);
}

// (opsional) ensure index unik supaya duplicate tertangkap konsisten
declare global {
  // eslint-disable-next-line no-var
  var __mabel_users_indexes_promise: Promise<void> | undefined;
}
async function ensureUserIndexes(db: any) {
  if (!global.__mabel_users_indexes_promise) {
    global.__mabel_users_indexes_promise = (async () => {
      const col = db.collection("users");
      await col.createIndex({ email: 1 }, { unique: true });
      await col.createIndex({ username: 1 }, { unique: true });
      await col.createIndex({ createdAt: -1 });
    })();
  }
  await global.__mabel_users_indexes_promise;
}

type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: Ctx) {
  const gate = assertSuperadmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await getParams(context.params);

  // validasi ObjectId
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const _id = new ObjectId(id);

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());
    await ensureUserIndexes(db);

    const body = await req.json().catch(() => ({}));

    const $set: Partial<UserDoc> & Record<string, any> = {};
    const now = new Date();

    if (body.fullName !== undefined) {
      $set.fullName = String(body.fullName).trim();
    }
    if (body.email !== undefined) {
      $set.email = String(body.email).trim().toLowerCase();
    }
    if (body.username !== undefined) {
      $set.username = String(body.username).trim().toLowerCase();
    }
    if (body.role !== undefined) {
      const r = normalizeRole(String(body.role));
      if (!r) {
        return NextResponse.json(
          { error: "Role tidak valid" },
          { status: 400 },
        );
      }
      $set.role = r;
    }
    if (body.isActive !== undefined) {
      $set.isActive = Boolean(body.isActive);
    }

    // ganti password (opsional)
    if (body.password !== undefined && String(body.password).length > 0) {
      $set.passwordHash = await hashPassword(String(body.password));
    }

    // kalau tidak ada field yang diubah
    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada field untuk diupdate" },
        { status: 400 },
      );
    }

    $set.updatedAt = now;

    const result = await db.collection("users").findOneAndUpdate(
      { _id },
      { $set },
      {
        returnDocument: "after",
        projection: { passwordHash: 0 }, // jangan kirim hash
      },
    );

    if (!result) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        ...result,
        _id: String((result as any)._id),
      },
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      const keys = Object.keys(e?.keyPattern ?? {});
      return NextResponse.json(
        { error: `Duplicate: ${keys.join(", ")}` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: e?.message ?? "Gagal update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, context: any) {
  const gate = assertSuperadmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const _id = new ObjectId(id);

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());

    const deleted = await db
      .collection("users")
      .findOneAndDelete({ _id });

    // 🔥 FIX: cek langsung deleted, bukan deleted.value
    if (!deleted) {
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal menghapus user" },
      { status: 500 },
    );
  }
}
