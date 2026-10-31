// Page editor rules, the same as the backend's CategoryPageDocument checks
// (checked in the browser for instant feedback, again in the server action, and
// finally by the backend). Errors are keyed by the backend's field paths
// ("hero.headline", "sections[2].limit") so both land on the same field.
// Safe for client components.

import { SAFE_LINE, SAFE_MULTILINE } from "@/lib/catalog/validation";
import { BACKEND_ACCEPTS_CUSTOM_COLOUR, contrastWithWhite, HEX_COLOUR, MIN_CONTRAST, PAGE_THEMES, themeColour } from "@/lib/catalog/food-theme";
import type { PageTheme } from "@/lib/catalog/types";
import {
  HERO_ANIMATIONS, HERO_LAYOUTS, HERO_SIZES, heroDisplay, PAGE_STATS, REVEAL_ANIMATIONS, revealOf, TRUST_ICONS,
  type FaqItem, type FaqPageSection, type HeroDisplay, type PromoBannerSection, type TextBlockSection, type TrustStripSection, type HeroDoc, type PageDocument, type PageSection, type PageStat, type RevealAnimation, type SectionType, type TrustIcon, type TrustPoint,
} from "./types";

export const PAGE_LIMITS = {
  headline: 60,
  accentLine: 60,
  intro: 600,
  imageAlt: 125,
  badge: 30,
  trustPoints: 3,
  trustText: 60,
  stats: 4,
  sections: 12,
  title: 60,
  subtitle: 120,
  railMin: 4,
  railMax: 12,
  railDefault: 8,
  rails: 4,
  bannerHeadline: 60,
  bannerText: 160,
  buttonLabel: 24,
  body: 2000,
  stripMin: 2,
  stripMax: 4,
  faqMin: 1,
  faqMax: 10,
  question: 150,
  answer: 800,
} as const;

/** A link on our own site: one leading slash, lowercase letters, digits, - and /, never "//" (= the backend's SITE_PATH). */
export const SITE_PATH = /^(?!.*\/\/)\/[a-z0-9][a-z0-9/-]{0,199}$/;

export const SECTION_INFO: Record<SectionType, { label: string; text: string; topLevel: boolean; sub: boolean; max: number; required?: "sub" }> = {
  SUBCATEGORIES: { label: "Shop by type", text: "The subcategories as photo tiles or chips", topLevel: true, sub: false, max: 1 },
  PRODUCT_RAIL: { label: "Product row", text: "A swipeable row: in season or featured products", topLevel: true, sub: true, max: PAGE_LIMITS.rails },
  PRODUCT_GRID: { label: "All products", text: "The subcategory's products with filters", topLevel: false, sub: true, max: 1, required: "sub" },
  PROMO_BANNER: { label: "Offer banner", text: "A wide picture with a headline and a button", topLevel: true, sub: true, max: 3 },
  TEXT_BLOCK: { label: "Text block", text: "A heading with formatted text: guides, tips", topLevel: true, sub: true, max: 4 },
  TRUST_STRIP: { label: "Trust strip", text: "2 to 4 short promises with icons", topLevel: true, sub: true, max: 2 },
  FAQ: { label: "Questions", text: "Questions and answers that open on tap", topLevel: true, sub: true, max: 1 },
};

export type PageErrors = Record<string, string>;

const OLD_NAMES = { VEG: 1, NON_VEG: 1, EGG: 1, GENERAL: 1 };
// Only the values the editor offers (the backend refuses others).
const THEMES: PageTheme[] = PAGE_THEMES.map((t) => t.value);
const SECTION_ID = /^[a-z0-9-]{1,20}$/;

/** The value to send for a theme: the offered one with the same colour (old food-type names become colour names). */
function themeValue(theme: PageTheme | undefined): PageTheme {
  const colour = themeColour(theme);
  return PAGE_THEMES.find((t) => t.colour === colour)?.value ?? "INDIGO";
}

/** The sections the home page shares with category pages (same fields, same rules). */
export type ContentSection = PromoBannerSection | TextBlockSection | TrustStripSection | FaqPageSection;
export const CONTENT_TYPES = ["PROMO_BANNER", "TEXT_BLOCK", "TRUST_STRIP", "FAQ"] as const;
export const isContentSection = (s: { type: string }): s is ContentSection => (CONTENT_TYPES as readonly string[]).includes(s.type);

