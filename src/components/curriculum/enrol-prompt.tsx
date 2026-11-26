import { SubmitButton } from "@/components/ui/submit-button";
import { enrolAction } from "@/server/progress/actions";

export function EnrolPrompt({ pathSlug, pathTitle }: { pathSlug: string; pathTitle: string }) {
  return (
    <div className="callout callout--hint flex flex-wrap items-center justify-between gap-4">
      <span>
        <strong>You’re not enrolled yet.</strong> Enrol in {pathTitle} to open lessons and track your progress.
      </span>
      <form action={enrolAction}>
        <input type="hidden" name="pathSlug" value={pathSlug} />
        <SubmitButton size="sm" pendingLabel="Enrolling…">Enrol now</SubmitButton>
      </form>
    </div>
  );
}
