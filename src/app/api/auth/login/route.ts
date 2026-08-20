import { NextResponse } from "next/server";
import clientPromise, { getDbName } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/jwt";

type UserDoc = {
  _id: any;
  fullName: string;
  email: string;
  username: string;
  passwordHash: string;
  role: "SUPERADMIN" | "ADMIN" | "LEADER" | "SALES";
  isActive?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const identityRaw = String(body?.identity ?? "").trim();
    const identity = identityRaw.toLowerCase(); // email/username
    const password = String(body?.password ?? "");

    if (!identity || !password) {
      return NextResponse.json(
        { error: "Identity dan password wajib" },
        { status: 400 },
      );
    }

    // ✅ connect (native driver)
    const client = await clientPromise;
    const db = client.db(getDbName());

    // ✅ cari user berdasarkan username/email
    // CATATAN: ini mengasumsikan username & email disimpan lowercase di DB.
    const user = (await db.collection<UserDoc>("users").findOne({
      $or: [{ username: identity }, { email: identity }],
    })) as UserDoc | null;

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 401 },
      );
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: "User nonaktif" }, { status: 403 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    const token = signSession({
      userId: String(user._id),
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        _id: String(user._id),
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
      },
    });

    // ✅ httpOnly cookie
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Login gagal" },
      { status: 500 },
    );
  }
}
