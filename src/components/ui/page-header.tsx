type Props = {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, children }: Props) {
  return (
    <header className="section-head mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="text-[clamp(1.9rem,1.3rem+2.4vw,2.75rem)]">{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
