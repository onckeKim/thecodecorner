import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import type { FormState } from "@/types/domain";

/** Success / error banner for a form action, with an optional recovery link. */
export function FormMessage({ state, successTitle }: { state: FormState<string>; successTitle?: string }) {
  if (state.status === "idle" || !state.message) return null;
  const ok = state.status === "success";
  return (
    <Callout variant={ok ? "success" : "error"} title={ok ? successTitle : undefined} role={ok ? "status" : "alert"}>
      {state.message}
      {state.link && (
        <>
          {" "}
          <Link className="link" href={state.link.href}>
            {state.link.label}
          </Link>
        </>
      )}
    </Callout>
  );
}
