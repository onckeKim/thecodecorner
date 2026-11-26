import { requireViewer } from "@/server/auth/session";

/**
 * Every route in this group requires a signed-in user. The proxy already redirects
 * signed-out visitors (with ?next=); this server-side check is the authoritative one.
 */
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  await requireViewer();
  return children;
}
