import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Callout } from "@/components/ui/callout";
import { NotConfigured } from "@/components/ui/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link_invalid: "That confirmation link is invalid or has expired. Please sign in or request a new link.",
  not_configured: "Sign-in isn’t available because the site isn’t connected to Supabase.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const safeNext = next ? safeNextPath(next) : undefined;
  return (
    <div className="card grid gap-6 p-[clamp(1.5rem,4vw,2.25rem)]">
      <div>
        <span className="eyebrow">Welcome back</span>
        <h1 className="mt-2 text-3xl">Sign in</h1>
      </div>
      {!isSupabaseConfigured() && <NotConfigured />}
      {error && <Callout variant="error" role="alert">{ERRORS[error] ?? "Something went wrong. Please try again."}</Callout>}
      <LoginForm next={safeNext} />
    </div>
  );
}
