import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile/profile-form";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { requireViewer } from "@/server/auth/session";
import { getProfile } from "@/server/profile/service";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const profile = await getProfile(viewer.id);
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <div className="site-container max-w-3xl py-12">
      <PageHeader eyebrow="Profile" title="Your profile" description={profile ? `Member since ${formatDate(profile.joinedAt)}` : undefined} />
      {profile ? (
        <div className="card">
          <ProfileForm profile={profile} timezones={timezones.includes("UTC") ? timezones : ["UTC", ...timezones]} roles={viewer.roles} />
        </div>
      ) : (
        <Callout variant="error" role="alert">We couldn’t find your profile. Try signing out and back in.</Callout>
      )}
    </div>
  );
}
