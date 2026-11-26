import { Callout } from "@/components/ui/callout";
import { parseContent, type ContentBlock } from "@/lib/content/blocks";

import { CodeBlock } from "./code-block";
import { InlineText } from "./inline-text";

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? <h3><InlineText text={block.text} /></h3> : <h2><InlineText text={block.text} /></h2>;
    case "paragraph":
      return <p><InlineText text={block.text} /></p>;
    case "list": {
      const items = block.items.map((item, i) => <li key={i}><InlineText text={item} /></li>);
      return block.style === "number" ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "callout":
      return (
        <Callout variant={block.variant} title={block.title}>
          <InlineText text={block.text} />
        </Callout>
      );
    case "code":
      return <CodeBlock code={block.code} language={block.language} filename={block.filename} />;
    case "table":
      return (
        <figure className="m-0 grid gap-2">
          <div className="table-wrap" tabIndex={0}>
            <table className="data">
              <thead>
                <tr>{block.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>{row.map((cell, c) => <td key={c}><InlineText text={cell} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && <figcaption className="font-code text-xs text-subtle">{block.caption}</figcaption>}
        </figure>
      );
    case "key_terms":
      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          {block.items.map((item, i) => (
            <div key={i} className="card p-4">
              <dt className="font-display font-semibold">{item.term}</dt>
              <dd className="m-0 mt-1 text-sm text-muted"><InlineText text={item.definition} /></dd>
            </div>
          ))}
        </dl>
      );
    case "video":
      return (
        <Callout variant="hint" title="Video.">
          <a className="link" href={block.url} target="_blank" rel="noopener noreferrer">
            {block.title} (opens in a new tab)
          </a>
        </Callout>
      );
  }
}

/** Renders validated lesson blocks. Invalid blocks are skipped and reported once. */
export function LessonContent({ content }: { content: unknown }) {
  const { blocks, invalidCount } = parseContent(content);
  if (!blocks.length) {
    return (
      <Callout variant="hint" title="Content coming soon.">
        This lesson doesn’t have any content yet.
      </Callout>
    );
  }
  return (
    <div className="prose-lesson">
      {blocks.map((block, i) => <Block key={i} block={block} />)}
      {invalidCount > 0 && (
        <Callout variant="error" title="Some content couldn’t be displayed.">
          {invalidCount} block{invalidCount === 1 ? "" : "s"} in this lesson didn’t pass validation and {invalidCount === 1 ? "was" : "were"} skipped.
        </Callout>
      )}
    </div>
  );
}
