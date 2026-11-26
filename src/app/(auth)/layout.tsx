export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="section section--alt flex min-h-[calc(100dvh-4rem)] items-start justify-center">
      <div className="site-container max-w-md">{children}</div>
    </div>
  );
}
