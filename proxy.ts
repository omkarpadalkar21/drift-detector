import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const { pathname } = request.nextUrl;

  // Protect /repos and all repo/scan/report APIs
  const isProtectedRoute =
    pathname.startsWith("/repos") ||
    pathname.startsWith("/api-docs") ||
    pathname.startsWith("/api/repos") ||
    pathname.startsWith("/api/scans") ||
    pathname.startsWith("/api/reports");

  if (isProtectedRoute && !sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/sign-in", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-authenticated users away from auth pages
  if (sessionToken && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/repos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/repos/:path*",
    "/api-docs",
    "/api-docs/:path*",
    "/api/repos/:path*",
    "/api/scans/:path*",
    "/api/reports/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
