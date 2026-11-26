import type { Metadata } from "next";
import Link from "next/link";

import { PathCard } from "@/components/curriculum/path-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotConfigured } from "@/components/ui/not-configured";
import { PageHeader } from "@/components/ui/page-header";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { getViewer } from "@/server/auth/session";
import { listPaths } from "@/server/curriculum/service";
import { getEnrolledPaths } from "@/server/progress/service";

export const metadata: Metadata = { title: "Learn" };

/** Public learning hub: your enrolled paths (if signed in) and everything else available. */
export default async function LearnPage() {
  const [viewer, paths] = await Promise.all([getViewer(), listPaths()]);
  const enrolled = viewer ? await getEnrolledPaths(viewer, new Map(paths.map((p) => [p.id, p.slug]))) : [];
  const enrolledIds = new Set(enrolled.map((e) => e.path.id));
  const others = paths.filter((p) => !enrolledIds.has(p.id));

  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Learn" title={viewer ? "Your learning" : "Start learning"} description="Pick up where you left off, or start a new learning path." />

      {!isSupabaseConfigured() && <NotConfigured />}

      {enrolled.length > 0 && (
        <section aria-labelledby="enrolled-heading" className="mb-12">
          <h2 id="enrolled-heading" className="mb-5 text-xl">In progress</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrolled.map(({ path, progress }) => (
              <PathCard
                key={path.id}
                href={routes.learnPath(path.slug)}
                progress={progress.percent}
                path={{ id: path.id, slug: path.slug, title: path.title, summary: path.summary, level: path.level, estimatedHours: path.estimatedHours, icon: path.icon, courseCount: path.courses.length }}
              />
            ))}
          </div>
        </section>
      )}

      {isSupabaseConfigured() && (
        <section aria-labelledby="available-heading">
          <h2 id="available-heading" className="mb-5 text-xl">{enrolled.length ? "More learning paths" : "Available learning paths"}</h2>
          {others.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => <PathCard key={p.id} path={p} />)}
            </div>
          ) : (
            <EmptyState
              title={paths.length ? "You’re enrolled in every available path" : "No learning paths yet"}
              description={paths.length ? "New paths are on the way." : "Published paths will appear here."}
              action={!viewer ? <Link className="btn btn--primary" href={routes.register}>Create an account</Link> : undefined}
            />
          )}
        </section>
      )}
    </div>
  );
}
