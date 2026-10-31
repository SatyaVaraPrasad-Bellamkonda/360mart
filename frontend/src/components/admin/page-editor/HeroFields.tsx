"use client";

import { EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { RichTextField } from "@/components/RichTextField";
import { heroDisplay, PAGE_STATS, type HeroAnimation, type HeroDoc, type HeroLayout, type PageImage, type PageStat, type TrustPoint } from "@/lib/category-page/types";
import { PAGE_LIMITS } from "@/lib/category-page/validation";
import { ChoiceCards, ImageSlot, PointsEditor, Segmented, Switch } from "./parts";

export type Fallbacks = { name: string; description: string | null; badge: string | null; imageUrl: string | null };

// Ready-made points that are true for every store-based category.
const SUGGESTED_POINTS: TrustPoint[] = [
  { icon: "store", text: "Sold by local shops near you" },
  { icon: "scale", text: "Compare prices across stores" },
  { icon: "badge-check", text: "Pick the store you'd like to buy from" },
];

// A tiny drawing of each layout: picture = filled block, text = lines.
const Lines = ({ light }: { light?: boolean }) => (
  <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
    <span className={`h-1.5 w-4/5 rounded-full ${light ? "bg-white" : "bg-ink/70"}`} />
    <span className={`h-1 w-3/5 rounded-full ${light ? "bg-white/70" : "bg-ink/30"}`} />
    <span className={`h-1 w-2/3 rounded-full ${light ? "bg-white/70" : "bg-ink/30"}`} />
  </span>
);
const Pic = () => <span className="w-2/5 shrink-0 rounded-md bg-gradient-to-br from-amber-300 to-green-400" />;
export const LAYOUT_ART: Record<HeroLayout, ReactNode> = {
  IMAGE_RIGHT: (
    <span aria-hidden className="flex h-14 gap-2 rounded-lg bg-surface p-2 ring-1 ring-line">
      <Lines />
      <Pic />
    </span>
  ),
  IMAGE_LEFT: (
    <span aria-hidden className="flex h-14 gap-2 rounded-lg bg-surface p-2 ring-1 ring-line">
      <Pic />
      <Lines />
    </span>
  ),
  IMAGE_BACKGROUND: (
    <span aria-hidden className="flex h-14 rounded-lg bg-gradient-to-br from-amber-400 to-green-600 p-2">
      <span className="flex w-3/5 rounded-md bg-black/35 p-1.5">
        <Lines light />
      </span>
    </span>
  ),
  TEXT_ONLY: (
    <span aria-hidden className="flex h-14 rounded-lg bg-surface p-2 ring-1 ring-line">
      <Lines />
    </span>
  ),
};

export const LAYOUTS: { value: HeroLayout; label: string; text: string }[] = [
  { value: "IMAGE_RIGHT", label: "Picture right", text: "The classic look" },
  { value: "IMAGE_LEFT", label: "Picture left", text: "Picture leads the eye" },
  { value: "IMAGE_BACKGROUND", label: "Full picture", text: "Text over the photo" },
  { value: "TEXT_ONLY", label: "Text only", text: "A short strip, no picture" },
];

export const ANIMATIONS: { value: HeroAnimation; label: string; text: string }[] = [
  { value: "NONE", label: "None", text: "Shows at once" },
  { value: "FADE_UP", label: "Fade up", text: "Lines rise in one by one" },
  { value: "SLIDE_IN", label: "Slide in", text: "Text and picture slide in" },
  { value: "SLOW_ZOOM", label: "Slow zoom", text: "The photo slowly zooms" },
];

// The hero panel: show or hide it, its look (layout, size, animation), words,
// pictures, trust points and stats, each extra switchable. Empty fields use the
// category's own values (shown as placeholders), so nothing has to be typed twice.
export function HeroFields({
  hero,
  onChange,
  errors,
  fallbacks,
  isSubcategory,
  counts,
  images,
  urlOf,
  uploading,
  onUpload,
}: {
  hero: HeroDoc;
  onChange: (patch: Partial<HeroDoc>) => void;
  errors: Record<string, string>;
  fallbacks: Fallbacks;
  isSubcategory: boolean;
  counts: Partial<Record<PageStat, number>> | null;
  images: PageImage[];
  urlOf: (imageId: string | null | undefined) => string | null;
  uploading: string | null;
  onUpload: (slot: "HERO" | "HERO_MOBILE", file: File) => void;
}) {
  const points = hero.trustPoints ?? [];
  const stats = hero.stats ?? [];
  const look = heroDisplay(hero);
  const offered = PAGE_STATS.filter((s) => !(s.topLevelOnly && isSubcategory));
  const gallery = images.map((img) => ({ imageId: img.imageId, url: urlOf(img.imageId) ?? img.url }));

  function toggleStat(stat: PageStat) {
    onChange({ stats: stats.includes(stat) ? stats.filter((s) => s !== stat) : [...stats, stat].slice(0, PAGE_LIMITS.stats) });
  }

  const headline = (
    <TextField label="Headline" name="headline" optional autoComplete="off" maxLength={PAGE_LIMITS.headline} placeholder={fallbacks.name} value={hero.headline ?? ""} onChange={(v) => onChange({ headline: v })} error={errors["hero.headline"]} hint="Empty = the category name." />
  );

  if (!look.enabled) {
    return (
      <div className="space-y-5">
        <Switch checked={false} onChange={(v) => onChange({ enabled: v })} label="Show the banner" />
        <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
          <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          The page starts with just its title, then your sections. Everything below is kept, so switching the banner back on brings it all back.
        </p>
        {headline}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Switch checked onChange={(v) => onChange({ enabled: v })} label="Show the banner" />
      <ChoiceCards label="Layout" value={look.layout} options={LAYOUTS.map((l) => ({ ...l, art: LAYOUT_ART[l.value] }))} onChange={(layout) => onChange({ layout })} />
      {isSubcategory ? (
        <p className="text-sm text-muted">Subcategory pages use the compact banner, so their products come into view sooner.</p>
      ) : (
        <Segmented
          label="Size"
          value={look.size}
          options={[
            { value: "LARGE", label: "Large" },
            { value: "COMPACT", label: "Compact" },
          ]}
          onChange={(size) => onChange({ size })}
        />
      )}
      <ChoiceCards
        label="Entrance animation"
        hint="Plays once when the page opens. Shoppers who turned off motion on their phone see no animation."
        value={look.animation}
        options={ANIMATIONS.map((a) => ({ ...a, disabled: a.value === "SLOW_ZOOM" && look.layout === "TEXT_ONLY" }))}
        onChange={(animation) => onChange({ animation })}
      />

      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        {headline}
        <TextField
          label="Coloured second line"
          name="accentLine"
          optional
          autoComplete="off"
          maxLength={PAGE_LIMITS.accentLine}
          placeholder="from stores near you"
          value={hero.accentLine ?? ""}
          onChange={(v) => onChange({ accentLine: v })}
          error={errors["hero.accentLine"]}
          hint="Shown in the theme colour."
        />
      </div>
      <RichTextField
        label="Intro"
        name="intro"
        optional
        rows={4}
        maxLength={PAGE_LIMITS.intro}
        placeholder={fallbacks.description ?? "Fresh, seasonal produce from shops in your neighbourhood."}
        value={hero.intro ?? ""}
        onChange={(v) => onChange({ intro: v })}
        error={errors["hero.intro"]}
        hint={fallbacks.description ? "Empty = the category description." : undefined}
        previewClassName="text-base leading-relaxed text-muted"
      />
      <div className="space-y-2">
        <Switch checked={look.showBadge} onChange={(v) => onChange({ showBadge: v })} label="Show a badge" />
        {look.showBadge && (
          <TextField label="Badge" name="badge" optional autoComplete="off" maxLength={PAGE_LIMITS.badge} placeholder={fallbacks.badge ?? "Seasonal"} value={hero.badge ?? ""} onChange={(v) => onChange({ badge: v })} error={errors["hero.badge"]} hint="A short pill above the headline." />
        )}
      </div>

      {look.layout === "TEXT_ONLY" ? (
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">The Text only layout has no picture. Your pictures are kept for when you switch back.</p>
      ) : (
      <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ImageSlot
          label="Banner picture"
          hint="Wide, at least 1600 px across. JPEG or PNG, up to 2 MB."
          url={urlOf(hero.imageId) ?? fallbacks.imageUrl}
          usingDefault={!hero.imageId}
          defaultLabel="Category picture"
          images={gallery}
          uploading={uploading === "HERO"}
          error={errors["hero.imageId"]}
          onUpload={(file) => onUpload("HERO", file)}
          onPick={(img) => onChange({ imageId: img.imageId })}
          onClear={() => onChange({ imageId: null })}
        />
        <ImageSlot
          label="Phone picture (optional)"
          hint="A taller crop for phones, about 1080 px across. Empty = the banner picture."
          url={urlOf(hero.mobileImageId)}
          usingDefault={!hero.mobileImageId}
          defaultLabel="Same as banner"
          images={gallery}
          uploading={uploading === "HERO_MOBILE"}
          error={errors["hero.mobileImageId"]}
          onUpload={(file) => onUpload("HERO_MOBILE", file)}
          onPick={(img) => onChange({ mobileImageId: img.imageId })}
          onClear={() => onChange({ mobileImageId: null })}
        />
      </div>
      <TextField
        label="Picture description"
        name="imageAlt"
        optional
        autoComplete="off"
        maxLength={PAGE_LIMITS.imageAlt}
        placeholder={fallbacks.name}
        value={hero.imageAlt ?? ""}
        onChange={(v) => onChange({ imageAlt: v })}
        error={errors["hero.imageAlt"]}
        hint="What the picture shows, for screen readers and Google Images."
      />
      </>
      )}

      <fieldset className="min-w-0">
        <legend className="sr-only">Trust points</legend>
        <Switch checked={look.showTrustPoints} onChange={(v) => onChange({ showTrustPoints: v })} label="Show trust points" />
        {look.showTrustPoints && (
          <div className="mt-2">
            <p className="mb-2 text-sm text-muted">Up to {PAGE_LIMITS.trustPoints} short lines with an icon. Only promise what every store really does.</p>
            <PointsEditor points={points} onChange={(trustPoints) => onChange({ trustPoints })} max={PAGE_LIMITS.trustPoints} path="hero.trustPoints" errors={errors} suggested={SUGGESTED_POINTS} />
          </div>
        )}
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Counts</legend>
        <Switch checked={look.showStats} onChange={(v) => onChange({ showStats: v })} label="Show counts" />
        {look.showStats && (
        <>
        <p className="mb-2 mt-1 text-sm text-muted">In the order you tap them. A count of 0 is hidden on the page.</p>
        <div className="flex flex-wrap gap-2">
          {offered.map((s) => {
            const at = stats.indexOf(s.value);
            const value = counts?.[s.value];
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={at >= 0}
                onClick={() => toggleStat(s.value)}
                className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
              >
                {at >= 0 && <span className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-ink">{at + 1}</span>}
                {s.label}
                {value !== undefined && <span className="tabular-nums opacity-70">{value.toLocaleString("en-IN")}</span>}
              </button>
            );
          })}
        </div>
        {errors["hero.stats"] && <p className="mt-1.5 text-sm text-red-700">{errors["hero.stats"]}</p>}
        <p className="mt-2 text-xs text-muted">Nearby stores and lowest price need the shopper&apos;s location, so they&apos;ll come with the location feature.</p>
        </>
        )}
      </fieldset>
    </div>
  );
}
