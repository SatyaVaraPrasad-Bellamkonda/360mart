"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Clapperboard, Film, ImageIcon, LoaderCircle, Palette, Plus, ShoppingCart, Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { ChoiceCards, ImageSlot, Segmented, Switch } from "@/components/admin/page-editor/parts";
import { Dialog } from "@/components/Dialog";
import { RichTextField } from "@/components/RichTextField";
import { useNow } from "@/components/support/Deadline";
import type { Category } from "@/lib/catalog/types";
import type { PageImage, PageImagePurpose } from "@/lib/category-page/types";
import { headlineOptional, HERO_LIMITS, newSlide, VIDEO_MAX_BYTES, VIDEO_TYPES } from "@/lib/home-page/hero";
import {
  HERO_BACKGROUNDS, HOME_DEFAULTS, STANDARD_FLOATING_LABELS, type HeroBackground, type HeroFocus, type HeroOverlay, type HeroSideCard, type HeroSlide,
  type HeroSlideKind, type HeroTextPosition, type HomeHeroDoc, type PageVideo, type PageVideoPurpose, type SideCardTone,
} from "@/lib/home-page/types";
import { DateTime } from "./HtmlBlockFields";

type Upload = (purpose: PageImagePurpose, slot: string, file: File, apply: (imageId: string) => void) => void;
type UploadVideo = (purpose: PageVideoPurpose, slot: string, file: File, apply: (videoId: string) => void) => void;

