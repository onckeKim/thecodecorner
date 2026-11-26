import Link from "next/link";

export default function NotFound() {
  return (
    <div className="site-container py-20">
      <div className="mx-auto grid max-w-xl gap-4">
        <span className="eyebrow">404</span>
        <h1 className="text-4xl">Page not found</h1>
        <p className="text-muted">The page you’re looking for doesn’t exist, or it hasn’t been published yet.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn--primary" href="/paths">Browse learning paths</Link>
          <Link className="btn btn--ghost" href="/">Go home</Link>
        </div>
      </div>
    </div>
  );
}
