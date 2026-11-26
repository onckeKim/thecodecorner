import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/server/curriculum/service";

/**
 * Assessment service. Phase 1 exposes quiz / exercise metadata only; answer keys and
 * model solutions live in admin-only tables (quiz_question_keys, exercise_solutions).
 * Grading will be a database function in a later phase so learners can't see answers.
 */
export type LessonActivities = {
  quizzes: Array<{ id: string; title: string; questionCount: number; passMark: number }>;
  exercises: Array<{ id: string; title: string; type: string }>;
};

export const getLessonActivities = cache(async (lessonId: string): Promise<LessonActivities> => {
  const supabase = await createClient();
  const [quizzes, exercises] = await Promise.all([
    supabase.from("quizzes").select("id, title, pass_mark_percent").eq("lesson_id", lessonId).eq("status", "published").order("sort_order"),
    supabase.from("exercises").select("id, title, exercise_type").eq("lesson_id", lessonId).eq("status", "published").order("sort_order"),
  ]);
  if (quizzes.error) throw new DataAccessError("quizzes", quizzes.error);
  if (exercises.error) throw new DataAccessError("exercises", exercises.error);

  const quizIds = (quizzes.data ?? []).map((q) => q.id);
  const questions = quizIds.length
    ? await supabase.from("quiz_questions").select("quiz_id").in("quiz_id", quizIds)
    : { data: [] as Array<{ quiz_id: string }>, error: null };
  if (questions.error) throw new DataAccessError("quiz questions", questions.error);

  return {
    quizzes: (quizzes.data ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      passMark: q.pass_mark_percent,
      questionCount: (questions.data ?? []).filter((x) => x.quiz_id === q.id).length,
    })),
    exercises: (exercises.data ?? []).map((e) => ({ id: e.id, title: e.title, type: e.exercise_type })),
  };
});
