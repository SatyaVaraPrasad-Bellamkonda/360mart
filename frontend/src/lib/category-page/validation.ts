// Page editor rules, the same as the backend's CategoryPageDocument checks
// (checked in the browser for instant feedback, again in the server action, and
// finally by the backend). Errors are keyed by the backend's field paths
// ("hero.headline", "sections[2].limit") so both land on the same field.
// Safe for client components.

import { SAFE_LINE, SAFE_MULTILINE } from "@/lib/catalog/validation";
import { BACKEND_ACCEPTS_CUSTOM_COLOUR, contrastWithWhite, HEX_COLOUR, MIN_CONTRAST, PAGE_THEMES, themeColour } from "@/lib/catalog/food-theme";
import type { PageTheme } from "@/lib/catalog/types";
import { PAGE_STATS, TRUST_ICONS, type HeroDoc, type PageDocument, type PageSection, type PageStat, type SectionType, type TrustIcon, type TrustPoint } from "./types";

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
} as const;

export const SECTION_INFO: Record<SectionType, { label: string; text: string; topLevel: boolean; sub: boolean; max: number; required?: "sub" }> = {
  SUBCATEGORIES: { label: "Shop by type", text: "The subcategories as photo tiles or chips", topLevel: true, sub: false, max: 1 },
  PRODUCT_RAIL: { label: "Product row", text: "A swipeable row: in season or featured products", topLevel: true, sub: true, max: PAGE_LIMITS.rails },
  PRODUCT_GRID: { label: "All products", text: "The subcategory's products with filters", topLevel: false, sub: true, max: 1, required: "sub" },
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

function text(errors: PageErrors, path: string, value: string | null | undefined, max: number, label: string, multiline = false) {
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
  });
  if (isSubcategory && !counts.PRODUCT_GRID) e.sections = "A subcategory page needs its All products section";
  return e;
}

/** The document as the backend wants it: trimmed text, empty text as null, only known keys. */
export function cleanDocument(doc: PageDocument, isSubcategory: boolean): PageDocument {
  const line = (v: string | null | undefined) => (v ?? "").trim().replace(/\s+/g, " ") || null;
  const block = (v: string | null | undefined) =>
    (v ?? "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() || null;
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
  };
  const sections = doc.sections.map((s): PageSection => {
    const base = { id: s.id, enabled: s.enabled !== false, title: line(s.title), subtitle: line(s.subtitle) };
    if (s.type === "SUBCATEGORIES") return { ...base, type: s.type, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" };
    if (s.type === "PRODUCT_RAIL") return { ...base, type: s.type, source: s.source, limit: s.limit ?? PAGE_LIMITS.railDefault };
    return { ...base, type: s.type, showFilters: s.showFilters !== false };
  });
  // The custom colour is only sent when set: an older backend refuses the key.
  const custom = !isSubcategory && doc.customColour ? { customColour: doc.customColour.toLowerCase() } : {};
  return { schemaVersion: 1, ...(isSubcategory ? {} : { theme: themeValue(doc.theme) }), ...custom, hero, sections };
}

/** A short id, unique within the page ("rail-3k9x"). */
export function newSectionId(type: SectionType, taken: string[]): string {
  const prefix = type === "SUBCATEGORIES" ? "types" : type === "PRODUCT_GRID" ? "products" : "rail";
  for (;;) {
    const id = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.includes(id)) return id;
  }
}

export function newSection(type: SectionType, taken: string[]): PageSection {
  const id = newSectionId(type, taken);
  if (type === "SUBCATEGORIES") return { id, type, enabled: true, title: "Shop by type", subtitle: null, layout: "TILES" };
  if (type === "PRODUCT_RAIL") return { id, type, enabled: true, title: "Featured picks", subtitle: null, source: "FEATURED", limit: PAGE_LIMITS.railDefault };
  return { id, type, enabled: true, title: null, subtitle: null, showFilters: true };
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

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? null : undefined);

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
  const trust: TrustPoint[] = [];
  for (const p of points) {
    if (!p || typeof p !== "object") return null;
    const { icon, text: t } = p as Record<string, unknown>;
    if (!TRUST_ICONS.includes(icon as TrustIcon) || typeof t !== "string") return null;
    trust.push({ icon: icon as TrustIcon, text: t });
  }
  const statValues = PAGE_STATS.map((s) => s.value);
  if (stats.some((s) => !statValues.includes(s as PageStat))) return null;
  h.trustPoints = trust;
  h.stats = stats as PageStat[];

  const sections: PageSection[] = [];
  for (const item of raw.sections) {
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    const id = str(s.id);
    const title = str(s.title);
    const subtitle = str(s.subtitle);
    if (!id || title === undefined || subtitle === undefined || typeof s.enabled !== "boolean") return null;
    const base = { id, enabled: s.enabled, title, subtitle };
    if (s.type === "SUBCATEGORIES") sections.push({ ...base, type: s.type, layout: s.layout === "CHIPS" ? "CHIPS" : "TILES" });
    else if (s.type === "PRODUCT_RAIL" && (s.source === "IN_SEASON" || s.source === "FEATURED") && typeof s.limit === "number") sections.push({ ...base, type: s.type, source: s.source, limit: s.limit });
    else if (s.type === "PRODUCT_GRID") sections.push({ ...base, type: s.type, showFilters: s.showFilters !== false });
    else return null;
  }
  const custom = raw.customColour;
  if (custom != null && (typeof custom !== "string" || !HEX_COLOUR.test(custom))) return null;
  return { schemaVersion: 1, ...(theme ? { theme } : {}), ...(custom ? { customColour: custom } : {}), hero: h, sections };
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
    },
    // Types this editor doesn't know yet (a newer backend) are left out rather than broken.
    sections: (doc.sections ?? [])
      .filter((s) => s.type in SECTION_INFO)
      .map((s) => ({ ...s, enabled: s.enabled !== false, title: s.title ?? "", subtitle: s.subtitle ?? "" }) as PageSection),
  };
}

/** True when two documents would save the same thing. */
export function sameDocument(a: PageDocument, b: PageDocument, isSubcategory: boolean): boolean {
  return JSON.stringify(cleanDocument(a, isSubcategory)) === JSON.stringify(cleanDocument(b, isSubcategory));
}
