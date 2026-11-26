import type { Metadata } from "next";

import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Practice" };

const TOOLS = [
  {
    title: "Topic quizzes",
    body: "Multiple-choice questions with hints and explanations for SQL, Power BI, Excel, DAX and data modelling.",
    href: "/prototype/practice.html",
    topic: "dax",
    icon: "?",
  },
  {
    title: "SQL Lab",
    body: "Write real SQL against a sample shop database in your browser and check it against the expected result.",
    href: "/prototype/sql-lab.html",
    topic: "sql",
    icon: "SQL",
  },
] as const;

export default function PracticePage() {
  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Practice" title="Practice tools" description="Sharpen your skills between lessons." />
      <Callout variant="hint" title="Preview." className="mb-8">
        These tools come from the original static prototype and keep their progress in this browser only. They will
        be rebuilt into the platform, with progress saved to your account, in a later phase.
      </Callout>
      <div className="grid gap-5 md:grid-cols-2">
        {TOOLS.map((t) => (
          <a key={t.title} href={t.href} className="card card--hover topic-card" data-topic={t.topic}>
            <span className="icon-box" aria-hidden="true">{t.icon}</span>
            <h2 className="text-xl">{t.title}</h2>
            <p className="text-muted">{t.body}</p>
            <div className="topic-card__meta"><span>Open tool →</span></div>
          </a>
        ))}
      </div>
    </div>
  );
}
