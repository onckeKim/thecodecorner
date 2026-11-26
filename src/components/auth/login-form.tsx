"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { signIn } from "@/server/auth/actions";
import type { SignInField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

const initial: FormState<SignInField> = { status: "idle" };

export function LoginForm({ next, defaultEmail }: { next?: string; defaultEmail?: string }) {
  const [state, action] = useActionState(signIn, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const err = state.fieldErrors ?? {};
  const registerHref = next ? `${routes.register}?next=${encodeURIComponent(next)}` : routes.register;

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? defaultEmail}
        error={err.email}
      />
      <PasswordField name="password" label="Password" autoComplete="current-password" error={err.password} />
      <div className="-mt-2 text-right text-sm">
        <Link className="link" href={routes.forgotPassword}>Forgot password?</Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New to The Code Corner? <Link className="link" href={registerHref}>Create an account</Link>
      </p>
    </form>
  );
}
