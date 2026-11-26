type Props = { title: string; description?: React.ReactNode; action?: React.ReactNode; icon?: string };

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span className="icon-box" aria-hidden="true" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {icon}
        </span>
      )}
      <h3>{title}</h3>
      {description && <p className="max-w-prose text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
