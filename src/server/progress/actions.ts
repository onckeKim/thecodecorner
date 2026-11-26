"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth/session";
import { getPathOutline } from "@/server/curriculum/service";
import type { CompleteLessonResult } from "@/types/domain";

import { completeLesson, ProgressError } from "./service";

const uuid = z.uuid();

export type CompleteLessonState =
  | { status: "idle" }
  | { status: "success"; result: CompleteLessonResult }
  | { status: "error"; message: string };

export async function completeLessonAction(
  _prev: CompleteLessonState,
  formData: FormData,
): Promise<CompleteLessonState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please sign in again to save your progress." };

  const lessonId = uuid.safeParse(formData.get("lessonId"));
  const pathSlug = z.string().max(100).safeParse(formData.get("pathSlug"));
  if (!lessonId.success || !pathSlug.success) return { status: "error", message: "Invalid lesson." };

  try {
    const result = await completeLesson(lessonId.data);
    revalidatePath(routes.learnPath(pathSlug.data), "layout");
    revalidatePath(routes.dashboard);
    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ProgressError ? error.message : "Something went wrong while saving your progress.",
    };
  }
}

/** Enrols the signed-in user in a published path, then opens it. */
export async function enrolAction(formData: FormData): Promise<void> {
  const slug = z.string().regex(/^[a-z0-9-]+$/).max(100).safeParse(formData.get("pathSlug"));
  if (!slug.success) redirect(routes.paths);

  const viewer = await getViewer();
  if (!viewer) redirect(`${routes.login}?next=${encodeURIComponent(routes.path(slug.data))}`);

  const path = await getPathOutline(slug.data);
  if (!path) redirect(routes.paths);

  const supabase = await createClient();
  const { error } = await supabase.from("enrolments").insert({ path_id: path.id });
  // 23505 = already enrolled (unique violation): treat as success.
  if (error && error.code !== "23505") {
    redirect(`${routes.path(slug.data)}?error=enrol`);
  }

  revalidatePath("/", "layout");
  redirect(routes.learnPath(slug.data));
}
