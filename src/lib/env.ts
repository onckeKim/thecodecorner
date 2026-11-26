/**
 * Public environment configuration. Only NEXT_PUBLIC_* values belong here; they are
 * inlined into the client bundle. Server-only secrets must never be read from this file.
 */
export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
};

export function getPublicEnv(): PublicEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return {
    supabaseUrl,
    supabaseAnonKey,
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  };
}

export function isSupabaseConfigured(): boolean {
  return getPublicEnv() !== null;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function requirePublicEnv(): PublicEnv {
  const env = getPublicEnv();
  if (!env) throw new SupabaseNotConfiguredError();
  return env;
}
