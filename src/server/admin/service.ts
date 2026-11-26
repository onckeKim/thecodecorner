import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/server/curriculum/service";
import type { ContentStatus } from "@/types/database";

/**
 * Admin service (read side). Callers must already have verified the viewer is an
 * admin (admin layout + assertAdmin); RLS independently restricts these reads.
 */

export const CONTENT_ENTITIES = ["paths", "courses", "modules", "lessons", "quizzes", "projects"] as const;
export type ContentEntity = (typeof CONTENT_ENTITIES)[number];

export const ENTITY_TABLE = {
  paths: "learning_paths",
  courses: "courses",
  modules: "modules",
  lessons: "lessons",
  quizzes: "quizzes",
  projects: "projects",
} as const satisfies Record<ContentEntity, string>;

export const ENTITY_LABEL: Record<ContentEntity, { singular: string; plural: string }> = {
  paths: { singular: "Learning path", plural: "Learning paths" },
  courses: { singular: "Course", plural: "Courses" },
  modules: { singular: "Module", plural: "Modules" },
  lessons: { singular: "Lesson", plural: "Lessons" },
  quizzes: { singular: "Quiz", plural: "Quizzes" },
  projects: { singular: "Project", plural: "Projects" },
};

export type AdminContentRow = {
  id: string;
  title: string;
  status: ContentStatus;
  context: string;
  sortOrder: number;
  updatedAt: string;
};

type Named = { id: string; title: string };
const titleMap = (rows: Named[] | null) => new Map((rows ?? []).map((r) => [r.id, r.title]));

export async function listContent(entity: ContentEntity): Promise<AdminContentRow[]> {
  const supabase = await createClient();
  const fail = (e: unknown): never => {
    throw new DataAccessError(entity, e);
  };

  switch (entity) {
    case "paths": {
      const { data, error } = await supabase.from("learning_paths").select("id, title, status, sort_order, updated_at, slug").order("sort_order");
      if (error) fail(error);
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, context: `/${r.slug}`, sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
    case "courses": {
      const [{ data, error }, paths] = await Promise.all([
        supabase.from("courses").select("id, title, status, sort_order, updated_at, path_id").order("sort_order"),
        supabase.from("learning_paths").select("id, title"),
      ]);
      if (error) fail(error);
      const p = titleMap(paths.data);
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, context: p.get(r.path_id) ?? "", sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
    case "modules": {
      const [{ data, error }, courses] = await Promise.all([
        supabase.from("modules").select("id, title, status, sort_order, updated_at, course_id"),
        supabase.from("courses").select("id, title, sort_order").order("sort_order"),
      ]);
      if (error) fail(error);
      const c = titleMap(courses.data);
      const courseOrder = new Map((courses.data ?? []).map((x) => [x.id, x.sort_order]));
      return (data ?? [])
        .sort((a, b) => (courseOrder.get(a.course_id) ?? 0) - (courseOrder.get(b.course_id) ?? 0) || a.sort_order - b.sort_order)
        .map((r) => ({ id: r.id, title: r.title, status: r.status, context: c.get(r.course_id) ?? "", sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
    case "lessons": {
      const [{ data, error }, modules, courses] = await Promise.all([
        supabase.from("lessons").select("id, title, status, sort_order, updated_at, module_id"),
        supabase.from("modules").select("id, title, course_id, sort_order"),
        supabase.from("courses").select("id, title, sort_order"),
      ]);
      if (error) fail(error);
      const mods = new Map((modules.data ?? []).map((m) => [m.id, m]));
      const crs = new Map((courses.data ?? []).map((c) => [c.id, c]));
      const key = (moduleId: string) => {
        const m = mods.get(moduleId);
        const c = m ? crs.get(m.course_id) : undefined;
        return [(c?.sort_order ?? 0) * 1000 + (m?.sort_order ?? 0), `${c?.title ?? ""} › ${m?.title ?? ""}`] as const;
      };
      return (data ?? [])
        .sort((a, b) => key(a.module_id)[0] - key(b.module_id)[0] || a.sort_order - b.sort_order)
        .map((r) => ({ id: r.id, title: r.title, status: r.status, context: key(r.module_id)[1], sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
    case "quizzes": {
      const [{ data, error }, lessons] = await Promise.all([
        supabase.from("quizzes").select("id, title, status, sort_order, updated_at, lesson_id").order("sort_order"),
        supabase.from("lessons").select("id, title"),
      ]);
      if (error) fail(error);
      const l = titleMap(lessons.data);
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, context: r.lesson_id ? `Lesson: ${l.get(r.lesson_id) ?? ""}` : "Module quiz", sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
    case "projects": {
      const [{ data, error }, paths] = await Promise.all([
        supabase.from("projects").select("id, title, status, sort_order, updated_at, path_id").order("sort_order"),
        supabase.from("learning_paths").select("id, title"),
      ]);
      if (error) fail(error);
      const p = titleMap(paths.data);
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, context: p.get(r.path_id) ?? "", sortOrder: r.sort_order, updatedAt: r.updated_at }));
    }
  }
}

export type AdminOverview = {
  counts: Record<ContentEntity, { total: number; published: number }>;
  users: number;
  enrolments: number;
  enforcePrerequisites: boolean;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const count = async (table: (typeof ENTITY_TABLE)[ContentEntity], published: boolean) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (published) q = q.eq("status", "published");
    const { count: n, error } = await q;
    if (error) throw new DataAccessError(table, error);
    return n ?? 0;
  };

  const entries = await Promise.all(
    CONTENT_ENTITIES.map(async (e) => [e, { total: await count(ENTITY_TABLE[e], false), published: await count(ENTITY_TABLE[e], true) }] as const),
  );
  const [users, enrolments, setting] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("enrolments").select("id", { count: "exact", head: true }),
    supabase.from("platform_settings").select("value").eq("key", "enforce_prerequisites").maybeSingle(),
  ]);

  return {
    counts: Object.fromEntries(entries) as AdminOverview["counts"],
    users: users.count ?? 0,
    enrolments: enrolments.count ?? 0,
    enforcePrerequisites: setting.data?.value !== false,
  };
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string;
  username: string | null;
  roles: string[];
  enrolments: number;
  joinedAt: string;
};

export async function listUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const [profiles, roles, enrolments] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, username, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("user_roles").select("user_id, role_id"),
    supabase.from("enrolments").select("user_id"),
  ]);
  if (profiles.error) throw new DataAccessError("users", profiles.error);
  return (profiles.data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    username: p.username,
    roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role_id).sort(),
    enrolments: (enrolments.data ?? []).filter((e) => e.user_id === p.id).length,
    joinedAt: p.created_at,
  }));
}
