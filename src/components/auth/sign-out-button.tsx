"use client";

import { useFormStatus } from "react-dom";

import { signOut } from "@/server/auth/actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="nav-link w-full text-left" disabled={pending} aria-busy={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button />
    </form>
  );
}
