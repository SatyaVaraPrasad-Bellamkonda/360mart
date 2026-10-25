// A tiny, safe text format for product descriptions and storage tips, stored as
// plain text (no HTML, so the backend's "no < or >" rule still holds):
//   **bold**   *italic*   __underline__   lines starting with "- " = a bullet list
//   one line break = a new line, an empty line = a new paragraph.
// Parsed into plain data and rendered by <RichText> as React elements: nothing
// typed by an admin ever becomes HTML. Safe for client and server code.

export type Inline = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type Block = { kind: "paragraph"; lines: Inline[][] } | { kind: "list"; items: Inline[][] };

const BULLET = /^\s*[-•]\s+/;
// ***both***, **bold**, __underline__, then *italic*; the marks must hug the text ("2 * 3" stays as is).
// Marks work within one line: the editor wraps each selected line on its own.
const INLINE = /\*\*\*(?=[^\s*])(.+?)(?<=[^\s*])\*\*\*|\*\*(?=\S)(.+?)(?<=\S)\*\*|__(?=\S)(.+?)(?<=\S)__|\*(?=[^\s*])(.+?)(?<=[^\s*])\*/g;

export function parseInline(text: string, outer: Omit<Inline, "text"> = {}): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), ...outer });
    if (m[1] !== undefined) out.push({ text: m[1], ...outer, bold: true, italic: true });
    else if (m[2] !== undefined) out.push(...parseInline(m[2], { ...outer, bold: true }));
    else if (m[3] !== undefined) out.push(...parseInline(m[3], { ...outer, underline: true }));
    else out.push({ text: m[4], ...outer, italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), ...outer });
  return out;
}

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const prev = blocks.at(-1);
    if (!line.trim()) {
      // An empty line ends the paragraph or list (a following one starts fresh).
      if (prev && !(prev.kind === "paragraph" && prev.lines.length === 0)) blocks.push({ kind: "paragraph", lines: [] });
      continue;
    }
    if (BULLET.test(line)) {
      const item = parseInline(line.replace(BULLET, "").trim());
      if (prev?.kind === "list") prev.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      const content = parseInline(line.trim());
      if (prev?.kind === "paragraph") prev.lines.push(content);
      else blocks.push({ kind: "paragraph", lines: [content] });
    }
  }
  return blocks.filter((b) => (b.kind === "paragraph" ? b.lines.length > 0 : b.items.length > 0));
}

/** The words without the marks, on one line: for Google snippets, JSON-LD and cards. */
export function richTextToPlain(source: string): string {
  return parseRichText(source)
    .flatMap((b) => (b.kind === "paragraph" ? b.lines : b.items))
    .map((line) => line.map((part) => part.text).join("").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;]$/.test(line) ? line : `${line}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
