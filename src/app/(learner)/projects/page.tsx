import type { Metadata } from "next";

import { LessonContent } from "@/components/curriculum/lesson-content";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listProjects } from "@/server/curriculum/service";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Projects" title="Real-world projects" description="Apply what you’ve learned to realistic briefs and build your portfolio." />
      <Callout variant="hint" className="mb-8">Project submissions and reviews open in a later phase. For now you can read each brief.</Callout>
      {projects.length ? (
        <div className="grid gap-5">
          {projects.map((p) => (
            <article key={p.id} className="card grid gap-4" aria-labelledby={`project-${p.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag">{p.pathTitle}</span>
                {p.estimatedHours && <span className="tag">~{p.estimatedHours} hours</span>}
                <span className="tag">{p.xpReward} XP</span>
              </div>
              <h2 id={`project-${p.id}`} className="text-xl">{p.title}</h2>
              {p.summary && <p className="text-muted">{p.summary}</p>}
              <LessonContent content={p.brief} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No projects yet" description="Projects will appear here once they’re published." />
      )}
    </div>
  );
}
