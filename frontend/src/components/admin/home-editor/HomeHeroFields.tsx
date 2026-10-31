"use client";

import { EyeOff, Image as ImageIcon, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { TextField } from "@/components/auth/AuthFields";
import { RichTextField } from "@/components/RichTextField";
import { ANIMATIONS, LAYOUT_ART, LAYOUTS } from "@/components/admin/page-editor/HeroFields";
import { ChoiceCards, ImageSlot, Segmented, Switch } from "@/components/admin/page-editor/parts";
import type { Category } from "@/lib/catalog/types";
import { heroDisplay, type PageImage } from "@/lib/category-page/types";
import { HOME_DEFAULTS, STANDARD_FLOATING_LABELS, type HomeHeroDoc } from "@/lib/home-page/types";
import { HOME_LIMITS } from "@/lib/home-page/validation";

type LabelsMode = "STANDARD" | "OWN" | "NONE";

// The home banner panel: shown or not, the animated cart or a photo, its
// look, the words (empty = the standard copy, shown as placeholders), the
// button and the cart's floating labels.
export function HomeHeroFields({
  hero,
  onChange,
  errors,
  categories,
  images,
  urlOf,
  uploading,
  onUpload,
}: {
  hero: HomeHeroDoc;
  onChange: (patch: Partial<HomeHeroDoc>) => void;
  errors: Record<string, string>;
  categories: Category[];
  images: PageImage[];
  urlOf: (imageId: string | null | undefined) => string | null;
  uploading: string | null;
  onUpload: (slot: "HERO" | "HERO_MOBILE", file: File) => void;
}) {
  const look = heroDisplay(hero);
  const cart = hero.visual !== "PHOTO";
  const gallery = images.map((img) => ({ imageId: img.imageId, url: urlOf(img.imageId) ?? img.url }));
  const labels = hero.floatingLabels;
  const labelsMode: LabelsMode = labels == null ? "STANDARD" : labels.length === 0 ? "NONE" : "OWN";
  const links = [
    { label: "Categories on this page", path: "/#categories" },
    { label: "All categories", path: "/categories" },
    ...categories.slice(0, 8).map((c) => ({ label: c.name, path: `/${c.slug}` })),
  ];

  // A link needs its button text (the backend's rule): an empty one gets the standard text.
  const setLink = (buttonLink: string) => onChange(hero.buttonLabel?.trim() ? { buttonLink } : { buttonLink, buttonLabel: HOME_DEFAULTS.buttonLabel });

  const headline = (
    <TextField label="Headline" name="headline" optional autoComplete="off" maxLength={HOME_LIMITS.headline} placeholder={HOME_DEFAULTS.headline} value={hero.headline ?? ""} onChange={(v) => onChange({ headline: v })} error={errors["hero.headline"]} hint="Empty = the standard headline." />
  );

  if (!look.enabled) {
    return (
      <div className="space-y-5">
        <Switch checked={false} onChange={(v) => onChange({ enabled: v })} label="Show the banner" />
        <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
          <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          The home page starts straight with your sections. The headline below isn&apos;t shown, but Google and screen readers still read it as the page&apos;s title, so make it describe the site. Your other banner settings are kept for when you switch it back on.
        </p>
        {headline}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Switch checked onChange={(v) => onChange({ enabled: v })} label="Show the banner" />
      <ChoiceCards
        label="Beside the words"
        columns="grid-cols-2"
        value={cart ? "CART_ANIMATION" : "PHOTO"}
        options={[
          { value: "CART_ANIMATION", label: "Animated cart", text: "The 360mart cart with floating labels", art: <VisualArt icon={ShoppingCart} /> },
          { value: "PHOTO", label: "Photo", text: "A picture you upload", art: <VisualArt icon={ImageIcon} /> },
        ]}
        onChange={(visual) => onChange(visual === "CART_ANIMATION" && look.layout === "IMAGE_BACKGROUND" ? { visual, layout: "IMAGE_RIGHT" } : { visual })}
      />
      <ChoiceCards
        label="Layout"
        value={look.layout}
        options={LAYOUTS.map((l) => ({ ...l, art: LAYOUT_ART[l.value], disabled: cart && l.value === "IMAGE_BACKGROUND", text: cart && l.value === "IMAGE_BACKGROUND" ? "Needs a photo" : l.text }))}
        onChange={(layout) => onChange({ layout })}
      />
      <Segmented
        label="Size"
        value={look.size}
        options={[
          { value: "LARGE", label: "Large" },
          { value: "COMPACT", label: "Compact" },
        ]}
        onChange={(size) => onChange({ size })}
      />
      <ChoiceCards
        label="Entrance animation"
        hint="Plays once when the page opens. The cart has its own motion too. Shoppers who turned off motion on their phone see no animation."
        value={look.animation}
        options={ANIMATIONS.map((a) => ({ ...a, disabled: a.value === "SLOW_ZOOM" && (cart || look.layout === "TEXT_ONLY") }))}
        onChange={(animation) => onChange({ animation })}
      />

      <div className="space-y-4 border-t border-line pt-5">
        <div className="space-y-2">
          <Switch checked={look.showBadge} onChange={(v) => onChange({ showBadge: v })} label="Show a badge" />
          {look.showBadge && (
            <TextField label="Badge" name="badge" optional autoComplete="off" maxLength={HOME_LIMITS.badge} placeholder={HOME_DEFAULTS.badge} value={hero.badge ?? ""} onChange={(v) => onChange({ badge: v })} error={errors["hero.badge"]} hint="A short pill above the headline." />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {headline}
          <TextField
            label="Coloured second line"
            name="accentLine"
            optional
            autoComplete="off"
            maxLength={HOME_LIMITS.accentLine}
            placeholder={HOME_DEFAULTS.accentLine}
            value={hero.accentLine ?? ""}
            onChange={(v) => onChange({ accentLine: v })}
            error={errors["hero.accentLine"]}
            hint="Shown in 360mart gold."
          />
        </div>
        <RichTextField
          label="Intro"
          name="intro"
          optional
          rows={3}
          maxLength={HOME_LIMITS.intro}
          placeholder={HOME_DEFAULTS.intro}
          value={hero.intro ?? ""}
          onChange={(v) => onChange({ intro: v })}
          error={errors["hero.intro"]}
          hint="Empty = the standard intro."
          previewClassName="text-base leading-relaxed text-muted"
        />
      </div>

      <fieldset className="min-w-0 space-y-3 border-t border-line pt-5">
        <legend className="sr-only">Button</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Button text" name="buttonLabel" optional autoComplete="off" maxLength={HOME_LIMITS.buttonLabel} placeholder={HOME_DEFAULTS.buttonLabel} value={hero.buttonLabel ?? ""} onChange={(v) => onChange({ buttonLabel: v })} error={errors["hero.buttonLabel"]} />
          <TextField
            label="Button link"
            name="buttonLink"
            optional
            autoComplete="off"
            maxLength={242}
            placeholder={HOME_DEFAULTS.buttonLink}
            value={hero.buttonLink ?? ""}
            onChange={(v) => setLink(v.toLowerCase().replace(/\s+/g, ""))}
            error={errors["hero.buttonLink"]}
            hint="A page on 360mart."
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Link to</p>
          <div className="flex flex-wrap gap-1.5">
            {links.map((l) => (
              <button
                key={l.path}
                type="button"
                aria-pressed={(hero.buttonLink || HOME_DEFAULTS.buttonLink) === l.path}
                onClick={() => setLink(l.path)}
                className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {look.layout !== "TEXT_ONLY" && cart && (
        <fieldset className="min-w-0 space-y-3 border-t border-line pt-5">
          <legend className="sr-only">Floating labels</legend>
          <Segmented<LabelsMode>
            label="Labels floating around the cart"
            value={labelsMode}
            options={[
              { value: "STANDARD", label: "Standard" },
              { value: "OWN", label: "My own" },
              { value: "NONE", label: "None" },
            ]}
            onChange={(mode) => onChange({ floatingLabels: mode === "STANDARD" ? null : mode === "NONE" ? [] : labels?.length ? labels : [...STANDARD_FLOATING_LABELS] })}
          />
          {labelsMode === "STANDARD" && <p className="text-sm text-muted">{STANDARD_FLOATING_LABELS.join(" · ")}</p>}
          {labelsMode === "OWN" && labels && (
            <div className="space-y-2">
              {labels.map((label, i) => {
                const error = errors[`hero.floatingLabels[${i}]`];
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Label ${i + 1}`}
                        value={label}
                        maxLength={HOME_LIMITS.floatingLabel}
                        onChange={(e) => onChange({ floatingLabels: labels.map((x, j) => (j === i ? e.target.value : x)) })}
                        aria-invalid={!!error}
                        className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
                      />
                      <button type="button" onClick={() => onChange({ floatingLabels: labels.filter((_, j) => j !== i) })} aria-label={`Remove label ${i + 1}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-red-700 hover:ring-red-300">
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                    {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
                  </div>
                );
              })}
              {labels.length < HOME_LIMITS.floatingLabels && (
                <button type="button" onClick={() => onChange({ floatingLabels: [...labels, ""] })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                  <Plus aria-hidden className="size-4" />
                  Add label
                </button>
              )}
              {errors["hero.floatingLabels"] && <p className="text-sm text-red-700">{errors["hero.floatingLabels"]}</p>}
            </div>
          )}
        </fieldset>
      )}

      {look.layout !== "TEXT_ONLY" && !cart && (
        <div className="space-y-4 border-t border-line pt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageSlot
              label="Banner photo"
              hint="Wide, at least 1600 px across. JPEG or PNG, up to 2 MB."
              url={urlOf(hero.imageId)}
              usingDefault={!hero.imageId}
              defaultLabel="No picture"
              images={gallery}
              uploading={uploading === "HERO"}
              error={errors["hero.imageId"]}
              onUpload={(file) => onUpload("HERO", file)}
              onPick={(img) => onChange({ imageId: img.imageId })}
              onClear={() => onChange({ imageId: null })}
            />
            <ImageSlot
              label="Phone photo (optional)"
              hint="A taller crop for phones, about 1080 px across. Empty = the banner photo."
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
            label="Photo description"
            name="imageAlt"
            optional
            autoComplete="off"
            maxLength={HOME_LIMITS.imageAlt}
            placeholder={HOME_DEFAULTS.imageAlt}
            value={hero.imageAlt ?? ""}
            onChange={(v) => onChange({ imageAlt: v })}
            error={errors["hero.imageAlt"]}
            hint="What the photo shows, for screen readers and Google Images."
          />
        </div>
      )}
    </div>
  );
}

function VisualArt({ icon: Icon }: { icon: typeof ShoppingCart }) {
  return (
    <span aria-hidden className="flex h-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#fdf1dc] to-white ring-1 ring-line">
      <Icon className="size-7 text-brand-deep" />
    </span>
  );
}
