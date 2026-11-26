import Link from "next/link";

import { PathCard } from "@/components/curriculum/path-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotConfigured } from "@/components/ui/not-configured";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { getViewer } from "@/server/auth/session";
import { listPaths } from "@/server/curriculum/service";

const STEPS = [
  { title: "Follow a path", body: "Each path is a structured sequence of courses, modules and short lessons, so you always know what to learn next." },
  { title: "Learn by doing", body: "Lessons pair clear explanations with real examples, exercises and quizzes that check your understanding." },
  { title: "Track your progress", body: "Earn XP, keep your streak going and unlock achievements as you complete lessons and courses." },
];

export default async function HomePage() {
  const [viewer, paths] = await Promise.all([getViewer(), listPaths()]);

  return (
    <>
      <section className="site-container py-[clamp(2.5rem,7vw,5rem)]">
        <span className="eyebrow">Practical IT skills</span>
        <h1 className="mt-2.5 max-w-[20ch]">
          Learn by doing. Become a <span className="accent">Data Analyst</span>, one lesson at a time.
        </h1>
        <p className="mt-4 mb-7 max-w-[56ch] text-muted">
          Structured learning paths with hands-on lessons, exercises, assessments and real-world projects. Start with
          Excel, SQL and Power BI, with more paths on the way.
        </p>
        <div className="flex flex-wrap gap-3">
          {viewer ? (
            <Link className="btn btn--primary" href={routes.dashboard}>Go to your dashboard</Link>
          ) : (
            <Link className="btn btn--primary" href={routes.register}>Start learning for free</Link>
          )}
          <Link className="btn btn--ghost" href={routes.paths}>Browse learning paths</Link>
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="paths-heading">
        <div className="site-container">
          <div className="section-head mb-7">
            <span className="eyebrow">Learning paths</span>
            <h2 id="paths-heading">Choose your path</h2>
            <p>Every path takes you from the fundamentals to a portfolio-ready project.</p>
          </div>
          {!isSupabaseConfigured() ? (
            <NotConfigured />
          ) : paths.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((p) => <PathCard key={p.id} path={p} />)}
            </div>
          ) : (
            <EmptyState title="No learning paths yet" description="Published paths will appear here." />
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="how-heading">
        <div className="site-container">
          <div className="section-head mb-7">
            <span className="eyebrow">How it works</span>
            <h2 id="how-heading">A few focused minutes a day</h2>
          </div>
          <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card">
                <span className="mb-3.5 inline-grid size-8 place-items-center rounded-full bg-accent-soft font-code text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mb-1.5">{s.title}</h3>
                <p className="text-[0.95rem] text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
