import type { Metadata } from "next";

import { ContentTable } from "@/components/admin/content-table";
import { PageHeader } from "@/components/ui/page-header";
import { ENTITY_LABEL } from "@/server/admin/service";

export const metadata: Metadata = { title: ENTITY_LABEL.lessons.plural };

export default function AdminLessonsPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title={ENTITY_LABEL.lessons.plural} description="Publish or unpublish items. Unpublished items are hidden from learners immediately." />
      <ContentTable entity="lessons" contextLabel="Course › module" />
    </>
  );
}
