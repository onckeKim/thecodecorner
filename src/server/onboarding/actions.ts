"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isOnboardingStep, nextStep, normaliseTools, type OnboardingStep } from "@/lib/onboarding/steps";
import { routes } from "@/lib/routes";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import type { FormState } from "@/types/domain";

import { getOnboardingOptions } from "./service";

export type OnboardingField = "choice";
type State = FormState<OnboardingField>;

const SESSION_EXPIRED: State = {
  status: "error",
  message: "Your session has expired. Sign in again to continue. Your answers so far are saved.",
  link: { href: `${routes.login}?next=${encodeURIComponent(routes.onboarding)}`, label: "Sign in" },
};
const SAVE_FAILED: State = { status: "error", message: "We couldn’t save your answer. Please try again." };

/** Creates the learner's preferences row (idempotent). */
async function ensurePreferencesRow(supabase: ServerSupabaseClient, userId: string) {
  const { error } = await supabase.from("learner_preferences").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  return error;
}

/**
 * Saves one onboarding step, then moves to the next. Each answer is stored immediately
 * (learner_preferences / learner_tools, protected by RLS) so onboarding can be resumed.
 */
export async function saveOnboardingStep(_prev: State, formData: FormData): Promise<State> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_EXPIRED;

  const stepValue = String(formData.get("step") ?? "");
  if (!isOnboardingStep(stepValue)) return { status: "error", message: "Unknown onboarding step." };
  const step: OnboardingStep = stepValue;

  const supabase = await createClient();
  const options = await getOnboardingOptions();
  const prefsError = await ensurePreferencesRow(supabase, viewer.id);
  if (prefsError) return SAVE_FAILED;

  const single = (ids: string[], message: string) =>
    z.string().refine((v) => ids.includes(v), message).safeParse(formData.get("choice") ?? "");

  switch (step) {
    case "welcome":
      break; // the row created above marks onboarding as started

    case "goal": {
      const parsed = single(options.goals.map((o) => o.id), "Choose what you’d like to achieve.");
      if (!parsed.success) return { status: "error", message: "Please choose an option.", fieldErrors: { choice: parsed.error.issues[0]?.message } };
      const { error } = await supabase.from("learner_preferences").update({ learning_goal_id: parsed.data }).eq("user_id", viewer.id);
      if (error) return SAVE_FAILED;
      break;
    }

    case "experience": {
      const parsed = single(options.levels.map((o) => o.id), "Choose the level that fits you best.");
      if (!parsed.success) return { status: "error", message: "Please choose an option.", fieldErrors: { choice: parsed.error.issues[0]?.message } };
      const { error } = await supabase.from("learner_preferences").update({ experience_level_id: parsed.data }).eq("user_id", viewer.id);
      if (error) return SAVE_FAILED;
      break;
    }

    case "tools": {
      const selected = formData.getAll("choice").filter((v): v is string => typeof v === "string");
      const result = normaliseTools(selected, options.tools.map((t) => t.id));
      if (!result.ok) return { status: "error", message: "Please check your selection.", fieldErrors: { choice: result.error } };
      // Replace the selection, then record that the question was answered.
      const del = await supabase.from("learner_tools").delete().eq("user_id", viewer.id);
      if (del.error) return SAVE_FAILED;
      if (result.tools.length) {
        const ins = await supabase.from("learner_tools").insert(result.tools.map((tool_id) => ({ user_id: viewer.id, tool_id })));
        if (ins.error) return SAVE_FAILED;
      }
      const { error } = await supabase.from("learner_preferences").update({ tools_answered_at: new Date().toISOString() }).eq("user_id", viewer.id);
      if (error) return SAVE_FAILED;
      break;
    }

    case "time": {
      const parsed = single(options.weekly.map((o) => o.id), "Choose how much time you’d like to spend each week.");
      if (!parsed.success) return { status: "error", message: "Please choose an option.", fieldErrors: { choice: parsed.error.issues[0]?.message } };
      const { error } = await supabase.from("learner_preferences").update({ weekly_target_id: parsed.data }).eq("user_id", viewer.id);
      if (error) return SAVE_FAILED;

      // Last step: validate everything, mark onboarding complete and enrol in the
      // default path (Data Analyst) exactly once. All done in one database function.
      const done = await supabase.rpc("complete_onboarding");
      if (done.error) {
        return done.error.message.includes("answer every")
          ? { status: "error", message: "Some answers are missing. Please go back and complete every step." }
          : { status: "error", message: "We couldn’t finish setting up your account. Please try again." };
      }
      revalidatePath("/", "layout");
      redirect(`${routes.dashboard}?welcome=1`);
    }
  }

  revalidatePath(routes.onboarding, "layout");
  const next = nextStep(step);
  redirect(routes.onboardingStep(next ?? "time"));
}
