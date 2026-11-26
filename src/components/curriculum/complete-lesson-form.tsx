"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Callout } from "@/components/ui/callout";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeLessonAction, type CompleteLessonState } from "@/server/progress/actions";
import type { LessonLink } from "@/types/domain";

const initial: CompleteLessonState = { status: "idle" };

export function CompleteLessonForm({
  lessonId,
  pathSlug,
  alreadyCompleted,
  next,
  courseHref,
}: {
  lessonId: string;
  pathSlug: string;
  alreadyCompleted: boolean;
  next: LessonLink | null;
  courseHref: string;
}) {
  const [state, action] = useActionState(completeLessonAction, initial);
  const done = alreadyCompleted || state.status === "success";

  return (
    <div className="grid gap-4">
      {state.status === "success" && (
        <Callout variant="success" title={state.result.alreadyCompleted ? "Already completed." : "Lesson complete!"} role="status">
          {state.result.xpAwarded > 0 && <>You earned <b>{state.result.xpAwarded} XP</b>. </>}
          {state.result.currentStreak > 0 && <>Streak: {state.result.currentStreak} day{state.result.currentStreak === 1 ? "" : "s"}. </>}
          {state.result.courseCompleted && <>You’ve finished this course. </>}
          {state.result.newAchievements.map((a) => (
            <span key={a.slug} className="mt-1 block">
              🏅 Achievement unlocked: <b>{a.title}</b>{a.xpReward > 0 && ` (+${a.xpReward} XP)`}
            </span>
          ))}
        </Callout>
      )}
      {state.status === "error" && <Callout variant="error" role="alert">{state.message}</Callout>}

      <div className="flex flex-wrap items-center gap-3">
        {done ? (
          <span className="tag" style={{ color: "var(--success)", background: "var(--success-soft)", borderColor: "transparent" }}>
            ✓ Completed
          </span>
        ) : (
          <form action={action}>
            <input type="hidden" name="lessonId" value={lessonId} />
            <input type="hidden" name="pathSlug" value={pathSlug} />
            <SubmitButton pendingLabel="Saving…">Mark as complete</SubmitButton>
          </form>
        )}
        {done &&
          (next ? (
            <Link className="btn btn--primary" href={next.href}>Next lesson →</Link>
          ) : (
            <Link className="btn btn--primary" href={courseHref}>Back to course</Link>
          ))}
      </div>
    </div>
  );
}