export function text(errors: PageErrors, path: string, value: string | null | undefined, max: number, label: string, multiline = false) {
  const v = value ?? "";
  if (v.length > max) errors[path] = `${label} must be at most ${max} characters`;
  else if (!(multiline ? SAFE_MULTILINE : SAFE_LINE).test(v)) errors[path] = `${label} can't contain < or >`;
}

export function pageErrors(doc: PageDocument, isSubcategory: boolean): PageErrors {
  const e: PageErrors = {};
  if (doc.customColour) {
    if (!HEX_COLOUR.test(doc.customColour)) e.customColour = "Pick a colour, or enter it as #RRGGBB";
    else if (contrastWithWhite(doc.customColour) < MIN_CONTRAST) e.customColour = "Too light to read on white: use a darker shade";
    else if (!BACKEND_ACCEPTS_CUSTOM_COLOUR) e.customColour = "Custom colours can be saved once the backend update is in. Pick a preset to save now.";
  }
  const h = doc.hero;
  text(e, "hero.headline", h.headline, PAGE_LIMITS.headline, "Headline");
  text(e, "hero.accentLine", h.accentLine, PAGE_LIMITS.accentLine, "Second line");
  text(e, "hero.intro", h.intro, PAGE_LIMITS.intro, "Intro", true);
  text(e, "hero.imageAlt", h.imageAlt, PAGE_LIMITS.imageAlt, "Picture description");
  text(e, "hero.badge", h.badge, PAGE_LIMITS.badge, "Badge");
  const points = h.trustPoints ?? [];
  if (points.length > PAGE_LIMITS.trustPoints) e["hero.trustPoints"] = `At most ${PAGE_LIMITS.trustPoints} points`;
  points.forEach((p, i) => {
    if (!p.text.trim()) e[`hero.trustPoints[${i}].text`] = "Write the point, or remove it";
    else text(e, `hero.trustPoints[${i}].text`, p.text, PAGE_LIMITS.trustText, "Point");
  });
  const stats = h.stats ?? [];
  if (stats.length > PAGE_LIMITS.stats) e["hero.stats"] = `At most ${PAGE_LIMITS.stats} stats`;
  if (isSubcategory && stats.includes("TYPES")) e["hero.stats"] = "Types can only be shown on a top-level category";

  if (doc.sections.length > PAGE_LIMITS.sections) e.sections = `At most ${PAGE_LIMITS.sections} sections`;
  const seen = new Set<string>();
  const counts: Partial<Record<SectionType, number>> = {};
  doc.sections.forEach((s, i) => {
    const at = `sections[${i}]`;
    const info = SECTION_INFO[s.type];
    counts[s.type] = (counts[s.type] ?? 0) + 1;
    if (!SECTION_ID.test(s.id) || seen.has(s.id)) e[at] = "This section needs a new id: remove and add it again";
    seen.add(s.id);
    if (isSubcategory ? !info.sub : !info.topLevel) e[at] = `${info.label} can't be used on a ${isSubcategory ? "subcategory" : "top-level"} page`;
    else if ((counts[s.type] ?? 0) > info.max) e[at] = info.max === 1 ? `Only one ${info.label} section` : `At most ${info.max} ${info.label} sections`;
    text(e, `${at}.title`, s.title, PAGE_LIMITS.title, "Title");
    text(e, `${at}.subtitle`, s.subtitle, PAGE_LIMITS.subtitle, "Subtitle");
    if (s.type === "PRODUCT_RAIL") {
      const limit = s.limit ?? PAGE_LIMITS.railDefault;
      if (!Number.isInteger(limit) || limit < PAGE_LIMITS.railMin || limit > PAGE_LIMITS.railMax) e[`${at}.limit`] = `Show ${PAGE_LIMITS.railMin} to ${PAGE_LIMITS.railMax} products`;
    }
    if (isContentSection(s)) contentSectionErrors(e, at, s);
  });
  if (isSubcategory && !counts.PRODUCT_GRID) e.sections = "A subcategory page needs its All products section";
  return e;
}

