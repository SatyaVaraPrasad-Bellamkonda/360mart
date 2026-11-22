// JSON shapes of the home page APIs: the shop's GET /home-page and the admin
// designer under /admin/home-page. Types and constants only, so client
// components may import them too.

import type { Category } from "@/lib/catalog/types";
import type {
  FaqPageSection, HeroAnimation, HeroLayout, HeroSize, PageHistoryItem, PageImage, ProductCard, PromoBannerSection, RevealAnimation,
  SectionImage, TextBlockSection, TrustStripSection,
} from "@/lib/category-page/types";

export type HeroVisual = "CART_ANIMATION" | "PHOTO";

/** The floating labels around the animated cart when the admin keeps the standard ones (hero.floatingLabels = null). */
export const STANDARD_FLOATING_LABELS = ["Fresh & Fast", "Everything you need", "Quick delivery", "Your local favourites"];

/** The copy an empty hero field shows (= the backend's HomePageDefaults). */
export const HOME_DEFAULTS = {
  badge: "Your neighbourhood, online",
  headline: "Your local stores,",
  accentLine: "delivered to your door",
  intro: "360mart brings the shops around you online. Fresh fruits, meat and fish, groceries and fashion from sellers you can trust.",
  buttonLabel: "Start shopping",
  buttonLink: "/#categories",
  imageAlt: "Groceries from local stores",
};

// ---- what the admin edits (HomePageDocument) ----

// ---- the banner (format 3: slides) ----

export const HERO_SLIDE_KINDS = ["PHOTO", "VIDEO", "CART", "COLOUR"] as const;
export type HeroSlideKind = (typeof HERO_SLIDE_KINDS)[number];
export const HERO_FOCUSES = ["CENTER", "LEFT", "RIGHT", "TOP", "BOTTOM"] as const;
export type HeroFocus = (typeof HERO_FOCUSES)[number];
export const HERO_BACKGROUNDS = ["AMBER", "INK", "FOREST", "BERRY", "SKY", "SAND"] as const;
export type HeroBackground = (typeof HERO_BACKGROUNDS)[number];
export const HERO_TEXT_POSITIONS = ["LEFT", "CENTER", "BOTTOM_LEFT"] as const;
export type HeroTextPosition = (typeof HERO_TEXT_POSITIONS)[number];
export const HERO_TEXT_TONES = ["LIGHT", "DARK"] as const;
export type HeroTextTone = (typeof HERO_TEXT_TONES)[number];
export const HERO_OVERLAYS = ["NONE", "LEFT_FADE", "BOTTOM_FADE", "EVEN"] as const;
export type HeroOverlay = (typeof HERO_OVERLAYS)[number];
export const HERO_FRAMES = ["CARD", "FULL_WIDTH"] as const;
export type HeroFrame = (typeof HERO_FRAMES)[number];
export const HERO_HEIGHTS = ["COMPACT", "MEDIUM", "TALL"] as const;
export type HeroHeight = (typeof HERO_HEIGHTS)[number];
export const HERO_MOBILE_SHAPES = ["SQUARE", "PORTRAIT", "WIDE"] as const;
export type HeroMobileShape = (typeof HERO_MOBILE_SHAPES)[number];
export const SIDE_CARD_TONES = ["PEACH", "MINT", "SKY", "SAND"] as const;
export type SideCardTone = (typeof SIDE_CARD_TONES)[number];

/** One slide of the home banner. PHOTO needs imageId; VIDEO needs videoId + a poster in imageId. */
export type HeroSlide = {
  id: string;
  kind: HeroSlideKind;
  imageId?: string | null;
  mobileImageId?: string | null;
  videoId?: string | null;
  mobileVideoId?: string | null;
  /** VIDEO: false = phones show only the poster (saves their data). */
  videoOnPhones?: boolean;
  imageAlt?: string | null;
  focus?: HeroFocus;
  /** COLOUR and CART slides. */
  background?: HeroBackground;
  badge?: string | null;
  /** Required for CART and COLOUR slides; a photo or video can go without words. */
  headline?: string | null;
  accentLine?: string | null;
  intro?: string | null;
  buttonLabel?: string | null;
  buttonLink?: string | null;
  secondaryLabel?: string | null;
  secondaryLink?: string | null;
  textPosition?: HeroTextPosition;
  textTone?: HeroTextTone;
  overlay?: HeroOverlay;
  /** 0–80 (%). */
  overlayStrength?: number;
  /** CART only: null = the standard labels, [] = none. */
  floatingLabels?: string[] | null;
  /** UTC; shown only in this window. */
  startsAt?: string | null;
  endsAt?: string | null;
};

/** The card beside the banner on wide screens (under it on phones). */
export type HeroSideCard = { imageId?: string | null; eyebrow?: string | null; title: string; text?: string | null; linkPath: string; tone?: SideCardTone };

/** The single banner of page formats 1–2 (read only: turned into one slide). */
export type LegacyHomeHero = {
  headline?: string | null;
  accentLine?: string | null;
  intro?: string | null;
  badge?: string | null;
  buttonLabel?: string | null;
  buttonLink?: string | null;
  visual?: HeroVisual;
  imageId?: string | null;
  mobileImageId?: string | null;
  imageAlt?: string | null;
  floatingLabels?: string[] | null;
  layout?: HeroLayout;
  size?: HeroSize;
  showBadge?: boolean;
  animation?: HeroAnimation;
};

