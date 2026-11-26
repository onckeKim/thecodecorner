export default function Loading() {
  return (
    <div className="site-container py-16" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className="skeleton mb-4 h-4 w-28" />
      <div className="skeleton mb-3 h-10 w-2/3 max-w-xl" />
      <div className="skeleton mb-10 h-5 w-1/2 max-w-md" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-44" />
        ))}
      </div>
    </div>
  );
}
