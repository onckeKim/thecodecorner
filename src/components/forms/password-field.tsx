"use client";

import { useId, useState } from "react";

import { PASSWORD_RULES } from "@/server/auth/schemas";

type Props = {
  name: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  error?: string;
  /** Show the live requirements checklist (for creating a password). */
  showRules?: boolean;
};

/** Password input with a show/hide toggle and (optionally) a live requirements list. */
export function PasswordField({ name, label, autoComplete, error, showRules }: Props) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const id = useId();
  const inputId = `${name}-${id}`;
  const errorId = `${inputId}-error`;
  const rulesId = `${inputId}-rules`;
  const describedBy = [error ? errorId : null, showRules ? rulesId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          className="input pr-20"
          autoComplete={autoComplete}
          required
          maxLength={128}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-[var(--radius-sm)] px-2.5 py-1.5 font-code text-xs text-muted hover:text-accent"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && <span id={errorId} className="field-error">{error}</span>}
      {showRules && (
        <ul id={rulesId} className="m-0 grid list-none gap-1 p-0 text-[0.8rem]" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <li key={rule.id} className={met ? "text-success" : "text-subtle"}>
                <span aria-hidden="true">{met ? "✓" : "○"}</span> {rule.label}
                <span className="sr-only">{met ? " (met)" : " (not met yet)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
