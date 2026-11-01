"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { PINCODE, splitEntries } from "@/lib/campaigns/validation";

// A box that turns what's typed into chips: Enter, comma or "Add" adds it,
// pasting a list adds each one, Backspace in the empty box removes the last.
// Used for the audience's cities and pincodes.
export function ChipInput({
  label,
  hint,
  values,
  onChange,
  max,
  kind,
  placeholder,
  error,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  kind: "city" | "pincode";
  placeholder: string;
  error?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const pincodes = kind === "pincode";

  function add(raw: string) {
    const entries = splitEntries(raw, pincodes);
    if (!entries.length) return;
    const next = [...values];
    const bad: string[] = [];
    for (const entry of entries) {
      const ok = pincodes ? PINCODE.test(entry) : entry.length >= 2 && entry.length <= 100 && !/[<>]/.test(entry);
      if (!ok) {
        bad.push(entry);
        continue;
      }
      if (next.some((v) => v.toLowerCase() === entry.toLowerCase())) continue;
      if (next.length >= max) {
        setProblem(`At most ${max}. Remove one to add another.`);
        onChange(next);
        setText("");
        return;
      }
      next.push(entry);
    }
    onChange(next);
    setText(bad.join(pincodes ? " " : ", "));
    setProblem(bad.length ? (pincodes ? `${bad.join(", ")}: enter a 6-digit pincode.` : "Enter a city name (2 to 100 letters).") : null);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!/[,;\n]/.test(pasted) && !(pincodes && /\s/.test(pasted.trim()))) return;
    e.preventDefault();
    add(`${text} ${pasted}`);
  }

  const shown = problem ?? error;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
        {label}
        <span className="shrink-0 text-xs font-normal tabular-nums text-muted">
          {values.length}/{max}
        </span>
      </label>
      <div className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand/40 ${shown ? "border-red-500" : "border-line focus-within:border-ink"}`}>
        {values.map((v) => (
          <span key={v} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface py-0.5 pl-3 pr-1 text-sm font-semibold text-ink ring-1 ring-line motion-safe:animate-pop-in">
            <span className={pincodes ? "tabular-nums" : "capitalize"}>{v}</span>
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink" aria-label={`Remove ${v}`}>
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setProblem(null);
          }}
          onKeyDown={onKey}
          onPaste={onPaste}
          onBlur={() => text.trim() && add(text)}
          inputMode={pincodes ? "numeric" : "text"}
          maxLength={pincodes ? 400 : 100}
          placeholder={values.length ? "" : placeholder}
          aria-invalid={!!shown}
          aria-describedby={`${id}-hint`}
          className="min-h-9 min-w-32 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-muted/70"
        />
        {text.trim() && (
          <button type="button" onClick={() => add(text)} className="flex min-h-9 items-center gap-1 rounded-full bg-ink px-3 text-sm font-semibold text-white">
            <Plus aria-hidden className="size-4" />
            Add
          </button>
        )}
      </div>
      {shown ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-red-700">
          {shown}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
