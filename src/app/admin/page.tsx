import Link from "next/link";

import { PrerequisiteToggle } from "@/components/admin/prerequisite-toggle";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { CONTENT_ENTITIES, ENTITY_LABEL, getAdminOverview } from "@/server/admin/service";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Curriculum, learners and platform settings." />
      <section aria-label="Content counts" className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {CONTENT_ENTITIES.map((e) => (
          <Link key={e} href={`/admin/${e}`} className="card card--hover stat">
            <b>{overview.counts[e].total}</b>
            <span>{ENTITY_LABEL[e].plural}</span>
            <span className="mt-1 block normal-case">{overview.counts[e].published} published</span>
          </Link>
        ))}
        <Link href="/admin/users" className="card card--hover stat">
          <b>{overview.users}</b>
          <span>Users</span>
        </Link>
        <div className="card stat">
          <b>{overview.enrolments}</b>
          <span>Enrolments</span>
        </div>
      </section>

      <section aria-labelledby="settings-heading" className="card grid gap-4">
        <h2 id="settings-heading" className="text-xl">Prerequisites</h2>
        <PrerequisiteToggle enforced={overview.enforcePrerequisites} />
      </section>

      <Callout variant="hint" title="Coming next." className="mt-8">
        Creating and editing content, uploading resources and managing quizzes arrive in the admin CMS phase. For now,
        content is managed through the database (see <code className="inline">supabase/seed.sql</code>).
      </Callout>
    </>
  );
}
