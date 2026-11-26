"use client";

import { useActionState, useRef } from "react";

import { useFocusFirstError } from "@/components/forms/use-focus-first-error";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileAction } from "@/server/profile/actions";
import type { ProfileField } from "@/server/profile/schema";
import type { ProfileView } from "@/server/profile/service";
import type { FormState } from "@/types/domain";

const initial: FormState<ProfileField> = { status: "idle" };

export function ProfileForm({ profile, timezones, roles }: { profile: ProfileView; timezones: string[]; roles: string[] }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const err = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" value={profile.email ?? ""} disabled readOnly />
        <span className="hint">Your sign-in email. Role: {roles.join(", ") || "learner"}.</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" className="input" defaultValue={profile.firstName ?? ""} required maxLength={60} autoComplete="given-name" aria-invalid={!!err.firstName} aria-describedby={err.firstName ? "firstName-error" : undefined} />
          {err.firstName && <span id="firstName-error" className="field-error">{err.firstName}</span>}
        </div>
        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" className="input" defaultValue={profile.lastName ?? ""} required maxLength={60} autoComplete="family-name" aria-invalid={!!err.lastName} aria-describedby={err.lastName ? "lastName-error" : undefined} />
          {err.lastName && <span id="lastName-error" className="field-error">{err.lastName}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" className="input" defaultValue={profile.displayName} required maxLength={80} aria-invalid={!!err.displayName} aria-describedby={err.displayName ? "displayName-error" : undefined} />
        {err.displayName && <span id="displayName-error" className="field-error">{err.displayName}</span>}
      </div>

      <div className="field">
        <label htmlFor="username">Username <span className="font-normal text-subtle">(optional)</span></label>
        <input id="username" name="username" className="input" defaultValue={profile.username ?? ""} maxLength={30} pattern="[a-z0-9_]{3,30}" autoComplete="username" aria-invalid={!!err.username} aria-describedby="username-hint" />
        <span id="username-hint" className={err.username ? "field-error" : "hint"}>{err.username ?? "3–30 characters: lowercase letters, numbers and underscores."}</span>
      </div>

      <div className="field">
        <label htmlFor="bio">Bio <span className="font-normal text-subtle">(optional)</span></label>
        <textarea id="bio" name="bio" className="input" defaultValue={profile.bio ?? ""} maxLength={500} aria-invalid={!!err.bio} />
        {err.bio && <span className="field-error">{err.bio}</span>}
      </div>

      <div className="field">
        <label htmlFor="timezone">Time zone</label>
        <select id="timezone" name="timezone" className="input" defaultValue={profile.timezone} aria-invalid={!!err.timezone} aria-describedby="timezone-hint">
          {timezones.map((tz) => <option key={tz} value={tz}>{tz.replaceAll("_", " ")}</option>)}
        </select>
        <span id="timezone-hint" className={err.timezone ? "field-error" : "hint"}>{err.timezone ?? "Used to work out your daily learning streak."}</span>
      </div>

      <div><SubmitButton pendingLabel="Saving…">Save profile</SubmitButton></div>
    </form>
  );
}
