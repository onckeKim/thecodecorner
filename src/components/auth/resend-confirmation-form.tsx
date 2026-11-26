"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { TextField } from "@/components/forms/text-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { resendConfirmation } from "@/server/auth/actions";
import type { FormState } from "@/types/domain";

const initial: FormState<"email"> = { status: "idle" };

/** "Didn't get the email?" Resends the sign-up confirmation link. */
export function ResendConfirmationForm({ email, showEmailField = false }: { email: string; showEmailField?: boolean }) {
  const [state, action] = useActionState(resendConfirmation, initial);
  return (
    <form action={action} className="grid gap-3" noValidate>
      {showEmailField ? (
        <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email ?? email} error={state.fieldErrors?.email} />
      ) : (
        <input type="hidden" name="email" value={email} />
      )}
      {state.status !== "idle" && <FormMessage state={state} />}
      <div>
        <SubmitButton variant="ghost" size="sm" pendingLabel="Sending…">Resend confirmation email</SubmitButton>
      </div>
    </form>
  );
}
