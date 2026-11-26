"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOnboardingStep, type OnboardingField } from "@/server/onboarding/actions";
import type { FormState } from "@/types/domain";

const initial: FormState<OnboardingField> = { status: "idle" };

export function WelcomeStepForm() {
  const [state, action] = useActionState(saveOnboardingStep, initial);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="step" value="welcome" />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Starting…">Let’s get started</SubmitButton>
      </div>
    </form>
  );
}
