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

export type HomeHeroDoc = {
  headline?: string | null;
  accentLine?: string | null;
  intro?: string | null;
  badge?: string | null;
  buttonLabel?: string | null;
  /** "/", "/fruits", "/#categories": always our own site. */
  buttonLink?: string | null;
  visual?: HeroVisual;
  imageId?: string | null;
  mobileImageId?: string | null;
  imageAlt?: string | null;
  /** null = the standard labels, [] = none. */
  floatingLabels?: string[] | null;
  enabled?: boolean;
  layout?: HeroLayout;
  size?: HeroSize;
  showBadge?: boolean;
  animation?: HeroAnimation;
};

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
export type HomeSection = CategoryGridSection | HomeRailSection | TrendingSearchesSection | PromoBannerSection | TextBlockSection | TrustStripSection | FaqPageSection;
export type HomeSectionType = HomeSection["type"];

export type HomePageDocument = {
  schemaVersion: 1;
  hero: HomeHeroDoc;
  timeSlots: TimeSlot[];
  sections: HomeSection[];
};

// ---- the shop page (HomePageResponse) ----

/** The hero with every field resolved (empty texts already hold the standard copy). */
export type HomeHeroView = {
  headline: string;
  accentLine: string | null;
  intro: string | null;
  badge: string | null;
  buttonLabel: string | null;
  buttonLink: string | null;
  visual: HeroVisual;
  imageId: string | null;
  imageUrl: string | null;
  mobileImageId: string | null;
  mobileImageUrl: string | null;
  imageAlt: string | null;
  floatingLabels: string[];
  enabled: boolean;
  layout: HeroLayout;
  size: HeroSize;
  showBadge: boolean;
  animation: HeroAnimation;
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
};

export type HomeHistoryItem = Pick<PageHistoryItem, "version" | "publishedAt" | "publishedBy">;
