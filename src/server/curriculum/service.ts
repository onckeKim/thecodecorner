import "server-only";

import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type {
  CourseOutline,
  LessonDetail,
  LessonLink,
  LessonLocation,
  LessonOutline,
  ModuleOutline,
  PathOutline,
  PathSummary,
} from "@/types/domain";

/**
 * Curriculum service: reads learning paths → courses → modules → lessons.
 *
 * Queries run as the current user, so RLS decides what is visible: learners and visitors
 * only ever receive published content; administrators also see drafts. Structure is
 * fetched as flat lists and assembled here (no curriculum is hard-coded in components).
 */

export class DataAccessError extends Error {
  constructor(what: string, cause?: unknown) {
    super(`Could not load ${what}.`);
    this.name = "DataAccessError";
    this.cause = cause;
  }
}

/** Throws DataAccessError for Supabase errors so route error boundaries can handle them. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new DataAccessError(what, result.error);
  if (result.data === null) throw new DataAccessError(what);
  return result.data;
}

export const listPaths = cache(async (): Promise<PathSummary[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const [paths, courses] = await Promise.all([
    supabase
      .from("learning_paths")
      .select("id, slug, title, summary, level, estimated_hours, icon, status")
      .eq("status", "published")
      .order("sort_order")
      .order("title"),
    supabase.from("courses").select("id, path_id").eq("status", "published"),
  ]);
  const pathRows = unwrap(paths, "learning paths");
  const courseRows = unwrap(courses, "courses");

  return pathRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    level: p.level,
    estimatedHours: p.estimated_hours,
    icon: p.icon,
    courseCount: courseRows.filter((c) => c.path_id === p.id).length,
  }));
});

/**
 * Full outline of a path (no lesson bodies). Returns null when the path doesn't exist or
 * isn't visible to the current user. Learner-facing pages only include published items
 * even for admins, unless `includeDrafts` is set (admin previews).
 */
export const getPathOutline = cache(async (slug: string, includeDrafts = false): Promise<PathOutline | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const pathResult = await supabase
    .from("learning_paths")
    .select("id, slug, title, summary, description, level, estimated_hours, icon, status")
    .eq("slug", slug)
    .maybeSingle();
  if (pathResult.error) throw new DataAccessError("the learning path", pathResult.error);
  const path = pathResult.data;
  if (!path || (!includeDrafts && path.status !== "published")) return null;

  const courseRows = unwrap(
    await supabase
      .from("courses")
      .select("id, slug, title, summary, description, level, estimated_hours, icon, theme, sort_order, status")
      .eq("path_id", path.id)
      .order("sort_order")
      .order("title"),
    "courses",
  ).filter((c) => includeDrafts || c.status === "published");

  const courseIds = courseRows.map((c) => c.id);
  const moduleRows = courseIds.length
    ? unwrap(
        await supabase
          .from("modules")
          .select("id, course_id, slug, title, summary, estimated_minutes, sort_order, status")
          .in("course_id", courseIds)
          .order("sort_order")
          .order("title"),
        "modules",
      ).filter((m) => includeDrafts || m.status === "published")
    : [];

  const moduleIds = moduleRows.map((m) => m.id);
  const [lessonRows, coursePrereqs, modulePrereqs] = await Promise.all([
    moduleIds.length
      ? supabase
          .from("lessons")
          .select("id, module_id, slug, title, summary, lesson_type, estimated_minutes, xp_reward, sort_order, status")
          .in("module_id", moduleIds)
          .order("sort_order")
          .order("title")
          .then((r) => unwrap(r, "lessons").filter((l) => includeDrafts || l.status === "published"))
      : Promise.resolve([]),
    courseIds.length
      ? supabase
          .from("course_prerequisites")
          .select("course_id, required_course_id")
          .in("course_id", courseIds)
          .then((r) => unwrap(r, "course prerequisites"))
      : Promise.resolve([]),
    moduleIds.length
      ? supabase
          .from("module_prerequisites")
          .select("module_id, required_module_id")
          .in("module_id", moduleIds)
          .then((r) => unwrap(r, "module prerequisites"))
      : Promise.resolve([]),
  ]);

  const courses: CourseOutline[] = courseRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    description: c.description,
    level: c.level,
    estimatedHours: c.estimated_hours,
    icon: c.icon,
    theme: c.theme,
    sortOrder: c.sort_order,
    status: c.status,
    prerequisiteCourseIds: coursePrereqs.filter((p) => p.course_id === c.id).map((p) => p.required_course_id),
    modules: moduleRows
      .filter((m) => m.course_id === c.id)
      .map<ModuleOutline>((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        estimatedMinutes: m.estimated_minutes,
        sortOrder: m.sort_order,
        status: m.status,
        prerequisiteModuleIds: modulePrereqs.filter((p) => p.module_id === m.id).map((p) => p.required_module_id),
        lessons: lessonRows
          .filter((l) => l.module_id === m.id)
          .map<LessonOutline>((l) => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
            summary: l.summary,
            lessonType: l.lesson_type,
            estimatedMinutes: l.estimated_minutes,
            xpReward: l.xp_reward,
            sortOrder: l.sort_order,
            status: l.status,
          })),
      })),
  }));

  return {
    id: path.id,
    slug: path.slug,
    title: path.title,
    summary: path.summary,
    description: path.description,
    level: path.level,
    estimatedHours: path.estimated_hours,
    icon: path.icon,
    status: path.status,
    courses,
  };
});

