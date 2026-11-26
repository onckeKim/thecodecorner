import type { TopicTheme } from "@/types/database";

/** Design-system stat card (.card.stat). */
export function StatCard({ value, label, theme }: { value: React.ReactNode; label: string; theme?: TopicTheme | null }) {
  return (
    <div className="card stat" data-topic={theme ?? undefined}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
