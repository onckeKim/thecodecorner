import Link from "next/link";

import { routes } from "@/lib/routes";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getViewer } from "@/server/auth/session";
import type { Viewer } from "@/types/domain";

import { MenuPanel } from "./menu-panel";
import { NavLinks, type NavItem } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

const PUBLIC_NAV: NavItem[] = [
  { href: routes.paths, label: "Paths" },
  { href: routes.learn, label: "Learn" },
];

const LEARNER_NAV: NavItem[] = [
  { href: routes.dashboard, label: "Dashboard" },
  { href: routes.learn, label: "Learn" },
  { href: routes.practice, label: "Practice" },
  { href: routes.projects, label: "Projects" },
];

function accountLinks(viewer: Viewer): NavItem[] {
  return [
    { href: routes.profile, label: "Profile" },
    { href: routes.achievements, label: "Achievements" },
    { href: routes.certificates, label: "Certificates" },
    ...(viewer.isAdmin ? [{ href: routes.admin, label: "Admin" }] : []),
  ];
}

const MenuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export async function SiteHeader() {
  const viewer = await getViewer();
  const needsOnboarding = !!viewer && !viewer.onboardingCompleted && !viewer.isAdmin;
  const nav = !viewer ? PUBLIC_NAV : needsOnboarding ? [{ href: routes.onboarding, label: "Finish setup" }] : LEARNER_NAV;

  return (
    <header className="site-header">
      <div className="site-container flex min-h-16 items-center justify-between gap-3">
        <Link className="logo" href={!viewer ? routes.home : needsOnboarding ? routes.onboarding : routes.dashboard}>
          The Code<b>Corner</b>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks items={nav} className="flex items-center gap-1" />
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {viewer ? (
            <MenuPanel
              label={`Account menu for ${viewer.displayName}`}
              trigger={
                <>
                  <span
                    aria-hidden="true"
                    className="grid size-6 place-items-center rounded-full bg-accent text-[0.72rem] font-semibold text-on-accent"
                  >
                    {viewer.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-medium text-ink sm:inline">{viewer.displayName}</span>
                </>
              }
            >
              <p className="px-3 pt-2 pb-1 text-xs text-subtle">
                Signed in as <span className="break-all text-muted">{viewer.email}</span>
              </p>
              <nav aria-label="Account" className="md:hidden">
                <NavLinks items={nav} className="grid" />
                <hr className="my-2 border-line" />
              </nav>
              {!needsOnboarding && (
                <>
                  <NavLinks items={accountLinks(viewer)} className="grid" />
                  <hr className="my-2 border-line" />
                </>
              )}
              <SignOutButton />
            </MenuPanel>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm hidden sm:inline-flex" href={routes.login}>
                Sign in
              </Link>
              <Link className="btn btn--primary btn--sm hidden min-[420px]:inline-flex" href={routes.register}>
                Get started
              </Link>
              <MenuPanel label="Open navigation" trigger={MenuIcon} className="md:hidden">
                <nav aria-label="Mobile">
                  <NavLinks items={[...nav, { href: routes.login, label: "Sign in" }, { href: routes.register, label: "Create account" }]} className="grid" />
                </nav>
              </MenuPanel>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
