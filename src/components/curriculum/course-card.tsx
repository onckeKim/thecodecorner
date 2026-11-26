import Link from "next/link";

import { LevelBadge } from "@/components/ui/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/routes";
import { pluralise } from "@/lib/utils";
import type { CourseOutline, CourseState } from "@/types/domain";

/** Course card on the learner path page, showing progress or why it is locked. */
export function CourseCard({ pathSlug, course, index, state }: { pathSlug: string; course: CourseOutline; index: number; state?: CourseState }) {
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const locked = state?.locked ?? false;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="icon-box" aria-hidden="true">{course.icon ?? index}</span>
        <span className="font-code text-xs text-subtle">Course {index}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h3>{course.title}</h3>
        <LevelBadge level={course.level} />
      </div>
      {course.summary && <p className="text-muted">{course.summary}</p>}
      {state && !locked && <ProgressBar value={state.percent} theme={course.theme} label={state.status === "completed" ? "Completed" : "Progress"} detail={`${state.completedLessons} / ${state.totalLessons}`} />}
      {locked && (
        <p className="tag self-start whitespace-normal" role="note">
          Locked. Complete {state?.blockedBy.join(", ")} first.
        </p>
      )}
      <div className="topic-card__meta">
        <span>{pluralise(course.modules.length, "module")} · {pluralise(lessonCount, "lesson")}</span>
        {course.estimatedHours && <span>~{course.estimatedHours} h</span>}
      </div>
    </>
  );

  return locked ? (
    <div className="card topic-card min-w-0 opacity-80" data-topic={course.theme ?? undefined} aria-disabled="true">{body}</div>
  ) : (
    <Link href={routes.learnCourse(pathSlug, course.slug)} className="card card--hover topic-card min-w-0" data-topic={course.theme ?? undefined}>
      {body}
    </Link>
  );
}
