// Page colours. Category pages use the colour the admin picks in the page
// editor; product pages use the product's food type (green veg, red non-veg,
// amber egg, indigo for everything else). Full class names only (Tailwind
// can't see built ones). Safe for client and server code.

import type { FoodType, PageTheme } from "./types";

export type ThemeColour = "GREEN" | "RED" | "AMBER" | "ORANGE" | "PINK" | "PURPLE" | "INDIGO" | "BLUE" | "TEAL" | "SLATE";

export type FoodTheme = {
  /** Accent text and icons. */
  text: string;
  /** Soft pill background. */
  soft: string;
  /** Pill / icon-circle ring. */
  ring: string;
  /** Solid tag background (white text on it). */
  solid: string;
  /** Banner background gradient. */
  banner: string;
  /** Banner photo shadow. */
  shadow: string;
  /** Picture placeholder background when there's no photo. */
  placeholder: string;
  /** Selected chip (white text on it). */
  chipOn: string;
};

// Every accent is a 600/700 shade, so white text on it and it on white stay readable.
const THEMES: Record<ThemeColour, FoodTheme> = {
  GREEN: { text: "text-fresh", soft: "bg-fresh-soft", ring: "ring-green-200", solid: "bg-fresh", banner: "from-green-50 via-white to-amber-50", shadow: "shadow-green-900/10", placeholder: "bg-gradient-to-br from-green-100 to-amber-50", chipOn: "bg-fresh border-fresh" },
  RED: { text: "text-red-700", soft: "bg-red-50", ring: "ring-red-200", solid: "bg-red-700", banner: "from-rose-50 via-white to-orange-50", shadow: "shadow-red-900/10", placeholder: "bg-gradient-to-br from-rose-100 to-orange-50", chipOn: "bg-red-700 border-red-700" },
  AMBER: { text: "text-amber-700", soft: "bg-amber-50", ring: "ring-amber-200", solid: "bg-amber-600", banner: "from-amber-50 via-white to-yellow-50", shadow: "shadow-amber-900/10", placeholder: "bg-gradient-to-br from-amber-100 to-yellow-50", chipOn: "bg-amber-600 border-amber-600" },
  ORANGE: { text: "text-orange-700", soft: "bg-orange-50", ring: "ring-orange-200", solid: "bg-orange-600", banner: "from-orange-50 via-white to-amber-50", shadow: "shadow-orange-900/10", placeholder: "bg-gradient-to-br from-orange-100 to-amber-50", chipOn: "bg-orange-600 border-orange-600" },
  PINK: { text: "text-pink-700", soft: "bg-pink-50", ring: "ring-pink-200", solid: "bg-pink-600", banner: "from-pink-50 via-white to-rose-50", shadow: "shadow-pink-900/10", placeholder: "bg-gradient-to-br from-pink-100 to-rose-50", chipOn: "bg-pink-600 border-pink-600" },
  PURPLE: { text: "text-purple-700", soft: "bg-purple-50", ring: "ring-purple-200", solid: "bg-purple-600", banner: "from-purple-50 via-white to-fuchsia-50", shadow: "shadow-purple-900/10", placeholder: "bg-gradient-to-br from-purple-100 to-fuchsia-50", chipOn: "bg-purple-600 border-purple-600" },
  INDIGO: { text: "text-indigo-700", soft: "bg-indigo-50", ring: "ring-indigo-200", solid: "bg-indigo-600", banner: "from-indigo-50 via-white to-sky-50", shadow: "shadow-indigo-900/10", placeholder: "bg-gradient-to-br from-indigo-100 to-sky-50", chipOn: "bg-indigo-600 border-indigo-600" },
  BLUE: { text: "text-blue-700", soft: "bg-blue-50", ring: "ring-blue-200", solid: "bg-blue-600", banner: "from-blue-50 via-white to-cyan-50", shadow: "shadow-blue-900/10", placeholder: "bg-gradient-to-br from-blue-100 to-cyan-50", chipOn: "bg-blue-600 border-blue-600" },
  TEAL: { text: "text-teal-700", soft: "bg-teal-50", ring: "ring-teal-200", solid: "bg-teal-600", banner: "from-teal-50 via-white to-emerald-50", shadow: "shadow-teal-900/10", placeholder: "bg-gradient-to-br from-teal-100 to-emerald-50", chipOn: "bg-teal-600 border-teal-600" },
  SLATE: { text: "text-slate-700", soft: "bg-slate-100", ring: "ring-slate-200", solid: "bg-slate-700", banner: "from-slate-100 via-white to-slate-50", shadow: "shadow-slate-900/10", placeholder: "bg-gradient-to-br from-slate-200 to-slate-50", chipOn: "bg-slate-700 border-slate-700" },
};

