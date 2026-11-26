import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set up your learning" };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="section section--alt min-h-[calc(100dvh-4rem)] pt-[clamp(2rem,5vw,3.5rem)]">
      <div className="site-container max-w-2xl">{children}</div>
    </div>
  );
}
