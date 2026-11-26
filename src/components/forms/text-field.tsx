type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
};

/** Labelled input wired to its hint / error text for screen readers. */
export function TextField({ name, label, error, hint, id, ...input }: Props) {
  const fieldId = id ?? name;
  const msgId = `${fieldId}-msg`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        name={name}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        {...input}
      />
      {(error || hint) && (
        <span id={msgId} className={error ? "field-error" : "hint"}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}
