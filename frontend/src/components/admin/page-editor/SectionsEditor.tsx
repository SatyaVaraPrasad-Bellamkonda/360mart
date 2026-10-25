"use client";

import { ArrowDown, ArrowUp, ChevronDown, LayoutGrid, Plus, Rows3, Shapes, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/auth/AuthFields";
import type { PageSection, SectionType } from "@/lib/category-page/types";
import { addableSections, newSection, PAGE_LIMITS, SECTION_INFO } from "@/lib/category-page/validation";
import { Segmented, Switch } from "./parts";

const ICON: Record<SectionType, LucideIcon> = { SUBCATEGORIES: Shapes, PRODUCT_RAIL: Rows3, PRODUCT_GRID: LayoutGrid };

/** What a section shows when its title is empty (the same defaults as the shop page). */
export function defaultTitle(s: PageSection, categoryName: string): string {
  if (s.type === "SUBCATEGORIES") return "Shop by type";
  if (s.type === "PRODUCT_RAIL") return s.source === "IN_SEASON" ? "In season now" : "Featured picks";
  return `All ${categoryName}`;
}

// The page's sections in order: switch each on or off, move it, open it to
// edit, add new ones (only the kinds still allowed here) or remove them.
export function SectionsEditor({
  sections,
  onChange,
  errors,
  isSubcategory,
  categoryName,
  railCounts,
}: {
  sections: PageSection[];
  onChange: (sections: PageSection[], structural?: boolean) => void;
  errors: Record<string, string>;
  isSubcategory: boolean;
  categoryName: string;
  /** How many products each saved rail has today (by section id), when known. */
  railCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const addable = addableSections(sections, isSubcategory);

  const update = (i: number, patch: Partial<PageSection>) => onChange(sections.map((s, j) => (j === i ? ({ ...s, ...patch } as PageSection) : s)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...sections];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next, true);
  };
  function add(type: SectionType) {
    const s = newSection(type, sections.map((x) => x.id));
    onChange([...sections, s], true);
    setOpen(s.id);
  }

  return (
    <div className="space-y-3">
      {errors.sections && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">{errors.sections}</p>}
      <ol className="space-y-2">
        {sections.map((s, i) => {
          const info = SECTION_INFO[s.type];
          const Icon = ICON[s.type];
          const expanded = open === s.id;
          const problem = errors[`sections[${i}]`] ?? Object.entries(errors).find(([k]) => k.startsWith(`sections[${i}].`))?.[1];
          const required = info.required === "sub" && isSubcategory;
          const count = s.type === "PRODUCT_RAIL" ? railCounts[s.id] : undefined;
          return (
            <li key={s.id} className={`rounded-2xl bg-white ring-1 transition ${problem ? "ring-red-300" : expanded ? "ring-ink/40" : "ring-line"} ${s.enabled === false ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-2 p-2 sm:p-3">
                <button type="button" onClick={() => setOpen(expanded ? null : s.id)} aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-line">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{s.title || defaultTitle(s, categoryName)}</span>
                    <span className="block truncate text-xs text-muted">
                      {info.label}
                      {s.type === "PRODUCT_RAIL" && ` · ${s.source === "IN_SEASON" ? "In season" : "Featured"} · up to ${s.limit ?? PAGE_LIMITS.railDefault}`}
                      {s.type === "SUBCATEGORIES" && ` · ${s.layout === "CHIPS" ? "Chips" : "Photo tiles"}`}
                      {count === 0 && " · no products yet, hidden"}
                      {s.enabled === false && " · off"}
                    </span>
                  </span>
                  <ChevronDown aria-hidden className={`ml-auto size-4 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`} />
                </button>
                <Switch checked={s.enabled !== false} onChange={(v) => update(i, { enabled: v })} srLabel={`Show ${s.title || defaultTitle(s, categoryName)}`} />
              </div>
              {problem && !expanded && <p className="px-4 pb-3 text-sm text-red-700">{problem}</p>}

              {expanded && (
                <div className="space-y-4 border-t border-line p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Title" name={`title-${s.id}`} optional autoComplete="off" maxLength={PAGE_LIMITS.title} placeholder={defaultTitle(s, categoryName)} value={s.title ?? ""} onChange={(v) => update(i, { title: v })} error={errors[`sections[${i}].title`]} />
                    <TextField label="Subtitle" name={`subtitle-${s.id}`} optional autoComplete="off" maxLength={PAGE_LIMITS.subtitle} value={s.subtitle ?? ""} onChange={(v) => update(i, { subtitle: v })} error={errors[`sections[${i}].subtitle`]} />
                  </div>
                  {s.type === "SUBCATEGORIES" && (
                    <Segmented label="Layout" value={s.layout ?? "TILES"} options={[{ value: "TILES", label: "Photo tiles" }, { value: "CHIPS", label: "Chips" }]} onChange={(v) => update(i, { layout: v })} />
                  )}
                  {s.type === "PRODUCT_RAIL" && (
                    <div className="flex flex-wrap items-end gap-4">
                      <Segmented label="Products" value={s.source} options={[{ value: "IN_SEASON", label: "In season" }, { value: "FEATURED", label: "Featured" }]} onChange={(v) => update(i, { source: v })} />
                      <label className="text-sm font-semibold text-ink">
                        How many
                        <select
                          value={s.limit ?? PAGE_LIMITS.railDefault}
                          onChange={(e) => update(i, { limit: Number(e.target.value) })}
                          className="mt-1.5 block min-h-11 rounded-xl border border-line bg-white px-3 text-base font-normal text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40"
                        >
                          {Array.from({ length: PAGE_LIMITS.railMax - PAGE_LIMITS.railMin + 1 }, (_, k) => k + PAGE_LIMITS.railMin).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      {errors[`sections[${i}].limit`] && <p className="w-full text-sm text-red-700">{errors[`sections[${i}].limit`]}</p>}
                    </div>
                  )}
                  {s.type === "PRODUCT_GRID" && <Switch checked={s.showFilters !== false} onChange={(v) => update(i, { showFilters: v })} label="Show quick filters (In season, Veg only, Featured)" />}
                  {errors[`sections[${i}]`] && <p className="text-sm text-red-700">{errors[`sections[${i}]`]}</p>}

                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-40">
                      <ArrowUp aria-hidden className="size-4" />
                      Move up
                    </button>
                    <button type="button" disabled={i === sections.length - 1} onClick={() => move(i, 1)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-40">
                      <ArrowDown aria-hidden className="size-4" />
                      Move down
                    </button>
                    {!required && (
                      <button
                        type="button"
                        onClick={() => {
                          onChange(sections.filter((_, j) => j !== i), true);
                          setOpen(null);
                        }}
                        className="ml-auto flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-red-700"
                      >
                        <Trash2 aria-hidden className="size-4" />
                        Remove
                      </button>
                    )}
                    {required && <p className="ml-auto text-xs text-muted">Every subcategory page has this one.</p>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {sections.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No sections: the page shows only the banner. Add one below.</p>}

      {addable.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {addable.map((t) => {
            const Icon = ICON[t];
            return (
              <button key={t} type="button" onClick={() => add(t)} title={SECTION_INFO[t].text} className="flex min-h-11 items-center gap-2 rounded-full border border-dashed border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink">
                <Plus aria-hidden className="size-4" />
                <Icon aria-hidden className="size-4" />
                {SECTION_INFO[t].label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
