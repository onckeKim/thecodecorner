"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/server/auth/schemas";
import { getViewer } from "@/server/auth/session";
import type { FormState } from "@/types/domain";

import { getOnboardingOptions } from "@/server/onboarding/service";

import { preferencesSchema, profileSchema, type PreferencesField, type ProfileField } from "./schema";

export async function updateProfileAction(
  _prev: FormState<ProfileField>,
  formData: FormData,
): Promise<FormState<ProfileField>> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has expired. Please sign in again.", link: { href: `${routes.login}?next=${encodeURIComponent(routes.profile)}`, label: "Sign in" } };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom<ProfileField>(parsed.error) };
  }

  const supabase = await createClient();
  // RLS + column privileges restrict this to the viewer's own row and these columns.
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
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

/** Updates the learning goal and weekly target chosen during onboarding. */
export async function updatePreferencesAction(
  _prev: FormState<PreferencesField>,
  formData: FormData,
): Promise<FormState<PreferencesField>> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has expired. Please sign in again.", link: { href: `${routes.login}?next=${encodeURIComponent(routes.profile)}`, label: "Sign in" } };

  const parsed = preferencesSchema.safeParse(Object.fromEntries(formData));
  const options = await getOnboardingOptions();
  if (!parsed.success || !options.goals.some((g) => g.id === parsed.data.goal) || !options.weekly.some((w) => w.id === parsed.data.weekly)) {
    return { status: "error", message: "Please choose from the listed options." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("learner_preferences")
    .update({ learning_goal_id: parsed.data.goal, weekly_target_id: parsed.data.weekly })
    .eq("user_id", viewer.id);
  if (error) return { status: "error", message: "We couldn’t save your preferences. Please try again." };

  revalidatePath(routes.profile);
  revalidatePath(routes.dashboard);
  return { status: "success", message: "Preferences saved." };
}