/** Field problems of an offer banner, text block, trust strip or FAQ at path `at` ("sections[3]"). */
export function contentSectionErrors(e: PageErrors, at: string, s: ContentSection) {
  if (s.type === "PROMO_BANNER") {
    if (!s.imageId) e[`${at}.imageId`] = "Add a picture";
    if (!s.headline?.trim()) e[`${at}.headline`] = "Enter the headline";
    else text(e, `${at}.headline`, s.headline, PAGE_LIMITS.bannerHeadline, "Headline");
    text(e, `${at}.text`, s.text, PAGE_LIMITS.bannerText, "Text");
    text(e, `${at}.imageAlt`, s.imageAlt, PAGE_LIMITS.imageAlt, "Picture description");
    text(e, `${at}.buttonLabel`, s.buttonLabel, PAGE_LIMITS.buttonLabel, "Button text");
    const link = s.linkPath?.trim();
    if (link && !SITE_PATH.test(link)) e[`${at}.linkPath`] = "Use a link on 360mart, like /fruits/mangoes";
    else if (link && !s.buttonLabel?.trim()) e[`${at}.buttonLabel`] = "Add the button text";
  }
  if (s.type === "TEXT_BLOCK") {
    if (!s.body?.trim()) e[`${at}.body`] = "Enter the text";
    else text(e, `${at}.body`, s.body, PAGE_LIMITS.body, "Text", true);
  }
  if (s.type === "TRUST_STRIP") {
    const pts = s.points ?? [];
    if (pts.length < PAGE_LIMITS.stripMin || pts.length > PAGE_LIMITS.stripMax) e[`${at}.points`] = `Add ${PAGE_LIMITS.stripMin} to ${PAGE_LIMITS.stripMax} points`;
    pts.forEach((p, j) => {
      if (!p.text.trim()) e[`${at}.points[${j}].text`] = "Write the point, or remove it";
      else text(e, `${at}.points[${j}].text`, p.text, PAGE_LIMITS.trustText, "Point");
    });
  }
  if (s.type === "FAQ") {
    const items = s.items ?? [];
    if (items.length < PAGE_LIMITS.faqMin || items.length > PAGE_LIMITS.faqMax) e[`${at}.items`] = `Add ${PAGE_LIMITS.faqMin} to ${PAGE_LIMITS.faqMax} questions`;
    items.forEach((q, j) => {
      if (!q.question.trim()) e[`${at}.items[${j}].question`] = "Enter the question";
      else text(e, `${at}.items[${j}].question`, q.question, PAGE_LIMITS.question, "Question");
      if (!q.answer.trim()) e[`${at}.items[${j}].answer`] = "Enter the answer";
      else text(e, `${at}.items[${j}].answer`, q.answer, PAGE_LIMITS.answer, "Answer", true);
    });
  }
}

