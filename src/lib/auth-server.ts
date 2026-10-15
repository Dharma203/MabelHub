import { verifySession, type SessionPayload } from "@/lib/jwt";

function getTokenFromReq(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function getSession(req: Request): SessionPayload | null {
  const token = getTokenFromReq(req);
  if (!token) return null;
  return verifySession(token);
}

export function assertLoggedIn(req: Request) {
  const session = getSession(req);
  if (!session) {
    return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  }
  return { ok: true as const, session };
}

export function assertSuperadmin(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) return auth;

  if (auth.session.role !== "SUPERADMIN") {
    return {
      ok: false as const,
      status: 403,
      error: "FORBIDDEN: SUPERADMIN only",
    };
  }
  return auth;
}

export function assertAdminOrSuperadmin(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) return auth;

  if (auth.session.role !== "SUPERADMIN" && auth.session.role !== "ADMIN" && auth.session.role !== "ADMIN SALES") {
    return { ok: false as const, status: 403, error: "ADMIN/SUPERADMIN only" };
  }
  return auth;
}

export function assertLeaderOrSales(req: Request) {
  const auth = assertLoggedIn(req);
  if (!auth.ok) return auth;

  if (auth.session.role !== "LEADER" && auth.session.role !== "SALES" && auth.session.role !== "ADMIN SALES") {
    return {
      ok: false as const,
      status: 403,
      error: "LEADER/SALES/ADMIN SALES only",
    };
  }
  return auth;
}
