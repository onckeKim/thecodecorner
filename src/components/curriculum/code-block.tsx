import { highlight } from "@/lib/content/highlight";

/** Design-system dark code block (.code) with token colouring. */
export function CodeBlock({ code, language, filename }: { code: string; language: string; filename?: string }) {
  const tokens = highlight(code, language);
  return (
    <pre className="code" tabIndex={0} aria-label={filename ? `Code: ${filename}` : `${language} code`}>
      <span className="code__bar" aria-hidden="true">
        <i />
        <i />
        <i />
        &nbsp;{filename ?? language}
      </span>
      {tokens.map((t, i) => (t.kind ? <span key={i} className={t.kind}>{t.text}</span> : t.text))}
    </pre>
  );
}
