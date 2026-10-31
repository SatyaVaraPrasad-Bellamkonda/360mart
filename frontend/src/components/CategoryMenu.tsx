"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CategoryImage } from "./catalog/CategoryImage";

type Item = { id: number; name: string; href: string; image: string | null };

// The desktop header's "Categories" button: one button however many
// categories there are, opening a panel with all of them (picture + name) and
// a link to the full page. Closes on a pick, Esc, or a click outside.
export function CategoryMenu({ categories }: { categories: Item[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${open ? "bg-ink text-white" : "text-ink hover:bg-surface"}`}
      >
        <LayoutGrid aria-hidden className="size-4" />
        Categories
        <ChevronDown aria-hidden className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-40 mt-2 w-[min(40rem,calc(100vw-2rem))] rounded-3xl bg-white p-3 shadow-2xl ring-1 ring-line motion-safe:animate-pop-in">
          {categories.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Categories are on their way.</p>
          ) : (
            <ul className="grid max-h-[60vh] grid-cols-2 gap-1 overflow-y-auto lg:grid-cols-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={c.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl p-1.5 pr-3 text-sm font-semibold text-ink transition hover:bg-surface">
                    <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-brand-soft">
                      <CategoryImage src={c.image} alt="" className="size-full" iconClassName="size-5" />
                    </span>
                    <span className="min-w-0 truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 border-t border-line pt-2">
            <Link href="/categories" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-brand-deep hover:bg-surface">
              See all categories
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
