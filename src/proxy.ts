import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, routes } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every page request:
 *  1. refreshes the Supabase session cookie;
 *  2. sends signed-out visitors on protected routes to /login?next=…
 *
 * This is a convenience redirect only. Authorisation is enforced again server-side in
 * each protected layout/page/action (requireUser / requireAdmin) and by database RLS.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Server Action submissions (POST with a Next-Action header) are not redirected: a
  // redirect response would break the action call. Every action checks the session itself
  // and returns a "session expired, sign in again" message instead.
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!userId && isProtectedPath(pathname) && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Signed-in users don't need the sign-in / registration pages. The learner layout
  // then sends anyone who hasn't finished onboarding to /onboarding.
  if (userId && (pathname === routes.login || pathname === routes.register) && !request.nextUrl.searchParams.has("resend")) {
    const url = request.nextUrl.clone();
    url.pathname = routes.dashboard;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets, images and the static prototype.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|prototype/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|css|js|wasm)$).*)"],
};
