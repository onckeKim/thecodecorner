import type { ProgressStatus } from "@/types/database";
import type { CourseState, LessonState, ModuleState, PathOutline, PathProgress } from "@/types/domain";

/**
 * Pure progress & lock calculation for one learner on one path.
 *
 * This mirrors the authoritative rules in the database (is_course_unlocked /
 * is_module_unlocked / complete_lesson). The UI uses it to show progress and locks; the
 * database still enforces them, so a stale or tampered client can't skip ahead.
 */
export function computePathProgress(
  path: PathOutline,
  lessonStatuses: ReadonlyMap<string, ProgressStatus>,
  options: { enforcePrerequisites: boolean; bypassLocks: boolean },
): PathProgress {
  const enforce = options.enforcePrerequisites && !options.bypassLocks;
  const lessons: Record<string, LessonState> = {};
  const modules: Record<string, ModuleState> = {};
  const courses: Record<string, CourseState> = {};

  const statusOf = (lessonId: string): ProgressStatus => lessonStatuses.get(lessonId) ?? "not_started";

  // First pass: completion counts (independent of locks).
  const moduleCompleted = new Map<string, boolean>();
  const courseCompleted = new Map<string, boolean>();
  for (const course of path.courses) {
    let courseDone = 0;
    let courseTotal = 0;
    for (const mod of course.modules) {
      const done = mod.lessons.filter((l) => statusOf(l.id) === "completed").length;
      moduleCompleted.set(mod.id, done === mod.lessons.length);
      courseDone += done;
      courseTotal += mod.lessons.length;
    }
    courseCompleted.set(course.id, courseTotal > 0 && courseDone === courseTotal);
  }

  const courseTitle = new Map(path.courses.map((c) => [c.id, c.title]));
  let pathDone = 0;
  let pathTotal = 0;
  let nextLesson: PathProgress["nextLesson"] = null;

  for (const course of path.courses) {
    // Prerequisites that aren't part of this (visible) path are ignored, as in the DB.
    const blockedBy = enforce
      ? course.prerequisiteCourseIds
          .filter((id) => courseCompleted.has(id) && !courseCompleted.get(id))
          .map((id) => courseTitle.get(id) ?? "a previous course")
      : [];
    const courseLocked = blockedBy.length > 0;

    let courseDone = 0;
    let courseTotal = 0;
    let anyStarted = false;

    for (const mod of course.modules) {
      const moduleLocked =
        courseLocked ||
        (enforce &&
          mod.prerequisiteModuleIds.some((id) => moduleCompleted.has(id) && !moduleCompleted.get(id)));

      let done = 0;
      for (const lesson of mod.lessons) {
        const status = statusOf(lesson.id);
        if (status === "completed") done += 1;
        if (status !== "not_started") anyStarted = true;
        lessons[lesson.id] = { lessonId: lesson.id, status, locked: moduleLocked };
        if (!nextLesson && !moduleLocked && status !== "completed") {
          nextLesson = { courseSlug: course.slug, moduleSlug: mod.slug, lessonSlug: lesson.slug, title: lesson.title };
        }
      }

      modules[mod.id] = {
        moduleId: mod.id,
        completedLessons: done,
        totalLessons: mod.lessons.length,
        completed: mod.lessons.length > 0 && done === mod.lessons.length,
        locked: moduleLocked,
      };
      courseDone += done;
      courseTotal += mod.lessons.length;
    }

    const completed = courseTotal > 0 && courseDone === courseTotal;
    courses[course.id] = {
      courseId: course.id,
      completedLessons: courseDone,
      totalLessons: courseTotal,
      percent: courseTotal ? Math.round((courseDone / courseTotal) * 100) : 0,
      status: completed ? "completed" : anyStarted ? "in_progress" : "not_started",
      locked: courseLocked,
      blockedBy,
    };
    pathDone += courseDone;
    pathTotal += courseTotal;
  }

  return {
    percent: pathTotal ? Math.round((pathDone / pathTotal) * 100) : 0,
    completedLessons: pathDone,
    totalLessons: pathTotal,
    lessons,
    modules,
    courses,
    nextLesson,
  };
}
