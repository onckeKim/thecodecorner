import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Callout } from "@/components/ui/callout";
import { routes } from "@/lib/routes";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached from the password reset email via /auth/confirm, which creates a short-lived
 * recovery session. Without that session the link has expired or was already used.
 */
export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  return (
    <div className="card grid gap-6 p-[clamp(1.5rem,4vw,2.25rem)]">
      <div>
        <span className="eyebrow">Account recovery</span>
        <h1 className="mt-2 text-3xl">Choose a new password</h1>
      </div>
      {viewer ? (
        <>
          <p className="text-muted">
            Setting a new password for <b className="text-ink">{viewer.email}</b>. You’ll be signed out everywhere and can then sign in with it.
          </p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <Callout variant="error" role="alert">This password reset link has expired or has already been used.</Callout>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn--primary" href={routes.forgotPassword}>Request a new link</Link>
            <Link className="btn btn--ghost" href={routes.login}>Back to sign in</Link>
          </div>
        </>
      )}
    </div>
  );
}
