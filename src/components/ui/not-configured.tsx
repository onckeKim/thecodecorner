import { Callout } from "./callout";

/** Shown wherever data is needed but the Supabase environment variables are missing. */
export function NotConfigured() {
  return (
    <Callout variant="error" title="Supabase is not connected." role="alert">
      Set <code className="inline">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="inline">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
      <code className="inline">.env.local</code> (see <code className="inline">.env.example</code>), then restart the server.
    </Callout>
  );
}
