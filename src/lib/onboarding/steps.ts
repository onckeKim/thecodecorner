/**
 * Onboarding steps and resume logic (pure, no I/O, so it is unit-tested).
 * Answers are saved after every step, so a learner who leaves part-way through is sent
 * back to the first unanswered step when they return.
 */
export const ONBOARDING_STEPS = ["welcome", "goal", "experience", "tools", "time"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  goal: "Your goal",
  experience: "Your experience",
  tools: "Tools you’ve used",
  time: "Weekly time",
};

export type OnboardingAnswers = {
  started: boolean;
  learningGoalId: string | null;
  experienceLevelId: string | null;
  toolsAnswered: boolean;
  weeklyTargetId: string | null;
};

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** First step that still needs an answer ("time" if everything but the last is done). */
export function currentStep(a: OnboardingAnswers | null): OnboardingStep {
  if (!a || !a.started) return "welcome";
  if (!a.learningGoalId) return "goal";
  if (!a.experienceLevelId) return "experience";
  if (!a.toolsAnswered) return "tools";
  return "time";
}

/** A step may be visited if it isn't beyond the first unanswered step. */
export function canVisit(step: OnboardingStep, a: OnboardingAnswers | null): boolean {
  return ONBOARDING_STEPS.indexOf(step) <= ONBOARDING_STEPS.indexOf(currentStep(a));
}

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;
}

export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? (ONBOARDING_STEPS[i - 1] ?? null) : null;
}

export const NONE_TOOL = "none";

/** Validates the tools selection: known ids only, and "none" can't be combined. */
export function normaliseTools(selected: string[], validIds: readonly string[]): { ok: true; tools: string[] } | { ok: false; error: string } {
  const unique = [...new Set(selected)];
  if (!unique.length) return { ok: false, error: "Choose at least one option, or “None of these”." };
  if (unique.includes(NONE_TOOL)) {
    return unique.length === 1 ? { ok: true, tools: [] } : { ok: false, error: "“None of these” can’t be combined with other tools." };
  }
  if (unique.some((t) => !validIds.includes(t))) return { ok: false, error: "Please choose from the listed tools." };
  return { ok: true, tools: unique };
}
