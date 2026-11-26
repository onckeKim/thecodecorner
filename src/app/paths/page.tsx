import type { Metadata } from "next";

import { PathCard } from "@/components/curriculum/path-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotConfigured } from "@/components/ui/not-configured";
import { PageHeader } from "@/components/ui/page-header";
import { isSupabaseConfigured } from "@/lib/env";
import { listPaths } from "@/server/curriculum/service";

export const metadata: Metadata = { title: "Learning paths" };

export default async function PathsPage() {
  const paths = await listPaths();
  return (
    <div className="site-container py-12">
      <PageHeader
        eyebrow="Learning paths"
        title="Choose what to learn"
        description="Structured, step-by-step paths from your first lesson to a portfolio-ready project."
      />
      {!isSupabaseConfigured() ? (
        <NotConfigured />
      ) : paths.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => <PathCard key={p.id} path={p} />)}
        </div>
      ) : (
        <EmptyState title="No learning paths yet" description="New paths are on the way. Check back soon." />
      )}
    </div>
  );
}
