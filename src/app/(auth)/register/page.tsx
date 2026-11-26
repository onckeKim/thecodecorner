import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { NotConfigured } from "@/components/ui/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Create your account" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="card grid gap-6 p-[clamp(1.5rem,4vw,2.25rem)]">
      <div>
        <span className="eyebrow">Start learning</span>
        <h1 className="mt-2 text-3xl">Create your account</h1>
        <p className="mt-2 text-muted">Free access to structured learning paths, lessons and progress tracking.</p>
      </div>
      {!isSupabaseConfigured() && <NotConfigured />}
      <RegisterForm next={next ? safeNextPath(next) : undefined} />
    </div>
  );
}