const SWATCH: Record<ThemeColour, string> = {
  GREEN: "bg-fresh", RED: "bg-red-700", AMBER: "bg-amber-600", ORANGE: "bg-orange-600", PINK: "bg-pink-600",
  PURPLE: "bg-purple-600", INDIGO: "bg-indigo-600", BLUE: "bg-blue-600", TEAL: "bg-teal-600", SLATE: "bg-slate-700",
};
const LABEL: Record<ThemeColour, string> = {
  GREEN: "Green", RED: "Red", AMBER: "Amber", ORANGE: "Orange", PINK: "Pink", PURPLE: "Purple", INDIGO: "Indigo", BLUE: "Blue", TEAL: "Teal", SLATE: "Grey",
};

// The backend's first theme values were named after food types; each one is a colour.
const LEGACY: Record<string, ThemeColour> = { VEG: "GREEN", NON_VEG: "RED", EGG: "AMBER", GENERAL: "INDIGO" };
const LEGACY_VALUE: Partial<Record<ThemeColour, PageTheme>> = { GREEN: "VEG", RED: "NON_VEG", AMBER: "EGG", INDIGO: "GENERAL" };

/**
 * Switch on once the backend accepts colour names (GREEN, RED, … SLATE) as page
 * themes: the picker then offers all ten. Until then it offers the four the
 * backend stores today, sent under their old names.
 */
export const BACKEND_ACCEPTS_COLOUR_NAMES = true;

/** The colour a stored theme value means (old food-type names included). */
export function themeColour(value: string | null | undefined): ThemeColour {
  if (value && value in THEMES) return value as ThemeColour;
  return LEGACY[value ?? ""] ?? "INDIGO";
}

/** The colours the page editor offers, with the value to send for each. */
export const PAGE_THEMES: { value: PageTheme; colour: ThemeColour; label: string; swatch: string }[] = (Object.keys(THEMES) as ThemeColour[])
  .filter((c) => BACKEND_ACCEPTS_COLOUR_NAMES || LEGACY_VALUE[c])
  .map((c) => ({ value: BACKEND_ACCEPTS_COLOUR_NAMES ? c : LEGACY_VALUE[c]!, colour: c, label: LABEL[c], swatch: SWATCH[c] }));

export const colourLabel = (value: string | null | undefined) => LABEL[themeColour(value)];
export const colourSwatch = (value: string | null | undefined) => SWATCH[themeColour(value)];

/**
 * Switch on once the backend stores a custom page colour ("customColour":
 * "#RRGGBB" in the page document and the page response). Until then the editor
 * lets admins try one in the live preview but not save it.
 */
export const BACKEND_ACCEPTS_CUSTOM_COLOUR = true;

// A custom colour can't have its own Tailwind classes, so its theme reads CSS
// variables that themeStyle() sets on the page from that one colour.
const CUSTOM: FoodTheme = {
  text: "text-(--page-accent)",
  soft: "bg-(--page-soft)",
  ring: "ring-(--page-ring)",
  solid: "bg-(--page-accent)",
  banner: "from-(--page-banner) via-white to-(--page-banner-end)",
  shadow: "shadow-(color:--page-shadow)",
  placeholder: "bg-gradient-to-br from-(--page-ring) to-(--page-banner-end)",
  chipOn: "bg-(--page-accent) border-(--page-accent)",
};

export const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/** A category page's colours: the custom one when set, else the preset. */
export function pageTheme(theme: string | null | undefined, customColour?: string | null): FoodTheme {
  return customColour && HEX_COLOUR.test(customColour) ? CUSTOM : THEMES[themeColour(theme)];
}

/** The CSS variables a custom colour's theme reads (put on the page's outer element); nothing for presets. */
export function themeStyle(customColour?: string | null): Record<string, string> | undefined {
  if (!customColour || !HEX_COLOUR.test(customColour)) return undefined;
  const mix = (pct: number, other = "white") => `color-mix(in srgb, ${customColour} ${pct}%, ${other})`;
  return {
    "--page-accent": customColour,
    "--page-soft": mix(10),
    "--page-ring": mix(30),
    "--page-banner": mix(9),
    "--page-banner-end": mix(4),
    "--page-shadow": mix(18, "transparent"),
  };
}

// ---- readability of a custom colour ----

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Contrast with white (1 to 21). The page uses the colour as text on white and under white text, so it needs 4.5. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

export const MIN_CONTRAST = 4.5;

/** The same colour, darkened just enough to be readable (same hue and saturation; unchanged when it already is). */
export function readableShade(hex: string): string {
  if (contrastWithWhite(hex) >= MIN_CONTRAST) return hex.toLowerCase();
  const [h, s, l] = toHsl(hex);
  for (let light = l; light >= 0; light -= 0.01) {
    const shade = fromHsl(h, s, light);
    if (contrastWithWhite(shade) >= MIN_CONTRAST) return shade;
  }
  return "#000000";
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    const v = x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p;
    return Math.round(Math.max(0, Math.min(1, v)) * 255);
  };
  return `#${[channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** A product's colours: its food type (null = not a food item). */
export function foodTheme(type: FoodType | null | undefined): FoodTheme {
  return THEMES[themeColour(type ?? "GENERAL")];
}
