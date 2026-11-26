"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { setContentStatusAction, type AdminActionState } from "@/server/admin/actions";
import type { ContentEntity } from "@/server/admin/service";
import type { ContentStatus } from "@/types/database";

const initial: AdminActionState = { status: "idle" };

/** Publish / unpublish control for one curriculum item. */
export function StatusForm({ entity, id, status, title }: { entity: ContentEntity; id: string; status: ContentStatus; title: string }) {
  const [state, action] = useActionState(setContentStatusAction, initial);
  const target: ContentStatus = status === "published" ? "draft" : "published";
  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={target} />
      {state.status === "error" && <span role="alert" className="text-xs text-error">{state.message}</span>}
      <SubmitButton size="sm" variant={target === "published" ? "primary" : "ghost"} pendingLabel="Saving…">
        <span aria-hidden="true">{target === "published" ? "Publish" : "Unpublish"}</span>
        <span className="sr-only">{target === "published" ? `Publish ${title}` : `Unpublish ${title}`}</span>
      </SubmitButton>
    </form>
  );
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  const cls = status === "published" ? "level--easy" : status === "draft" ? "level--medium" : "level--hard";
  return <span className={`level ${cls}`}>{status}</span>;
}