export function findCourse(path: PathOutline, courseSlug: string): CourseOutline | null {
  return path.courses.find((c) => c.slug === courseSlug) ?? null;
}

/** Locates a lesson in its path and works out previous/next lessons across modules and courses. */
export function locateLesson(
  path: PathOutline,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): LessonLocation | null {
  const flat: Array<{ course: CourseOutline; module: ModuleOutline; lesson: LessonOutline }> = [];
  for (const course of path.courses)
    for (const mod of course.modules) for (const lesson of mod.lessons) flat.push({ course, module: mod, lesson });

  const index = flat.findIndex(
    (f) => f.course.slug === courseSlug && f.module.slug === moduleSlug && f.lesson.slug === lessonSlug,
  );
  const here = flat[index];
  if (index === -1 || !here) return null;

  const link = (f: (typeof flat)[number] | undefined): LessonLink | null =>
    f ? { title: f.lesson.title, href: routes.lesson(path.slug, f.course.slug, f.module.slug, f.lesson.slug) } : null;

  return {
    path,
    course: here.course,
    module: here.module,
    lesson: here.lesson,
    previous: link(flat[index - 1]),
    next: link(flat[index + 1]),
  };
}

/** Lesson body. RLS returns nothing for unpublished lessons unless the user is an admin. */
export const getLessonDetail = cache(async (lessonId: string): Promise<LessonDetail | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const result = await supabase
    .from("lessons")
    .select("id, slug, title, summary, lesson_type, estimated_minutes, xp_reward, sort_order, status, content, video_url")
    .eq("id", lessonId)
    .maybeSingle();
  if (result.error) throw new DataAccessError("the lesson", result.error);
  const l = result.data;
  if (!l) return null;
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    summary: l.summary,
    lessonType: l.lesson_type,
    estimatedMinutes: l.estimated_minutes,
    xpReward: l.xp_reward,
    sortOrder: l.sort_order,
    status: l.status,
    content: l.content,
    videoUrl: l.video_url,
  };
});

/** Platform switch: whether prerequisites lock later courses/modules. */
export const getEnforcePrerequisites = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "enforce_prerequisites").maybeSingle();
  return data?.value !== false;
});

export type ProjectSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string | null;
  estimatedHours: number | null;
  xpReward: number;
  brief: unknown;
  pathTitle: string;
};

export const listProjects = cache(async (): Promise<ProjectSummary[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const [projects, paths] = await Promise.all([
    supabase
      .from("projects")
      .select("id, path_id, slug, title, summary, level, estimated_hours, xp_reward, brief")
      .eq("status", "published")
      .order("sort_order"),
    supabase.from("learning_paths").select("id, title"),
  ]);
  const pathRows = unwrap(paths, "learning paths");
  return unwrap(projects, "projects").map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    level: p.level,
    estimatedHours: p.estimated_hours,
    xpReward: p.xp_reward,
    brief: p.brief,
    pathTitle: pathRows.find((x) => x.id === p.path_id)?.title ?? "",
  }));
});
