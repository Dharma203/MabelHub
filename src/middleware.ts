import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/api/auth/login"];

// Pola untuk mencocokkan file statis di folder public (gambar, ikon, dokumen, dll.)
const PUBLIC_FILE_PATTERN = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|xlsx|xls|csv)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow public assets & login
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  // allow auth endpoints
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const token = req.cookies.get("session")?.value;

  // protect all app pages + api
  if (!token) {
    // If it's an API route, return 401 JSON instead of redirecting
    // This prevents "Unexpected token '<', <!DOCTYPE..." errors in the frontend
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing session token" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