/** One line of text: trimmed, inner runs of spaces made one, empty = null. */
export const cleanLine = (v: string | null | undefined) => (v ?? "").trim().replace(/\s+/g, " ") || null;
/** Several lines (rich text): trailing spaces and extra empty lines dropped, empty = null. */
export const cleanBlock = (v: string | null | undefined) =>
  (v ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || null;

/** A content section as the backend wants it; `base` holds the common fields, already cleaned. */
export function cleanContentSection(s: ContentSection, base: Pick<ContentSection, "id" | "enabled" | "title" | "subtitle" | "reveal">): ContentSection {
  switch (s.type) {
    case "PROMO_BANNER":
      return {
        ...base,
        type: s.type,
        imageId: s.imageId || null,
        mobileImageId: s.mobileImageId || null,
        imageAlt: cleanLine(s.imageAlt),
        headline: cleanLine(s.headline) ?? "",
        text: cleanLine(s.text),
        buttonLabel: cleanLine(s.buttonLabel),
        linkPath: (s.linkPath ?? "").trim() || null,
      };
    case "TEXT_BLOCK":
      return { ...base, type: s.type, body: cleanBlock(s.body) ?? "" };
    case "TRUST_STRIP":
      return { ...base, type: s.type, points: (s.points ?? []).map((p) => ({ icon: p.icon, text: cleanLine(p.text) ?? "" })) };
    case "FAQ":
      return { ...base, type: s.type, items: (s.items ?? []).map((q) => ({ question: cleanLine(q.question) ?? "", answer: cleanBlock(q.answer) ?? "" })) };
  }
}

/** The document as the backend wants it: trimmed text, empty text as null, only known keys. */
export function cleanDocument(doc: PageDocument, isSubcategory: boolean): PageDocument {
  const line = cleanLine;
  const block = cleanBlock;
  const h = doc.hero;
  const hero: HeroDoc = {
    headline: line(h.headline),
    accentLine: line(h.accentLine),
    intro: block(h.intro),
    imageId: h.imageId || null,
    mobileImageId: h.mobileImageId || null,
    imageAlt: line(h.imageAlt),
    badge: line(h.badge),
    trustPoints: (h.trustPoints ?? []).map((p) => ({ icon: p.icon, text: line(p.text) ?? "" })),
    stats: [...new Set(h.stats ?? [])],
    ...heroDisplay(h),
  };
  const sections = doc.sections.map((s): PageSection => {
    const base = { id: s.id, enabled: s.enabled !== false, title: line(s.title), subtitle: line(s.subtitle), reveal: revealOf(s) };
    if (isContentSection(s)) return cleanContentSection(s, base);
    switch (s.type) {
      case "SUBCATEGORIES":
        return { ...base, type: s.type, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" };
      case "PRODUCT_RAIL":
        return { ...base, type: s.type, source: s.source, limit: s.limit ?? PAGE_LIMITS.railDefault };
      default:
        return { ...base, type: s.type, showFilters: s.showFilters !== false };
    }
  });
  // The custom colour is only sent when set: an older backend refuses the key.
  const custom = !isSubcategory && doc.customColour ? { customColour: doc.customColour.toLowerCase() } : {};
  return { schemaVersion: 1, ...(isSubcategory ? {} : { theme: themeValue(doc.theme) }), ...custom, hero, sections };
}

const ID_PREFIX: Record<SectionType, string> = { SUBCATEGORIES: "types", PRODUCT_GRID: "products", PRODUCT_RAIL: "rail", PROMO_BANNER: "promo", TEXT_BLOCK: "text", TRUST_STRIP: "promises", FAQ: "faq" };

/** A short id, unique within the page ("rail-3k9x"). */
export function newSectionId(type: SectionType, taken: string[]): string {
  const prefix = ID_PREFIX[type];
  for (;;) {
    const id = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.includes(id)) return id;
  }
}

// Ready-made promises that are true for every store-based category.
const STRIP_POINTS: TrustPoint[] = [
  { icon: "store", text: "Local shops near you" },
  { icon: "scale", text: "Compare prices" },
  { icon: "badge-check", text: "Pick your store" },
];

export function newSection(type: SectionType, taken: string[]): PageSection {
  const id = newSectionId(type, taken);
  if (type === "SUBCATEGORIES") return { id, type, enabled: true, title: "Shop by type", subtitle: null, layout: "TILES" };
  if (type === "PRODUCT_RAIL") return { id, type, enabled: true, title: "Featured picks", subtitle: null, source: "FEATURED", limit: PAGE_LIMITS.railDefault };
  if (type === "PRODUCT_GRID") return { id, type, enabled: true, title: null, subtitle: null, showFilters: true };
  return newContentSection(type, id);
}

/** A new content section with its starting values. */
export function newContentSection(type: ContentSection["type"], id: string): ContentSection {
  const base = { id, enabled: true, title: "", subtitle: "", reveal: "RISE" as const };
  if (type === "PROMO_BANNER") return { ...base, type, imageId: null, mobileImageId: null, imageAlt: "", headline: "", text: "", buttonLabel: "Shop now", linkPath: "" };
  if (type === "TEXT_BLOCK") return { ...base, type, body: "" };
  if (type === "TRUST_STRIP") return { ...base, type, points: STRIP_POINTS };
  return { ...base, type, title: "Questions", items: [{ question: "", answer: "" }] };
}

/** Which section types can still be added. */
export function addableSections(sections: PageSection[], isSubcategory: boolean): SectionType[] {
  if (sections.length >= PAGE_LIMITS.sections) return [];
  return (Object.keys(SECTION_INFO) as SectionType[]).filter((t) => {
    const info = SECTION_INFO[t];
    return (isSubcategory ? info.sub : info.topLevel) && sections.filter((s) => s.type === t).length < info.max;
  });
}

// ---- reading untrusted input (server action arguments) ----

export const str = (v: unknown) => (typeof v === "string" ? v : v == null ? null : undefined);

/** A document from the browser, rebuilt from known fields only; null when it isn't shaped like one. */
export function readPageDocument(input: unknown): PageDocument | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const hero = raw.hero as Record<string, unknown> | undefined;
  if (!hero || typeof hero !== "object" || !Array.isArray(raw.sections)) return null;
  const theme = raw.theme === undefined ? undefined : THEMES.includes(raw.theme as PageTheme) ? (raw.theme as PageTheme) : typeof raw.theme === "string" && raw.theme in OLD_NAMES ? themeValue(raw.theme as PageTheme) : null;
  if (theme === null) return null;

  const fields = ["headline", "accentLine", "intro", "imageId", "mobileImageId", "imageAlt", "badge"] as const;
  const h: HeroDoc = {};
  for (const f of fields) {
    const v = str(hero[f]);
    if (v === undefined) return null;
    h[f] = v;
  }
  const points = hero.trustPoints ?? [];
  const stats = hero.stats ?? [];
  if (!Array.isArray(points) || !Array.isArray(stats)) return null;
  const trust = readPoints(points);
  if (!trust) return null;
  const statValues = PAGE_STATS.map((s) => s.value);
  if (stats.some((s) => !statValues.includes(s as PageStat))) return null;
  h.trustPoints = trust;
  h.stats = stats as PageStat[];
  const display = readDisplay(hero);
  if (!display) return null;
  Object.assign(h, display);

  const sections: PageSection[] = [];
  for (const item of raw.sections) {
    const section = readSection(item);
    if (!section) return null;
    sections.push(section);
  }
  const custom = raw.customColour;
  if (custom != null && (typeof custom !== "string" || !HEX_COLOUR.test(custom))) return null;
  return { schemaVersion: 1, ...(theme ? { theme } : {}), ...(custom ? { customColour: custom } : {}), hero: h, sections };
}

