"use client";

import { ArrowLeft, ArrowUpRight, Clock, CornerDownLeft, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import type { ProductCard } from "@/lib/category-page/types";
import { suggestAction, type Suggestions } from "@/lib/search/actions";
import { cleanQuery, MAX_QUERY, searchHref } from "@/lib/search/query";
import { clearRecent, readRecent, rememberSearch } from "@/lib/search/recent";

type Option = { key: string; href: string; label: string; remember?: string };

// The search panel the header opens: type, and a few matching products and
// categories appear (300 ms after the last key; only the newest answer is
// used). Enter or "See all results" opens /search. Arrow keys move through
// the suggestions (a combobox for screen readers). Full screen on phones.
// Mounted fresh for each opening, so it starts empty.
export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const router = useRouter();
  const [q, setQ] = useState("");
  // A new panel is mounted for each opening (keyed by the launcher), so this reads the device's list then.
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  const [found, setFound] = useState<{ for: string; products: ProductCard[]; categories: Suggestions["categories"] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Suggestions for the text, after a pause in typing.
  const text = cleanQuery(q);
  useEffect(() => {
    if (!text) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await suggestAction(text);
      if (ticket !== latest.current) return;
      setLoading(false);
      setFailed(!res.ok);
      if (res.ok) setFound({ for: text, products: res.data.products.items, categories: res.data.categories });
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const shown = text && found?.for === text ? found : null;
  const options: Option[] = text
    ? [
        ...(shown?.categories ?? []).slice(0, 3).map((c) => ({ key: `c${c.categoryId}`, href: c.href, label: c.name })),
        ...(shown?.products ?? []).map((p) => ({ key: `p${p.productId}`, href: `/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`, label: p.name, remember: text })),
        { key: "all", href: searchHref(text), label: `See all results for “${text}”`, remember: text },
      ]
    : recent.map((r) => ({ key: `r${r}`, href: searchHref(r), label: r, remember: r }));

  function go(option: Option) {
    if (option.remember) rememberSearch(option.remember);
    onClose();
    router.push(option.href);
  }

  function submit() {
    if (active >= 0 && options[active]) return go(options[active]);
    if (text) go({ key: "all", href: searchHref(text), label: text, remember: text });
  }

  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % options.length : (i <= 0 ? options.length : i) - 1));
    }
  }

  const optionId = (i: number) => `${listId}-${i}`;
  const productOf = (key: string) => shown?.products.find((p) => `p${p.productId}` === key);
  const categoryOf = (key: string) => shown?.categories.find((c) => `c${c.categoryId}` === key);

  return (
    <dialog
      ref={ref}
      aria-label="Search"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/50 backdrop:backdrop-blur-sm sm:mx-auto sm:mt-[10vh] sm:h-auto sm:max-h-[75vh] sm:max-w-xl sm:rounded-3xl sm:shadow-2xl"
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-1 border-b border-line px-2 py-2 sm:px-3"
          >
            <button type="button" onClick={onClose} aria-label="Close search" className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink sm:hidden">
              <ArrowLeft aria-hidden className="size-5" />
            </button>
            <Search aria-hidden className="ml-2 hidden size-5 shrink-0 text-muted sm:block" />
            <input
              ref={inputRef}
              autoFocus
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_QUERY}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={keys}
              placeholder="Search fruits, milk, snacks…"
              role="combobox"
              aria-expanded={options.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              aria-label="Search products and categories"
              className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
            />
            {loading && text && <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-muted" />}
            {q && (
              <button type="button" onClick={() => (setQ(""), inputRef.current?.focus())} aria-label="Clear" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
                <X aria-hidden className="size-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className="hidden min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink sm:block">
              Esc
            </button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
            {!text && recent.length > 0 && (
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Recent searches</p>
                <button type="button" onClick={() => (clearRecent(), setRecent([]))} className="-my-2 min-h-10 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
                  Clear
                </button>
              </div>
            )}
            {!text && recent.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted">{q.trim() ? "Type at least 2 letters." : "Search for products and categories from stores near you."}</p>
            )}
            {failed && text && <p className="px-3 py-3 text-sm text-muted">Suggestions aren&apos;t loading right now. Press Enter to search.</p>}
            {shown && shown.products.length === 0 && shown.categories.length === 0 && (
              <p className="px-3 pb-1 pt-3 text-sm text-muted">No quick matches for &ldquo;{text}&rdquo;. Press Enter to search everything.</p>
            )}

            <ul id={listId} role="listbox" aria-label="Suggestions" className="space-y-0.5">
              {options.map((o, i) => {
                const product = productOf(o.key);
                const category = categoryOf(o.key);
                const on = i === active;
                return (
                  <li key={o.key} id={optionId(i)} role="option" aria-selected={on}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(o)}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition ${on ? "bg-surface" : "hover:bg-surface"}`}
                    >
                      {product || category ? (
                        <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-brand-soft ring-1 ring-line">
                          <CategoryImage src={(product ?? category)!.imageUrl} alt="" className="size-full" iconClassName="size-5" />
                        </span>
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
                          {o.key === "all" ? <Search aria-hidden className="size-4" /> : <Clock aria-hidden className="size-4" />}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${o.key === "all" ? "font-bold text-brand-deep" : "font-semibold text-ink"}`}>{o.label}</span>
                        {product && <span className="block truncate text-xs text-muted">{[product.brand, product.variants.map((v) => v.label).slice(0, 3).join(" · ")].filter(Boolean).join(" · ")}</span>}
                        {category && <span className="block text-xs text-muted">{category.parentName ? `In ${category.parentName}` : "Category"}</span>}
                      </span>
                      {on ? <CornerDownLeft aria-hidden className="size-4 shrink-0 text-muted" /> : <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted/60" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </dialog>
  );
}
