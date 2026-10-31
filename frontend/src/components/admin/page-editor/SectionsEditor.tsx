"use client";

import { GalleryHorizontal, LayoutGrid, MessageCircleQuestion, Rows3, Shapes, ShieldCheck, TextQuote, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { revealOf, type PageSection, type SectionType } from "@/lib/category-page/types";
import { addableSections, newSection, PAGE_LIMITS, SECTION_INFO } from "@/lib/category-page/validation";
import { FaqFields, PromoBannerFields, TextBlockFields, TrustStripFields, type BannerPictures, type PageLink } from "./ContentSectionFields";
import { AddSectionGrid, RevealPicker, SectionCard, Segmented, Switch } from "./parts";

const ICON: Record<SectionType, LucideIcon> = {
  SUBCATEGORIES: Shapes,
  PRODUCT_RAIL: Rows3,
  PRODUCT_GRID: LayoutGrid,
  PROMO_BANNER: GalleryHorizontal,
  TEXT_BLOCK: TextQuote,
  TRUST_STRIP: ShieldCheck,
  FAQ: MessageCircleQuestion,
};

const REVEAL_LABEL = { NONE: "", FADE: " · fades in", RISE: " · rises in" };

/** Content sections have an optional heading of their own; the product ones fall back to a default title. */
const OPTIONAL_HEADING: Partial<Record<SectionType, true>> = { PROMO_BANNER: true, TEXT_BLOCK: true, TRUST_STRIP: true };

/** The grey line under a section's title in the list. */
function summary(s: PageSection, count: number | undefined): string {
  const info = SECTION_INFO[s.type];
  let text = info.label;
  if (s.type === "PRODUCT_RAIL") text += ` · ${s.source === "IN_SEASON" ? "In season" : "Featured"} · up to ${s.limit ?? PAGE_LIMITS.railDefault}`;
  if (s.type === "SUBCATEGORIES") text += ` · ${s.layout === "CHIPS" ? "Chips" : "Photo tiles"}`;
  if (s.type === "TRUST_STRIP") text += ` · ${s.points?.length ?? 0} points`;
  if (s.type === "FAQ") text += ` · ${s.items?.length ?? 0} ${s.items?.length === 1 ? "question" : "questions"}`;
  if (s.type === "PROMO_BANNER" && !s.imageId) text += " · needs a picture";
  text += REVEAL_LABEL[revealOf(s)];
  if (count === 0) text += " · no products yet, hidden";
  return text;
}

/** What a section shows when its title is empty (the same defaults as the shop page). */
export function defaultTitle(s: PageSection, categoryName: string): string {
  if (s.type === "SUBCATEGORIES") return "Shop by type";
  if (s.type === "PRODUCT_RAIL") return s.source === "IN_SEASON" ? "In season now" : "Featured picks";
  if (s.type === "PROMO_BANNER") return s.headline?.trim() || "Offer banner";
  if (s.type === "TEXT_BLOCK") return "Text block";
  if (s.type === "TRUST_STRIP") return "Trust strip";
  if (s.type === "FAQ") return "Questions";
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
  pictures,
  links,
}: {
  sections: PageSection[];
  onChange: (sections: PageSection[], structural?: boolean) => void;
  errors: Record<string, string>;
  isSubcategory: boolean;
  categoryName: string;
  /** How many products each saved rail has today (by section id), when known. */
  railCounts: Record<string, number>;
  pictures: BannerPictures;
  /** Pages an offer banner can link to (this category and its subcategories). */
  links: PageLink[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const addable = addableSections(sections, isSubcategory);
  // Every kind this page can have; the full ones are shown switched off.
  const offered = (Object.keys(SECTION_INFO) as SectionType[]).filter((t) => (isSubcategory ? SECTION_INFO[t].sub : SECTION_INFO[t].topLevel) && !(SECTION_INFO[t].required && isSubcategory && sections.some((x) => x.type === t)));

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
            <SectionCard
              key={s.id}
              icon={Icon}
              title={s.title || defaultTitle(s, categoryName)}
              summary={summary(s, count)}
              enabled={s.enabled !== false}
              onEnabled={(v) => update(i, { enabled: v })}
              expanded={expanded}
              onExpanded={(v) => setOpen(v ? s.id : null)}
              problem={problem}
              error={errors[`sections[${i}]`]}
              first={i === 0}
              last={i === sections.length - 1}
              onMove={(by) => move(i, by)}
              onRemove={
                required
                  ? undefined
                  : () => {
                      onChange(sections.filter((_, j) => j !== i), true);
                      setOpen(null);
                    }
              }
              keepNote="Every subcategory page has this one."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={OPTIONAL_HEADING[s.type] ? "Heading above it" : "Title"}
                  name={`title-${s.id}`}
                  optional
                  autoComplete="off"
                  maxLength={PAGE_LIMITS.title}
                  placeholder={OPTIONAL_HEADING[s.type] ? "No heading" : defaultTitle(s, categoryName)}
                  value={s.title ?? ""}
                  onChange={(v) => update(i, { title: v })}
                  error={errors[`sections[${i}].title`]}
                />
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
              {s.type === "PROMO_BANNER" && <PromoBannerFields section={s} at={`sections[${i}]`} errors={errors} update={(patch) => update(i, patch)} pictures={pictures} links={links} />}
              {s.type === "TEXT_BLOCK" && <TextBlockFields section={s} at={`sections[${i}]`} errors={errors} update={(patch) => update(i, patch)} />}
              {s.type === "TRUST_STRIP" && <TrustStripFields section={s} at={`sections[${i}]`} errors={errors} update={(patch) => update(i, patch)} />}
              {s.type === "FAQ" && <FaqFields section={s} at={`sections[${i}]`} errors={errors} update={(patch) => update(i, patch)} />}
              <RevealPicker value={revealOf(s)} onChange={(reveal) => update(i, { reveal })} />
            </SectionCard>
          );
        })}
      </ol>
      {sections.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No sections: the page shows only the banner. Add one below.</p>}

      <AddSectionGrid
        kinds={offered.map((t) => {
          const used = sections.filter((x) => x.type === t).length;
          const max = SECTION_INFO[t].max;
          return { type: t, label: SECTION_INFO[t].label, text: SECTION_INFO[t].text, icon: ICON[t], disabled: addable.includes(t) ? undefined : used >= max ? (max === 1 ? "Already on the page" : `All ${max} in use`) : "No room" };
        })}
        onAdd={(t) => add(t as SectionType)}
        full={sections.length >= PAGE_LIMITS.sections ? `A page can have ${PAGE_LIMITS.sections} sections. Remove one to add another.` : undefined}
      />
    </div>
  );
}
