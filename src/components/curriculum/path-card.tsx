import Link from "next/link";

import { ProgressBar } from "@/components/ui/progress-bar";
import { LevelBadge } from "@/components/ui/level-badge";
import { routes } from "@/lib/routes";
import { pluralise } from "@/lib/utils";
import type { PathSummary } from "@/types/domain";

/** Learning path card (design-system .card.topic-card). */
export function PathCard({ path, progress, href }: { path: PathSummary; progress?: number; href?: string }) {
  return (
    <Link href={href ?? routes.path(path.slug)} className="card card--hover topic-card">
      <span className="icon-box" aria-hidden="true">
        {path.icon === "chart" ? "DA" : (path.icon ?? path.title.slice(0, 2))}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <h3>{path.title}</h3>
        <LevelBadge level={path.level} />
      </div>
      {path.summary && <p className="text-muted">{path.summary}</p>}
      {progress !== undefined && <ProgressBar value={progress} label="Your progress" />}
      <div className="topic-card__meta">
        <span>{pluralise(path.courseCount, "course")}</span>
        {path.estimatedHours && <span>~{path.estimatedHours} hours</span>}
      </div>
    </Link>
  );
}
