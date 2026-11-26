import { cn } from "@/lib/utils";

type Props = {
  variant?: "hint" | "success" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
};

/** Design-system callout (.callout--hint | --success | --error). */
export function Callout({ variant = "hint", title, children, className, role }: Props) {
  return (
    <div className={cn("callout", `callout--${variant}`, className)} role={role}>
      {title && <strong>{title}</strong>} {children}
    </div>
  );
}
