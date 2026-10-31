// Home page designer rules, the same as the backend's HomePageDocument /
// HomePageRules checks (in the browser for instant feedback, again in the
// server action, finally by the backend). Errors are keyed by the backend's
// paths ("timeSlots[1].start", "sections[2].productIds"). Also the time-slot
// helpers the shop uses to pick the current row. Safe for client components.

import type { Category } from "@/lib/catalog/types";
import { heroDisplay, HERO_ANIMATIONS, HERO_LAYOUTS, HERO_SIZES } from "@/lib/category-page/types";
import {
  cleanBlock, cleanContentSection, cleanLine, CONTENT_TYPES, contentSectionErrors, editableSection, isContentSection, newContentSection, oneOf,
  readContentSection, readSectionBase, str, text, type PageErrors,
} from "@/lib/category-page/validation";
import { STANDARD_FLOATING_LABELS, type HomeHeroDoc, type HomePageDocument, type HomeSection, type HomeSectionType, type RailSource, type TimeSlot } from "./types";

export const HOME_LIMITS = {
  headline: 60,
  accentLine: 60,
  intro: 600,
  badge: 40,
  buttonLabel: 24,
  imageAlt: 125,
  floatingLabels: 4,
  floatingLabel: 24,
  slots: 6,
  slotLabel: 20,
  slotTitle: 60,
  slotSubtitle: 120,
  slotCategories: 10,
  slotProducts: 24,
  sections: 20,
  title: 60,
  subtitle: 120,
  rails: 8,
  slotRails: 2,
  railMin: 4,
  railMax: 12,
  railDefault: 8,
  picks: 24,
  gridMin: 2,
  gridMax: 24,
  gridDefault: 12,
  gridPicks: 24,
  trendingMin: 3,
  trendingMax: 12,
  trendingDefault: 8,
} as const;

