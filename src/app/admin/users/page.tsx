import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { listUsers } from "@/server/admin/service";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const users = await listUsers();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description="Registered learners and administrators." />
      {users.length ? (
        <div className="table-wrap" tabIndex={0}>
          <table className="data">
            <caption className="sr-only">Users</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Roles</th>
                <th scope="col">Enrolments</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-body font-medium">{u.displayName}{u.username && <span className="block text-xs text-subtle">@{u.username}</span>}</td>
                  <td className="text-muted">{u.email}</td>
                  <td>{u.roles.map((r) => <span key={r} className={`level ${r === "admin" ? "level--hard" : "level--easy"} mr-1`}>{r}</span>)}</td>
                  <td>{u.enrolments}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(u.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No users yet" />
      )}
    </>
  );
}
