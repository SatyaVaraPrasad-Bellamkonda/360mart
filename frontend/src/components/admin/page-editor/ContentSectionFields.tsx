"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { TextField } from "@/components/auth/AuthFields";
import { PromoBanner } from "@/components/category-page/ContentBlocks";
import { RichTextField } from "@/components/RichTextField";
import type { FaqItem, FaqPageSection, PromoBannerSection, TextBlockSection, TrustStripSection } from "@/lib/category-page/types";
import { PAGE_LIMITS } from "@/lib/category-page/validation";
import { ImageSlot, PointsEditor } from "./parts";

export type PageLink = { label: string; path: string };
export type BannerPictures = {
  gallery: { imageId: string; url: string }[];
  urlOf: (imageId: string | null | undefined) => string | null;
  /** The slot being uploaded ("banner:<id>", "banner-mobile:<id>"), or null. */
  uploading: string | null;
  onUpload: (sectionId: string, mobile: boolean, file: File) => void;
};

// The fields of the content sections (offer banner, text block, trust strip,
// questions). Errors are keyed by the backend's paths: `${at}.headline`.

export function PromoBannerFields({
  section: s,
  at,
  errors,
  update,
  pictures,
  links,
}: {
  section: PromoBannerSection;
  at: string;
  errors: Record<string, string>;
  update: (patch: Partial<PromoBannerSection>) => void;
  pictures: BannerPictures;
  links: PageLink[];
}) {
  const link = s.linkPath ?? "";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ImageSlot
          label="Picture"
          hint="Wide, about 1600 × 500 px. JPEG or PNG, up to 2 MB."
          url={pictures.urlOf(s.imageId)}
          usingDefault={!s.imageId}
          defaultLabel="No picture"
          images={pictures.gallery}
          uploading={pictures.uploading === `banner:${s.id}`}
          error={errors[`${at}.imageId`]}
          onUpload={(file) => pictures.onUpload(s.id, false, file)}
          onPick={(img) => update({ imageId: img.imageId })}
          onClear={() => update({ imageId: null })}
        />
        <ImageSlot
          label="Phone picture (optional)"
          hint="A taller crop for phones, about 1080 × 810 px. Empty = the picture above."
          url={pictures.urlOf(s.mobileImageId)}
          usingDefault={!s.mobileImageId}
          defaultLabel="Same as picture"
          images={pictures.gallery}
          uploading={pictures.uploading === `banner-mobile:${s.id}`}
          error={errors[`${at}.mobileImageId`]}
          onUpload={(file) => pictures.onUpload(s.id, true, file)}
          onPick={(img) => update({ mobileImageId: img.imageId })}
          onClear={() => update({ mobileImageId: null })}
        />
      </div>
      <TextField label="Headline" name={`headline-${s.id}`} autoComplete="off" maxLength={PAGE_LIMITS.bannerHeadline} placeholder="Alphonso season is here" value={s.headline ?? ""} onChange={(v) => update({ headline: v })} error={errors[`${at}.headline`]} />
      <TextField label="Text" name={`text-${s.id}`} optional autoComplete="off" maxLength={PAGE_LIMITS.bannerText} placeholder="Straight from Ratnagiri, at stores near you" value={s.text ?? ""} onChange={(v) => update({ text: v })} error={errors[`${at}.text`]} />
      <TextField
        label="Picture description"
        name={`alt-${s.id}`}
        optional
        autoComplete="off"
        maxLength={PAGE_LIMITS.imageAlt}
        value={s.imageAlt ?? ""}
        onChange={(v) => update({ imageAlt: v })}
        error={errors[`${at}.imageAlt`]}
        hint="What the picture shows, for screen readers."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Link"
          name={`link-${s.id}`}
          optional
          autoComplete="off"
          maxLength={201}
          placeholder="/fruits/mangoes"
          value={link}
          onChange={(v) => update({ linkPath: v.toLowerCase().replace(/\s+/g, "") })}
          error={errors[`${at}.linkPath`]}
          hint="A page on 360mart. Empty = no button."
        />
        <TextField label="Button text" name={`button-${s.id}`} optional autoComplete="off" maxLength={PAGE_LIMITS.buttonLabel} placeholder="Shop now" value={s.buttonLabel ?? ""} onChange={(v) => update({ buttonLabel: v })} error={errors[`${at}.buttonLabel`]} />
      </div>
      {links.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Link to</p>
          <div className="-mx-1 flex flex-wrap gap-1.5">
            {links.map((l) => (
              <button
                key={l.path}
                type="button"
                aria-pressed={link === l.path}
                onClick={() => update({ linkPath: l.path, buttonLabel: s.buttonLabel?.trim() ? s.buttonLabel : "Shop now" })}
                className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {s.headline?.trim() && (
        <div aria-hidden className="pointer-events-none">
          <p className="mb-1.5 text-xs font-semibold text-muted">How it looks</p>
          <PromoBanner section={{ ...s, title: null }} image={{ imageUrl: pictures.urlOf(s.imageId), mobileImageUrl: pictures.urlOf(s.mobileImageId) }} id={`preview-${s.id}`} />
        </div>
      )}
    </div>
  );
}

export function TextBlockFields({ section: s, at, errors, update }: { section: TextBlockSection; at: string; errors: Record<string, string>; update: (patch: Partial<TextBlockSection>) => void }) {
  return (
    <RichTextField
      label="Text"
      name={`body-${s.id}`}
      rows={7}
      maxLength={PAGE_LIMITS.body}
      placeholder={"How to pick a good mango:\n- Smell the stem end\n- Soft, not mushy"}
      value={s.body ?? ""}
      onChange={(v) => update({ body: v })}
      error={errors[`${at}.body`]}
      previewClassName="text-base leading-relaxed text-muted"
    />
  );
}

export function TrustStripFields({ section: s, at, errors, update }: { section: TrustStripSection; at: string; errors: Record<string, string>; update: (patch: Partial<TrustStripSection>) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">Points</legend>
      <p className="mb-2 text-sm text-muted">
        {PAGE_LIMITS.stripMin} to {PAGE_LIMITS.stripMax} short promises. Only promise what every store really does.
      </p>
      <PointsEditor points={s.points ?? []} onChange={(points) => update({ points })} max={PAGE_LIMITS.stripMax} path={`${at}.points`} errors={errors} />
    </fieldset>
  );
}

export function FaqFields({ section: s, at, errors, update }: { section: FaqPageSection; at: string; errors: Record<string, string>; update: (patch: Partial<FaqPageSection>) => void }) {
  const items = s.items ?? [];
  const set = (next: FaqItem[]) => update({ items: next });
  const move = (i: number, by: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set(next);
  };
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="text-sm font-semibold text-ink">Questions</legend>
      <p className="text-sm text-muted">Up to {PAGE_LIMITS.faqMax}. Real questions shoppers ask; Google can show them in search results too.</p>
      {errors[`${at}.items`] && <p className="text-sm text-red-700">{errors[`${at}.items`]}</p>}
      <ol className="space-y-3">
        {items.map((q, i) => (
          <li key={i} className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">Question {i + 1}</p>
              <div className="flex gap-1.5">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move question ${i + 1} up`} className="flex size-10 items-center justify-center rounded-xl bg-white text-muted ring-1 ring-line hover:text-ink hover:ring-ink disabled:opacity-40">
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move question ${i + 1} down`} className="flex size-10 items-center justify-center rounded-xl bg-white text-muted ring-1 ring-line hover:text-ink hover:ring-ink disabled:opacity-40">
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                {items.length > 1 && (
                  <button type="button" onClick={() => set(items.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`} className="flex size-10 items-center justify-center rounded-xl bg-white text-muted ring-1 ring-line hover:text-red-700 hover:ring-red-300">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <TextField
              label="Question"
              name={`question-${s.id}-${i}`}
              autoComplete="off"
              maxLength={PAGE_LIMITS.question}
              placeholder="Are the mangoes carbide-free?"
              value={q.question}
              onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, question: v } : x)))}
              error={errors[`${at}.items[${i}].question`]}
            />
            <RichTextField
              label="Answer"
              name={`answer-${s.id}-${i}`}
              rows={3}
              maxLength={PAGE_LIMITS.answer}
              value={q.answer}
              onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, answer: v } : x)))}
              error={errors[`${at}.items[${i}].answer`]}
              previewClassName="text-sm leading-relaxed text-muted"
            />
          </li>
        ))}
      </ol>
      {items.length < PAGE_LIMITS.faqMax && (
        <button type="button" onClick={() => set([...items, { question: "", answer: "" }])} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
          <Plus aria-hidden className="size-4" />
          Add question
        </button>
      )}
    </fieldset>
  );
}
