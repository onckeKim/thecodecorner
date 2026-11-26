import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { Callout } from "@/components/ui/callout";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · The Code Corner" } };

/**
 * Admin area. The role check happens here on the server (not just by hiding links),
 * every admin action re-checks it (assertAdmin), and RLS enforces it in the database.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("/admin");

  if (!viewer.isAdmin) {
    return (
      <div className="site-container max-w-xl py-16">
        <h1 className="mb-4 text-3xl">Access denied</h1>
        <Callout variant="error" role="alert">This area is only available to administrators.</Callout>
        <Link className="btn btn--primary mt-6" href="/dashboard">Back to your dashboard</Link>
      </div>
    );
  }

  return (
    <div className="site-container grid gap-8 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <span className="eyebrow mb-3 block">Admin</span>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