export function readPoints(list: unknown[]): TrustPoint[] | null {
  const out: TrustPoint[] = [];
  for (const p of list) {
    if (!p || typeof p !== "object") return null;
    const { icon, text: t } = p as Record<string, unknown>;
    if (!TRUST_ICONS.includes(icon as TrustIcon) || typeof t !== "string") return null;
    out.push({ icon: icon as TrustIcon, text: t });
  }
  return out;
}

export const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => values.includes(v as T);

function readDisplay(hero: Record<string, unknown>): HeroDisplay | null {
  const flags = ["enabled", "showBadge", "showTrustPoints", "showStats"] as const;
  if (flags.some((f) => hero[f] !== undefined && typeof hero[f] !== "boolean")) return null;
  if (hero.layout !== undefined && !oneOf(HERO_LAYOUTS, hero.layout)) return null;
  if (hero.size !== undefined && !oneOf(HERO_SIZES, hero.size)) return null;
  if (hero.animation !== undefined && !oneOf(HERO_ANIMATIONS, hero.animation)) return null;
  return heroDisplay(hero as Partial<HeroDisplay>);
}

function readSection(item: unknown): PageSection | null {
  if (!item || typeof item !== "object") return null;
  const s = item as Record<string, unknown>;
  const base = readSectionBase(s);
  if (!base) return null;
  if ((CONTENT_TYPES as readonly unknown[]).includes(s.type)) return readContentSection(s, base);
  switch (s.type) {
    case "SUBCATEGORIES":
      return { ...base, type: s.type, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" };
    case "PRODUCT_RAIL":
      return (s.source === "IN_SEASON" || s.source === "FEATURED") && typeof s.limit === "number" ? { ...base, type: s.type, source: s.source, limit: s.limit } : null;
    case "PRODUCT_GRID":
      return { ...base, type: s.type, showFilters: s.showFilters !== false };
    default:
      return null;
  }
}

/** The common fields of a section from the browser (null when they aren't shaped right). */
export function readSectionBase(s: Record<string, unknown>) {
  const id = str(s.id);
  const title = str(s.title);
  const subtitle = str(s.subtitle);
  if (!id || title === undefined || subtitle === undefined || typeof s.enabled !== "boolean") return null;
  if (s.reveal !== undefined && !oneOf(REVEAL_ANIMATIONS, s.reveal)) return null;
  return { id, enabled: s.enabled, title, subtitle, reveal: revealOf({ reveal: s.reveal as RevealAnimation | undefined }) };
}

/** An offer banner, text block, trust strip or FAQ from the browser, rebuilt from known fields; null when it isn't shaped like one. */
export function readContentSection(s: Record<string, unknown>, base: Pick<ContentSection, "id" | "enabled" | "title" | "subtitle" | "reveal">): ContentSection | null {
  switch (s.type) {
    case "PROMO_BANNER": {
      const f = { imageId: str(s.imageId), mobileImageId: str(s.mobileImageId), imageAlt: str(s.imageAlt), headline: str(s.headline), text: str(s.text), buttonLabel: str(s.buttonLabel), linkPath: str(s.linkPath) };
      if (Object.values(f).some((v) => v === undefined)) return null;
      return { ...base, type: s.type, ...f, imageId: f.imageId ?? null, headline: f.headline ?? "" };
    }
    case "TEXT_BLOCK":
      return typeof s.body === "string" ? { ...base, type: s.type, body: s.body } : null;
    case "TRUST_STRIP": {
      const points = Array.isArray(s.points) ? readPoints(s.points) : null;
      return points ? { ...base, type: s.type, points } : null;
    }
    case "FAQ": {
      if (!Array.isArray(s.items)) return null;
      const items: FaqItem[] = [];
      for (const q of s.items) {
        if (!q || typeof q !== "object") return null;
        const { question, answer } = q as Record<string, unknown>;
        if (typeof question !== "string" || typeof answer !== "string") return null;
        items.push({ question, answer });
      }
      return { ...base, type: s.type, items };
    }
    default:
      return null;
  }
}

/** The editor's working copy of a document from the API: every field present, so the form is always controlled. */
export function toEditable(doc: PageDocument, liveTheme: PageTheme): PageDocument {
  const h = doc.hero ?? {};
  return {
    schemaVersion: 1,
    theme: doc.theme ?? liveTheme,
    customColour: doc.customColour ?? null,
    hero: {
      headline: h.headline ?? "",
      accentLine: h.accentLine ?? "",
      intro: h.intro ?? "",
      imageId: h.imageId ?? null,
      mobileImageId: h.mobileImageId ?? null,
      imageAlt: h.imageAlt ?? "",
      badge: h.badge ?? "",
      trustPoints: h.trustPoints ?? [],
      stats: (h.stats ?? []).filter((s) => PAGE_STATS.some((p) => p.value === s)),
      ...heroDisplay(h),
    },
    // Types this editor doesn't know yet (a newer backend) are left out rather than broken.
    sections: (doc.sections ?? [])
      .filter((s) => s.type in SECTION_INFO)
      .map((s) => editableSection({ ...s, enabled: s.enabled !== false, title: s.title ?? "", subtitle: s.subtitle ?? "", reveal: revealOf(s) } as PageSection)),
  };
}

/** Every text of a section as a string, so its inputs are always controlled. */
export function editableSection<T extends { type: string }>(s: T): T {
  return isContentSection(s) ? (editableContent(s) as unknown as T) : s;
}

function editableContent(s: ContentSection): ContentSection {
  if (s.type === "PROMO_BANNER")
    return { ...s, imageId: s.imageId ?? null, mobileImageId: s.mobileImageId ?? null, imageAlt: s.imageAlt ?? "", headline: s.headline ?? "", text: s.text ?? "", buttonLabel: s.buttonLabel ?? "", linkPath: s.linkPath ?? "" };
  if (s.type === "TEXT_BLOCK") return { ...s, body: s.body ?? "" };
  if (s.type === "TRUST_STRIP") return { ...s, points: s.points ?? [] };
  return { ...s, items: (s.items ?? []).map((q) => ({ question: q.question ?? "", answer: q.answer ?? "" })) };
}

/** True when two documents would save the same thing. */
export function sameDocument(a: PageDocument, b: PageDocument, isSubcategory: boolean): boolean {
  return JSON.stringify(cleanDocument(a, isSubcategory)) === JSON.stringify(cleanDocument(b, isSubcategory));
}
