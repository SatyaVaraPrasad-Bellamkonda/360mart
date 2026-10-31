"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchPanel } from "./SearchPanel";

// The header's search button: an icon on phones, a search-box look on bigger
// screens. Also opens with "/" or Ctrl/Cmd + K (not while typing elsewhere).
export function SearchLauncher() {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);
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

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Search"
        aria-keyshortcuts="/ Control+K Meta+K"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink ring-1 ring-line transition hover:bg-surface hover:ring-ink/30 lg:w-52 lg:justify-start lg:gap-2 lg:bg-surface/60 lg:px-3.5 lg:text-muted"
      >
        <Search aria-hidden className="size-[18px] shrink-0" />
        <span className="hidden truncate text-sm lg:inline">Search products</span>
        <kbd className="ml-auto hidden rounded-md bg-white px-1.5 text-[11px] font-semibold text-muted ring-1 ring-line lg:inline">/</kbd>
      </button>
      {opening > 0 && <SearchPanel key={opening} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
