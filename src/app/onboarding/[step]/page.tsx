import { notFound, redirect } from "next/navigation";

import { ChoiceStepForm } from "@/components/onboarding/choice-step-form";
import { WelcomeStepForm } from "@/components/onboarding/welcome-step-form";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ONBOARDING_STEPS,
  STEP_TITLES,
  canVisit,
  currentStep,
  isOnboardingStep,
  previousStep,
} from "@/lib/onboarding/steps";
import { routes } from "@/lib/routes";
import { requireViewer } from "@/server/auth/session";
import { getLearnerOnboarding, getOnboardingOptions } from "@/server/onboarding/service";

type Props = { params: Promise<{ step: string }> };

const PILLARS = [
  { title: "Learn", body: "Short, focused lessons on the skills analysts use every day." },
  { title: "Practise", body: "Exercises and quizzes that check your understanding as you go." },
  { title: "Build", body: "Real-world projects you can add to your portfolio." },
  { title: "Grow", body: "Track your progress and keep building momentum week by week." },
];

export default async function OnboardingStepPage({ params }: Props) {
  const { step } = await params;
  if (!isOnboardingStep(step)) notFound();

  const viewer = await requireViewer(routes.onboardingStep(step));
  if (viewer.onboardingCompleted) redirect(routes.dashboard);

  const [answers, options] = await Promise.all([getLearnerOnboarding(viewer.id), getOnboardingOptions()]);
  // Don't let learners skip ahead of the first unanswered step.
  if (!canVisit(step, answers)) redirect(routes.onboardingStep(currentStep(answers)));

  const index = ONBOARDING_STEPS.indexOf(step);
  const back = previousStep(step);
  const backHref = back ? routes.onboardingStep(back) : undefined;

  return (
    <div className="grid gap-6">
      <div>
        <ProgressBar
          value={(index / ONBOARDING_STEPS.length) * 100}
          label={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}
          detail={STEP_TITLES[step]}
        />
      </div>

      <div className="card p-[clamp(1.5rem,4vw,2.5rem)]">
        {step === "welcome" && (
          <div className="grid gap-6">
            <div>
              <span className="eyebrow">Welcome, {viewer.firstName ?? viewer.displayName}</span>
              <h1 className="mt-2 text-[clamp(1.9rem,1.4rem+2vw,2.6rem)]">Learn. Practise. Build. Grow.</h1>
              <p className="mt-3 text-muted">
                The Code Corner is about practical skills. You won’t just read lessons: you’ll complete exercises and
                build real-world projects. A few quick questions will help us set things up for you. It takes about a minute.
              </p>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {PILLARS.map((p, i) => (
                <li key={p.title} className="flex gap-3 rounded-[var(--radius-sm)] bg-page-alt p-4">
                  <span className="option__key flex-none" aria-hidden="true">{i + 1}</span>
                  <span>
                    <b className="font-display">{p.title}</b>
                    <span className="block text-sm text-muted">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <WelcomeStepForm />
          </div>
        )}

        {step === "goal" && (
          <ChoiceStepForm
            step="goal"
            legend="What would you like to achieve?"
            hint="Choose the one that matters most to you right now."
            options={options.goals}
            defaultValues={answers.learningGoalId ? [answers.learningGoalId] : []}
            submitLabel="Continue"
            pendingLabel="Saving…"
            backHref={backHref}
          />
        )}

        {step === "experience" && (
          <ChoiceStepForm
            step="experience"
            legend="How would you describe your experience?"
            hint="There’s no wrong answer. This helps us recommend where to focus."
            options={options.levels}
            defaultValues={answers.experienceLevelId ? [answers.experienceLevelId] : []}
            submitLabel="Continue"
            pendingLabel="Saving…"
            backHref={backHref}
          />
        )}

        {step === "tools" && (
          <ChoiceStepForm
            step="tools"
            legend="Which tools have you used before?"
            hint="Select all that apply."
            options={options.tools}
            multiple
            noneOption="None of these"
            defaultValues={answers.toolsAnswered ? (answers.toolIds.length ? answers.toolIds : ["none"]) : []}
            submitLabel="Continue"
            pendingLabel="Saving…"
            backHref={backHref}
          />
        )}

        {step === "time" && (
          <ChoiceStepForm
            step="time"
            legend="How much time would you like to spend learning each week?"
            hint="This becomes your weekly target. You can change it later in your profile."
            options={options.weekly}
            defaultValues={answers.weeklyTargetId ? [answers.weeklyTargetId] : []}
            submitLabel="Finish and start learning"
            pendingLabel="Setting up your learning path…"
            backHref={backHref}
          />
        )}
      </div>
      <p className="text-center text-sm text-muted">Your answers are saved as you go, so you can finish later.</p>
    </div>
  );
}
