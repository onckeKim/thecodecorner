"use client";

import Link from "next/link";

import { Callout } from "./callout";

/** Shared body for route error boundaries. */
export function ErrorState({ error, reset, title = "Something went wrong" }: { error: Error & { digest?: string }; reset: () => void; title?: string }) {
  return (
    <div className="site-container py-16">
      <div className="mx-auto grid max-w-xl gap-5">
        <h1 className="text-3xl">{title}</h1>
        <Callout variant="error" role="alert">
          We couldn’t load this page. This is usually temporary, so please try again.
          {error.digest && <span className="mt-2 block font-code text-xs text-subtle">Reference: {error.digest}</span>}
        </Callout>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn--primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn--ghost" href="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
