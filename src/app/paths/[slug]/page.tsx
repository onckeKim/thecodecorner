import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelBadge } from "@/components/ui/level-badge";
import { Callout } from "@/components/ui/callout";
import { SubmitButton } from "@/components/ui/submit-button";
import { routes } from "@/lib/routes";
import { pluralise } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { getPathOutline } from "@/server/curriculum/service";
import { enrolAction } from "@/server/progress/actions";
import { getEnrolment } from "@/server/progress/service";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = await getPathOutline((await params).slug);
  return { title: path?.title ?? "Learning path", description: path?.summary ?? undefined };
}

export default async function PathDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { error } = await searchParams;
  const [path, viewer] = await Promise.all([getPathOutline(slug), getViewer()]);
  if (!path) notFound();

  const enrolment = viewer ? await getEnrolment(viewer.id, path.id) : null;
  const lessonCount = path.courses.reduce((n, c) => n + c.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);

  return (
    <div className="site-container py-12">
      <nav aria-label="Breadcrumb" className="mb-6 font-code text-xs text-subtle">
        <Link className="hover:text-accent" href={routes.paths}>Learning paths</Link> / <span>{path.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <span className="eyebrow">Learning path</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(2rem,1.4rem+2.6vw,3rem)]">{path.title}</h1>
            <LevelBadge level={path.level} />
          </div>
          {path.summary && <p className="mt-4 max-w-[60ch] text-lg text-muted">{path.summary}</p>}
          {path.description && <p className="mt-3 max-w-[65ch] text-muted">{path.description}</p>}

          <h2 className="mt-12 mb-5 text-2xl">What you’ll learn</h2>
          <ol className="m-0 grid list-none gap-4 p-0">
            {path.courses.map((course, i) => (
              <li key={course.id} className="card topic-card" data-topic={course.theme ?? undefined}>
                <div className="flex items-start gap-4">
                  <span className="icon-box" aria-hidden="true">{course.icon ?? i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-code text-xs text-subtle">Course {i + 1}</span>
                    <h3>{course.title}</h3>
                    {course.summary && <p className="mt-1 text-muted">{course.summary}</p>}
                    {course.modules.length > 0 && (
                      <ul className="mt-3 grid list-none gap-1 p-0 text-sm text-muted">
                        {course.modules.map((m) => (
                          <li key={m.id}>
                            <span className="font-medium text-ink">{m.title}</span> · {pluralise(m.lessons.length, "lesson")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card grid gap-4">
            <dl className="m-0 grid grid-cols-3 gap-2 text-center">
              <div><dt className="font-code text-[0.7rem] text-subtle uppercase">Courses</dt><dd className="m-0 font-display text-2xl font-semibold">{path.courses.length}</dd></div>
              <div><dt className="font-code text-[0.7rem] text-subtle uppercase">Lessons</dt><dd className="m-0 font-display text-2xl font-semibold">{lessonCount}</dd></div>
              <div><dt className="font-code text-[0.7rem] text-subtle uppercase">Hours</dt><dd className="m-0 font-display text-2xl font-semibold">{path.estimatedHours ?? "–"}</dd></div>
            </dl>

            {error === "enrol" && <Callout variant="error" role="alert">We couldn’t enrol you just now. Please try again.</Callout>}

            {!viewer ? (
              <>
                <Link className="btn btn--primary w-full" href={`${routes.register}?next=${encodeURIComponent(routes.path(path.slug))}`}>
                  Create a free account
                </Link>
                <p className="text-center text-sm text-muted">
                  Already have an account?{" "}
                  <Link className="link" href={`${routes.login}?next=${encodeURIComponent(routes.path(path.slug))}`}>Sign in</Link>
                </p>
              </>
            ) : enrolment ? (
              <Link className="btn btn--primary w-full" href={routes.learnPath(path.slug)}>
                {enrolment.status === "completed" ? "Review this path" : "Continue learning"}
              </Link>
            ) : (
              <form action={enrolAction}>
                <input type="hidden" name="pathSlug" value={path.slug} />
                <SubmitButton className="w-full" pendingLabel="Enrolling…">Enrol in this path</SubmitButton>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
