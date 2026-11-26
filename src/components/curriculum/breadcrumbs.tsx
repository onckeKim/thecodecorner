import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 font-code text-xs text-subtle">
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href ? (
              <Link className="hover:text-accent" href={c.href}>{c.label}</Link>
            ) : (
              <span aria-current="page" className="text-muted">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