export type HomeHeroDoc = {
  enabled?: boolean;
  frame?: HeroFrame;
  /** Desktop height. */
  height?: HeroHeight;
  /** Phones: 1:1, 4:5 or 16:9. */
  mobileShape?: HeroMobileShape;
  autoplay?: boolean;
  /** 4–12. */
  intervalSeconds?: number;
  slides?: HeroSlide[];
  sideCard?: HeroSideCard | null;
} & LegacyHomeHero;

/** A part of the day with its own product row ("05:00"–"11:00", India time; an end before the start runs past midnight). */
export type TimeSlot = {
  id: string;
  label: string;
  start: string;
  end: string;
  title: string;
  subtitle?: string | null;
  categoryIds: number[];
  productIds: number[];
};

export type RailSource = "TIME_OF_DAY" | "POPULAR_NOW" | "BESTSELLERS" | "HANDPICKED" | "NEW_ARRIVALS" | "IN_SEASON" | "FEATURED";
export const SLOT_SOURCES: RailSource[] = ["TIME_OF_DAY", "POPULAR_NOW"];
export const isSlotSource = (s: RailSource) => SLOT_SOURCES.includes(s);

type Base = { id: string; enabled?: boolean; title?: string | null; subtitle?: string | null; reveal?: RevealAnimation };
export type CategoryGridSection = Base & { type: "CATEGORY_GRID"; mode: "ALL" | "FEATURED" | "PICKED"; categoryIds?: number[] | null; limit?: number; layout?: "TILES" | "CHIPS" };
export type HomeRailSection = Base & { type: "PRODUCT_RAIL"; source: RailSource; limit?: number; productIds?: number[] | null; windowDays?: 7 | 30 | null };
export type TrendingSearchesSection = Base & { type: "TRENDING_SEARCHES"; limit?: number };
/**
 * Where "Buy again" sits (one per page). Settings only: the products are each
 * shopper's own, fetched in the browser (GET /users/me/buy-again?limit=), never
 * part of the shared, cached page. Empty title/subtitle = the standard texts.
 */
export type BuyAgainSection = Base & { type: "BUY_AGAIN"; limit?: number };
/**
 * The admin's own HTML with inline CSS (announcements, offers), cleaned by the
 * backend. mobileHtml = a separate design for phones; linkPath makes the whole
 * block one link (then the HTML has no links of its own); startsAt / endsAt (UTC)
 * = shown only in that window.
 */
export type HtmlBlockSection = Base & {
  type: "HTML_BLOCK";
  html: string;
  mobileHtml?: string | null;
  linkPath?: string | null;
  linkLabel?: string | null;
  width?: "CONTAINED" | "FULL";
  startsAt?: string | null;
  endsAt?: string | null;
};
export type HomeSection = CategoryGridSection | HomeRailSection | TrendingSearchesSection | BuyAgainSection | HtmlBlockSection | PromoBannerSection | TextBlockSection | TrustStripSection | FaqPageSection;
export type HomeSectionType = HomeSection["type"];

/** 3 = the banner is slides (2 = sections saved exactly as sent; 1 put a missing "Buy again" back at the top). */
export const HOME_SCHEMA_VERSION = 3;

export type HomePageDocument = {
  schemaVersion: 1 | 2 | 3;
  hero: HomeHeroDoc;
  timeSlots: TimeSlot[];
  sections: HomeSection[];
};

// ---- the shop page (HomePageResponse) ----

/** A slide as the shop gets it: every option resolved, with permanent links. */
export type HeroSlideView = Required<Omit<HeroSlide, "floatingLabels">> & {
  imageUrl: string | null;
  mobileImageUrl: string | null;
  videoUrl: string | null;
  mobileVideoUrl: string | null;
  posterUrl: string | null;
  floatingLabels: string[];
};

export type HeroSideCardView = Required<HeroSideCard> & { imageUrl: string | null };

/** The banner as the shop gets it (only the slides showing now). The old flat fields still come too, for older apps. */
export type HomeHeroView = {
  enabled: boolean;
  frame: HeroFrame;
  height: HeroHeight;
  mobileShape: HeroMobileShape;
  autoplay: boolean;
  intervalSeconds: number;
  slides: HeroSlideView[];
  sideCard: HeroSideCardView | null;
};

/** SALES = what really sells at this time of day; PICKED = the admin's picks for the slot. */
export type SlotRail = { slotId: string; title: string; subtitle: string | null; basedOn: "SALES" | "PICKED"; products: ProductCard[] };

export type HomePage = {
  hero: HomeHeroView;
  /** Enabled sections only, in order; unknown types may come later and are skipped. */
  sections: HomeSection[];
  timeSlots: TimeSlot[];
  timeZone: string;
  rails: Record<string, ProductCard[]>;
  /** Section id → slot id → that slot's row. */
  slotRails: Record<string, Record<string, SlotRail>>;
  categoryGrids: Record<string, Category[]>;
  trendingSearches: Record<string, string[]>;
  sectionImages: Record<string, SectionImage>;
  version: number | null;
  publishedAt: string | null;
};

// ---- the admin designer ----

export type AdminHomePage = {
  draft: HomePageDocument | null;
  published: HomePageDocument | null;
  /** The draft, else the published page, else the defaults: what the designer opens. */
  effectiveDraft: HomePageDocument;
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  hasUnpublishedChanges: boolean;
  images: PageImage[];
  /** Finished video uploads, for the slide picker. */
  videos?: PageVideo[];
};

export type PageVideoPurpose = "HERO" | "HERO_MOBILE";
export type PageVideo = { videoId: string; url: string; purpose: PageVideoPurpose; contentType: string | null; sizeBytes: number | null; createdAt: string };

export type HomeHistoryItem = Pick<PageHistoryItem, "version" | "publishedAt" | "publishedBy">;
