"use client";

import { Clock, GalleryHorizontal, LayoutGrid, MessageCircleQuestion, Rows3, Search, ShieldCheck, TextQuote, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { FaqFields, PromoBannerFields, TextBlockFields, TrustStripFields, type BannerPictures, type PageLink } from "@/components/admin/page-editor/ContentSectionFields";
import { AddSectionGrid, ChoiceCards, RevealPicker, SectionCard, Segmented } from "@/components/admin/page-editor/parts";
import type { Category } from "@/lib/catalog/types";
import { revealOf } from "@/lib/category-page/types";
import { isSlotSource, type CategoryGridSection, type HomeRailSection, type HomeSection, type HomeSectionType, type RailSource } from "@/lib/home-page/types";
import { addableHomeSections, canAddSlotRail, HOME_LIMITS, HOME_SECTION_INFO, newHomeSection, RAIL_SOURCES, railSourceInfo } from "@/lib/home-page/validation";
import { CategoryPicker, ProductPicker } from "./pickers";

const ICON: Record<HomeSectionType, LucideIcon> = {
  CATEGORY_GRID: LayoutGrid,
  PRODUCT_RAIL: Rows3,
  PROMO_BANNER: GalleryHorizontal,
  TEXT_BLOCK: TextQuote,
  TRUST_STRIP: ShieldCheck,
  FAQ: MessageCircleQuestion,
  TRENDING_SEARCHES: Search,
};
const REVEAL_LABEL = { NONE: "", FADE: " · fades in", RISE: " · rises in" };
const MODE_LABEL = { ALL: "All categories", FEATURED: "Featured categories", PICKED: "Your pick" };

/** What a section shows when its title is empty. */
export function homeTitle(s: HomeSection): string {
  switch (s.type) {
    case "CATEGORY_GRID":
      return s.title?.trim() || "Shop by category";
    case "PRODUCT_RAIL":
      return isSlotSource(s.source) ? `${railSourceInfo(s.source).label} row` : s.title?.trim() || railSourceInfo(s.source).title;
    case "TRENDING_SEARCHES":
      return s.title?.trim() || "Trending searches";
    case "PROMO_BANNER":
      return s.headline?.trim() || "Offer banner";
    default:
      return s.title?.trim() || HOME_SECTION_INFO[s.type].label;
  }
}

function summary(s: HomeSection, live: string | undefined): string {
  let text = HOME_SECTION_INFO[s.type].label;
  if (s.type === "CATEGORY_GRID") text += ` · ${MODE_LABEL[s.mode]} · ${s.layout === "CHIPS" ? "chips" : "cards"}`;
  if (s.type === "PRODUCT_RAIL") text += ` · ${railSourceInfo(s.source).label}${s.source === "BESTSELLERS" ? ` · last ${s.windowDays ?? 7} days` : ""} · up to ${s.limit ?? HOME_LIMITS.railDefault}`;
  if (s.type === "TRUST_STRIP") text += ` · ${s.points?.length ?? 0} points`;
  if (s.type === "FAQ") text += ` · ${s.items?.length ?? 0} ${s.items?.length === 1 ? "question" : "questions"}`;
  if (s.type === "PROMO_BANNER" && !s.imageId) text += " · needs a picture";
  text += REVEAL_LABEL[revealOf(s)];
  if (live) text += ` · ${live}`;
  return text;
}

// The home page's sections in order: switch each on or off, move it, open it
// to edit, add new ones (only the kinds still allowed) or remove them.
export function HomeSectionsEditor({
  sections,
  onChange,
  errors,
  hasSlots,
  categories,
  pictures,
  links,
  live,
}: {
  sections: HomeSection[];
  onChange: (sections: HomeSection[], structural?: boolean) => void;
  errors: Record<string, string>;
  hasSlots: boolean;
  categories: Category[];
  pictures: BannerPictures;
  links: PageLink[];
  /** What each saved section shows on the page now ("8 products now"), by id. */
  live: Record<string, string>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const addable = addableHomeSections(sections);
  const update = (i: number, patch: Partial<HomeSection>) => onChange(sections.map((s, j) => (j === i ? ({ ...s, ...patch } as HomeSection) : s)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...sections];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next, true);
  };
  function add(type: HomeSectionType) {
    // A new product row starts with the time-of-day picks when the day has slots and no such row yet.
    const source: RailSource = hasSlots && !sections.some((s) => s.type === "PRODUCT_RAIL" && isSlotSource(s.source)) ? "TIME_OF_DAY" : "NEW_ARRIVALS";
    const s = newHomeSection(type, sections.map((x) => x.id), source);
    onChange([...sections, s], true);
    setOpen(s.id);
  }

  return (
    <div className="space-y-3">
      {errors.sections && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">{errors.sections}</p>}
      <ol className="space-y-2">
        {sections.map((s, i) => {
          const at = `sections[${i}]`;
          const problem = errors[at] ?? Object.entries(errors).find(([k]) => k.startsWith(`${at}.`))?.[1];
          const slotRow = s.type === "PRODUCT_RAIL" && isSlotSource(s.source);
          return (
            <SectionCard
              key={s.id}
              icon={slotRow ? Clock : ICON[s.type]}
              title={homeTitle(s)}
              summary={summary(s, live[s.id])}
              enabled={s.enabled !== false}
              onEnabled={(v) => update(i, { enabled: v })}
              expanded={open === s.id}
              onExpanded={(v) => setOpen(v ? s.id : null)}
              problem={problem}
              error={errors[at]}
              first={i === 0}
              last={i === sections.length - 1}
              onMove={(by) => move(i, by)}
              onRemove={() => {
                onChange(sections.filter((_, j) => j !== i), true);
                setOpen(null);
              }}
            >
              {slotRow ? (
                <p className="rounded-xl bg-surface px-3 py-2 text-sm text-muted ring-1 ring-line">The row shows the title and subtitle of the time slot that&apos;s on now. Set them under Times of day.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={s.type === "PROMO_BANNER" || s.type === "TEXT_BLOCK" || s.type === "TRUST_STRIP" ? "Heading above it" : "Title"}
                    name={`title-${s.id}`}
                    optional
                    autoComplete="off"
                    maxLength={HOME_LIMITS.title}
                    placeholder={s.type === "PROMO_BANNER" || s.type === "TEXT_BLOCK" || s.type === "TRUST_STRIP" ? "No heading" : homeTitle({ ...s, title: "" } as HomeSection)}
                    value={s.title ?? ""}
                    onChange={(v) => update(i, { title: v })}
                    error={errors[`${at}.title`]}
                  />
                  <TextField label="Subtitle" name={`subtitle-${s.id}`} optional autoComplete="off" maxLength={HOME_LIMITS.subtitle} value={s.subtitle ?? ""} onChange={(v) => update(i, { subtitle: v })} error={errors[`${at}.subtitle`]} />
                </div>
              )}
              {s.type === "CATEGORY_GRID" && <CategoryGridFields section={s} at={at} errors={errors} update={(p) => update(i, p)} categories={categories} />}
              {s.type === "PRODUCT_RAIL" && <RailFields section={s} at={at} errors={errors} update={(p) => update(i, p)} hasSlots={hasSlots} slotRailAllowed={isSlotSource(s.source) || canAddSlotRail(sections)} />}
              {s.type === "TRENDING_SEARCHES" && (
                <div className="space-y-2">
                  <NumberSelect label="How many searches" value={s.limit ?? HOME_LIMITS.trendingDefault} min={HOME_LIMITS.trendingMin} max={HOME_LIMITS.trendingMax} onChange={(limit) => update(i, { limit })} error={errors[`${at}.limit`]} />
                  <p className="text-sm text-muted">
                    The most searched words of the last days, refreshed hourly. Keep a word out on the{" "}
                    <Link href="/admin/search" className="font-semibold text-brand-deep underline-offset-2 hover:underline">
                      search report
                    </Link>
                    . Hidden until shoppers have searched enough.
                  </p>
                </div>
              )}
              {s.type === "PROMO_BANNER" && <PromoBannerFields section={s} at={at} errors={errors} update={(p) => update(i, p)} pictures={pictures} links={links} />}
              {s.type === "TEXT_BLOCK" && <TextBlockFields section={s} at={at} errors={errors} update={(p) => update(i, p)} />}
              {s.type === "TRUST_STRIP" && <TrustStripFields section={s} at={at} errors={errors} update={(p) => update(i, p)} />}
              {s.type === "FAQ" && <FaqFields section={s} at={at} errors={errors} update={(p) => update(i, p)} />}
              <RevealPicker value={revealOf(s)} onChange={(reveal) => update(i, { reveal })} />
            </SectionCard>
          );
        })}
      </ol>
      {sections.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No sections: the home page shows only the banner. Add one below.</p>}

      <AddSectionGrid
        kinds={(Object.keys(HOME_SECTION_INFO) as HomeSectionType[]).map((t) => {
          const max = HOME_SECTION_INFO[t].max;
          const used = sections.filter((x) => x.type === t).length;
          return { type: t, label: HOME_SECTION_INFO[t].label, text: HOME_SECTION_INFO[t].text, icon: ICON[t], disabled: addable.includes(t) ? undefined : used >= max ? (max === 1 ? "Already on the page" : `All ${max} in use`) : "No room" };
        })}
        onAdd={(t) => add(t as HomeSectionType)}
        full={sections.length >= HOME_LIMITS.sections ? `The home page can have ${HOME_LIMITS.sections} sections. Remove one to add another.` : undefined}
      />
    </div>
  );
}

function CategoryGridFields({ section: s, at, errors, update, categories }: { section: CategoryGridSection; at: string; errors: Record<string, string>; update: (p: Partial<CategoryGridSection>) => void; categories: Category[] }) {
  return (
    <div className="space-y-4">
      <Segmented
        label="Which categories"
        value={s.mode}
        options={[
          { value: "ALL", label: "All" },
          { value: "FEATURED", label: "Featured" },
          { value: "PICKED", label: "My pick" },
        ]}
        onChange={(mode) => update({ mode })}
      />
      {s.mode === "FEATURED" && <p className="-mt-2 text-sm text-muted">Top-level categories marked Featured in Categories.</p>}
      {s.mode === "PICKED" && (
        <CategoryPicker label="Categories, in this order" hint="Subcategories work too." ids={s.categoryIds ?? []} onChange={(categoryIds) => update({ categoryIds })} max={HOME_LIMITS.gridPicks} error={errors[`${at}.categoryIds`]} categories={categories} />
      )}
      <div className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Look"
          value={s.layout ?? "TILES"}
          options={[
            { value: "TILES", label: "Photo cards" },
            { value: "CHIPS", label: "Chips" },
          ]}
          onChange={(layout) => update({ layout })}
        />
        <NumberSelect label="Show up to" value={s.limit ?? HOME_LIMITS.gridDefault} min={HOME_LIMITS.gridMin} max={HOME_LIMITS.gridMax} onChange={(limit) => update({ limit })} error={errors[`${at}.limit`]} />
      </div>
    </div>
  );
}

function RailFields({ section: s, at, errors, update, hasSlots, slotRailAllowed }: { section: HomeRailSection; at: string; errors: Record<string, string>; update: (p: Partial<HomeRailSection>) => void; hasSlots: boolean; slotRailAllowed: boolean }) {
  return (
    <div className="space-y-4">
      <ChoiceCards
        label="Products"
        columns="grid-cols-1 sm:grid-cols-2"
        value={s.source}
        options={RAIL_SOURCES.map((r) => ({ value: r.value, label: r.label, text: r.text, disabled: isSlotSource(r.value) && !slotRailAllowed }))}
        onChange={(source) => update({ source, title: s.title?.trim() && !RAIL_SOURCES.some((r) => r.title === s.title) ? s.title : railSourceInfo(source).title })}
      />
      {errors[`${at}.source`] && <p className="text-sm text-red-700">{errors[`${at}.source`]}</p>}
      {isSlotSource(s.source) && !hasSlots && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">Add the times of the day above first: this row shows the products of the slot that&apos;s on now.</p>}
      {s.source === "BESTSELLERS" && (
        <Segmented
          label="Sales over"
          value={String(s.windowDays ?? 7) as "7" | "30"}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
          ]}
          onChange={(v) => update({ windowDays: v === "30" ? 30 : 7 })}
        />
      )}
      {s.source === "HANDPICKED" && <ProductPicker label="Products, in this order" ids={s.productIds ?? []} onChange={(productIds) => update({ productIds })} max={HOME_LIMITS.picks} error={errors[`${at}.productIds`]} />}
      <NumberSelect label="Show up to" value={s.limit ?? HOME_LIMITS.railDefault} min={HOME_LIMITS.railMin} max={HOME_LIMITS.railMax} onChange={(limit) => update({ limit })} error={errors[`${at}.limit`]} />
    </div>
  );
}

function NumberSelect({ label, value, min, max, onChange, error }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; error?: string }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 block min-h-11 rounded-xl border border-line bg-white px-3 text-base font-normal text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40"
      >
        {Array.from({ length: max - min + 1 }, (_, k) => k + min).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-sm font-normal text-red-700">{error}</span>}
    </label>
  );
}
