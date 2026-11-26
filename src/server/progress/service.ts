import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getEnforcePrerequisites, getPathOutline, DataAccessError } from "@/server/curriculum/service";
import type { ProgressStatus } from "@/types/database";
import type { CompleteLessonResult, Enrolment, PathOutline, PathProgress, Viewer } from "@/types/domain";

import { computePathProgress } from "./compute";

/**
 * Progress service: enrolments and lesson/course/path progress for the current user.
 * Reads go through RLS (own rows only). Writes go through the database functions
 * start_lesson / complete_lesson, which validate enrolment, visibility and locks.
 */

export const getEnrolments = cache(async (userId: string): Promise<Enrolment[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrolments")
    .select("id, path_id, status, enrolled_at, completed_at")
    .eq("user_id", userId)
    .order("enrolled_at");
  if (error) throw new DataAccessError("your enrolments", error);
  return (data ?? []).map((e) => ({
    id: e.id,
    pathId: e.path_id,
    status: e.status,
    enrolledAt: e.enrolled_at,
    completedAt: e.completed_at,
  }));
});

export async function getEnrolment(userId: string, pathId: string): Promise<Enrolment | null> {
  const all = await getEnrolments(userId);
  return all.find((e) => e.pathId === pathId && e.status !== "withdrawn") ?? null;
}

export const getLessonStatuses = cache(async (userId: string): Promise<Map<string, ProgressStatus>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lesson_progress").select("lesson_id, status").eq("user_id", userId);
  if (error) throw new DataAccessError("your progress", error);
  return new Map((data ?? []).map((r) => [r.lesson_id, r.status]));
});

export async function getPathProgress(viewer: Viewer, path: PathOutline): Promise<PathProgress> {
  const [statuses, enforce] = await Promise.all([getLessonStatuses(viewer.id), getEnforcePrerequisites()]);
  return computePathProgress(path, statuses, { enforcePrerequisites: enforce, bypassLocks: viewer.isAdmin });
}

export type EnrolledPath = { path: PathOutline; enrolment: Enrolment; progress: PathProgress };

export async function getEnrolledPaths(viewer: Viewer, pathSlugsById: Map<string, string>): Promise<EnrolledPath[]> {
  const enrolments = (await getEnrolments(viewer.id)).filter((e) => e.status !== "withdrawn");
  const results = await Promise.all(
    enrolments.map(async (enrolment) => {
      const slug = pathSlugsById.get(enrolment.pathId);
      const path = slug ? await getPathOutline(slug) : null;
      if (!path) return null;
      return { path, enrolment, progress: await getPathProgress(viewer, path) };
    }),
  );
  return results.filter((r): r is EnrolledPath => r !== null);
}

/** Records that the learner opened a lesson. Errors are non-fatal for page rendering. */
export async function recordLessonVisit(lessonId: string): Promise<ProgressStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_lesson", { p_lesson_id: lessonId });
  if (error) return null;
  return data;
}

export class ProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressError";
  }
}

export async function completeLesson(lessonId: string): Promise<CompleteLessonResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });
  if (error) {
    // Messages raised by the database function are written for learners.
    const known = ["not enrolled", "locked", "not found", "Not authenticated"].some((k) => error.message.includes(k));
    throw new ProgressError(known ? error.message : "Something went wrong while saving your progress.");
  }
  return parseCompleteResult(data);
}

function parseCompleteResult(raw: unknown): CompleteLessonResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const achievements = Array.isArray(obj.new_achievements) ? obj.new_achievements : [];
  return {
    alreadyCompleted: obj.already_completed === true,
    xpAwarded: num(obj.xp_awarded),
    currentStreak: num(obj.current_streak),
    courseCompleted: obj.course_completed === true,
    coursePercent: num(obj.course_percent),
    newAchievements: achievements
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .map((a) => ({ slug: String(a.slug ?? ""), title: String(a.title ?? ""), xpReward: num(a.xp_reward) })),
  };
}
