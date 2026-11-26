"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Callout } from "@/components/ui/callout";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { signUp } from "@/server/auth/actions";
import type { SignUpField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

const initial: FormState<SignUpField> = { status: "idle" };

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUp, initial);
  const err = state.fieldErrors ?? {};
  const loginHref = next ? `${routes.login}?next=${encodeURIComponent(next)}` : routes.login;

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <Callout variant="success" title="Almost there!" role="status">{state.message}</Callout>
        <p className="text-sm text-muted">
          Already confirmed? <Link className="link" href={loginHref}>Sign in</Link>
        </p>
      </div>
    );
  }

  const field = (name: SignUpField, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" aria-invalid={!!err[name]} aria-describedby={`${name}-msg`} {...props} />
      {(err[name] || hint) && (
        <span id={`${name}-msg`} className={err[name] ? "field-error" : "hint"}>{err[name] ?? hint}</span>
      )}
    </div>
  );

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.status === "error" && state.message && <Callout variant="error" role="alert">{state.message}</Callout>}
      <input type="hidden" name="next" value={next ?? ""} />
      {field("displayName", "Your name", { autoComplete: "name", required: true, maxLength: 80 })}
      {field("email", "Email", { type: "email", autoComplete: "email", required: true })}
      {field("password", "Password", { type: "password", autoComplete: "new-password", required: true, minLength: 8 }, "At least 8 characters, with a letter and a number.")}
      {field("confirmPassword", "Confirm password", { type: "password", autoComplete: "new-password", required: true })}
      <SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link className="link" href={loginHref}>Sign in</Link>
      </p>
    </form>
  );
}
