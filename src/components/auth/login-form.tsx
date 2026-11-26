"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Callout } from "@/components/ui/callout";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { signIn } from "@/server/auth/actions";
import type { SignInField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

const initial: FormState<SignInField> = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initial);
  const err = state.fieldErrors ?? {};
  const registerHref = next ? `${routes.register}?next=${encodeURIComponent(next)}` : routes.register;

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.status === "error" && state.message && <Callout variant="error" role="alert">{state.message}</Callout>}
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required aria-invalid={!!err.email} aria-describedby={err.email ? "email-error" : undefined} />
        {err.email && <span id="email-error" className="field-error">{err.email}</span>}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required aria-invalid={!!err.password} aria-describedby={err.password ? "password-error" : undefined} />
        {err.password && <span id="password-error" className="field-error">{err.password}</span>}
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New to The Code Corner? <Link className="link" href={registerHref}>Create an account</Link>
      </p>
    </form>
  );
}
