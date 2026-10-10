import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { safeNext } from "@/lib/safe-next";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    if (sessionCookie) {
      const next = safeNext(request.nextUrl.searchParams.get("next")) ?? "/";
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") || pathname === "/sw.js") {
    return NextResponse.next();
  }

  if (
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  ) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    if (pathname !== "/") {
      signIn.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
