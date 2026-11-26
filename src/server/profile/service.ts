import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/server/curriculum/service";

export type ProfileView = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  username: string | null;
  bio: string | null;
  timezone: string;
  joinedAt: string;
};

export const getProfile = cache(async (userId: string): Promise<ProfileView | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, display_name, username, bio, timezone, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new DataAccessError("your profile", error);
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    displayName: data.display_name,
    username: data.username,
    bio: data.bio,
    timezone: data.timezone,
    joinedAt: data.created_at,
  };
});
