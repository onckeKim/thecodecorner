import type { DifficultyLevel } from "@/types/database";

const MAP: Record<DifficultyLevel, { cls: string; label: string }> = {
  beginner: { cls: "level--easy", label: "Beginner" },
  intermediate: { cls: "level--medium", label: "Intermediate" },
  advanced: { cls: "level--hard", label: "Advanced" },
};

/** Maps platform difficulty onto the design system's level badges. */
export function LevelBadge({ level }: { level: DifficultyLevel | null }) {
  if (!level) return null;
  const { cls, label } = MAP[level];
  return <span className={`level ${cls}`}>{label}</span>;
}
