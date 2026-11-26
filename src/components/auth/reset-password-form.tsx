"use client";

import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePassword } from "@/server/auth/actions";
import type { ResetPasswordField } from "@/server/auth/schemas";
import type { FormState } from "@/types/domain";

const initial: FormState<ResetPasswordField> = { status: "idle" };

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const err = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <PasswordField name="password" label="New password" autoComplete="new-password" error={err.password} showRules />
      <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" error={err.confirmPassword} />
      <SubmitButton className="w-full" pendingLabel="Updating password…">Update password</SubmitButton>
    </form>
  );
}
