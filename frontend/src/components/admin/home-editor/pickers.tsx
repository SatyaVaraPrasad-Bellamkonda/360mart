"use client";

import { ArrowDown, ArrowUp, Check, ChevronRight, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { Dialog } from "@/components/Dialog";
import { toastError } from "@/components/Toaster";
import { loadSubcategoriesAction } from "@/lib/catalog/actions";
import type { Category } from "@/lib/catalog/types";
import type { ProductCard } from "@/lib/category-page/types";
import { pickProductsAction } from "@/lib/home-page/actions";
import { useNames } from "./names";

// The designer's pickers: chosen items as an ordered list (move, remove) and a
// dialog to add more. Products are found by search; categories are browsed
// (subcategories load when a category is opened: one call each, kept).

function Picked({ ids, kind, onChange, max }: { ids: number[]; kind: "product" | "category"; onChange: (ids: number[]) => void; max: number }) {
  const names = useNames();
  if (!ids.length) return null;
  const move = (i: number, by: -1 | 1) => {
    const next = [...ids];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  return (
    <ol className="space-y-1.5">
      {ids.map((id, i) => {
        const known = kind === "product" ? names.product(id) : names.category(id);
        return (
          <li key={id} className="flex items-center gap-2 rounded-xl bg-white p-1.5 ring-1 ring-line">
            <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-surface">
              <CategoryImage src={known.imageUrl} alt="" className="size-full" iconClassName="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{known.name}</span>
              {known.note && <span className="block truncate text-xs text-muted">{known.note}</span>}
            </span>
            <span className="hidden text-xs tabular-nums text-muted sm:inline">
              {i + 1}/{max}
            </span>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${known.name} up`} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30">
              <ArrowUp aria-hidden className="size-4" />
            </button>
            <button type="button" disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${known.name} down`} className="hidden size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30 sm:flex">
              <ArrowDown aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(ids.filter((x) => x !== id))} aria-label={`Remove ${known.name}`} className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700">
              <X aria-hidden className="size-4" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function ProductPicker({ label, hint, ids, onChange, max, error }: { label: string; hint?: string; ids: number[]; onChange: (ids: number[]) => void; max: number; error?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className={`space-y-2 rounded-2xl p-2 ring-1 ${error ? "ring-red-400" : "ring-line"} bg-surface/60`}>
        <Picked ids={ids} kind="product" onChange={onChange} max={max} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={ids.length >= max}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white text-sm font-semibold text-ink hover:border-ink disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" />
          {ids.length ? "Add more products" : "Pick products"}
          <span className="font-normal text-muted">
            ({ids.length}/{max})
          </span>
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
      <ProductSearchDialog open={open} onClose={() => setOpen(false)} ids={ids} onChange={onChange} max={max} />
    </fieldset>
  );
}

function ProductSearchDialog({ open, onClose, ids, onChange, max }: { open: boolean; onClose: () => void; ids: number[]; onChange: (ids: number[]) => void; max: number }) {
  const names = useNames();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ for: string; items: ProductCard[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  const text = q.trim();

  useEffect(() => {
    if (text.length < 2) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await pickProductsAction(text);
      if (ticket !== latest.current) return;
      setLoading(false);
      if (!res.ok) return toastError(res.error.message);
      names.learnProducts(res.data);
      setFound({ for: text, items: res.data });
    }, 300);
    return () => clearTimeout(timer);
  }, [text, names]);

  const items = text.length >= 2 && found?.for === text ? found.items : [];
  const toggle = (id: number) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < max ? [...ids, id] : ids);

  return (
    <Dialog open={open} onClose={onClose} title="Pick products" description={`Search the catalogue. ${ids.length} of ${max} picked.`}>
      <div className="space-y-3 pb-5">
        <label className="flex items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/40">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product name or brand" aria-label="Search products" className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
          {loading && <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-muted" />}
        </label>
        {text.length < 2 && <p className="py-6 text-center text-sm text-muted">Type at least 2 letters. Only products on sale can be picked.</p>}
        {text.length >= 2 && found?.for === text && items.length === 0 && <p className="py-6 text-center text-sm text-muted">No products on sale match &ldquo;{text}&rdquo;.</p>}
        <ul className="space-y-1.5">
          {items.map((p) => {
            const on = ids.includes(p.productId);
            return (
              <li key={p.productId}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={!on && ids.length >= max}
                  onClick={() => toggle(p.productId)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl p-2 text-left ring-1 transition disabled:opacity-50 ${on ? "bg-brand-soft/60 ring-brand" : "bg-white ring-line hover:ring-ink/40"}`}
                >
                  <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface">
                    <CategoryImage src={p.imageUrl} alt="" className="size-full" iconClassName="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{[p.brand, p.subcategorySlug.replace(/-/g, " ")].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${on ? "bg-ink text-white" : "ring-1 ring-line"}`}>{on ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4 text-muted" />}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink/85">
          Done
        </button>
      </div>
    </Dialog>
  );
}

export function CategoryPicker({
  label,
  hint,
  ids,
  onChange,
  max,
  error,
  categories,
  subcategories = true,
}: {
  label: string;
  hint?: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  max: number;
  error?: string;
  /** The top-level categories. */
  categories: Category[];
  /** Whether subcategories can be picked too. */
  subcategories?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className={`space-y-2 rounded-2xl p-2 ring-1 ${error ? "ring-red-400" : "ring-line"} bg-surface/60`}>
        <Picked ids={ids} kind="category" onChange={onChange} max={max} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={ids.length >= max}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white text-sm font-semibold text-ink hover:border-ink disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" />
          {ids.length ? "Add more categories" : "Pick categories"}
          <span className="font-normal text-muted">
            ({ids.length}/{max})
          </span>
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
      <CategoryDialog open={open} onClose={() => setOpen(false)} ids={ids} onChange={onChange} max={max} categories={categories} subcategories={subcategories} />
    </fieldset>
  );
}

function CategoryDialog({ open, onClose, ids, onChange, max, categories, subcategories }: { open: boolean; onClose: () => void; ids: number[]; onChange: (ids: number[]) => void; max: number; categories: Category[]; subcategories: boolean }) {
  const names = useNames();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [subs, setSubs] = useState<Record<number, Category[]>>({});
  const [loading, setLoading] = useState<number | null>(null);
  const toggle = (id: number) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < max ? [...ids, id] : ids);

  async function openCategory(c: Category) {
    if (expanded === c.categoryId) return setExpanded(null);
    setExpanded(c.categoryId);
    if (subs[c.categoryId]) return;
    setLoading(c.categoryId);
    const res = await loadSubcategoriesAction(c.categoryId);
    setLoading(null);
    if (!res.ok) return toastError(res.error.message);
    names.learnCategories(res.data, c.name);
    setSubs((m) => ({ ...m, [c.categoryId]: res.data }));
  }

  const row = (c: Category, sub?: boolean) => {
    const on = ids.includes(c.categoryId);
    return (
      <button
        type="button"
        aria-pressed={on}
        disabled={!on && ids.length >= max}
        onClick={() => toggle(c.categoryId)}
        className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition disabled:opacity-50 ${on ? "bg-brand-soft/60" : "hover:bg-surface"}`}
      >
        <span className={`${sub ? "size-8" : "size-10"} shrink-0 overflow-hidden rounded-lg bg-surface`}>
          <CategoryImage src={c.imageUrl} alt="" className="size-full" iconClassName="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.name}</span>
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-ink text-white" : "ring-1 ring-line"}`}>{on && <Check aria-hidden className="size-3.5" />}</span>
      </button>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Pick categories" description={`${subcategories ? "Tap the arrow to see a category's subcategories. " : ""}${ids.length} of ${max} picked.`}>
      <div className="space-y-2 pb-5">
        {categories.length === 0 && <p className="py-6 text-center text-sm text-muted">No categories yet.</p>}
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.categoryId} className="rounded-2xl ring-1 ring-line">
              <div className="flex items-center gap-1 p-1">
                {row(c)}
                {subcategories && (
                  <button type="button" onClick={() => openCategory(c)} aria-expanded={expanded === c.categoryId} aria-label={`Subcategories of ${c.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-ink">
                    {loading === c.categoryId ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ChevronRight aria-hidden className={`size-4 transition ${expanded === c.categoryId ? "rotate-90" : ""}`} />}
                  </button>
                )}
              </div>
              {expanded === c.categoryId && subs[c.categoryId] && (
                <ul className="space-y-0.5 border-t border-line p-1 pl-6">
                  {subs[c.categoryId].length === 0 && <li className="px-2 py-2 text-xs text-muted">No subcategories.</li>}
                  {subs[c.categoryId].map((s) => (
                    <li key={s.categoryId} className="flex">
                      {row(s, true)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink/85">
          Done
        </button>
      </div>
    </Dialog>
  );
}
