import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { routes, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Landing point for links in Supabase auth emails (sign-up confirmation and password reset).
 *
 * Supports both link styles:
 *  - PKCE `?code=` (Supabase's default email templates, same browser that requested it)
 *  - `?token_hash=&type=` (recommended templates; works in any browser)
 *
 * After the session is established it makes sure the profile exists (idempotent, so
 * opening the link twice never duplicates anything), then routes the user:
 *   password recovery            → /reset-password
 *   onboarding not completed     → /onboarding
 *   otherwise                    → next, /admin (admins) or /dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`${routes.login}?error=${encodeURIComponent(reason)}`, request.url));

  if (!isSupabaseConfigured()) return fail("not_configured");

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const requestedNext = searchParams.get("next");

  // Supabase redirects here with ?error_code=otp_expired when a link is stale.
  const linkError = searchParams.get("error_code") ?? searchParams.get("error");
  if (linkError) return fail(linkError === "otp_expired" ? "link_expired" : "link_invalid");

  let isRecovery = type === "recovery" || requestedNext === routes.resetPassword;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // A second click on an already-used link: if a session already exists, carry on.
      const { data } = await supabase.auth.getUser();
      if (!data.user) return fail(isRecovery ? "reset_link_invalid" : "link_invalid");
    }
  } else if (tokenHash && type && (OTP_TYPES as readonly string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    if (error) {
      const expired = error.code === "otp_expired";
      if (type === "recovery") return fail(expired ? "reset_link_expired" : "reset_link_invalid");
      return fail(expired ? "link_expired" : "link_invalid");
    }
    isRecovery = type === "recovery";
  } else {
    return fail("link_invalid");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("link_invalid");

  if (isRecovery) return NextResponse.redirect(new URL(routes.resetPassword, request.url));

  await supabase.rpc("ensure_profile");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role_id").eq("user_id", user.id),
  ]);
  const isAdmin = (roles ?? []).some((r) => r.role_id === "admin");
  const next = requestedNext ? safeNextPath(requestedNext, "") : "";

  let destination: string;
  if (!profile?.onboarding_completed && !isAdmin) destination = routes.onboarding;
  else if (next && next !== routes.onboarding) destination = next;
  else destination = isAdmin ? routes.admin : routes.dashboard;

  return NextResponse.redirect(new URL(destination, request.url));
}
