import type { ProgressStatus } from "@/types/database";

/** Small square status marker, styled like the design system's option keys. */
export function StatusIcon({ status, locked, index }: { status: ProgressStatus; locked?: boolean; index?: number }) {
  const base = "grid size-7 flex-none place-items-center rounded-[7px] font-code text-[0.72rem] font-semibold";
  if (locked) {
    return (
      <span className={`${base} bg-page-alt text-subtle`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
    );
  }
  if (status === "completed") return <span className={`${base} bg-success text-on-accent`} aria-hidden="true">✓</span>;
  if (status === "in_progress") return <span className={`${base} bg-accent-soft text-accent ring-1 ring-accent`} aria-hidden="true">{index ?? "•"}</span>;
  return <span className={`${base} bg-page-alt text-subtle`} aria-hidden="true">{index ?? "•"}</span>;
}

export function statusLabel(status: ProgressStatus, locked?: boolean): string {
  if (locked) return "Locked";
  return status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : "Not started";
}
