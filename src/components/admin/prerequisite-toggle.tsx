"use client";

import { useActionState } from "react";

import { Callout } from "@/components/ui/callout";
import { SubmitButton } from "@/components/ui/submit-button";
import { setEnforcePrerequisitesAction, type AdminActionState } from "@/server/admin/actions";

const initial: AdminActionState = { status: "idle" };

export function PrerequisiteToggle({ enforced }: { enforced: boolean }) {
  const [state, action] = useActionState(setEnforcePrerequisitesAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <p className="text-muted">
        Prerequisites are currently <b className="text-ink">{enforced ? "enforced" : "switched off"}</b>.{" "}
        {enforced
          ? "Learners must finish earlier courses before later ones unlock."
          : "Every course is unlocked, which is handy for testing. Switch this on before launch."}
      </p>
      <input type="hidden" name="enforce" value={enforced ? "false" : "true"} />
      <div>
        <SubmitButton size="sm" variant={enforced ? "ghost" : "primary"} pendingLabel="Saving…">
          {enforced ? "Unlock everything (testing)" : "Enforce prerequisites"}
        </SubmitButton>
      </div>
      {state.status === "success" && <Callout variant="success" role="status">{state.message}</Callout>}
      {state.status === "error" && <Callout variant="error" role="alert">{state.message}</Callout>}
    </form>
  );
}
