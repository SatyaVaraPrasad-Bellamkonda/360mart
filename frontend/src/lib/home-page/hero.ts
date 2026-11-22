// The home banner (page format 3): slides + an optional side card. Defaults,
// the backend's rules (same wording, keyed by its paths like
// "hero.slides[2].imageId"), what is sent, and turning an old single banner
// into one slide. Safe for client components.

import { cleanBlock, cleanLine, text, type PageErrors } from "@/lib/category-page/validation";
import {
  HOME_DEFAULTS, STANDARD_FLOATING_LABELS, type HeroSideCard, type HeroSideCardView, type HeroSlide, type HeroSlideKind, type HeroSlideView, type HomeHeroDoc, type HomeHeroView,
} from "./types";

export const HERO_LIMITS = {
  slides: 5,
  headline: 60,
  accentLine: 60,
  intro: 300,
  badge: 40,
  buttonLabel: 24,
  imageAlt: 125,
  floatingLabels: 4,
  floatingLabel: 24,
  overlayMax: 80,
  intervalMin: 4,
  intervalMax: 12,
  sideEyebrow: 24,
  sideTitle: 50,
  sideText: 140,
} as const;

/** Video files: type and size (the backend's PageVideoPurpose limits). */
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const VIDEO_MAX_BYTES = { HERO: 20 * 1024 * 1024, HERO_MOBILE: 8 * 1024 * 1024 } as const;

