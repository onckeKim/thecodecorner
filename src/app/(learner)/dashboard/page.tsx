import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { NotConfigured } from "@/components/ui/not-configured";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils";
import { requireViewer } from "@/server/auth/session";
import { listPaths } from "@/server/curriculum/service";
import { getEnrolledPaths } from "@/server/progress/service";
import { getLearningSummary, getRecentXp } from "@/server/xp/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  if (!isSupabaseConfigured()) return <div className="site-container py-12"><NotConfigured /></div>;

  const [paths, summary, recentXp] = await Promise.all([listPaths(), getLearningSummary(), getRecentXp(viewer.id)]);
  const enrolled = await getEnrolledPaths(viewer, new Map(paths.map((p) => [p.id, p.slug])));

  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Dashboard" title={`Welcome back, ${viewer.displayName}`} description="Here’s where you are on your learning journey." />

      <section aria-label="Your stats" className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={summary.totalXp} label="Total XP" />
        <StatCard value={summary.currentStreak} label="Day streak" theme="powerbi" />
        <StatCard value={summary.lessonsCompleted} label="Lessons done" theme="excel" />
        <StatCard value={summary.achievementsEarned} label="Achievements" theme="dax" />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="paths-heading" className="min-w-0">
          <h2 id="paths-heading" className="mb-5 text-xl">Your learning paths</h2>
          {enrolled.length ? (
            <div className="grid gap-5">
              {enrolled.map(({ path, progress }) => {
                const next = progress.nextLesson;
                return (
                  <article key={path.id} className="card grid gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3>{path.title}</h3>
                        <p className="text-sm text-muted">{progress.completedLessons} of {progress.totalLessons} lessons completed</p>
                      </div>
                      <Link className="btn btn--ghost btn--sm" href={routes.learnPath(path.slug)}>View path</Link>
                    </div>
                    <ProgressBar value={progress.percent} label="Path progress" />
                    {next ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-page-alt p-4">
                        <div className="min-w-0">
                          <span className="eyebrow">Up next</span>
                          <p className="font-medium">{next.title}</p>
                        </div>
                        <Link className="btn btn--primary btn--sm" href={routes.lesson(path.slug, next.courseSlug, next.moduleSlug, next.lessonSlug)}>
                          Continue
                        </Link>
                      </div>
                    ) : (
                      <p className="callout callout--success">You’ve completed every available lesson in this path. 🎉</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="You’re not enrolled in a path yet"
              description="Choose a learning path to start tracking your progress."
              action={<Link className="btn btn--primary" href={routes.paths}>Browse learning paths</Link>}
            />
          )}
        </section>

        <aside aria-labelledby="xp-heading">
          <h2 id="xp-heading" className="mb-5 text-xl">Recent XP</h2>
          <div className="card p-0">
            {recentXp.length ? (
              <ul className="m-0 list-none p-0">
                {recentXp.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                    <span className="min-w-0 text-sm">
                      <span className="block">{x.description ?? "XP"}</span>
                      <span className="font-code text-xs text-subtle">{formatDate(x.createdAt)}</span>
                    </span>
                    <b className="flex-none font-code text-sm text-success">+{x.amount}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Complete a lesson to earn your first XP.</p>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            Longest streak: <b>{summary.longestStreak}</b> day{summary.longestStreak === 1 ? "" : "s"} ·{" "}
            <Link className="link" href={routes.achievements}>View achievements</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
