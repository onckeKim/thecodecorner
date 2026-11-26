"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/server/auth/schemas";
import { getViewer } from "@/server/auth/session";
import type { FormState } from "@/types/domain";

import { profileSchema, type ProfileField } from "./schema";

export async function updateProfileAction(
  _prev: FormState<ProfileField>,
  formData: FormData,
): Promise<FormState<ProfileField>> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has expired. Please sign in again." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<ProfileField>(parsed.error) };
  }

  const supabase = await createClient();
  // RLS + column privileges restrict this to the viewer's own row and these columns.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio,
      timezone: parsed.data.timezone,
    })
    .eq("id", viewer.id);

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That username is taken.", fieldErrors: { username: "That username is already taken." } };
    }
    return { status: "error", message: "We couldn’t save your profile. Please try again." };
  }

  revalidatePath(routes.profile);
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}
