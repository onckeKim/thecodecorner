import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { NotConfigured } from "@/components/ui/not-configured";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Forgotten password" };

export default function ForgotPasswordPage() {
  return (
    <div className="card grid gap-6 p-[clamp(1.5rem,4vw,2.25rem)]">
      <div>
        <span className="eyebrow">Account recovery</span>
        <h1 className="mt-2 text-3xl">Forgotten your password?</h1>
        <p className="mt-2 text-muted">Enter the email address you registered with and we’ll send you a link to choose a new password.</p>
      </div>
      {!isSupabaseConfigured() && <NotConfigured />}
      <ForgotPasswordForm />
    </div>
  );
}
