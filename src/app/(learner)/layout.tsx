import { requireOnboardedViewer } from "@/server/auth/session";

/**
 * Every route in this group requires a signed-in learner who has finished onboarding
 * (administrators are exempt). The proxy already redirects signed-out visitors; this
 * server-side check is the authoritative one, and each page repeats it for its own data.
 */
export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedViewer();
  return children;
}
