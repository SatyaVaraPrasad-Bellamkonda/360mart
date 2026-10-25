"use client";

import { Bold, Eye, Italic, List, PenLine, Underline } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { RichText } from "@/components/RichText";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  rows?: number;
  /** The text style of the place it's shown in the shop, so Preview looks the same. */
  previewClassName?: string;
};

type Mark = "**" | "*" | "__";
const BULLET = /^(\s*[-•]\s+)?(.*?)(\s*)$/;
function isWrapped(text: string, mark: Mark) {
  if (text.length < mark.length * 2 + 1 || !text.startsWith(mark) || !text.endsWith(mark)) return false;
  // "**bold**" isn't italic, but "***both***" is.
  return mark !== "*" || !text.startsWith("**") || text.startsWith("***");
}

// A text box with Bold / Italic / Underline / List buttons that type our small format
// (**bold**, *italic*, __underline__, "- " lines; see lib/rich-text.ts), plus a Preview of what
// shoppers will see. The value stays plain text.
export function RichTextField({ label, name, value, onChange, maxLength, placeholder, hint, error, optional, rows = 5, previewClassName = "text-base leading-relaxed text-muted" }: Props) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function apply(next: string, start: number, end: number) {
    if (next.length > maxLength) return;
    onChange(next);
    // React re-renders the textarea first; then put the selection back.
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(start, end);
    });
  }

  // Wrap the selection in a mark, or take the mark off when it's already there.
  function wrap(mark: Mark) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const m = mark.length;
    const picked = value.slice(s, e);
    // Marks work within one line, so several lines (or a whole "- " line) are wrapped one by one.
    if (picked.includes("\n") || /^\s*[-•]\s/.test(picked)) return wrapLines(mark, s, e);
    if (value.slice(s - m, s) === mark && value.slice(e, e + m) === mark) {
      return apply(value.slice(0, s - m) + value.slice(s, e) + value.slice(e + m), s - m, e - m);
    }
    // Keep spaces outside the marks ("**word** " not "**word **"), or they wouldn't count.
    const lead = picked.length - picked.trimStart().length;
    const trail = picked.length - picked.trimEnd().length;
    const a = s + lead;
    const b = Math.max(a, e - trail);
    apply(value.slice(0, a) + mark + value.slice(a, b) + mark + value.slice(b), a + m, b + m);
  }

  function wrapLines(mark: Mark, s: number, e: number) {
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const endBreak = value.indexOf("\n", Math.max(s, e - 1));
    const end = endBreak === -1 ? value.length : endBreak;
    const parts = value
      .slice(start, end)
      .split("\n")
      .map((line) => {
        const [, bullet = "", body = "", tail = ""] = BULLET.exec(line) ?? [];
        return { bullet, body, tail };
      });
    const filled = parts.filter((p) => p.body);
    const undo = filled.length > 0 && filled.every((p) => isWrapped(p.body, mark));
    const m = mark.length;
    const next = parts.map((p) => (p.body ? p.bullet + (undo ? p.body.slice(m, -m) : mark + p.body + mark) + p.tail : p.bullet + p.tail)).join("\n");
    apply(value.slice(0, start) + next + value.slice(end), start, start + next.length);
  }

  // Add "- " to every selected line, or remove it when they all have it.
  function list() {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const endBreak = value.indexOf("\n", el.selectionEnd);
    const end = endBreak === -1 ? value.length : endBreak;
    const lines = value.slice(start, end).split("\n");
    const filled = lines.filter((l) => l.trim());
    const isList = filled.length > 0 && filled.every((l) => /^\s*-\s/.test(l));
    const next = lines.map((l) => (isList ? l.replace(/^\s*-\s+/, "") : l.trim() || lines.length === 1 ? `- ${l.replace(/^\s+/, "")}` : l)).join("\n");
    apply(value.slice(0, start) + next + value.slice(end), start + (lines.length === 1 ? next.length : 0), start + next.length);
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const mark = ({ b: "**", i: "*", u: "__" } as const)[key as "b" | "i" | "u"];
    if (mark) {
      event.preventDefault();
      wrap(mark);
    }
  }

  const describedBy = [error && `${id}-error`, `${id}-hint`].filter(Boolean).join(" ");
  const tool = "flex size-10 items-center justify-center rounded-lg text-ink transition hover:bg-surface disabled:opacity-40";

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      <div className={`overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-brand/40 ${error ? "border-red-500" : "border-line focus-within:border-ink"}`}>
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface/60 px-1.5 py-1">
          <div role="toolbar" aria-label={`Format ${label.toLowerCase()}`} aria-controls={id} className="flex items-center gap-0.5">
            <button type="button" onClick={() => wrap("**")} disabled={preview} aria-label="Bold" aria-keyshortcuts="Control+B Meta+B" title="Bold (Ctrl/Cmd + B)" className={tool}>
              <Bold aria-hidden className="size-4" strokeWidth={2.75} />
            </button>
            <button type="button" onClick={() => wrap("*")} disabled={preview} aria-label="Italic" aria-keyshortcuts="Control+I Meta+I" title="Italic (Ctrl/Cmd + I)" className={tool}>
              <Italic aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => wrap("__")} disabled={preview} aria-label="Underline" aria-keyshortcuts="Control+U Meta+U" title="Underline (Ctrl/Cmd + U)" className={tool}>
              <Underline aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={list} disabled={preview} aria-label="Bullet list" title="Bullet list" className={tool}>
              <List aria-hidden className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink transition hover:bg-surface aria-pressed:bg-ink aria-pressed:text-white"
          >
            {preview ? <PenLine aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            {preview ? "Write" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className={`min-h-32 px-3 py-3 ${previewClassName}`} aria-live="polite">
            {value.trim() ? <RichText text={value} /> : <p className="text-muted/70">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            ref={ref}
            id={id}
            name={name}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={keys}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className="block min-h-32 w-full resize-y px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70"
          />
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-1.5 flex justify-between gap-3 text-sm text-muted">
        <span id={`${id}-hint`}>
          {hint && !error && <>{hint} </>}
          <span className="[&>code]:whitespace-nowrap">
            <code className="font-semibold text-ink">**bold**</code>, <code className="italic text-ink">*italic*</code>, <code className="text-ink underline">__underline__</code>, <code className="text-ink">- list</code>
          </span>
        </span>
        <span aria-hidden className="shrink-0 tabular-nums">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
