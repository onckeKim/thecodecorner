import { z } from "zod";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60, "Keep it under 60 characters."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60, "Keep it under 60 characters."),
  displayName: z.string().trim().min(1, "Enter a display name.").max(80, "Keep it under 80 characters."),
  username: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,30}$/, "3–30 characters: lowercase letters, numbers and underscores.")
      .nullable(),
  ),
  bio: z.preprocess(emptyToNull, z.string().trim().max(500, "Keep your bio under 500 characters.").nullable()),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone."),
});

export type ProfileField = "firstName" | "lastName" | "displayName" | "username" | "bio" | "timezone";

export const preferencesSchema = z.object({ goal: z.string().min(1, "Choose a goal."), weekly: z.string().min(1, "Choose a weekly target.") });
export type PreferencesField = "goal" | "weekly";
