/** Route helpers: one place for URL shapes so links stay consistent. */
export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  learn: "/learn",
  paths: "/paths",
  path: (slug: string) => `/paths/${slug}`,
  dashboard: "/dashboard",
  learnPath: (path: string) => `/learn/${path}`,
  learnCourse: (path: string, course: string) => `/learn/${path}/${course}`,
  learnModule: (path: string, course: string, mod: string) => `/learn/${path}/${course}/${mod}`,
  lesson: (path: string, course: string, mod: string, lesson: string) => `/learn/${path}/${course}/${mod}/${lesson}`,
  practice: "/practice",
  projects: "/projects",
  profile: "/profile",
  achievements: "/achievements",
  certificates: "/certificates",
  admin: "/admin",
} as const;

/** Areas that require a signed-in user. /learn itself is public; anything below it is not. */
const PROTECTED_PREFIXES = ["/dashboard", "/practice", "/projects", "/profile", "/achievements", "/certificates", "/admin"];

export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/learn/")) return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Returns a safe in-app redirect target. Only same-origin relative paths are allowed,
 * which prevents open-redirects via ?next=https://evil.example.
 */
export function safeNextPath(next: unknown, fallback: string = routes.dashboard): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/register") || next.startsWith("/auth/")) return fallback;
  return next;
}
