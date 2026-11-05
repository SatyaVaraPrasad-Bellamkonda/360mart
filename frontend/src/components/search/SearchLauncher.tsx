"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { ParentCategory } from "@/lib/search/client";
import { SearchPanel } from "./SearchPanel";

const HINT_EVERY_MS = 2600;

// The header's search button: an icon on phones, a wide search box in the
// middle of the header on bigger screens, whose hint cycles through real
// category names ("Search for "fruits""). Also opens with "/" or Ctrl/Cmd + K
// (not while typing elsewhere); the shortcut isn't printed on the box.
export function SearchLauncher({ hints = [], parents = [] }: { hints?: string[]; parents?: ParentCategory[] }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);
  const [hint, setHint] = useState(0);
  const show = () => {
    setOpening((n) => n + 1);
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The live hint: one word at a time, sliding up. Still for reduced motion, and paused while the panel is open.
  useEffect(() => {
    if (hints.length < 2 || open || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setHint((n) => (n + 1) % hints.length), HINT_EVERY_MS);
    return () => clearInterval(timer);
  }, [hints.length, open]);

  const word = hints.length ? hints[hint % hints.length] : null;

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Search products"
        aria-keyshortcuts="/ Control+K Meta+K"
        className="group flex size-10 shrink-0 items-center justify-center rounded-full text-ink ring-1 ring-line transition hover:bg-surface hover:ring-ink/30 md:h-11 md:w-full md:max-w-xl md:justify-start md:gap-2.5 md:bg-surface/70 md:px-4 md:text-muted md:hover:bg-white md:hover:shadow-sm"
      >
        <Search aria-hidden className="size-[18px] shrink-0 md:text-ink/60 md:group-hover:text-ink" />
        <span aria-hidden className="hidden min-w-0 items-center gap-1 overflow-hidden text-sm md:flex">
          <span className="shrink-0">{word ? "Search for" : "Search products"}</span>
          {word && (
            <span className="relative inline-flex h-5 min-w-0 overflow-hidden">
              <span key={word} className="truncate font-semibold text-ink/75 motion-safe:animate-hint-in">
                &ldquo;{word}&rdquo;
              </span>
            </span>
          )}
        </span>
      </button>
      {opening > 0 && <SearchPanel key={opening} open={open} onClose={() => setOpen(false)} parents={parents} />}
    </>
  );
}
