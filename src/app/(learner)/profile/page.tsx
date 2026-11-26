import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile/profile-form";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { requireOnboardedViewer } from "@/server/auth/session";
import { getLearnerPlan } from "@/server/onboarding/service";
import { getProfile } from "@/server/profile/service";
import { PreferencesForm } from "@/components/profile/preferences-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireOnboardedViewer();
  const [profile, plan] = await Promise.all([getProfile(viewer.id), getLearnerPlan(viewer.id)]);
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <div className="site-container max-w-3xl py-12">
      <PageHeader eyebrow="Profile" title="Your profile" description={profile ? `Member since ${formatDate(profile.joinedAt)}` : undefined} />
      {profile ? (
        <div className="grid gap-8">
          <section className="card" aria-labelledby="details-heading">
            <h2 id="details-heading" className="mb-5 text-xl">Your details</h2>
            <ProfileForm profile={profile} timezones={timezones.includes("UTC") ? timezones : ["UTC", ...timezones]} roles={viewer.roles} />
          </section>
          <section className="card" aria-labelledby="prefs-heading">
            <h2 id="prefs-heading" className="mb-1 text-xl">Learning preferences</h2>
            <p className="mb-5 text-sm text-muted">
              Experience: {plan.level ?? "not set"} · Tools: {plan.answers.toolsAnswered ? plan.tools.join(", ") || "none yet" : "not set"}
            </p>
            <PreferencesForm goals={plan.options.goals} weekly={plan.options.weekly} goalId={plan.answers.learningGoalId} weeklyId={plan.answers.weeklyTargetId} />
          </section>
        </div>
      ) : (
        <Callout variant="error" role="alert">We couldn’t find your profile. Try signing out and back in.</Callout>
      )}
    </div>
  );
}
