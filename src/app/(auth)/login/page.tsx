import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Callout } from "@/components/ui/callout";
import { NotConfigured } from "@/components/ui/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link_invalid: "That link is invalid or has already been used. Sign in below, or request a new link.",
  link_expired: "That confirmation link has expired or has already been used. If you’ve already confirmed your email, just sign in below. Otherwise sign in to get a new link.",
  reset_link_invalid: "That password reset link is invalid or has already been used. Request a new one below.",
  reset_link_expired: "That password reset link has expired. Request a new one below.",
  not_configured: "Sign-in isn’t available because the site isn’t connected to Supabase.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string; reset?: string; signed_out?: string; email?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, reset, signed_out: signedOut, email } = await searchParams;
  const safeNext = next ? safeNextPath(next, "") || undefined : undefined;
  return (
    <div className="card grid gap-6 p-[clamp(1.5rem,4vw,2.25rem)]">
      <div>
        <span className="eyebrow">Welcome back</span>
        <h1 className="mt-2 text-3xl">Sign in</h1>
      </div>
      {!isSupabaseConfigured() && <NotConfigured />}
      {reset === "success" && <Callout variant="success" title="Password updated." role="status">Sign in with your new password.</Callout>}
      {signedOut && <Callout variant="hint" role="status">You’ve been signed out.</Callout>}
      {safeNext && !error && <Callout variant="hint">Please sign in to continue.</Callout>}
      {error && (
        <Callout variant="error" role="alert">
          {ERRORS[error] ?? "Something went wrong. Please try again."}
          {error.startsWith("reset_") && (
            <>
              {" "}
              <a className="link" href="/forgot-password">Request a new reset link</a>
            </>
          )}
        </Callout>
      )}
      <LoginForm next={safeNext} defaultEmail={email} />
    </div>
  );
}
