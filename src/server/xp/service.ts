import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/server/curriculum/service";
import type { LearningSummary } from "@/types/domain";

/**
 * XP service. XP is only ever awarded by database functions (award_xp, called from
 * complete_lesson and achievement evaluation) so learners cannot grant themselves XP.
 */
export const getLearningSummary = cache(async (): Promise<LearningSummary> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_learning_summary");
  if (error) throw new DataAccessError("your learning summary", error);
  const row = data?.[0];
  return {
    totalXp: row?.total_xp ?? 0,
    lessonsCompleted: row?.lessons_completed ?? 0,
    coursesCompleted: row?.courses_completed ?? 0,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    achievementsEarned: row?.achievements_earned ?? 0,
  };
});

export type XpEntry = { id: string; amount: number; description: string | null; createdAt: string };

export const getRecentXp = cache(async (userId: string, limit = 8): Promise<XpEntry[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("xp_transactions")
    .select("id, amount, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new DataAccessError("your XP history", error);
  return (data ?? []).map((x) => ({ id: x.id, amount: x.amount, description: x.description, createdAt: x.created_at }));
});
