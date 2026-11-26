import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { routes } from "@/lib/routes";
import { formatDate } from "@/lib/utils";
import { getCertificates } from "@/server/achievements/service";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const viewer = await requireViewer();
  const certificates = await getCertificates(viewer.id);
  return (
    <div className="site-container py-12">
      <PageHeader eyebrow="Certificates" title="Your certificates" description="Certificates are issued when you complete a learning path." />
      {certificates.length ? (
        <ul className="m-0 grid list-none gap-4 p-0">
          {certificates.map((c) => (
            <li key={c.id} className="card flex flex-wrap justify-between gap-3">
              <span className="font-display text-lg font-semibold">{c.title}</span>
              <span className="font-code text-sm text-subtle">No. {c.number} · {formatDate(c.issuedAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No certificates yet"
          description="Complete every course in a learning path to earn its certificate."
          action={<Link className="btn btn--primary" href={routes.dashboard}>Continue learning</Link>}
        />
      )}
    </div>
  );
}