const KINDS: { value: HeroSlideKind; label: string; text: string; icon: typeof ImageIcon }[] = [
  { value: "PHOTO", label: "Photo", text: "A full photo with your words on it", icon: ImageIcon },
  { value: "VIDEO", label: "Video", text: "A silent looping video, with a still picture first", icon: Film },
  { value: "CART", label: "Animated cart", text: "The 360mart cart with floating labels", icon: ShoppingCart },
  { value: "COLOUR", label: "Colour", text: "A colour background, words only", icon: Palette },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<HeroSlideKind, string>;

// The colour swatches (same gradients as the shop banner, simplified).
const SWATCH: Record<HeroBackground, { name: string; css: string; dark: boolean }> = {
  AMBER: { name: "Amber", css: "linear-gradient(135deg,#fde68a,#f59e0b 55%,#d97706)", dark: false },
  INK: { name: "Night", css: "linear-gradient(135deg,#334155,#0f172a 60%,#020617)", dark: true },
  FOREST: { name: "Forest", css: "linear-gradient(135deg,#10b981,#065f46 55%,#022c22)", dark: true },
  BERRY: { name: "Berry", css: "linear-gradient(135deg,#f472b6,#9d174d 55%,#4a0620)", dark: true },
  SKY: { name: "Sky", css: "linear-gradient(135deg,#ffffff,#e0f2fe 40%,#7dd3fc)", dark: false },
  SAND: { name: "Sand", css: "linear-gradient(135deg,#ffffff,#fef3c7 45%,#fde68a)", dark: false },
};
const TONES: { value: SideCardTone; name: string; css: string }[] = [
  { value: "PEACH", name: "Peach", css: "#ffe7d9" },
  { value: "MINT", name: "Mint", css: "#dcf5e8" },
  { value: "SKY", name: "Sky", css: "#e0effe" },
  { value: "SAND", name: "Sand", css: "#fbf0d9" },
];

// The home banner's editor: slides (add up to 5, reorder, remove; edit the
// chosen one), how the banner sits on the page, and the card beside it.
// `selected` is shared with the live preview, which shows that slide.
export function HomeHeroFields({
  hero,
  onChange,
  errors,
  categories,
  images,
  videos,
  imageUrl,
  videoUrl,
  uploading,
  progress,
  onUpload,
  onUploadVideo,
  selected,
  onSelect,
}: {
  hero: HomeHeroDoc;
  onChange: (patch: Partial<HomeHeroDoc>) => void;
  errors: Record<string, string>;
  categories: Category[];
  images: PageImage[];
  videos: PageVideo[];
  imageUrl: (id: string | null | undefined) => string | null;
  videoUrl: (id: string | null | undefined) => string | null;
  uploading: string | null;
  /** slot → share uploaded (0–1) while a video is on its way. */
  progress: Record<string, number>;
  onUpload: Upload;
  onUploadVideo: UploadVideo;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const slides = hero.slides ?? [];
  const [adding, setAdding] = useState(false);
  const current = slides[Math.min(selected, slides.length - 1)];
  const at = (i: number) => `hero.slides[${i}]`;
  const links = [
    { label: "Categories on this page", path: "/#categories" },
    { label: "All categories", path: "/categories" },
    ...categories.slice(0, 8).map((c) => ({ label: c.name, path: `/${c.slug}` })),
  ];
  const gallery = images.filter((i) => i.purpose !== "HTML").map((img) => ({ imageId: img.imageId, url: imageUrl(img.imageId) ?? img.url }));

  const setSlides = (next: HeroSlide[]) => onChange({ slides: next });
  const setSlide = (i: number, patch: Partial<HeroSlide>) => setSlides(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  function add(kind: HeroSlideKind) {
    setSlides([...slides, newSlide(kind, slides.map((s) => s.id))]);
    onSelect(slides.length);
    setAdding(false);
  }
  function move(i: number, by: number) {
    const to = i + by;
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[i], next[to]] = [next[to], next[i]];
    setSlides(next);
    onSelect(to);
  }
  function remove(i: number) {
    setSlides(slides.filter((_, j) => j !== i));
    onSelect(Math.max(0, Math.min(selected, slides.length - 2)));
  }
  const slideHasError = (i: number) => Object.keys(errors).some((k) => k.startsWith(`${at(i)}.`) || k === at(i));

  return (
    <div className="min-w-0 space-y-6">
      <Switch checked={hero.enabled !== false} onChange={(enabled) => onChange({ enabled })} label="Show the banner" />

      {hero.enabled !== false && (
        <>
          {/* ---- slides ---- */}
          <section aria-label="Slides" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                Slides <span className="font-normal text-muted">({slides.length} of {HERO_LIMITS.slides})</span>
              </p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                disabled={slides.length >= HERO_LIMITS.slides}
                className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-40"
              >
                <Plus aria-hidden className="size-4" />
                Add slide
              </button>
            </div>
            {errors["hero.slides"] && <p className="text-sm text-red-700">{errors["hero.slides"]}</p>}
            <ol className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {slides.map((s, i) => {
                const picked = i === selected;
                const thumb = s.kind === "PHOTO" || s.kind === "VIDEO" ? imageUrl(s.imageId) : null;
                const Icon = KINDS.find((k) => k.value === s.kind)?.icon ?? ImageIcon;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      aria-pressed={picked}
                      className={`relative flex w-36 flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 transition ${picked ? "ring-2 ring-ink" : slideHasError(i) ? "ring-2 ring-red-400" : "ring-line hover:ring-ink/40"}`}
                    >
                      <span className="relative block aspect-[16/9] w-full overflow-hidden" style={thumb ? undefined : { background: SWATCH[s.background ?? "INK"].css }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded or local picture */}
                        {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                          <Icon aria-hidden className="size-3" />
                          {i + 1}
                        </span>
                        {(s.startsAt || s.endsAt) && <CalendarClock aria-label="Scheduled" className="absolute right-1.5 top-1.5 size-5 rounded-full bg-black/45 p-1 text-white" />}
                      </span>
                      <span className="block truncate px-2.5 py-2 text-xs font-semibold text-ink">{s.headline?.trim() || KIND_LABEL[s.kind]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {current && (
            <SlideEditor
              key={current.id}
              slide={current}
              index={Math.min(selected, slides.length - 1)}
              count={slides.length}
              errors={errors}
              links={links}
              gallery={gallery}
              videos={videos}
              imageUrl={imageUrl}
              videoUrl={videoUrl}
              uploading={uploading}
              progress={progress}
              onUpload={onUpload}
              onUploadVideo={onUploadVideo}
              update={(patch) => setSlide(Math.min(selected, slides.length - 1), patch)}
              onMove={(by) => move(Math.min(selected, slides.length - 1), by)}
              onRemove={() => remove(Math.min(selected, slides.length - 1))}
            />
          )}

          {/* ---- the banner as a whole ---- */}
          <section aria-label="Banner settings" className="space-y-4 border-t border-line pt-5">
            <p className="text-sm font-semibold text-ink">How the banner sits on the page</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Segmented label="Frame" value={hero.frame ?? "CARD"} options={[{ value: "CARD", label: "Rounded card" }, { value: "FULL_WIDTH", label: "Edge to edge" }]} onChange={(frame) => onChange({ frame })} />
              <Segmented label="Height on computers" value={hero.height ?? "MEDIUM"} options={[{ value: "COMPACT", label: "Compact" }, { value: "MEDIUM", label: "Medium" }, { value: "TALL", label: "Tall" }]} onChange={(height) => onChange({ height })} />
              <Segmented label="Shape on phones" value={hero.mobileShape ?? "PORTRAIT"} options={[{ value: "SQUARE", label: "Square" }, { value: "PORTRAIT", label: "Tall 4:5" }, { value: "WIDE", label: "Wide 16:9" }]} onChange={(mobileShape) => onChange({ mobileShape })} />
              <div className="space-y-2">
                <Switch checked={hero.autoplay !== false} onChange={(autoplay) => onChange({ autoplay })} label="Move to the next slide by itself" />
                {hero.autoplay !== false && slides.length > 1 && (
                  <label className="block text-sm text-ink">
                    Every <span className="font-bold">{hero.intervalSeconds ?? 6} seconds</span>
                    <input
                      type="range"
                      min={HERO_LIMITS.intervalMin}
                      max={HERO_LIMITS.intervalMax}
                      value={hero.intervalSeconds ?? 6}
                      onChange={(e) => onChange({ intervalSeconds: Number(e.target.value) })}
                      className="mt-1 block h-10 w-full accent-ink"
                    />
                  </label>
                )}
                {errors["hero.intervalSeconds"] && <p className="text-sm text-red-700">{errors["hero.intervalSeconds"]}</p>}
              </div>
            </div>
          </section>

          {/* ---- side card ---- */}
          <SideCardFields
            card={hero.sideCard ?? null}
            onChange={(sideCard) => onChange({ sideCard })}
            errors={errors}
            links={links}
            gallery={gallery}
            imageUrl={imageUrl}
            uploading={uploading}
            onUpload={onUpload}
          />
        </>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a slide" description="You can change any of it after.">
        <ul className="grid gap-2 pb-5 sm:grid-cols-2">
          {KINDS.map((k) => (
            <li key={k.value}>
              <button type="button" onClick={() => add(k.value)} className="flex min-h-20 w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-line transition hover:ring-2 hover:ring-ink">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-line">
                  <k.icon aria-hidden className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{k.label}</span>
                  <span className="block text-sm text-muted">{k.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

// ---- one slide ----

type Links = { label: string; path: string }[];
type Gallery = { imageId: string; url: string }[];

function SlideEditor({
  slide: s,
  index,
  count,
  errors,
  links,
  gallery,
  videos,
  imageUrl,
  videoUrl,
  uploading,
  progress,
  onUpload,
  onUploadVideo,
  update,
  onMove,
  onRemove,
}: {
  slide: HeroSlide;
  index: number;
  count: number;
  errors: Record<string, string>;
  links: Links;
  gallery: Gallery;
  videos: PageVideo[];
  imageUrl: (id: string | null | undefined) => string | null;
  videoUrl: (id: string | null | undefined) => string | null;
  uploading: string | null;
  progress: Record<string, number>;
  onUpload: Upload;
  onUploadVideo: UploadVideo;
  update: (patch: Partial<HeroSlide>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const at = `hero.slides[${index}]`;
  const err = (f: string) => errors[`${at}.${f}`];
  const media = s.kind === "PHOTO" || s.kind === "VIDEO";
  const slot = (f: string) => `slide:${s.id}:${f}`;

  return (
    <section aria-label={`Slide ${index + 1}`} className="space-y-5 rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-bold text-ink">
          Slide {index + 1} <span className="font-normal text-muted">· {KIND_LABEL[s.kind]}</span>
        </p>
        <div className="flex items-center gap-1">
          <IconButton label="Move earlier" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowLeft aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="Move later" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowRight aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="Remove this slide" danger onClick={onRemove}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>

      <ChoiceCards<HeroSlideKind>
        label="What it shows"
        value={s.kind}
        columns="grid-cols-2 sm:grid-cols-4"
        options={KINDS.map((k) => ({ value: k.value, label: k.label, text: k.text, art: <KindArt kind={k.value} /> }))}
        onChange={(kind) => update({ kind, overlay: kind === "PHOTO" || kind === "VIDEO" ? (s.overlay === "NONE" ? "LEFT_FADE" : s.overlay) : "NONE", textTone: kind === "PHOTO" || kind === "VIDEO" ? "LIGHT" : SWATCH[s.background ?? "INK"].dark ? "LIGHT" : "DARK" })}
      />

      {/* ---- the picture, video or colour ---- */}
      {s.kind === "VIDEO" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <VideoSlot
            label="Video"
            hint="MP4 or WebM, up to 20 MB. Best: 10–20 seconds, 1280×720, no sound needed."
            purpose="HERO"
            url={videoUrl(s.videoId)}
            error={err("videoId")}
            videos={videos.filter((v) => v.purpose === "HERO")}
            progress={progress[slot("video")]}
            onUpload={(file) => onUploadVideo("HERO", slot("video"), file, (videoId) => update({ videoId }))}
            onPick={(videoId) => update({ videoId })}
            onClear={() => update({ videoId: null })}
          />
          <VideoSlot
            label="Phone video (optional)"
            hint="A lighter version for phones, up to 8 MB: shorter, or 720×900 portrait."
            purpose="HERO_MOBILE"
            url={videoUrl(s.mobileVideoId)}
            error={err("mobileVideoId")}
            videos={videos.filter((v) => v.purpose === "HERO_MOBILE")}
            progress={progress[slot("mobileVideo")]}
            onUpload={(file) => onUploadVideo("HERO_MOBILE", slot("mobileVideo"), file, (mobileVideoId) => update({ mobileVideoId }))}
            onPick={(mobileVideoId) => update({ mobileVideoId })}
            onClear={() => update({ mobileVideoId: null })}
            disabled={s.videoOnPhones === false}
          />
          <div className="lg:col-span-2">
            <Switch checked={s.videoOnPhones !== false} onChange={(videoOnPhones) => update({ videoOnPhones })} label="Play the video on phones too" />
            <p className="mt-1 text-sm text-muted">Off: phones show the still picture and save their data. Phones with data saver on never play it.</p>
          </div>
        </div>
      )}

      {media && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageSlot
            label={s.kind === "VIDEO" ? "Still picture (shows while the video loads)" : "Photo"}
            hint="Wide, at least 1600 px across. JPEG or PNG, up to 2 MB."
            url={imageUrl(s.imageId)}
            usingDefault={!s.imageId}
            defaultLabel="No picture"
            images={gallery}
            uploading={uploading === slot("image")}
            error={err("imageId")}
            onUpload={(file) => onUpload("HERO", slot("image"), file, (imageId) => update({ imageId }))}
            onPick={(img) => update({ imageId: img.imageId })}
            onClear={() => update({ imageId: null })}
          />
          <ImageSlot
            label="Phone picture (optional)"
            hint="Taller, for phones (4:5 works well). Without it, phones crop the wide one."
            url={imageUrl(s.mobileImageId)}
            usingDefault={!s.mobileImageId}
            defaultLabel="Same as above"
            images={gallery}
            uploading={uploading === slot("mobileImage")}
            error={err("mobileImageId")}
            onUpload={(file) => onUpload("HERO_MOBILE", slot("mobileImage"), file, (mobileImageId) => update({ mobileImageId }))}
            onPick={(img) => update({ mobileImageId: img.imageId })}
            onClear={() => update({ mobileImageId: null })}
          />
          <Segmented<HeroFocus>
            label="Keep in view when cropped"
            value={s.focus ?? "CENTER"}
            options={[{ value: "CENTER", label: "Centre" }, { value: "LEFT", label: "Left" }, { value: "RIGHT", label: "Right" }, { value: "TOP", label: "Top" }, { value: "BOTTOM", label: "Bottom" }]}
            onChange={(focus) => update({ focus })}
          />
          <TextField label="Picture description" name="imageAlt" optional autoComplete="off" maxLength={HERO_LIMITS.imageAlt} placeholder={HOME_DEFAULTS.imageAlt} value={s.imageAlt ?? ""} onChange={(imageAlt) => update({ imageAlt })} error={err("imageAlt")} hint="For people who can't see it, and for Google." />
        </div>
      )}

      {!media && (
        <Swatches
          label="Background"
          value={s.background ?? "INK"}
          onChange={(background) => update({ background, textTone: SWATCH[background].dark ? "LIGHT" : "DARK" })}
        />
      )}

      {s.kind === "CART" && <FloatingLabels slide={s} errors={errors} at={at} update={update} />}

      {/* ---- words ---- */}
      <div className="space-y-4 border-t border-line pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Headline"
            name="headline"
            optional={headlineOptional(s.kind)}
            autoComplete="off"
            maxLength={HERO_LIMITS.headline}
            value={s.headline ?? ""}
            onChange={(headline) => update({ headline })}
            error={err("headline")}
            hint={headlineOptional(s.kind) && !(s.headline ?? "").trim() ? "Leave empty to show only the picture or video." : `${(s.headline ?? "").length}/${HERO_LIMITS.headline}`}
          />
          <TextField label="Second line (coloured)" name="accentLine" optional autoComplete="off" maxLength={HERO_LIMITS.accentLine} value={s.accentLine ?? ""} onChange={(accentLine) => update({ accentLine })} error={err("accentLine")} />
          <TextField label="Small label above" name="badge" optional autoComplete="off" maxLength={HERO_LIMITS.badge} placeholder="Like: This weekend" value={s.badge ?? ""} onChange={(badge) => update({ badge })} error={err("badge")} />
        </div>
        <RichTextField label="Text" name="intro" optional rows={3} maxLength={HERO_LIMITS.intro} value={s.intro ?? ""} onChange={(intro) => update({ intro })} error={err("intro")} hint="Two or three short lines read best." />
        <ButtonFields title="Main button" label={s.buttonLabel ?? ""} link={s.buttonLink ?? ""} labelError={err("buttonLabel")} linkError={err("buttonLink")} links={links} onChange={(buttonLabel, buttonLink) => update({ buttonLabel, buttonLink })} />
        <ButtonFields title="Second button (optional)" label={s.secondaryLabel ?? ""} link={s.secondaryLink ?? ""} labelError={err("secondaryLabel")} linkError={err("secondaryLink")} links={links} onChange={(secondaryLabel, secondaryLink) => update({ secondaryLabel, secondaryLink })} />
      </div>

      {/* ---- look of the words ---- */}
      <div className="space-y-4 border-t border-line pt-5">
        {s.kind !== "CART" && (
          <ChoiceCards<HeroTextPosition>
            label="Where the words sit"
            value={s.textPosition ?? "LEFT"}
            columns="grid-cols-3"
            options={[
              { value: "LEFT", label: "Left", text: "Middle, on the left", art: <PlaceArt place="LEFT" /> },
              { value: "CENTER", label: "Centre", text: "In the middle", art: <PlaceArt place="CENTER" /> },
              { value: "BOTTOM_LEFT", label: "Bottom left", text: "Low, on the left", art: <PlaceArt place="BOTTOM_LEFT" /> },
            ]}
            onChange={(textPosition) => update({ textPosition })}
          />
        )}
        <Segmented label="Text colour" value={s.textTone ?? "LIGHT"} options={[{ value: "LIGHT", label: "White" }, { value: "DARK", label: "Dark" }]} onChange={(textTone) => update({ textTone })} />
        {media && (
          <>
            <ChoiceCards<HeroOverlay>
              label="Shade behind the words"
              hint="Keeps the words readable on any picture."
              value={s.overlay ?? "LEFT_FADE"}
              columns="grid-cols-2 sm:grid-cols-4"
              options={[
                { value: "NONE", label: "None", text: "The picture as it is", art: <ShadeArt shade="NONE" /> },
                { value: "LEFT_FADE", label: "From the left", text: "Behind left-side words", art: <ShadeArt shade="LEFT_FADE" /> },
                { value: "BOTTOM_FADE", label: "From the bottom", text: "Behind low words", art: <ShadeArt shade="BOTTOM_FADE" /> },
                { value: "EVEN", label: "Even", text: "The whole picture", art: <ShadeArt shade="EVEN" /> },
              ]}
              onChange={(overlay) => update({ overlay })}
            />
            {s.overlay !== "NONE" && (
              <label className="block text-sm text-ink">
                Shade strength <span className="font-bold">{s.overlayStrength ?? 45}%</span>
                <input type="range" min={0} max={HERO_LIMITS.overlayMax} step={5} value={s.overlayStrength ?? 45} onChange={(e) => update({ overlayStrength: Number(e.target.value) })} className="mt-1 block h-10 w-full accent-ink" />
              </label>
            )}
          </>
        )}
      </div>

      <SlideSchedule slide={s} error={err("endsAt")} update={update} />
    </section>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-line transition disabled:opacity-35 ${danger ? "text-red-700 hover:ring-red-300" : "text-ink hover:ring-ink"}`}>
      {children}
    </button>
  );
}

function ButtonFields({ title, label, link, labelError, linkError, links, onChange }: { title: string; label: string; link: string; labelError?: string; linkError?: string; links: Links; onChange: (label: string, link: string) => void }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-semibold text-ink">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Button text" name={`${title}-label`} optional autoComplete="off" maxLength={HERO_LIMITS.buttonLabel} value={label} onChange={(v) => onChange(v, link)} error={labelError} />
        <TextField label="Goes to" name={`${title}-link`} optional autoComplete="off" maxLength={242} placeholder="/fruits" value={link} onChange={(v) => onChange(label, v.toLowerCase().replace(/\s+/g, ""))} error={linkError} hint="A page on 360mart." />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <button
            key={l.path}
            type="button"
            aria-pressed={link === l.path}
            onClick={() => onChange(label || (l.path === "/#categories" ? HOME_DEFAULTS.buttonLabel : `Shop ${l.label.toLowerCase()}`.slice(0, HERO_LIMITS.buttonLabel)), l.path)}
            className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
          >
            {l.label}
          </button>
        ))}
        {(label || link) && (
          <button type="button" onClick={() => onChange("", "")} className="min-h-10 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
            No button
          </button>
        )}
      </div>
    </fieldset>
  );
}

type LabelsMode = "STANDARD" | "OWN" | "NONE";

function FloatingLabels({ slide: s, errors, at, update }: { slide: HeroSlide; errors: Record<string, string>; at: string; update: (patch: Partial<HeroSlide>) => void }) {
  const labels = s.floatingLabels;
  const mode: LabelsMode = labels == null ? "STANDARD" : labels.length === 0 ? "NONE" : "OWN";
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="sr-only">Floating labels</legend>
      <Segmented<LabelsMode>
        label="Labels floating around the cart"
        value={mode}
        options={[{ value: "STANDARD", label: "Standard" }, { value: "OWN", label: "My own" }, { value: "NONE", label: "None" }]}
        onChange={(m) => update({ floatingLabels: m === "STANDARD" ? null : m === "NONE" ? [] : labels?.length ? labels : [...STANDARD_FLOATING_LABELS] })}
      />
      {mode === "STANDARD" && <p className="text-sm text-muted">{STANDARD_FLOATING_LABELS.join(" · ")}</p>}
      {mode === "OWN" && labels && (
        <div className="space-y-2">
          {labels.map((label, i) => {
            const error = errors[`${at}.floatingLabels[${i}]`];
            return (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Label ${i + 1}`}
                    value={label}
                    maxLength={HERO_LIMITS.floatingLabel}
                    onChange={(e) => update({ floatingLabels: labels.map((x, j) => (j === i ? e.target.value : x)) })}
                    aria-invalid={!!error}
                    className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
                  />
                  <IconButton label={`Remove label ${i + 1}`} danger onClick={() => update({ floatingLabels: labels.filter((_, j) => j !== i) })}>
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>
                {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
              </div>
            );
          })}
          {labels.length < HERO_LIMITS.floatingLabels && (
            <button type="button" onClick={() => update({ floatingLabels: [...labels, ""] })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <Plus aria-hidden className="size-4" />
              Add label
            </button>
          )}
          {errors[`${at}.floatingLabels`] && <p className="text-sm text-red-700">{errors[`${at}.floatingLabels`]}</p>}
        </div>
      )}
    </fieldset>
  );
}

function SlideSchedule({ slide: s, error, update }: { slide: HeroSlide; error?: string; update: (patch: Partial<HeroSlide>) => void }) {
  const now = useNow();
  const t = now ?? 0;
  const status =
    !s.startsAt && !s.endsAt
      ? "Always shown."
      : s.endsAt && Date.parse(s.endsAt) <= t
        ? "Ended: shoppers don't see this slide."
        : s.startsAt && Date.parse(s.startsAt) > t
          ? "Scheduled: shows from the start time."
          : "Showing now.";
  return (
    <fieldset className="min-w-0 border-t border-line pt-5">
      <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <CalendarClock aria-hidden className="size-4" /> Show only between <span className="font-normal text-muted">(optional, India time)</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateTime label="From" value={s.startsAt ?? null} onChange={(startsAt) => update({ startsAt })} />
        <DateTime label="Until" value={s.endsAt ?? null} onChange={(endsAt) => update({ endsAt })} error={error} />
      </div>
      <p className="mt-2 text-sm text-muted">{status}</p>
    </fieldset>
  );
}

// ---- video upload ----

function VideoSlot({
  label,
  hint,
  purpose,
  url,
  error,
  videos,
  progress,
  onUpload,
  onPick,
  onClear,
  disabled,
}: {
  label: string;
  hint: string;
  purpose: PageVideoPurpose;
  url: string | null;
  error?: string;
  videos: PageVideo[];
  progress?: number;
  onUpload: (file: File) => void;
  onPick: (videoId: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [library, setLibrary] = useState(false);
  const busy = progress !== undefined;
  const max = VIDEO_MAX_BYTES[purpose];

  function chosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const bad = !(VIDEO_TYPES as readonly string[]).includes(file.type) ? "Choose an MP4 or WebM video." : file.size > max ? `This video is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${max / 1024 / 1024} MB.` : null;
    setProblem(bad);
    if (!bad) onUpload(file);
  }

  const shown = problem ?? error;
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className={`flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ${shown ? "ring-red-400" : "ring-line"}`}>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-ink ring-1 ring-line">
          {url ? (
            <video key={url} src={url} muted loop playsInline autoPlay preload="metadata" className="size-full object-cover" aria-label={label} />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-1 text-xs text-white/70">
              <Clapperboard aria-hidden className="size-6" />
              No video
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70 text-white">
              <LoaderCircle aria-hidden className="size-6 animate-spin" />
              <span className="text-sm font-semibold">Uploading {Math.round((progress ?? 0) * 100)}%</span>
              <span className="h-1.5 w-2/3 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full rounded-full bg-white transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
              </span>
            </span>
          )}
        </div>
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept={VIDEO_TYPES.join(",")} onChange={chosen} className="sr-only" aria-describedby={`${id}-hint`} tabIndex={-1} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || disabled} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
            <Upload aria-hidden className="size-4" />
            {url ? "Replace" : "Upload video"}
          </button>
          {videos.length > 0 && (
            <button type="button" onClick={() => setLibrary(true)} disabled={busy || disabled} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink disabled:opacity-60">
              <Film aria-hidden className="size-4" />
              Uploaded
            </button>
          )}
          {url && (
            <button type="button" onClick={onClear} disabled={busy} className="min-h-10 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
              Remove
            </button>
          )}
        </div>
      </div>
      {shown && <p className="mt-1.5 text-sm text-red-700">{shown}</p>}

      <Dialog open={library} onClose={() => setLibrary(false)} title="Videos uploaded for the home page" description="Pick one to use here.">
        <ul className="grid grid-cols-2 gap-3 pb-5 sm:grid-cols-3">
          {videos.map((v) => (
            <li key={v.videoId}>
              <button
                type="button"
                onClick={() => {
                  onPick(v.videoId);
                  setLibrary(false);
                }}
                className="block w-full overflow-hidden rounded-xl bg-ink text-left ring-1 ring-line transition hover:ring-2 hover:ring-ink"
              >
                <video src={v.url} muted preload="metadata" className="aspect-[16/10] w-full object-cover" aria-hidden />
                <span className="block bg-white px-2 py-1.5 text-xs text-muted">{v.sizeBytes ? `${(v.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "Video"}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

// ---- side card ----

function SideCardFields({ card, onChange, errors, links, gallery, imageUrl, uploading, onUpload }: { card: HeroSideCard | null; onChange: (card: HeroSideCard | null) => void; errors: Record<string, string>; links: Links; gallery: Gallery; imageUrl: (id: string | null | undefined) => string | null; uploading: string | null; onUpload: Upload }) {
  const err = (f: string) => errors[`hero.sideCard.${f}`];
  const set = (patch: Partial<HeroSideCard>) => card && onChange({ ...card, ...patch });
  return (
    <section aria-label="Side card" className="space-y-4 border-t border-line pt-5">
      <Switch
        checked={!!card}
        onChange={(on) => onChange(on ? { imageId: null, eyebrow: "This weekend", title: "", text: "", linkPath: "/#categories", tone: "PEACH" } : null)}
        label="Show a card beside the banner"
      />
      <p className="-mt-2 text-sm text-muted">On computers it sits to the right of the banner; on phones, under it. Good for one offer or a seasonal pick.</p>
      {card && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageSlot
            label="Card picture (optional)"
            hint="4:3 works best. JPEG or PNG, up to 2 MB."
            url={imageUrl(card.imageId)}
            usingDefault={!card.imageId}
            defaultLabel="No picture"
            images={gallery}
            uploading={uploading === "side-card"}
            error={err("imageId")}
            onUpload={(file) => onUpload("BANNER", "side-card", file, (imageId) => set({ imageId }))}
            onPick={(img) => set({ imageId: img.imageId })}
            onClear={() => set({ imageId: null })}
          />
          <div className="space-y-3">
            <TextField label="Small label" name="eyebrow" optional autoComplete="off" maxLength={HERO_LIMITS.sideEyebrow} value={card.eyebrow ?? ""} onChange={(eyebrow) => set({ eyebrow })} error={err("eyebrow")} />
            <TextField label="Title" name="sideTitle" autoComplete="off" maxLength={HERO_LIMITS.sideTitle} value={card.title ?? ""} onChange={(title) => set({ title })} error={err("title")} />
            <TextField label="Text" name="sideText" optional autoComplete="off" maxLength={HERO_LIMITS.sideText} value={card.text ?? ""} onChange={(text) => set({ text })} error={err("text")} hint={`${(card.text ?? "").length}/${HERO_LIMITS.sideText}`} />
            <TextField label="Goes to" name="sideLink" autoComplete="off" maxLength={242} placeholder="/fruits" value={card.linkPath ?? ""} onChange={(v) => set({ linkPath: v.toLowerCase().replace(/\s+/g, "") })} error={err("linkPath")} />
            <div className="flex flex-wrap gap-1.5">
              {links.map((l) => (
                <button key={l.path} type="button" aria-pressed={card.linkPath === l.path} onClick={() => set({ linkPath: l.path })} className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white">
                  {l.label}
                </button>
              ))}
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Card colour</legend>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <label key={t.value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-ink">
                    <input type="radio" name="side-card-tone" value={t.value} checked={(card.tone ?? "PEACH") === t.value} onChange={() => set({ tone: t.value })} className="sr-only" />
                    <span aria-hidden className="size-8 rounded-full ring-1 ring-black/10" style={{ background: t.css }} />
                    {t.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </section>
  );
}

// ---- small drawings and swatches ----

function Swatches({ label, value, onChange }: { label: string; value: HeroBackground; onChange: (v: HeroBackground) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {HERO_BACKGROUNDS.map((b) => (
          <label key={b} className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl bg-white p-2 ring-1 ring-line transition has-[:checked]:ring-2 has-[:checked]:ring-ink">
            <input type="radio" name="slide-background" value={b} checked={value === b} onChange={() => onChange(b)} className="sr-only" />
            <span aria-hidden className="h-10 w-full rounded-xl ring-1 ring-black/5" style={{ background: SWATCH[b].css }} />
            <span className="text-xs font-semibold text-ink">{SWATCH[b].name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function KindArt({ kind }: { kind: HeroSlideKind }) {
  const bg = kind === "COLOUR" ? SWATCH.BERRY.css : kind === "CART" ? SWATCH.SAND.css : "linear-gradient(135deg,#64748b,#0f172a)";
  return (
    <span aria-hidden className="relative block h-12 overflow-hidden rounded-lg" style={{ background: bg }}>
      <span className={`absolute left-2 top-3 h-1.5 w-10 rounded-full ${kind === "CART" ? "bg-ink/70" : "bg-white/90"}`} />
      <span className={`absolute left-2 top-6 h-1 w-7 rounded-full ${kind === "CART" ? "bg-ink/40" : "bg-white/60"}`} />
      {kind === "VIDEO" && <Film className="absolute bottom-1.5 right-2 size-4 text-white/90" />}
      {kind === "CART" && <ShoppingCart className="absolute bottom-1.5 right-2 size-5 text-brand-deep" />}
    </span>
  );
}

function PlaceArt({ place }: { place: HeroTextPosition }) {
  const pos = place === "CENTER" ? "items-center justify-center" : place === "LEFT" ? "items-start justify-center" : "items-start justify-end";
  return (
    <span aria-hidden className={`flex h-12 flex-col gap-1 rounded-lg bg-[linear-gradient(135deg,#94a3b8,#334155)] p-2 ${pos}`}>
      <span className="h-1.5 w-9 rounded-full bg-white" />
      <span className="h-1 w-6 rounded-full bg-white/70" />
    </span>
  );
}

function ShadeArt({ shade }: { shade: HeroOverlay }) {
  const over = shade === "LEFT_FADE" ? "linear-gradient(90deg,rgb(2 6 23/.7),transparent 75%)" : shade === "BOTTOM_FADE" ? "linear-gradient(0deg,rgb(2 6 23/.7),transparent 80%)" : shade === "EVEN" ? "rgb(2 6 23/.45)" : "transparent";
  return (
    <span aria-hidden className="relative block h-12 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#fbbf24,#f97316_50%,#16a34a)]">
      <span className="absolute inset-0" style={{ background: over }} />
    </span>
  );
}
