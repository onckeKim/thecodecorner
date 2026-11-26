import Link from "next/link";

import { routes } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-8 font-code text-[0.8rem] text-subtle">
      <div className="site-container flex flex-wrap justify-between gap-4">
        <span>© {new Date().getFullYear()} The Code Corner</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-5">
          <Link className="hover:text-accent" href={routes.paths}>Learning paths</Link>
          <Link className="hover:text-accent" href={routes.learn}>Learn</Link>
          <Link className="hover:text-accent" href="/prototype/index.html">Practice prototype</Link>
        </nav>
      </div>
    </footer>
  );
}
