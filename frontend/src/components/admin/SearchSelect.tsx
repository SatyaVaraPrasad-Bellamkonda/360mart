"use client";

import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";

export type SearchOption = {
  value: number;
  label: string;
  /** Second line, e.g. the web address. */
  detail?: string;
  /** Shown with a picture (or the placeholder) when set; undefined = no picture column. */
  imageUrl?: string | null;
  /** Listed but not choosable, with the reason as its detail. */
  disabled?: boolean;
};

export type SearchSelectHandle = { open: () => void };

type Props = {
  label: string;
  options: SearchOption[];
  /** 0 = nothing chosen. */
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  searchPlaceholder: string;
  /** Shown instead of the list when there are no options at all. */
  emptyText?: string;
  disabled?: boolean;
  /** Options are being fetched: the button says so and can't open yet. */
  loading?: boolean;
  hint?: string;
  error?: string;
  handle?: Ref<SearchSelectHandle>;
};

// A dropdown with a search box (combobox): the button shows the choice; it
// opens a list under it with a search field on top. Type to filter, arrows to
// move, Enter to pick, Esc or a tap outside to close.
export function SearchSelect({ label, options, value, onChange, placeholder, searchPlaceholder, emptyText = "Nothing to choose yet.", disabled: off, loading, hint, error, handle }: Props) {
  const disabled = off || loading;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const chosen = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q)) : options;
  const pictures = options.some((o) => o.imageUrl !== undefined);

  function open() {
    if (triggerRef.current?.disabled) return; // read from the page: called right after the options arrive
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function pick(option: SearchOption | undefined) {
    if (!option || option.disabled) return;
    close();
    if (option.value !== value) onChange(option.value);
  }

  useImperativeHandle(handle, () => ({ open }));

  // Once open: focus the search, show the current choice, close on a tap outside.
  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    listRef.current?.querySelector("[aria-selected=true]")?.scrollIntoView({ block: "nearest" });
    const outside = (event: PointerEvent) => !rootRef.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [isOpen]);

  // Keep the highlighted option visible while moving with the arrows.
  useEffect(() => {
    if (isOpen) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, isOpen]);

  function onSearchKey(event: KeyboardEvent) {
    const move = (step: number) => {
      event.preventDefault();
      if (!shown.length) return;
      setActive((at) => (Math.min(Math.max(at, 0), shown.length - 1) + step + shown.length) % shown.length);
    };
    if (event.key === "ArrowDown") move(1);
    else if (event.key === "ArrowUp") move(-1);
    else if (event.key === "Enter") {
      event.preventDefault();
      pick(shown[Math.min(active, shown.length - 1)]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") close(false);
  }

  const activeOption = shown[Math.min(active, shown.length - 1)];

  return (
    <div ref={rootRef} className="relative">
      <span id={`${id}-label`} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label ${id}-value`}
        data-invalid={!!error || undefined} // buttons can't take aria-invalid; the error is linked below
        aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
        className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl border bg-white px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:bg-surface ${error ? "border-red-500" : isOpen ? "border-ink" : "border-line enabled:hover:border-ink"}`}
      >
        {pictures && chosen && <CategoryImage src={chosen.imageUrl ?? null} alt="" className="size-8 shrink-0 rounded-lg ring-1 ring-line" iconClassName="size-4" />}
        <span id={`${id}-value`} className={`min-w-0 flex-1 truncate text-base ${chosen ? "font-semibold text-ink" : "text-muted"}`}>
          {loading ? "Loading…" : (chosen?.label ?? placeholder)}
        </span>
        {loading ? (
          <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-muted" />
        ) : (
          <ChevronDown aria-hidden className={`size-5 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {isOpen && (
        <div className="absolute inset-x-0 top-[calc(100%-0.25rem)] z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl shadow-ink/10 ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-duration:200ms]">
          <div className="border-b border-line p-2">
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/50">
              <Search aria-hidden className="size-5 shrink-0 text-muted" />
              <span className="sr-only">{searchPlaceholder}</span>
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                aria-expanded
                aria-controls={`${id}-list`}
                aria-activedescendant={activeOption ? `${id}-${activeOption.value}` : undefined}
                aria-autocomplete="list"
                autoComplete="off"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKey}
                className="min-h-11 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
              />
            </label>
          </div>
          <ul ref={listRef} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">{emptyText}</li>
            ) : shown.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches &quot;{query.trim()}&quot;.</li>
            ) : (
              shown.map((o, i) => {
                const selected = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={`${id}-${o.value}`}
                    data-index={i}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={o.disabled || undefined}
                    onPointerDown={(e) => e.preventDefault()} // keep focus in the search box
                    onClick={() => pick(o)}
                    onPointerEnter={() => setActive(i)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-1.5 ${o.disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${i === Math.min(active, shown.length - 1) ? "bg-surface ring-1 ring-line" : ""}`}
                  >
                    {pictures && <CategoryImage src={o.imageUrl ?? null} alt="" className="size-8 shrink-0 rounded-lg ring-1 ring-line" iconClassName="size-4" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{o.label}</span>
                      {o.detail && <span className="block truncate text-xs text-muted">{o.detail}</span>}
                    </span>
                    {selected && <Check aria-hidden className="size-5 shrink-0 text-fresh" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
