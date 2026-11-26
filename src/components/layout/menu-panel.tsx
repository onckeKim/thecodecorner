"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Disclosure used for the user menu and the mobile navigation. Closes on route
 * change, Escape and outside click.
 */
export function MenuPanel({
  label,
  trigger,
  children,
  align = "right",
  className,
}: {
  label: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  // Close after navigating (derived from state instead of an effect).
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        className="icon-btn inline-flex w-auto items-center gap-2 px-3"
        aria-expanded={isOpen}
        aria-controls={id}
        aria-label={label}
        onClick={() => {
          setOpen(!isOpen);
          setOpenedAt(pathname);
        }}
      >
        {trigger}
      </button>
      <div
        id={id}
        hidden={!isOpen}
        className={`card absolute top-[calc(100%+8px)] z-50 w-64 p-2 ${align === "right" ? "right-0" : "left-0"}`}
      >
        {children}
      </div>
    </div>
  );
}
