import { redirect } from "next/navigation";

import { currentStep } from "@/lib/onboarding/steps";
import { routes } from "@/lib/routes";
import { requireViewer } from "@/server/auth/session";
import { getLearnerOnboarding } from "@/server/onboarding/service";

/** Sends the learner to the step they should continue from (or the dashboard if done). */
export default async function OnboardingIndex() {
  const viewer = await requireViewer(routes.onboarding);
  if (viewer.onboardingCompleted) redirect(routes.dashboard);
  const answers = await getLearnerOnboarding(viewer.id);
  redirect(routes.onboardingStep(currentStep(answers)));
}
