import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { ENTITY_LABEL, listContent, type ContentEntity } from "@/server/admin/service";

import { StatusBadge, StatusForm } from "./status-form";

/** Generic admin list for a curriculum entity with publish/unpublish controls. */
export async function ContentTable({ entity, contextLabel }: { entity: ContentEntity; contextLabel: string }) {
  const rows = await listContent(entity);
  const label = ENTITY_LABEL[entity];

  if (!rows.length) return <EmptyState title={`No ${label.plural.toLowerCase()} yet`} description="Content created through the CMS will appear here." />;

  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="data">
        <caption className="sr-only">{label.plural}</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">{contextLabel}</th>
            <th scope="col">Order</th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-body font-medium">{r.title}</td>
              <td className="text-muted">{r.context}</td>
              <td>{r.sortOrder}</td>
              <td><StatusBadge status={r.status} /></td>
              <td className="whitespace-nowrap text-muted">{formatDate(r.updatedAt)}</td>
              <td><StatusForm entity={entity} id={r.id} status={r.status} title={r.title} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
