"use client";

import { ArrowUp, Plus, Trash2, Wand2 } from "lucide-react";
import { TextField } from "@/components/auth/AuthFields";
import { RichTextField } from "@/components/RichTextField";
import type { HeroDoc, PageImage, PageImagePurpose, PageStat, TrustPoint } from "@/lib/category-page/types";
import { PAGE_STATS } from "@/lib/category-page/types";
import { PAGE_LIMITS } from "@/lib/category-page/validation";
import { IconPicker, ImageSlot } from "./parts";

export type Fallbacks = { name: string; description: string | null; badge: string | null; imageUrl: string | null };

// Ready-made points that are true for every store-based category.
const SUGGESTED_POINTS: TrustPoint[] = [
  { icon: "store", text: "Sold by local shops near you" },
  { icon: "scale", text: "Compare prices across stores" },
  { icon: "badge-check", text: "Pick the store you'd like to buy from" },
];

// The hero panel: words, pictures, trust points and stats. Empty fields use the
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
  uploading: PageImagePurpose | null;
  onUpload: (purpose: PageImagePurpose, file: File) => void;
}) {
  const points = hero.trustPoints ?? [];
  const stats = hero.stats ?? [];
  const setPoint = (i: number, patch: Partial<TrustPoint>) => onChange({ trustPoints: points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const offered = PAGE_STATS.filter((s) => !(s.topLevelOnly && isSubcategory));
  const gallery = images.map((img) => ({ imageId: img.imageId, url: urlOf(img.imageId) ?? img.url }));

  function toggleStat(stat: PageStat) {
    onChange({ stats: stats.includes(stat) ? stats.filter((s) => s !== stat) : [...stats, stat].slice(0, PAGE_LIMITS.stats) });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Headline" name="headline" optional autoComplete="off" maxLength={PAGE_LIMITS.headline} placeholder={fallbacks.name} value={hero.headline ?? ""} onChange={(v) => onChange({ headline: v })} error={errors["hero.headline"]} hint="Empty = the category name." />
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
      <TextField label="Badge" name="badge" optional autoComplete="off" maxLength={PAGE_LIMITS.badge} placeholder={fallbacks.badge ?? "Seasonal"} value={hero.badge ?? ""} onChange={(v) => onChange({ badge: v })} error={errors["hero.badge"]} hint="A short pill above the headline." />

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

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Trust points</legend>
        <p className="mb-2 text-sm text-muted">Up to {PAGE_LIMITS.trustPoints} short lines with an icon. Only promise what every store really does.</p>
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li key={i}>
              <div className="flex items-start gap-2">
                <IconPicker label={`Point ${i + 1} icon`} value={p.icon} onChange={(icon) => setPoint(i, { icon })} />
                <input
                  aria-label={`Point ${i + 1}`}
                  value={p.text}
                  maxLength={PAGE_LIMITS.trustText}
                  onChange={(e) => setPoint(i, { text: e.target.value })}
                  aria-invalid={!!errors[`hero.trustPoints[${i}].text`]}
                  className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${errors[`hero.trustPoints[${i}].text`] ? "border-red-500" : "border-line focus:border-ink"}`}
                />
                {i > 0 && (
                  <button type="button" onClick={() => onChange({ trustPoints: points.map((x, j) => (j === i - 1 ? p : j === i ? points[i - 1] : x)) })} aria-label={`Move point ${i + 1} up`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                )}
                <button type="button" onClick={() => onChange({ trustPoints: points.filter((_, j) => j !== i) })} aria-label={`Remove point ${i + 1}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-red-700 hover:ring-red-300">
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
              {errors[`hero.trustPoints[${i}].text`] && <p className="mt-1 text-sm text-red-700">{errors[`hero.trustPoints[${i}].text`]}</p>}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {points.length < PAGE_LIMITS.trustPoints && (
            <button type="button" onClick={() => onChange({ trustPoints: [...points, { icon: "store", text: "" }] })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <Plus aria-hidden className="size-4" />
              Add point
            </button>
          )}
          {points.length === 0 && (
            <button type="button" onClick={() => onChange({ trustPoints: SUGGESTED_POINTS })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <Wand2 aria-hidden className="size-4" />
              Use suggested points
            </button>
          )}
        </div>
        {errors["hero.trustPoints"] && <p className="mt-1.5 text-sm text-red-700">{errors["hero.trustPoints"]}</p>}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Counts to show</legend>
        <p className="mb-2 text-sm text-muted">In the order you tap them. A count of 0 is hidden on the page.</p>
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
      </fieldset>
    </div>
  );
}
