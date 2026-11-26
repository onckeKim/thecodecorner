import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { getAchievements } from "@/server/achievements/service";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const viewer = await requireViewer();
  const achievements = await getAchievements(viewer.id);
  const earned = achievements.filter((a) => a.earnedAt).length;

  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Achievements" title="Achievements" description={`You’ve earned ${earned} of ${achievements.length}.`} />
      {achievements.length ? (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <li key={a.id} className={`card flex gap-4 ${a.earnedAt ? "" : "opacity-60"}`}>
              <span className="icon-box flex-none text-xl" aria-hidden="true" style={{ background: a.earnedAt ? "var(--success-soft)" : "var(--bg-alt)" }}>
                {a.icon ?? "★"}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg">{a.title}</h2>
                {a.description && <p className="text-sm text-muted">{a.description}</p>}
                <p className="mt-2 font-code text-xs text-subtle">
                  {a.earnedAt ? `Earned ${formatDate(a.earnedAt)}` : "Not earned yet"}
                  {a.xpReward > 0 && ` · +${a.xpReward} XP`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No achievements available yet" />
      )}
    </div>
  );
}
