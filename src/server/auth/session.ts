import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { routes, safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import type { RoleId, Viewer } from "@/types/domain";

/**
 * Authentication service: resolves the current user for this request.
 *
 * The session lives in HTTP-only cookies managed by @supabase/ssr and is refreshed by the
 * proxy on every request. getUser() verifies the token with Supabase Auth, so nothing on
 * the client (localStorage etc.) is trusted. Wrapped in React `cache` so layouts, pages
 * and actions share one lookup per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Every page shows per-user state (at least the header), so always render per request,
  // even when Supabase isn't configured and no cookie is read.
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const loadProfile = () =>
    supabase
      .from("profiles")
      .select("display_name, username, email, first_name, last_name, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

  let [{ data: profile }, { data: roleRows }] = await Promise.all([
    loadProfile(),
    supabase.from("user_roles").select("role_id").eq("user_id", user.id),
  ]);

  // Safety net: the sign-up trigger normally creates these rows. If they are missing
  // (e.g. a user created before the trigger existed), create them idempotently.
  if (!profile) {
    await supabase.rpc("ensure_profile");
    [{ data: profile }, { data: roleRows }] = await Promise.all([
      loadProfile(),
      supabase.from("user_roles").select("role_id").eq("user_id", user.id),
    ]);
  }

  const roles = (roleRows ?? [])
    .map((r) => r.role_id)
    .filter((r): r is RoleId => r === "learner" || r === "admin");

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    displayName: profile?.display_name || profile?.first_name || user.email?.split("@")[0] || "Learner",
    username: profile?.username ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    onboardingCompleted: profile?.onboarding_completed ?? false,
  };
});

/**
 * Where a user should go after signing in or confirming their email:
 *   learner who hasn't finished onboarding → /onboarding
 *   administrator                         → /admin
 *   learner                               → /dashboard
 * An explicit, safe `next` path wins for onboarded users and admins.
 */
export function destinationFor(viewer: Viewer, next?: string | null): string {
  const target = next ? safeNextPath(next, "") : "";
  if (!viewer.onboardingCompleted && !viewer.isAdmin) return routes.onboarding;
  if (target) return target;
  return viewer.isAdmin ? routes.admin : routes.dashboard;
}

/** For pages that need a signed-in user. Redirects to /login (returning here afterwards). */
export async function requireViewer(nextPath?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(nextPath ? `${routes.login}?next=${encodeURIComponent(nextPath)}` : routes.login);
  }
  return viewer;
}

/** For learner areas: also requires onboarding to be complete (admins are exempt). */
export async function requireOnboardedViewer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.onboardingCompleted && !viewer.isAdmin) redirect(routes.onboarding);
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
