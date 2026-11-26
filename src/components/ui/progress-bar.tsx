import type { TopicTheme } from "@/types/database";

type Props = {
  value: number;
  label?: string;
  detail?: string;
  theme?: TopicTheme | null;
  className?: string;
};

/** Design-system progress bar (.progress / .progress-label). */
export function ProgressBar({ value, label, detail, theme, className }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className} data-topic={theme ?? undefined}>
      {(label || detail) && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{detail ?? `${pct}%`}</span>
        </div>
      )}
      <div
        className="progress"
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ "--value": `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}
