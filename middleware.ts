// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const pathname = req.nextUrl.pathname;

  // Pages that should never trigger auth checks
  const publicRoutes = [
    "/",
    "/features",
    "/how-it-works",
    "/login",
    "/register",
    "/auth/callback",
    "/check-email",
  ];
  if (publicRoutes.some((p) => pathname.startsWith(p))) {
    return res;
  }

  // Only guard these
  const protectedRoutes = ["/dashboard", "/training", "/history", "/profile"];
  const needsAuth = protectedRoutes.some((p) => pathname.startsWith(p));
  if (!needsAuth) return res;

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // send them to /login and remember where they came from
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

// Don’t run on Next internals / static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