/** "/", "/fruits", "/fruits/mangoes", "/#categories": our own site only (= the backend's SITE_LINK). */
const SITE_LINK = /^(?!.*\/\/)\/([a-z0-9][a-z0-9/-]{0,199})?(#[a-z0-9-]{1,40})?$/;
const SLIDE_ID = /^[a-z0-9-]{1,20}$/;

export const HERO_SETTINGS_DEFAULTS = { enabled: true, frame: "CARD", height: "MEDIUM", mobileShape: "PORTRAIT", autoplay: true, intervalSeconds: 6 } as const;

/** A photo or video can speak for itself: its headline is optional (a cart or colour slide would be empty without one). */
export const headlineOptional = (kind: HeroSlideKind) => kind === "PHOTO" || kind === "VIDEO";

/** A new slide of a kind, ready to fill in (colour/cart slides read dark on a light background). */
export function newSlide(kind: HeroSlideKind, taken: string[]): HeroSlide {
  const onPicture = kind === "PHOTO" || kind === "VIDEO";
  return {
    id: freshId(taken),
    kind,
    imageId: null,
    mobileImageId: null,
    videoId: null,
    mobileVideoId: null,
    videoOnPhones: true,
    imageAlt: "",
    focus: "CENTER",
    background: kind === "CART" ? "SAND" : "INK",
    badge: "",
    headline: kind === "CART" ? HOME_DEFAULTS.headline.replace(/,$/, "") : "",
    accentLine: "",
    intro: "",
    buttonLabel: HOME_DEFAULTS.buttonLabel,
    buttonLink: HOME_DEFAULTS.buttonLink,
    secondaryLabel: "",
    secondaryLink: "",
    textPosition: "LEFT",
    textTone: onPicture || kind === "COLOUR" ? "LIGHT" : "DARK",
    overlay: onPicture ? "LEFT_FADE" : "NONE",
    overlayStrength: 45,
    floatingLabels: null,
    startsAt: null,
    endsAt: null,
  };
}

function freshId(taken: string[]): string {
  for (let n = taken.length + 1; ; n++) if (!taken.includes(`slide-${n}`)) return `slide-${n}`;
}

/** Every field present (so the form is always controlled), and an old single banner turned into one slide. */
export function editableHero(h: HomeHeroDoc): HomeHeroDoc {
  const slides = h.slides ?? legacySlides(h);
  return {
    enabled: h.enabled !== false,
    frame: h.frame ?? HERO_SETTINGS_DEFAULTS.frame,
    height: h.height ?? (h.size === "COMPACT" ? "COMPACT" : HERO_SETTINGS_DEFAULTS.height),
    mobileShape: h.mobileShape ?? HERO_SETTINGS_DEFAULTS.mobileShape,
    autoplay: h.autoplay ?? HERO_SETTINGS_DEFAULTS.autoplay,
    intervalSeconds: h.intervalSeconds ?? HERO_SETTINGS_DEFAULTS.intervalSeconds,
    slides: slides.map((s) => ({ ...newSlide(s.kind, []), ...withoutNulls(s) })),
    sideCard: h.sideCard ? { imageId: null, eyebrow: "", title: "", text: "", linkPath: "", tone: "PEACH", ...withoutNulls(h.sideCard) } : null,
  };
}

const withoutNulls = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;

/** The page-format-2 banner as one slide (the backend does the same when it reads an old page). */
function legacySlides(h: HomeHeroDoc): HeroSlide[] {
  const cart = h.visual !== "PHOTO";
  const kind: HeroSlideKind = h.layout === "TEXT_ONLY" ? "COLOUR" : cart ? "CART" : "PHOTO";
  const full = kind === "PHOTO" && h.layout === "IMAGE_BACKGROUND";
  return [
    {
      ...newSlide(kind, []),
      id: "main",
      imageId: kind === "PHOTO" ? (h.imageId ?? null) : null,
      mobileImageId: kind === "PHOTO" ? (h.mobileImageId ?? null) : null,
      imageAlt: h.imageAlt ?? "",
      badge: h.showBadge === false ? "" : (h.badge ?? HOME_DEFAULTS.badge),
      headline: h.headline?.trim() || HOME_DEFAULTS.headline,
      accentLine: h.accentLine ?? HOME_DEFAULTS.accentLine,
      intro: h.intro ?? HOME_DEFAULTS.intro,
      buttonLabel: h.buttonLabel ?? HOME_DEFAULTS.buttonLabel,
      buttonLink: h.buttonLink ?? HOME_DEFAULTS.buttonLink,
      textTone: full || kind === "COLOUR" ? "LIGHT" : "DARK",
      overlay: full ? "LEFT_FADE" : "NONE",
      floatingLabels: h.floatingLabels ?? null,
    },
  ];
}

// ---- checks ----

export function heroErrors(h: HomeHeroDoc, e: PageErrors) {
  const slides = h.slides ?? [];
  if (slides.length > HERO_LIMITS.slides) e["hero.slides"] = `Add at most ${HERO_LIMITS.slides} slides`;
  else if (h.enabled !== false && slides.length === 0) e["hero.slides"] = "Add at least one slide, or switch the banner off";
  const every = h.intervalSeconds ?? HERO_SETTINGS_DEFAULTS.intervalSeconds;
  if (!Number.isInteger(every) || every < HERO_LIMITS.intervalMin || every > HERO_LIMITS.intervalMax) e["hero.intervalSeconds"] = "Use 4 to 12 seconds";
  const ids = new Set<string>();
  slides.forEach((s, i) => slideErrors(s, `hero.slides[${i}]`, ids, e));
  if (h.sideCard) sideCardErrors(h.sideCard, e);
}

function slideErrors(s: HeroSlide, at: string, ids: Set<string>, e: PageErrors) {
  if (!SLIDE_ID.test(s.id) || ids.has(s.id)) e[`${at}.id`] = "Each slide needs a different id";
  ids.add(s.id);
  if (!s.headline?.trim()) {
    if (!headlineOptional(s.kind)) e[`${at}.headline`] = "Add the headline";
  } else text(e, `${at}.headline`, s.headline, HERO_LIMITS.headline, "Headline");
  text(e, `${at}.accentLine`, s.accentLine, HERO_LIMITS.accentLine, "Second line");
  text(e, `${at}.intro`, s.intro, HERO_LIMITS.intro, "Text", true);
  text(e, `${at}.badge`, s.badge, HERO_LIMITS.badge, "Badge");
  text(e, `${at}.imageAlt`, s.imageAlt, HERO_LIMITS.imageAlt, "Picture description");
  buttonErrors(s.buttonLabel, s.buttonLink, `${at}.buttonLabel`, `${at}.buttonLink`, e);
  buttonErrors(s.secondaryLabel, s.secondaryLink, `${at}.secondaryLabel`, `${at}.secondaryLink`, e);
  if (s.kind === "PHOTO" && !s.imageId) e[`${at}.imageId`] = "Add the picture";
  if (s.kind === "VIDEO") {
    if (!s.videoId) e[`${at}.videoId`] = "Upload the video";
    if (!s.imageId) e[`${at}.imageId`] = "Add a poster picture: it shows while the video loads, and on phones that don't play it";
  }
  const strength = s.overlayStrength ?? 45;
  if (!Number.isInteger(strength) || strength < 0 || strength > HERO_LIMITS.overlayMax) e[`${at}.overlayStrength`] = "Use 0 to 80 (percent)";
  const labels = s.kind === "CART" ? (s.floatingLabels ?? []) : [];
  if (labels.length > HERO_LIMITS.floatingLabels) e[`${at}.floatingLabels`] = `Add at most ${HERO_LIMITS.floatingLabels} floating labels`;
  labels.forEach((l, j) => {
    if (!l.trim()) e[`${at}.floatingLabels[${j}]`] = "Enter the label, or remove it";
    else text(e, `${at}.floatingLabels[${j}]`, l, HERO_LIMITS.floatingLabel, "Label");
  });
  if (s.startsAt && s.endsAt && Date.parse(s.endsAt) <= Date.parse(s.startsAt)) e[`${at}.endsAt`] = "End after it starts";
}

/** A button needs both its text and where it goes. */
function buttonErrors(label: string | null | undefined, link: string | null | undefined, labelAt: string, linkAt: string, e: PageErrors) {
  const l = label?.trim();
  const to = link?.trim();
  text(e, labelAt, label, HERO_LIMITS.buttonLabel, "Button text");
  if (to && !SITE_LINK.test(to)) e[linkAt] = "Use a link on 360mart, like /fruits or /#categories";
  else if (to && !l) e[labelAt] = "Add the button text";
  else if (l && !to) e[linkAt] = "Say where the button goes, like /fruits";
}

function sideCardErrors(c: HeroSideCard, e: PageErrors) {
  if (!c.title?.trim()) e["hero.sideCard.title"] = "Add the card's title";
  else text(e, "hero.sideCard.title", c.title, HERO_LIMITS.sideTitle, "Title");
  text(e, "hero.sideCard.eyebrow", c.eyebrow, HERO_LIMITS.sideEyebrow, "Small label");
  text(e, "hero.sideCard.text", c.text, HERO_LIMITS.sideText, "Text");
  const to = c.linkPath?.trim();
  if (!to) e["hero.sideCard.linkPath"] = "Say where the card goes, like /fruits";
  else if (!SITE_LINK.test(to)) e["hero.sideCard.linkPath"] = "Use a link on 360mart, like /fruits or /#categories";
}

// ---- what is sent ----

/** Format 3 only: the old flat fields are left out (the backend refuses them), each slide with its kind's fields. */
export function cleanHero(h: HomeHeroDoc): HomeHeroDoc {
  return {
    enabled: h.enabled !== false,
    frame: h.frame ?? HERO_SETTINGS_DEFAULTS.frame,
    height: h.height ?? HERO_SETTINGS_DEFAULTS.height,
    mobileShape: h.mobileShape ?? HERO_SETTINGS_DEFAULTS.mobileShape,
    autoplay: h.autoplay !== false,
    intervalSeconds: h.intervalSeconds ?? HERO_SETTINGS_DEFAULTS.intervalSeconds,
    slides: (h.slides ?? []).map(cleanSlide),
    sideCard: h.sideCard
      ? {
          imageId: h.sideCard.imageId || null,
          eyebrow: cleanLine(h.sideCard.eyebrow),
          title: cleanLine(h.sideCard.title) ?? "",
          text: cleanLine(h.sideCard.text),
          linkPath: (h.sideCard.linkPath ?? "").trim(),
          tone: h.sideCard.tone ?? "PEACH",
        }
      : null,
  };
}

function cleanSlide(s: HeroSlide): HeroSlide {
  const picture = s.kind === "PHOTO" || s.kind === "VIDEO";
  const video = s.kind === "VIDEO";
  return {
    id: s.id,
    kind: s.kind,
    imageId: picture ? s.imageId || null : null,
    mobileImageId: picture ? s.mobileImageId || null : null,
    videoId: video ? s.videoId || null : null,
    mobileVideoId: video ? s.mobileVideoId || null : null,
    videoOnPhones: s.videoOnPhones !== false,
    imageAlt: picture ? cleanLine(s.imageAlt) : null,
    focus: s.focus ?? "CENTER",
    background: s.background ?? "INK",
    badge: cleanLine(s.badge),
    headline: cleanLine(s.headline),
    accentLine: cleanLine(s.accentLine),
    intro: cleanBlock(s.intro),
    buttonLabel: cleanLine(s.buttonLabel),
    buttonLink: (s.buttonLink ?? "").trim() || null,
    secondaryLabel: cleanLine(s.secondaryLabel),
    secondaryLink: (s.secondaryLink ?? "").trim() || null,
    textPosition: s.textPosition ?? "LEFT",
    textTone: s.textTone ?? "LIGHT",
    overlay: picture ? (s.overlay ?? "NONE") : "NONE",
    overlayStrength: s.overlayStrength ?? 45,
    floatingLabels: s.kind === "CART" ? (s.floatingLabels == null ? null : s.floatingLabels.map((l) => cleanLine(l) ?? "")) : null,
    startsAt: s.startsAt || null,
    endsAt: s.endsAt || null,
  };
}

/** The floating labels a cart slide shows (null = the standard ones). */
export const slideLabels = (s: Pick<HeroSlide, "floatingLabels">) => (s.floatingLabels == null ? STANDARD_FLOATING_LABELS : s.floatingLabels.filter((l) => l.trim()));

// ---- how it looks (the designer's live preview, and the home page's built-in banner) ----

type UrlOf = (id: string | null | undefined) => string | null;

/** A slide being edited as the shop would show it (links from the designer's uploads). */
export function slideView(s: HeroSlide, imageUrl: UrlOf, videoUrl: UrlOf): HeroSlideView {
  const c = cleanSlide(s);
  return {
    ...(c as Required<HeroSlide>),
    // The preview shows where a required headline goes; an optional one stays empty.
    headline: c.headline || (headlineOptional(c.kind) ? null : "Your headline"),
    imageUrl: imageUrl(c.imageId),
    mobileImageUrl: imageUrl(c.mobileImageId),
    videoUrl: videoUrl(c.videoId),
    mobileVideoUrl: videoUrl(c.mobileVideoId),
    posterUrl: imageUrl(c.imageId),
    floatingLabels: slideLabels(c),
  };
}

export function heroView(h: HomeHeroDoc, imageUrl: UrlOf, videoUrl: UrlOf): HomeHeroView {
  const c = cleanHero(h);
  const card = c.sideCard;
  return {
    enabled: c.enabled !== false,
    frame: c.frame ?? HERO_SETTINGS_DEFAULTS.frame,
    height: c.height ?? HERO_SETTINGS_DEFAULTS.height,
    mobileShape: c.mobileShape ?? HERO_SETTINGS_DEFAULTS.mobileShape,
    autoplay: c.autoplay !== false,
    intervalSeconds: c.intervalSeconds ?? HERO_SETTINGS_DEFAULTS.intervalSeconds,
    slides: (h.slides ?? []).map((s) => slideView(s, imageUrl, videoUrl)),
    sideCard: card ? ({ ...(card as Required<HeroSideCard>), title: card.title || "Card title", linkPath: card.linkPath || "/", imageUrl: imageUrl(card.imageId) } satisfies HeroSideCardView) : null,
  };
}

/** The standard banner (the animated cart with the site's words): shown when the design can't be loaded. */
export function standardHero(): HomeHeroView {
  const none = () => null;
  const slide: HeroSlide = { ...newSlide("CART", []), id: "main", headline: HOME_DEFAULTS.headline, accentLine: HOME_DEFAULTS.accentLine, intro: HOME_DEFAULTS.intro, badge: HOME_DEFAULTS.badge };
  return { ...HERO_SETTINGS_DEFAULTS, slides: [slideView(slide, none, none)], sideCard: null };
}