/** "/", "/fruits", "/fruits/mangoes", "/#categories": our own site only (= the backend's SITE_LINK). */
export const SITE_LINK = /^(?!.*\/\/)\/([a-z0-9][a-z0-9/-]{0,199})?(#[a-z0-9-]{1,40})?$/;
export const TIME_OF_DAY = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const ID = /^[a-z0-9-]{1,20}$/;

export const HOME_SECTION_INFO: Record<HomeSectionType, { label: string; text: string; max: number }> = {
  CATEGORY_GRID: { label: "Categories", text: "Category cards or chips: all, featured or your pick", max: 2 },
  PRODUCT_RAIL: { label: "Product row", text: "Time of day, bestsellers, your picks, new, in season", max: HOME_LIMITS.rails },
  PROMO_BANNER: { label: "Offer banner", text: "A wide picture with a headline and a button", max: 3 },
  TEXT_BLOCK: { label: "Text block", text: "A heading with formatted text", max: 4 },
  TRUST_STRIP: { label: "Trust strip", text: "2 to 4 short promises with icons", max: 2 },
  FAQ: { label: "Questions", text: "Questions and answers that open on tap", max: 1 },
  TRENDING_SEARCHES: { label: "Trending searches", text: "What shoppers search for most, as chips", max: 1 },
};

export const RAIL_SOURCES: { value: RailSource; label: string; text: string; title: string }[] = [
  { value: "TIME_OF_DAY", label: "Time of day", text: "Your picks for each time slot; the current one shows", title: "" },
  { value: "POPULAR_NOW", label: "Popular right now", text: "What really sells at this time of day (your picks until there's enough data)", title: "Popular right now" },
  { value: "BESTSELLERS", label: "Bestsellers", text: "Most ordered over 7 or 30 days; hidden until there's enough data", title: "Bestsellers" },
  { value: "HANDPICKED", label: "Handpicked", text: "Products you choose, in your order", title: "Our picks" },
  { value: "NEW_ARRIVALS", label: "New arrivals", text: "The newest products in the catalogue", title: "New arrivals" },
  { value: "IN_SEASON", label: "In season", text: "Products in season today, across the catalogue", title: "In season now" },
  { value: "FEATURED", label: "Featured", text: "Products marked featured, across the catalogue", title: "Featured picks" },
];
export const railSourceInfo = (s: RailSource) => RAIL_SOURCES.find((r) => r.value === s) ?? RAIL_SOURCES[0];
const SOURCES = RAIL_SOURCES.map((r) => r.value);
const isSlotRail = (s: HomeSection) => s.type === "PRODUCT_RAIL" && (s.source === "TIME_OF_DAY" || s.source === "POPULAR_NOW");

// ---- time slots ----

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** The minute of the day in India ("18:42" = 1122). */
export function indiaMinutes(date: Date): number {
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return toMinutes(hhmm);
}

/** Start included, end not; an end before the start runs past midnight. */
export function slotCovers(slot: Pick<TimeSlot, "start" | "end">, minute: number): boolean {
  if (!TIME_OF_DAY.test(slot.start) || !TIME_OF_DAY.test(slot.end)) return false;
  const a = toMinutes(slot.start);
  const b = toMinutes(slot.end);
  return a < b ? minute >= a && minute < b : minute >= a || minute < b;
}

export const slotAt = <T extends Pick<TimeSlot, "start" | "end">>(slots: T[], minute: number): T | undefined => slots.find((s) => slotCovers(s, minute));

/** The slot's minutes as ranges within one day ([a, b) pairs). */
function ranges(slot: Pick<TimeSlot, "start" | "end">): [number, number][] {
  const a = toMinutes(slot.start);
  const b = toMinutes(slot.end);
  return a < b ? [[a, b]] : [[a, 1440], [0, b]];
}

function overlap(x: TimeSlot, y: TimeSlot): boolean {
  return ranges(x).some(([a, b]) => ranges(y).some(([c, d]) => a < d && c < b));
}

/** "05:00 – 11:00" as shoppers read it: "5 am – 11 am". */
export function timeLabel(t: string): string {
  if (!TIME_OF_DAY.test(t)) return t;
  const h = Number(t.slice(0, 2));
  const m = t.slice(3, 5);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m === "00" ? "" : `:${m}`} ${h < 12 ? "am" : "pm"}`;
}

/**
 * A starting set of slots, with the categories whose names fit picked from the
 * live list (none found = the slot starts empty and the admin picks).
 */
export function suggestedSlots(categories: Category[]): TimeSlot[] {
  const find = (...words: string[]) =>
    categories
      .filter((c) => words.some((w) => c.slug.includes(w) || c.name.toLowerCase().includes(w)))
      .slice(0, 4)
      .map((c) => c.categoryId);
  return [
    { id: "morning", label: "Morning", start: "05:00", end: "11:00", title: "Good morning: milk & fresh fruit", subtitle: null, categoryIds: find("dairy", "milk", "fruit", "bakery", "bread"), productIds: [] },
    { id: "afternoon", label: "Afternoon", start: "11:00", end: "16:00", title: "Beat the heat", subtitle: null, categoryIds: find("beverage", "drink", "juice", "ice"), productIds: [] },
    { id: "evening", label: "Evening", start: "16:00", end: "20:00", title: "Evening snacks", subtitle: null, categoryIds: find("snack", "sweet", "namkeen", "tea"), productIds: [] },
    { id: "night", label: "Night", start: "20:00", end: "05:00", title: "Late-night cravings", subtitle: null, categoryIds: find("snack", "dessert", "ice", "grocer"), productIds: [] },
  ];
}

// ---- checks ----

export function homeErrors(doc: HomePageDocument): PageErrors {
  const e: PageErrors = {};
  const h = doc.hero;
  text(e, "hero.headline", h.headline, HOME_LIMITS.headline, "Headline");
  text(e, "hero.accentLine", h.accentLine, HOME_LIMITS.accentLine, "Second line");
  text(e, "hero.intro", h.intro, HOME_LIMITS.intro, "Intro", true);
  text(e, "hero.badge", h.badge, HOME_LIMITS.badge, "Badge");
  text(e, "hero.buttonLabel", h.buttonLabel, HOME_LIMITS.buttonLabel, "Button text");
  text(e, "hero.imageAlt", h.imageAlt, HOME_LIMITS.imageAlt, "Picture description");
  const link = h.buttonLink?.trim();
  if (link && !SITE_LINK.test(link)) e["hero.buttonLink"] = "Use a link on 360mart, like /fruits or /#categories";
  else if (link && !h.buttonLabel?.trim()) e["hero.buttonLabel"] = "Add the button text";
  if (h.visual === "PHOTO" && !h.imageId) e["hero.imageId"] = "Add a picture, or choose the animated cart";
  const labels = h.floatingLabels ?? [];
  if (labels.length > HOME_LIMITS.floatingLabels) e["hero.floatingLabels"] = `Add at most ${HOME_LIMITS.floatingLabels} floating labels`;
  labels.forEach((l, i) => {
    if (!l.trim()) e[`hero.floatingLabels[${i}]`] = "Enter the label, or remove it";
    else text(e, `hero.floatingLabels[${i}]`, l, HOME_LIMITS.floatingLabel, "Label");
  });

  const slots = doc.timeSlots;
  if (slots.length > HOME_LIMITS.slots) e.timeSlots = `Add at most ${HOME_LIMITS.slots} time slots`;
  const slotIds = new Set<string>();
  slots.forEach((s, i) => {
    const at = `timeSlots[${i}]`;
    if (!ID.test(s.id) || slotIds.has(s.id)) e[`${at}.id`] = "This slot needs a new id: remove and add it again";
    slotIds.add(s.id);
    if (!s.label.trim()) e[`${at}.label`] = "Enter a name, like Morning";
    else text(e, `${at}.label`, s.label, HOME_LIMITS.slotLabel, "Name");
    if (!s.title.trim()) e[`${at}.title`] = "Enter the row title";
    else text(e, `${at}.title`, s.title, HOME_LIMITS.slotTitle, "Row title");
    text(e, `${at}.subtitle`, s.subtitle, HOME_LIMITS.slotSubtitle, "Subtitle");
    if (!TIME_OF_DAY.test(s.start)) e[`${at}.start`] = "Use a time like 06:00";
    if (!TIME_OF_DAY.test(s.end)) e[`${at}.end`] = "Use a time like 11:00";
    else if (s.start === s.end) e[`${at}.end`] = "The end must differ from the start";
    if (s.categoryIds.length > HOME_LIMITS.slotCategories) e[`${at}.categoryIds`] = `Pick at most ${HOME_LIMITS.slotCategories} categories`;
    if (s.productIds.length > HOME_LIMITS.slotProducts) e[`${at}.productIds`] = `Pick at most ${HOME_LIMITS.slotProducts} products`;
  });
  slots.forEach((s, j) => {
    if (e[`timeSlots[${j}].start`] || e[`timeSlots[${j}].end`]) return;
    const earlier = slots.slice(0, j).find((x, i) => !e[`timeSlots[${i}].start`] && !e[`timeSlots[${i}].end`] && overlap(x, s));
    if (earlier) e[`timeSlots[${j}].start`] = `Overlaps the ${earlier.label.trim() || "other"} slot`;
  });

  if (doc.sections.length > HOME_LIMITS.sections) e.sections = `The home page can have at most ${HOME_LIMITS.sections} sections`;
  const seen = new Set<string>();
  const counts: Partial<Record<HomeSectionType, number>> = {};
  let slotRails = 0;
  doc.sections.forEach((s, i) => {
    const at = `sections[${i}]`;
    const info = HOME_SECTION_INFO[s.type];
    if (!info) {
      e[at] = "This section is only for category pages";
      return;
    }
    counts[s.type] = (counts[s.type] ?? 0) + 1;
    if (!ID.test(s.id) || seen.has(s.id)) e[at] = "This section needs a new id: remove and add it again";
    seen.add(s.id);
    if ((counts[s.type] ?? 0) > info.max) e[at] = info.max === 1 ? `Only one ${info.label} section` : `At most ${info.max} ${info.label.toLowerCase()} sections`;
    text(e, `${at}.title`, s.title, HOME_LIMITS.title, "Title");
    text(e, `${at}.subtitle`, s.subtitle, HOME_LIMITS.subtitle, "Subtitle");
    if (isContentSection(s)) contentSectionErrors(e, at, s);
    if (s.type === "PRODUCT_RAIL") {
      if (isSlotRail(s) && ++slotRails > HOME_LIMITS.slotRails) e[at] = `At most ${HOME_LIMITS.slotRails} time-of-day rows are allowed`;
      if (isSlotRail(s) && slots.length === 0) e[`${at}.source`] = "Add the time slots of the day first";
      const limit = s.limit ?? HOME_LIMITS.railDefault;
      if (!Number.isInteger(limit) || limit < HOME_LIMITS.railMin || limit > HOME_LIMITS.railMax) e[`${at}.limit`] = `Show ${HOME_LIMITS.railMin} to ${HOME_LIMITS.railMax} products`;
      const picks = s.productIds ?? [];
      if (s.source === "HANDPICKED" && picks.length === 0) e[`${at}.productIds`] = "Pick at least one product";
      else if (picks.length > HOME_LIMITS.picks) e[`${at}.productIds`] = `Pick at most ${HOME_LIMITS.picks} products`;
    }
    if (s.type === "CATEGORY_GRID") {
      const limit = s.limit ?? HOME_LIMITS.gridDefault;
      if (!Number.isInteger(limit) || limit < HOME_LIMITS.gridMin || limit > HOME_LIMITS.gridMax) e[`${at}.limit`] = `Show ${HOME_LIMITS.gridMin} to ${HOME_LIMITS.gridMax} categories`;
      const picked = s.categoryIds ?? [];
      if (s.mode === "PICKED" && picked.length === 0) e[`${at}.categoryIds`] = "Pick at least one category";
      else if (picked.length > HOME_LIMITS.gridPicks) e[`${at}.categoryIds`] = `Pick at most ${HOME_LIMITS.gridPicks} categories`;
    }
    if (s.type === "TRENDING_SEARCHES") {
      const limit = s.limit ?? HOME_LIMITS.trendingDefault;
      if (!Number.isInteger(limit) || limit < HOME_LIMITS.trendingMin || limit > HOME_LIMITS.trendingMax) e[`${at}.limit`] = `Show ${HOME_LIMITS.trendingMin} to ${HOME_LIMITS.trendingMax} searches`;
    }
  });
  return e;
}

// ---- what is sent ----

/** The document as the backend wants it: trimmed text, empty text as null, each section with only its own fields. */
export function cleanHomeDocument(doc: HomePageDocument): HomePageDocument {
  const h = doc.hero;
  const display = heroDisplay(h);
  const hero: HomeHeroDoc = {
    headline: cleanLine(h.headline),
    accentLine: cleanLine(h.accentLine),
    intro: cleanBlock(h.intro),
    badge: cleanLine(h.badge),
    buttonLabel: cleanLine(h.buttonLabel),
    buttonLink: (h.buttonLink ?? "").trim() || null,
    visual: h.visual === "PHOTO" ? "PHOTO" : "CART_ANIMATION",
    imageId: h.imageId || null,
    mobileImageId: h.mobileImageId || null,
    imageAlt: cleanLine(h.imageAlt),
    floatingLabels: h.floatingLabels == null ? null : h.floatingLabels.map((l) => cleanLine(l) ?? ""),
    enabled: display.enabled,
    layout: display.layout,
    size: display.size,
    showBadge: display.showBadge,
    animation: display.animation,
  };
  const timeSlots = doc.timeSlots.map((s) => ({
    id: s.id,
    label: cleanLine(s.label) ?? "",
    start: s.start,
    end: s.end,
    title: cleanLine(s.title) ?? "",
    subtitle: cleanLine(s.subtitle),
    categoryIds: [...new Set(s.categoryIds)],
    productIds: [...new Set(s.productIds)],
  }));
  const sections = doc.sections.map((s): HomeSection => {
    const base = { id: s.id, enabled: s.enabled !== false, title: cleanLine(s.title), subtitle: cleanLine(s.subtitle), reveal: s.reveal ?? "NONE" };
    if (isContentSection(s)) return cleanContentSection(s, base);
    switch (s.type) {
      case "CATEGORY_GRID":
        return { ...base, type: s.type, mode: s.mode, categoryIds: s.mode === "PICKED" ? [...new Set(s.categoryIds ?? [])] : null, limit: s.limit ?? HOME_LIMITS.gridDefault, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" };
      case "PRODUCT_RAIL":
        return {
          ...base,
          type: s.type,
          source: s.source,
          limit: s.limit ?? HOME_LIMITS.railDefault,
          // Only a handpicked row carries products, only bestsellers a window.
          productIds: s.source === "HANDPICKED" ? [...new Set(s.productIds ?? [])] : null,
          windowDays: s.source === "BESTSELLERS" ? (s.windowDays === 30 ? 30 : 7) : null,
        };
      default:
        return { ...base, type: s.type, limit: s.limit ?? HOME_LIMITS.trendingDefault };
    }
  });
  return { schemaVersion: 1, hero, timeSlots, sections };
}

/** The designer's working copy: every field present, so the form is always controlled. */
export function toEditableHome(doc: HomePageDocument): HomePageDocument {
  const h = doc.hero ?? {};
  return {
    schemaVersion: 1,
    hero: {
      headline: h.headline ?? "",
      accentLine: h.accentLine ?? "",
      intro: h.intro ?? "",
      badge: h.badge ?? "",
      buttonLabel: h.buttonLabel ?? "",
      buttonLink: h.buttonLink ?? "",
      visual: h.visual === "PHOTO" ? "PHOTO" : "CART_ANIMATION",
      imageId: h.imageId ?? null,
      mobileImageId: h.mobileImageId ?? null,
      imageAlt: h.imageAlt ?? "",
      floatingLabels: h.floatingLabels ?? null,
      ...heroDisplay(h),
    },
    timeSlots: (doc.timeSlots ?? []).map((s) => ({ ...s, subtitle: s.subtitle ?? "", categoryIds: s.categoryIds ?? [], productIds: s.productIds ?? [] })),
    // Types this designer doesn't know yet (a newer backend) are left out rather than broken.
    sections: (doc.sections ?? [])
      .filter((s) => s.type in HOME_SECTION_INFO)
      .map((s) => editableSection({ ...s, enabled: s.enabled !== false, title: s.title ?? "", subtitle: s.subtitle ?? "", reveal: s.reveal ?? "NONE" } as HomeSection)),
  };
}

export const sameHome = (a: HomePageDocument, b: HomePageDocument) => JSON.stringify(cleanHomeDocument(a)) === JSON.stringify(cleanHomeDocument(b));

/** The floating labels shown for a hero (null = the standard ones). */
export const floatingLabelsOf = (h: Pick<HomeHeroDoc, "floatingLabels">) => (h.floatingLabels == null ? STANDARD_FLOATING_LABELS : h.floatingLabels.filter((l) => l.trim()));

// ---- new sections ----

const PREFIX: Record<HomeSectionType, string> = { CATEGORY_GRID: "cats", PRODUCT_RAIL: "row", PROMO_BANNER: "promo", TEXT_BLOCK: "text", TRUST_STRIP: "promises", FAQ: "faq", TRENDING_SEARCHES: "trending" };

export function newHomeId(prefix: string, taken: string[]): string {
  for (;;) {
    const id = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.includes(id)) return id;
  }
}

export function newHomeSection(type: HomeSectionType, taken: string[], source: RailSource = "HANDPICKED"): HomeSection {
  const id = newHomeId(PREFIX[type], taken);
  if ((CONTENT_TYPES as readonly string[]).includes(type)) return newContentSection(type as (typeof CONTENT_TYPES)[number], id);
  const base = { id, enabled: true, subtitle: "", reveal: "RISE" as const };
  if (type === "CATEGORY_GRID") return { ...base, type, title: "Shop by category", mode: "ALL", categoryIds: [], limit: HOME_LIMITS.gridDefault, layout: "TILES" };
  if (type === "TRENDING_SEARCHES") return { ...base, type, title: "Trending searches", limit: HOME_LIMITS.trendingDefault };
  return { ...base, type: "PRODUCT_RAIL", title: railSourceInfo(source).title, source, limit: HOME_LIMITS.railDefault, productIds: [], windowDays: 7 };
}

/** Which section types can still be added. */
export function addableHomeSections(sections: HomeSection[]): HomeSectionType[] {
  if (sections.length >= HOME_LIMITS.sections) return [];
  return (Object.keys(HOME_SECTION_INFO) as HomeSectionType[]).filter((t) => sections.filter((s) => s.type === t).length < HOME_SECTION_INFO[t].max);
}

export const canAddSlotRail = (sections: HomeSection[]) => sections.filter(isSlotRail).length < HOME_LIMITS.slotRails;

// ---- reading untrusted input (server action arguments) ----

const ids = (v: unknown): number[] | null => (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n > 0 && n < 1e15) ? (v as number[]) : null);

/** A document from the browser, rebuilt from known fields only; null when it isn't shaped like one. */
export function readHomeDocument(input: unknown): HomePageDocument | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const hero = raw.hero as Record<string, unknown> | undefined;
  if (!hero || typeof hero !== "object" || !Array.isArray(raw.sections) || !Array.isArray(raw.timeSlots)) return null;

  const h: HomeHeroDoc = {};
  for (const f of ["headline", "accentLine", "intro", "badge", "buttonLabel", "buttonLink", "imageId", "mobileImageId", "imageAlt"] as const) {
    const v = str(hero[f]);
    if (v === undefined) return null;
    h[f] = v;
  }
  if (hero.visual !== "PHOTO" && hero.visual !== "CART_ANIMATION") return null;
  h.visual = hero.visual;
  const labels = hero.floatingLabels;
  if (labels != null && (!Array.isArray(labels) || labels.some((l) => typeof l !== "string"))) return null;
  h.floatingLabels = labels == null ? null : (labels as string[]);
  for (const f of ["enabled", "showBadge"] as const) if (hero[f] !== undefined && typeof hero[f] !== "boolean") return null;
  if (hero.layout !== undefined && !oneOf(HERO_LAYOUTS, hero.layout)) return null;
  if (hero.size !== undefined && !oneOf(HERO_SIZES, hero.size)) return null;
  if (hero.animation !== undefined && !oneOf(HERO_ANIMATIONS, hero.animation)) return null;
  Object.assign(h, heroDisplay(hero));

  const timeSlots: TimeSlot[] = [];
  for (const item of raw.timeSlots) {
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    const [id, label, start, end, title, subtitle] = [str(s.id), str(s.label), str(s.start), str(s.end), str(s.title), str(s.subtitle)];
    const categoryIds = ids(s.categoryIds ?? []);
    const productIds = ids(s.productIds ?? []);
    if (!id || label == null || start == null || end == null || title == null || subtitle === undefined || !categoryIds || !productIds) return null;
    timeSlots.push({ id, label, start, end, title, subtitle, categoryIds, productIds });
  }

  const sections: HomeSection[] = [];
  for (const item of raw.sections) {
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    const base = readSectionBase(s);
    if (!base) return null;
    let section: HomeSection | null = null;
    if ((CONTENT_TYPES as readonly unknown[]).includes(s.type)) section = readContentSection(s, base);
    else if (s.type === "CATEGORY_GRID") {
      const categoryIds = ids(s.categoryIds ?? []);
      if ((s.mode === "ALL" || s.mode === "FEATURED" || s.mode === "PICKED") && categoryIds && typeof s.limit === "number")
        section = { ...base, type: s.type, mode: s.mode, categoryIds, limit: s.limit, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" };
    } else if (s.type === "PRODUCT_RAIL") {
      const productIds = ids(s.productIds ?? []);
      if (oneOf(SOURCES, s.source) && productIds && typeof s.limit === "number")
        section = { ...base, type: s.type, source: s.source, limit: s.limit, productIds, windowDays: s.windowDays === 30 ? 30 : 7 };
    } else if (s.type === "TRENDING_SEARCHES" && typeof s.limit === "number") section = { ...base, type: s.type, limit: s.limit };
    if (!section) return null;
    sections.push(section);
  }
  return { schemaVersion: 1, hero: h, timeSlots, sections };
}

