"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { signUp } from "@/server/auth/actions";
import type { SignUpField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

import { ResendConfirmationForm } from "./resend-confirmation-form";

const initial: FormState<SignUpField> = { status: "idle" };

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUp, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const loginHref = next ? `${routes.login}?next=${encodeURIComponent(next)}` : routes.login;

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <FormMessage state={state} successTitle="Check your inbox." />
        <ResendConfirmationForm email={v.email ?? ""} />
        <p className="text-sm text-muted">
          Already confirmed? <Link className="link" href={loginHref}>Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="firstName" label="First name" autoComplete="given-name" required maxLength={60} defaultValue={v.firstName} error={err.firstName} />
        <TextField name="lastName" label="Last name" autoComplete="family-name" required maxLength={60} defaultValue={v.lastName} error={err.lastName} />
      </div>
      <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={v.email} error={err.email} />
      <PasswordField name="password" label="Password" autoComplete="new-password" error={err.password} showRules />
      <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" error={err.confirmPassword} />
      <SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link className="link" href={loginHref}>Sign in</Link>
      </p>
    </form>
  );
}
