import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/curriculum/breadcrumbs";
import { EnrolPrompt } from "@/components/curriculum/enrol-prompt";
import { LessonList } from "@/components/curriculum/lesson-list";
import { Callout } from "@/components/ui/callout";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/routes";
import { findCourse } from "@/server/curriculum/service";
import { loadLearnerPath } from "@/server/progress/learner-context";

type Props = { params: Promise<{ pathSlug: string; courseSlug: string; moduleSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pathSlug, courseSlug, moduleSlug } = await params;
  const { path } = await loadLearnerPath(pathSlug);
  return { title: findCourse(path, courseSlug)?.modules.find((m) => m.slug === moduleSlug)?.title ?? "Module" };
}

export default async function ModulePage({ params }: Props) {
  const { pathSlug, courseSlug, moduleSlug } = await params;
  const { path, progress, canStudy } = await loadLearnerPath(pathSlug);
  const course = findCourse(path, courseSlug);
  const mod = course?.modules.find((m) => m.slug === moduleSlug);
  if (!course || !mod) notFound();
  const state = progress.modules[mod.id];

  return (
    <div className="site-container max-w-4xl py-12" data-topic={course.theme ?? undefined}>
      <Breadcrumbs
        items={[
          { label: "Learn", href: routes.learn },
          { label: path.title, href: routes.learnPath(path.slug) },
          { label: course.title, href: routes.learnCourse(path.slug, course.slug) },
          { label: mod.title },
        ]}
      />
      <span className="eyebrow">Module</span>
      <h1 className="mt-2 text-[clamp(1.8rem,1.3rem+2vw,2.5rem)]">{mod.title}</h1>
      {mod.summary && <p className="mt-3 text-muted">{mod.summary}</p>}

      {canStudy && state && !state.locked && (
        <ProgressBar className="mt-6" value={state.totalLessons ? (state.completedLessons / state.totalLessons) * 100 : 0} theme={course.theme} label="Module progress" detail={`${state.completedLessons} / ${state.totalLessons}`} />
      )}
      <div className="mt-6 grid gap-5">
        {!canStudy && <EnrolPrompt pathSlug={path.slug} pathTitle={path.title} />}
        {state?.locked && <Callout variant="hint" title="This module is locked.">Complete the earlier course or module first.</Callout>}
        <div className="card">
          <LessonList pathSlug={path.slug} courseSlug={course.slug} module={mod} progress={canStudy ? progress : null} />
        </div>
      </div>
    </div>
  );
}
