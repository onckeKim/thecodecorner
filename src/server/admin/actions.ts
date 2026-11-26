"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { assertAdmin, AuthorizationError } from "@/server/auth/session";

import { CONTENT_ENTITIES, ENTITY_TABLE } from "./service";

export type AdminActionState = { status: "idle" | "success" | "error"; message?: string };

const statusSchema = z.object({
  entity: z.enum(CONTENT_ENTITIES),
  id: z.uuid(),
  status: z.enum(["draft", "published", "archived"]),
});

/** Publish / unpublish / archive a curriculum item. Admin-only (checked here and by RLS). */
export async function setContentStatusAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await assertAdmin();
  } catch (e) {
    return { status: "error", message: e instanceof AuthorizationError ? e.message : "Not allowed." };
  }

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid request." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(ENTITY_TABLE[parsed.data.entity])
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");

  if (error) return { status: "error", message: "The change could not be saved." };
  if (!data?.length) return { status: "error", message: "Item not found, or you don’t have permission to change it." };

  revalidatePath("/", "layout");
  return { status: "success", message: parsed.data.status === "published" ? "Published." : parsed.data.status === "draft" ? "Moved to draft." : "Archived." };
}

const settingSchema = z.object({ enforce: z.enum(["true", "false"]) });

/** Turns prerequisite locking on or off for the whole platform. */
export async function setEnforcePrerequisitesAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  let adminId: string;
  try {
    adminId = (await assertAdmin()).id;
  } catch (e) {
    return { status: "error", message: e instanceof AuthorizationError ? e.message : "Not allowed." };
  }
  const parsed = settingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({ value: parsed.data.enforce === "true", updated_by: adminId })
    .eq("key", "enforce_prerequisites");
  if (error) return { status: "error", message: "The setting could not be saved." };

  revalidatePath("/", "layout");
  return { status: "success", message: parsed.data.enforce === "true" ? "Prerequisites are now enforced." : "All content is now unlocked for testing." };
}
