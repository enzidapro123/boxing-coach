// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Always create the client and refresh cookies for every request,
  // including API routes. This keeps the auth cookie in sync.
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Pages that never require auth (don’t redirect on these)
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

  // Pages that DO require auth (API routes aren’t redirected here)
  const protectedPages = ["/dashboard", "/training", "/history", "/profile", "/super_admin", "/it_admin"];

  if (protectedPages.some((p) => pathname.startsWith(p)) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Let everything else (including /api/*) pass through with refreshed cookies
  return res;
}

// Don’t run on Next internals / static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
