import Link from "next/link";

import { routes } from "@/lib/routes";
import { formatMinutes } from "@/lib/utils";
import type { ModuleOutline, PathProgress } from "@/types/domain";

import { StatusIcon, statusLabel } from "./status-icon";

/** Lessons of a module with completion and lock state. Locked lessons are not links. */
export function LessonList({
  pathSlug,
  courseSlug,
  module,
  progress,
}: {
  pathSlug: string;
  courseSlug: string;
  module: ModuleOutline;
  progress: PathProgress | null;
}) {
  if (!module.lessons.length) {
    return <p className="px-1 text-sm text-muted">No lessons have been published in this module yet.</p>;
  }
  return (
    <ol className="m-0 grid list-none gap-1 p-0">
      {module.lessons.map((lesson, i) => {
        const state = progress?.lessons[lesson.id];
        const status = state?.status ?? "not_started";
        const locked = state?.locked ?? false;
        const inner = (
          <>
            <StatusIcon status={status} locked={locked} index={i + 1} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{lesson.title}</span>
              {lesson.summary && <span className="block text-sm text-muted">{lesson.summary}</span>}
            </span>
            <span className="hidden flex-none font-code text-xs text-subtle sm:block">
              {[formatMinutes(lesson.estimatedMinutes), `${lesson.xpReward} XP`].filter(Boolean).join(" · ")}
            </span>
            <span className="sr-only">{statusLabel(status, locked)}</span>
          </>
        );
        const cls = "flex items-center gap-3 rounded-[var(--radius-sm)] border border-transparent px-3 py-2.5";
        return (
          <li key={lesson.id}>
            {locked || !progress ? (
              <div className={`${cls} ${locked ? "opacity-70" : ""}`}>{inner}</div>
            ) : (
              <Link
                href={routes.lesson(pathSlug, courseSlug, module.slug, lesson.slug)}
                className={`${cls} transition-colors hover:border-line hover:bg-page-alt`}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
