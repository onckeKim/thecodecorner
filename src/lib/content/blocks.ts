import { z } from "zod";

/**
 * Lesson content is stored as an ordered JSON array of typed blocks (lessons.content).
 * This schema is the contract between the database / future admin CMS and the renderer.
 * Text fields support a tiny inline syntax: **bold**, *italic* and `code`.
 */
const text = z.string().min(1).max(10_000);

export const headingBlock = z.object({ type: z.literal("heading"), text, level: z.union([z.literal(2), z.literal(3)]).optional() });
export const paragraphBlock = z.object({ type: z.literal("paragraph"), text });
export const listBlock = z.object({
  type: z.literal("list"),
  style: z.enum(["bullet", "number"]).default("bullet"),
  items: z.array(text).min(1).max(100),
});
export const calloutBlock = z.object({
  type: z.literal("callout"),
  variant: z.enum(["hint", "success", "error"]).default("hint"),
  title: z.string().max(120).optional(),
  text,
});
export const codeBlock = z.object({
  type: z.literal("code"),
  language: z.string().max(20).default("text"),
  filename: z.string().max(80).optional(),
  code: z.string().min(1).max(20_000),
});
export const tableBlock = z.object({
  type: z.literal("table"),
  caption: z.string().max(200).optional(),
  columns: z.array(z.string().max(200)).min(1).max(12),
  rows: z.array(z.array(z.string().max(500)).max(12)).max(200),
});
export const keyTermsBlock = z.object({
  type: z.literal("key_terms"),
  items: z.array(z.object({ term: z.string().min(1).max(120), definition: text })).min(1).max(50),
});
export const videoBlock = z.object({
  type: z.literal("video"),
  title: z.string().min(1).max(160),
  url: z.url({ protocol: /^https$/ }),
});

export const contentBlock = z.discriminatedUnion("type", [
  headingBlock,
  paragraphBlock,
  listBlock,
  calloutBlock,
  codeBlock,
  tableBlock,
  keyTermsBlock,
  videoBlock,
]);

export type ContentBlock = z.infer<typeof contentBlock>;

export type ParsedContent = {
  blocks: ContentBlock[];
  /** Number of blocks that failed validation and were skipped. */
  invalidCount: number;
};

/** Validates each block independently so one bad block doesn't hide a whole lesson. */
export function parseContent(raw: unknown): ParsedContent {
  if (!Array.isArray(raw)) return { blocks: [], invalidCount: raw == null ? 0 : 1 };
  const blocks: ContentBlock[] = [];
  let invalidCount = 0;
  for (const item of raw) {
    const result = contentBlock.safeParse(item);
    if (result.success) blocks.push(result.data);
    else invalidCount += 1;
  }
  return { blocks, invalidCount };
}
