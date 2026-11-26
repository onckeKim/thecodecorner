import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/curriculum/breadcrumbs";
import { CourseCard } from "@/components/curriculum/course-card";
import { EnrolPrompt } from "@/components/curriculum/enrol-prompt";
import { Callout } from "@/components/ui/callout";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/routes";
import { getEnforcePrerequisites } from "@/server/curriculum/service";
import { loadLearnerPath } from "@/server/progress/learner-context";

type Props = { params: Promise<{ pathSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await loadLearnerPath((await params).pathSlug);
  return { title: path.title };
}

export default async function LearnPathPage({ params }: Props) {
  const { pathSlug } = await params;
  const { path, progress, canStudy, enrolment, viewer } = await loadLearnerPath(pathSlug);
  const enforce = await getEnforcePrerequisites();
  const next = progress.nextLesson;

  return (
    <div className="site-container py-12">
      <Breadcrumbs items={[{ label: "Learn", href: routes.learn }, { label: path.title }]} />
      <header className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end [&>*]:min-w-0">
        <div>
          <span className="eyebrow">Learning path</span>
          <h1 className="mt-2 text-[clamp(2rem,1.4rem+2.4vw,2.9rem)]">{path.title}</h1>
          {path.summary && <p className="mt-3 max-w-[60ch] text-muted">{path.summary}</p>}
        </div>
        {canStudy && (
          <div className="card grid gap-4">
            <ProgressBar value={progress.percent} label="Path progress" detail={`${progress.completedLessons} / ${progress.totalLessons} lessons`} />
            {next ? (
              <Link className="btn btn--primary whitespace-normal text-center leading-snug" href={routes.lesson(path.slug, next.courseSlug, next.moduleSlug, next.lessonSlug)}>
                {progress.completedLessons ? "Continue" : "Start"}: {next.title}
              </Link>
            ) : (
              <p className="text-sm text-success">All available lessons completed. 🎉</p>
            )}
          </div>
        )}
      </header>

      {!enrolment && !viewer.isAdmin && <div className="mb-8"><EnrolPrompt pathSlug={path.slug} pathTitle={path.title} /></div>}
      {!enrolment && viewer.isAdmin && (
        <div className="mb-8">
          <Callout variant="hint" title="Admin preview.">You can open every lesson without enrolling. Locks don’t apply to administrators.</Callout>
        </div>
      )}
      {!enforce && (
        <div className="mb-8">
          <Callout variant="hint" title="Testing mode.">Prerequisites are switched off, so every course is unlocked.</Callout>
        </div>
      )}

      {path.courses.length ? (
        <ol className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {path.courses.map((course, i) => (
            <li key={course.id} className="grid min-w-0">
              <CourseCard pathSlug={path.slug} course={course} index={i + 1} state={canStudy ? progress.courses[course.id] : undefined} />
            </li>
          ))}
        </ol>
      ) : (
        <Callout variant="hint">No courses have been published in this path yet.</Callout>
      )}
    </div>
  );
}
