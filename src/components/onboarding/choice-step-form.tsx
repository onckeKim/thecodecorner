"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { NONE_TOOL } from "@/lib/onboarding/steps";
import { saveOnboardingStep, type OnboardingField } from "@/server/onboarding/actions";
import type { ChoiceOption } from "@/server/onboarding/service";
import type { FormState } from "@/types/domain";

const initial: FormState<OnboardingField> = { status: "idle" };
const KEYS = "ABCDEFGHIJKLMNOP";

type Props = {
  step: string;
  legend: string;
  hint?: string;
  options: ChoiceOption[];
  multiple?: boolean;
  /** Adds an exclusive "None of these" option (multiple-choice only). */
  noneOption?: string;
  defaultValues: string[];
  submitLabel: string;
  pendingLabel: string;
  backHref?: string;
};

/** One onboarding question rendered as accessible radio / checkbox options. */
export function ChoiceStepForm(props: Props) {
  const { step, legend, hint, options, multiple, noneOption, defaultValues, submitLabel, pendingLabel, backHref } = props;
  const [state, action] = useActionState(saveOnboardingStep, initial);
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const error = state.fieldErrors?.choice;
  const errorId = `${step}-error`;

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors?.choice) fieldsetRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [state]);

  const all: ChoiceOption[] = noneOption ? [...options, { id: NONE_TOOL, label: noneOption, description: null }] : options;

  function toggle(id: string, checked: boolean) {
    if (!multiple) return setSelected([id]);
    setSelected((prev) => {
      if (id === NONE_TOOL) return checked ? [NONE_TOOL] : [];
      const without = prev.filter((v) => v !== NONE_TOOL && v !== id);
      return checked ? [...without, id] : without;
    });
  }

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="step" value={step} />
      <fieldset ref={fieldsetRef} className="choices" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : hint ? `${step}-hint` : undefined}>
        <legend>
          <span className="font-display text-[clamp(1.4rem,1.1rem+1vw,1.75rem)] font-semibold">{legend}</span>
          {hint && <span id={`${step}-hint`} className="mt-1 block text-sm text-muted">{hint}</span>}
        </legend>
        {all.map((o, i) => {
          const checked = selected.includes(o.id);
          return (
            <label key={o.id} className="option">
              <input
                className="sr-only"
                type={multiple ? "checkbox" : "radio"}
                name="choice"
                value={o.id}
                checked={checked}
                onChange={(e) => toggle(o.id, e.target.checked)}
              />
              <span className="option__key" aria-hidden="true">{multiple ? (checked ? "✓" : "") : KEYS[i]}</span>
              <span className="min-w-0">
                <span className="block">{o.label}</span>
                {o.description && <span className="mt-0.5 block text-sm font-normal text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
        {error && <p id={errorId} className="field-error mt-1" role="alert">{error}</p>}
      </fieldset>

      {state.status === "error" && !error && <FormMessage state={state} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {backHref ? <Link className="btn btn--ghost" href={backHref}>← Back</Link> : <span />}
        <SubmitButton pendingLabel={pendingLabel} disabled={!selected.length}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
