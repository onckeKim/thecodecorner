import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/curriculum/breadcrumbs";
import { EnrolPrompt } from "@/components/curriculum/enrol-prompt";
import { LessonList } from "@/components/curriculum/lesson-list";
import { Callout } from "@/components/ui/callout";
import { LevelBadge } from "@/components/ui/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/routes";
import { pluralise } from "@/lib/utils";
import { findCourse } from "@/server/curriculum/service";
import { loadLearnerPath } from "@/server/progress/learner-context";

type Props = { params: Promise<{ pathSlug: string; courseSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pathSlug, courseSlug } = await params;
  const { path } = await loadLearnerPath(pathSlug);
  return { title: findCourse(path, courseSlug)?.title ?? "Course" };
}

export default async function CoursePage({ params }: Props) {
  const { pathSlug, courseSlug } = await params;
  const { path, progress, canStudy } = await loadLearnerPath(pathSlug);
  const course = findCourse(path, courseSlug);
  if (!course) notFound();
  const state = progress.courses[course.id];

  return (
    <div className="site-container py-12" data-topic={course.theme ?? undefined}>
      <Breadcrumbs items={[{ label: "Learn", href: routes.learn }, { label: path.title, href: routes.learnPath(path.slug) }, { label: course.title }]} />

      <header className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <span className="tag tag--topic">{course.icon ?? "Course"}</span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(1.9rem,1.3rem+2.2vw,2.7rem)]">{course.title}</h1>
            <LevelBadge level={course.level} />
          </div>
          {course.summary && <p className="mt-3 max-w-[60ch] text-muted">{course.summary}</p>}
        </div>
        {canStudy && state && !state.locked && (
          <div className="card">
            <ProgressBar value={state.percent} theme={course.theme} label="Course progress" detail={`${state.completedLessons} / ${state.totalLessons} lessons`} />
          </div>
        )}
      </header>

      {!canStudy && <div className="mb-8"><EnrolPrompt pathSlug={path.slug} pathTitle={path.title} /></div>}
      {state?.locked && (
        <div className="mb-8">
          <Callout variant="hint" title="This course is locked.">
            Complete {state.blockedBy.join(", ")} to unlock it.{" "}
            <Link className="link" href={routes.learnPath(path.slug)}>Back to the path</Link>
          </Callout>
        </div>
      )}

      {course.modules.length ? (
        <div className="grid gap-5">
          {course.modules.map((mod, i) => {
            const ms = progress.modules[mod.id];
            return (
              <section key={mod.id} className="card grid gap-3" aria-labelledby={`module-${mod.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <span className="font-code text-xs text-subtle">Module {i + 1}</span>
                    <h2 id={`module-${mod.id}`} className="text-xl">
                      <Link className="hover:text-accent" href={routes.learnModule(path.slug, course.slug, mod.slug)}>{mod.title}</Link>
                    </h2>
                    {mod.summary && <p className="text-sm text-muted">{mod.summary}</p>}
                  </div>
                  <span className="font-code text-xs text-subtle">
                    {canStudy && ms ? `${ms.completedLessons} / ${ms.totalLessons} done` : pluralise(mod.lessons.length, "lesson")}
                  </span>
                </div>
                <LessonList pathSlug={path.slug} courseSlug={course.slug} module={mod} progress={canStudy ? progress : null} />
              </section>
            );
          })}
        </div>
      ) : (
        <Callout variant="hint">No modules have been published in this course yet.</Callout>
      )}
    </div>
  );
}
