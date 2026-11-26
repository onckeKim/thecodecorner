"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/paths", label: "Paths" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/modules", label: "Modules" },
  { href: "/admin/lessons", label: "Lessons" },
  { href: "/admin/quizzes", label: "Quizzes" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/users", label: "Users" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 lg:grid">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link className="nav-link block" href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
