"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePreferencesAction } from "@/server/profile/actions";
import type { PreferencesField } from "@/server/profile/schema";
import type { ChoiceOption } from "@/server/onboarding/service";
import type { FormState } from "@/types/domain";

const initial: FormState<PreferencesField> = { status: "idle" };

export function PreferencesForm({ goals, weekly, goalId, weeklyId }: { goals: ChoiceOption[]; weekly: ChoiceOption[]; goalId: string | null; weeklyId: string | null }) {
  const [state, action] = useActionState(updatePreferencesAction, initial);
  return (
    <form action={action} className="grid gap-5">
      <FormMessage state={state} />
      <div className="field">
        <label htmlFor="goal">Learning goal</label>
        <select id="goal" name="goal" className="input" defaultValue={goalId ?? ""} required>
          {!goalId && <option value="" disabled>Choose a goal</option>}
          {goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="weekly">Weekly learning target</label>
        <select id="weekly" name="weekly" className="input" defaultValue={weeklyId ?? ""} required>
          {!weeklyId && <option value="" disabled>Choose a target</option>}
          {weekly.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select>
      </div>
      <div><SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton></div>
    </form>
  );
}
