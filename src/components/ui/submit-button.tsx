"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
};

/** Submit button that disables itself and shows a pending label while its form submits. */
export function SubmitButton({ children, pendingLabel, variant = "primary", size = "md", className, name, value, disabled }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("btn", variant === "primary" ? "btn--primary" : "btn--ghost", size === "sm" && "btn--sm", className)}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
