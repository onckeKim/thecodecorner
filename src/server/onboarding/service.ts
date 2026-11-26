import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingAnswers } from "@/lib/onboarding/steps";
import { DataAccessError } from "@/server/curriculum/service";

/**
 * Onboarding service. Options come from the database (learning_goals, experience_levels,
 * tools, weekly_learning_targets), so new choices can be added without code changes.
 */
export type ChoiceOption = { id: string; label: string; description: string | null };

export type OnboardingOptions = {
  goals: ChoiceOption[];
  levels: ChoiceOption[];
  tools: ChoiceOption[];
  weekly: ChoiceOption[];
};

export const getOnboardingOptions = cache(async (): Promise<OnboardingOptions> => {
  const supabase = await createClient();
  const [goals, levels, tools, weekly] = await Promise.all([
    supabase.from("learning_goals").select("id, label, description").eq("is_active", true).order("sort_order"),
    supabase.from("experience_levels").select("id, label, description").eq("is_active", true).order("sort_order"),
    supabase.from("tools").select("id, label").eq("is_active", true).order("sort_order"),
    supabase.from("weekly_learning_targets").select("id, label").eq("is_active", true).order("sort_order"),
  ]);
  for (const r of [goals, levels, tools, weekly]) if (r.error) throw new DataAccessError("onboarding options", r.error);
  return {
    goals: goals.data ?? [],
    levels: levels.data ?? [],
    tools: (tools.data ?? []).map((t) => ({ ...t, description: null })),
    weekly: (weekly.data ?? []).map((w) => ({ ...w, description: null })),
  };
});

export type LearnerOnboarding = OnboardingAnswers & { toolIds: string[] };

export const getLearnerOnboarding = cache(async (userId: string): Promise<LearnerOnboarding> => {
  const supabase = await createClient();
  const [prefs, tools] = await Promise.all([
    supabase
      .from("learner_preferences")
      .select("learning_goal_id, experience_level_id, weekly_target_id, tools_answered_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("learner_tools").select("tool_id").eq("user_id", userId),
  ]);
  if (prefs.error) throw new DataAccessError("your onboarding answers", prefs.error);
  if (tools.error) throw new DataAccessError("your tools", tools.error);
  const p = prefs.data;
  return {
    started: !!p,
    learningGoalId: p?.learning_goal_id ?? null,
    experienceLevelId: p?.experience_level_id ?? null,
    toolsAnswered: !!p?.tools_answered_at,
    weeklyTargetId: p?.weekly_target_id ?? null,
    toolIds: (tools.data ?? []).map((t) => t.tool_id),
  };
});

/** Labels of the learner's answers, for the dashboard and profile. */
export async function getLearnerPlan(userId: string) {
  const [options, answers] = await Promise.all([getOnboardingOptions(), getLearnerOnboarding(userId)]);
  const label = (list: ChoiceOption[], id: string | null) => list.find((o) => o.id === id)?.label ?? null;
  return {
    answers,
    goal: label(options.goals, answers.learningGoalId),
    level: label(options.levels, answers.experienceLevelId),
    weekly: label(options.weekly, answers.weeklyTargetId),
    tools: answers.toolIds.map((id) => label(options.tools, id)).filter((l): l is string => !!l),
    options,
  };
}
