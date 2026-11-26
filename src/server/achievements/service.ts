import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/server/curriculum/service";

/**
 * Achievement service. Achievements are awarded by the database (evaluate_achievements)
 * whenever progress changes; this service reads the catalogue and the learner's awards.
 */
export type AchievementView = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  xpReward: number;
  earnedAt: string | null;
};

export const getAchievements = cache(async (userId: string): Promise<AchievementView[]> => {
  const supabase = await createClient();
  const [catalogue, earned] = await Promise.all([
    supabase.from("achievements").select("id, slug, title, description, icon, xp_reward").eq("status", "published").order("sort_order"),
    supabase.from("user_achievements").select("achievement_id, awarded_at").eq("user_id", userId),
  ]);
  if (catalogue.error) throw new DataAccessError("achievements", catalogue.error);
  if (earned.error) throw new DataAccessError("your achievements", earned.error);
  const earnedAt = new Map((earned.data ?? []).map((e) => [e.achievement_id, e.awarded_at]));
  return (catalogue.data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    icon: a.icon,
    xpReward: a.xp_reward,
    earnedAt: earnedAt.get(a.id) ?? null,
  }));
});

export type CertificateView = { id: string; number: string; title: string; issuedAt: string };

export const getCertificates = cache(async (userId: string): Promise<CertificateView[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("id, certificate_number, issued_at, path_id, course_id")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw new DataAccessError("your certificates", error);
  const rows = data ?? [];
  if (!rows.length) return [];
  const [paths, courses] = await Promise.all([
    supabase.from("learning_paths").select("id, title"),
    supabase.from("courses").select("id, title"),
  ]);
  const titleOf = (r: (typeof rows)[number]) =>
    (r.path_id && paths.data?.find((p) => p.id === r.path_id)?.title) ||
    (r.course_id && courses.data?.find((c) => c.id === r.course_id)?.title) ||
    "Certificate";
  return rows.map((r) => ({ id: r.id, number: r.certificate_number, title: titleOf(r), issuedAt: r.issued_at }));
});
