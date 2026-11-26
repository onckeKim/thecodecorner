import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { RoleId, Viewer } from "@/types/domain";

/**
 * Authentication service: resolves the current user for this request.
 * Wrapped in React `cache` so layouts, pages and actions share one lookup per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Every page shows per-user state (at least the header), so always render per request,
  // even when Supabase isn't configured and no cookie is read.
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  // getUser() verifies the JWT with Supabase Auth rather than trusting the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role_id").eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? [])
    .map((r) => r.role_id)
    .filter((r): r is RoleId => r === "learner" || r === "admin");

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    displayName: profile?.display_name || user.email?.split("@")[0] || "Learner",
    username: profile?.username ?? null,
    roles,
    isAdmin: roles.includes("admin"),
  };
});

/** For pages that need a signed-in user. Redirects to /login (returning here afterwards). */
export async function requireViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(nextPath ? `${routes.login}?next=${encodeURIComponent(nextPath)}` : routes.login);
  }
  return viewer;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * For server actions / route handlers that require an administrator.
 * Always checked on the server; hiding admin links in the UI is not a security boundary.
 * The database enforces the same rule through RLS (public.is_admin()).
 */
export async function assertAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthorizationError("Please sign in.");
  if (!viewer.isAdmin) throw new AuthorizationError();
  return viewer;
}
