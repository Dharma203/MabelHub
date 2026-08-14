import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { assertSuperadmin, assertAdminOrSuperadmin } from "@/lib/auth-server";

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

// (opsional tapi bagus) ensure index unik untuk username & email
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

function normalizeRole(role: string): UserRole | null {
  const r = role.toUpperCase().trim();
  if (r === "SUPERADMIN") return "SUPERADMIN";
  if (r === "ADMIN") return "ADMIN";
  if (r === "LEADER") return "LEADER";
  if (r === "SALES") return "SALES";
  if (r === "TELEMARKETING") return "TELEMARKETING";
  return null;
}

export async function GET(req: Request) {
  const gate = assertAdminOrSuperadmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());
    await ensureUserIndexes(db);

    const users = await db
      .collection<UserDoc>("users")
      .find(
        {},
        {
          projection: {
            passwordHash: 0, // jangan pernah kirim hash ke client
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const data = users.map((u: any) => ({
      ...u,
      _id: String(u._id),
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal mengambil data users" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const gate = assertSuperadmin(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const client = await clientPromise;
    const db = client.db(getDbName());
    await ensureUserIndexes(db);

    const body = await req.json().catch(() => ({}));

    const fullName = String(body?.fullName ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const username = String(body?.username ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "");
    const role = normalizeRole(String(body?.role ?? ""));

    if (!fullName || !email || !username || !password || !role) {
      return NextResponse.json(
        { error: "Field wajib: fullName, email, username, password, role" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const doc: UserDoc = {
      fullName,
      email,
      username,
      passwordHash,
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    const result = await db.collection<UserDoc>("users").insertOne(doc);

    return NextResponse.json(
      {
        data: {
          _id: String(result.insertedId),
          fullName: doc.fullName,
          email: doc.email,
          username: doc.username,
          role: doc.role,
          isActive: doc.isActive,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          lastLoginAt: doc.lastLoginAt,
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    // duplicate key error (Mongo)
    if (e?.code === 11000) {
      const keys = Object.keys(e?.keyPattern ?? {});
      return NextResponse.json(
        { error: `Duplicate: ${keys.join(", ")}` },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: e?.message ?? "Gagal membuat user" },
      { status: 500 },
    );
  }
}
