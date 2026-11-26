import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/curriculum/breadcrumbs";
import { CompleteLessonForm } from "@/components/curriculum/complete-lesson-form";
import { EnrolPrompt } from "@/components/curriculum/enrol-prompt";
import { LessonContent } from "@/components/curriculum/lesson-content";
import { Callout } from "@/components/ui/callout";
import { routes } from "@/lib/routes";
import { formatMinutes, pluralise } from "@/lib/utils";
import { getLessonActivities } from "@/server/assessment/service";
import { getLessonDetail, locateLesson } from "@/server/curriculum/service";
import { loadLearnerPath } from "@/server/progress/learner-context";
import { recordLessonVisit } from "@/server/progress/service";

type Props = { params: Promise<{ pathSlug: string; courseSlug: string; moduleSlug: string; lessonSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const { path } = await loadLearnerPath(p.pathSlug);
  return { title: locateLesson(path, p.courseSlug, p.moduleSlug, p.lessonSlug)?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const p = await params;
  const { path, progress, canStudy } = await loadLearnerPath(p.pathSlug);
  const loc = locateLesson(path, p.courseSlug, p.moduleSlug, p.lessonSlug);
  if (!loc) notFound();

  const { course, module: mod, lesson } = loc;
  const state = progress.lessons[lesson.id];
  const locked = state?.locked ?? false;
  const courseHref = routes.learnCourse(path.slug, course.slug);

  const crumbs = (
    <Breadcrumbs
      items={[
        { label: path.title, href: routes.learnPath(path.slug) },
        { label: course.title, href: courseHref },
        { label: mod.title, href: routes.learnModule(path.slug, course.slug, mod.slug) },
        { label: lesson.title },
      ]}
    />
  );

  // Not enrolled, or locked: explain why instead of showing the lesson.
  if (!canStudy || locked) {
    return (
      <div className="site-container max-w-3xl py-12">
        {crumbs}
        <h1 className="mb-6 text-[clamp(1.8rem,1.3rem+2vw,2.5rem)]">{lesson.title}</h1>
        {!canStudy ? (
          <EnrolPrompt pathSlug={path.slug} pathTitle={path.title} />
        ) : (
          <Callout variant="hint" title="This lesson is locked.">
            Complete {progress.courses[course.id]?.blockedBy.join(", ") || "the earlier lessons"} first.{" "}
            <Link className="link" href={courseHref}>Back to the course</Link>
          </Callout>
        )}
      </div>
    );
  }

  const [detail, activities] = await Promise.all([getLessonDetail(lesson.id), getLessonActivities(lesson.id)]);
  if (!detail) notFound();

  // Record the visit (marks the lesson "in progress"); never downgrades completed lessons.
  const visitStatus = await recordLessonVisit(lesson.id);
  const completed = (visitStatus ?? state?.status) === "completed";

  return (
    <div className="site-container py-10" data-topic={course.theme ?? undefined}>
      <div className="mx-auto max-w-3xl">
        {crumbs}
        <article aria-labelledby="lesson-title">
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="tag tag--topic">{course.title}</span>
              {formatMinutes(lesson.estimatedMinutes) && <span className="tag">{formatMinutes(lesson.estimatedMinutes)}</span>}
              <span className="tag">{lesson.xpReward} XP</span>
            </div>
            <h1 id="lesson-title" className="text-[clamp(1.9rem,1.3rem+2.4vw,2.75rem)]">{lesson.title}</h1>
            {lesson.summary && <p className="mt-3 text-lg text-muted">{lesson.summary}</p>}
          </header>

          <LessonContent content={detail.content} />

          {(activities.quizzes.length > 0 || activities.exercises.length > 0) && (
            <section aria-labelledby="practice-heading" className="mt-10">
              <h2 id="practice-heading" className="mb-3 text-xl">Practise this lesson</h2>
              <ul className="m-0 grid list-none gap-3 p-0">
                {activities.quizzes.map((q) => (
                  <li key={q.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <span><b>Quiz:</b> {q.title} <span className="text-muted">· {pluralise(q.questionCount, "question")} · pass mark {q.passMark}%</span></span>
                    <span className="tag whitespace-normal">Interactive quizzes arrive in Phase 2</span>
                  </li>
                ))}
                {activities.exercises.map((e) => (
                  <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <span><b>Exercise:</b> {e.title} <span className="text-muted">· {e.type.toUpperCase()}</span></span>
                    <span className="tag whitespace-normal">Graded exercises arrive in a later phase</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-12 grid gap-6 border-t border-line pt-8">
            <CompleteLessonForm lessonId={lesson.id} pathSlug={path.slug} alreadyCompleted={completed} next={loc.next} courseHref={courseHref} />
            <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-3 text-sm">
              {loc.previous ? (
                <Link className="link" href={loc.previous.href}>← {loc.previous.title}</Link>
              ) : <span />}
              {loc.next && <Link className="link" href={loc.next.href}>{loc.next.title} →</Link>}
            </nav>
          </footer>
        </article>
      </div>
    </div>
  );
}
