"use client";

import { Check, ChevronDown, LoaderCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchSubcategories } from "@/lib/catalog/admin-client";
import { LIMITS } from "@/lib/campaigns/validation";

export type CategoryOption = { id: number; name: string; slug: string };

// "Bought from": categories or subcategories the person has bought from.
// Top-level categories come with the page; a category's subcategories are
// loaded only when it's opened (one call, kept), never all at once.
export function CategoryChooser({
  categories,
  value,
  onChange,
  names,
  onNames,
  error,
}: {
  categories: CategoryOption[];
  value: number[];
  onChange: (ids: number[]) => void;
  names: Record<number, string>;
  onNames: (more: Record<number, string>) => void;
  error?: string;
}) {
  const { sessionExpired } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [subs, setSubs] = useState<Record<number, CategoryOption[] | "loading" | string>>({});
  const full = value.length >= LIMITS.categories;

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : full ? value : [...value, id]);
  }

  async function expand(id: number) {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (subs[id] && typeof subs[id] !== "string") return;
    setSubs((s) => ({ ...s, [id]: "loading" }));
    const res = await fetchSubcategories(id);
    if (!res.ok) {
      if (res.error.code === "UNAUTHENTICATED") sessionExpired();
      return setSubs((s) => ({ ...s, [id]: res.error.message }));
    }
    const list = res.data.map((c) => ({ id: c.categoryId, name: c.name, slug: c.slug }));
    setSubs((s) => ({ ...s, [id]: list }));
    onNames(Object.fromEntries(list.map((c) => [c.id, c.name])));
  }

  // Top-level names come with the page; a subcategory's only once its category is opened (no get-one endpoint).
  const label = (id: number) => names[id] ?? `Subcategory no. ${id}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((id) => (
          <span key={id} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-violet-50 py-0.5 pl-3 pr-1 text-sm font-semibold text-violet-900 ring-1 ring-violet-200 motion-safe:animate-pop-in">
            {label(id)}
            <button type="button" onClick={() => toggle(id)} className="flex size-7 items-center justify-center rounded-full hover:bg-white" aria-label={`Remove ${label(id)}`}>
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
          <Plus aria-hidden className="size-4" />
          {value.length ? "Change" : "Choose categories"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}

      <Dialog open={open} onClose={() => setOpen(false)} title="Bought from" description={`People who bought from any of these. Up to ${LIMITS.categories}; open a category for its subcategories.`}>
        <ul className="space-y-1 pb-3">
          {categories.map((c) => {
            const list = subs[c.id];
            return (
              <li key={c.id} className="rounded-2xl ring-1 ring-line">
                <div className="flex items-center gap-1 pr-1">
                  <Tick checked={value.includes(c.id)} disabled={full && !value.includes(c.id)} onChange={() => toggle(c.id)} label={c.name} strong />
                  <button type="button" onClick={() => expand(c.id)} aria-expanded={expanded === c.id} className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
                    <ChevronDown aria-hidden className={`size-5 transition ${expanded === c.id ? "rotate-180" : ""}`} />
                    <span className="sr-only">Subcategories of {c.name}</span>
                  </button>
                </div>
                {expanded === c.id && (
                  <div className="border-t border-line px-2 py-1.5">
                    {list === "loading" || list === undefined ? (
                      <p className="flex min-h-10 items-center gap-2 px-2 text-sm text-muted">
                        <LoaderCircle aria-hidden className="size-4 animate-spin" />
                        Loading subcategories
                      </p>
                    ) : typeof list === "string" ? (
                      <p className="px-2 py-2 text-sm text-red-700">{list}</p>
                    ) : list.length === 0 ? (
                      <p className="px-2 py-2 text-sm text-muted">No subcategories.</p>
                    ) : (
                      <ul className="grid gap-0.5 sm:grid-cols-2">
                        {list.map((s) => (
                          <li key={s.id}>
                            <Tick checked={value.includes(s.id)} disabled={full && !value.includes(s.id)} onChange={() => toggle(s.id)} label={s.name} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-3">
          <span className="text-sm text-muted">
            {value.length}/{LIMITS.categories} chosen
          </span>
          <button type="button" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            Done
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Tick({ checked, disabled, onChange, label, strong }: { checked: boolean; disabled: boolean; onChange: () => void; label: string; strong?: boolean }) {
  return (
    <label className={`flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surface"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className={`min-w-0 truncate text-sm text-ink ${strong ? "font-semibold" : ""}`}>{label}</span>
    </label>
  );
}
