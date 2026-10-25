import { Fragment, type ReactNode } from "react";
import { parseRichText, type Inline } from "@/lib/rich-text";

// Shows text written in our small format (lib/rich-text.ts) as paragraphs,
// lists, bold and italic. Built from React elements only, never raw HTML, so
// whatever is typed is shown as text.
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  if (!blocks.length) return null;
  return (
    <div className={`space-y-3 break-words ${className}`}>
      {blocks.map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-brand-deep">
            {block.items.map((item, j) => (
              <li key={j}>
                <Line parts={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Line parts={line} />
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}

function Line({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) => {
    let node: ReactNode = part.text;
    if (part.italic) node = <em>{node}</em>;
    // Thicker, offset line so it doesn't read as a link.
    if (part.underline) node = <u className="decoration-2 underline-offset-4">{node}</u>;
    if (part.bold) node = <strong className="font-bold text-ink">{node}</strong>;
    return <Fragment key={i}>{node}</Fragment>;
  });
}
