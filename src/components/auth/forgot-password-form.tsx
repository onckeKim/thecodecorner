"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { requestPasswordReset } from "@/server/auth/actions";
import type { ForgotPasswordField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

const initial: FormState<ForgotPasswordField> = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  if (state.status === "success") {
    return (
      <div className="grid gap-5">
        <FormMessage state={state} successTitle="Check your inbox." />
        <p className="text-sm text-muted">
          Didn’t get it? Check your spam folder or <Link className="link" href={routes.forgotPassword}>try again</Link>.{" "}
          <Link className="link" href={routes.login}>Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <SubmitButton className="w-full" pendingLabel="Sending link…">Send reset link</SubmitButton>
      <p className="text-center text-sm text-muted">
        Remembered it? <Link className="link" href={routes.login}>Back to sign in</Link>
      </p>
    </form>
  );
}
