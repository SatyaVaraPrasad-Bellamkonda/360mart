"use client";

import { Check, ImagePlus, Images, LoaderCircle, RotateCcw } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { Dialog } from "@/components/Dialog";
import { TRUST_ICON } from "@/components/category-page/icons";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/catalog/validation";
import { TRUST_ICONS, type PageImage, type TrustIcon } from "@/lib/category-page/types";

// Small controls shared by the page editor's panels.

/** A row of choices that look like one control (radio buttons underneath). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-10 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold text-muted transition hover:text-ink has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** An on/off switch with its label (a real checkbox for keyboards and screen readers). */
export function Switch({ checked, onChange, label, srLabel }: { checked: boolean; onChange: (value: boolean) => void; label?: string; srLabel?: string }) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-line transition peer-checked:bg-fresh peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
      {label}
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </label>
  );
}

/** The current icon as a button; opens a grid of the allowed icons. */
export function IconPicker({ value, onChange, label }: { value: TrustIcon; onChange: (icon: TrustIcon) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const Icon = TRUST_ICON[value];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${value.replace(/-/g, " ")}. Change icon`}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-ink ring-1 ring-line transition hover:ring-ink"
      >
        <Icon aria-hidden className="size-5" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Choose an icon">
        <div role="radiogroup" aria-label="Icons" className="grid grid-cols-5 gap-2 pb-5 sm:grid-cols-6">
          {TRUST_ICONS.map((name) => {
            const Each = TRUST_ICON[name];
            const on = name === value;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={name.replace(/-/g, " ")}
                title={name.replace(/-/g, " ")}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`flex aspect-square items-center justify-center rounded-2xl ring-1 transition ${on ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink"}`}
              >
                <Each aria-hidden className="size-6" />
              </button>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}

/**
 * One picture slot (banner, phone banner): shows the current picture, uploads
 * a new one (checked here first: JPEG/PNG, ≤ 2 MB), picks one uploaded before,
 * or goes back to the default.
 */
export function ImageSlot({
  label,
  hint,
  url,
  usingDefault,
  defaultLabel,
  images,
  uploading,
  error,
  onUpload,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  url: string | null;
  usingDefault: boolean;
  defaultLabel: string;
  images: { imageId: string; url: string }[];
  uploading: boolean;
  error?: string;
  onUpload: (file: File) => void;
  onPick: (image: PageImage | { imageId: string; url: string }) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false);

  function chosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be chosen again after an error
    if (!file) return;
    const bad = categoryImageError(file);
    setProblem(bad ?? null);
    if (!bad) onUpload(file);
  }

  const shownError = problem ?? error;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className={`flex flex-col gap-3 rounded-2xl p-3 ring-1 ${shownError ? "ring-red-400" : "ring-line"}`}>
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview or an uploaded picture
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted">No picture</span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoaderCircle aria-hidden className="size-6 animate-spin text-ink" />
              <span className="sr-only">Uploading</span>
            </span>
          )}
          {usingDefault && url && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-ink">{defaultLabel}</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {hint}
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} id={inputId} type="file" accept={CATEGORY_IMAGE_TYPES.join(",")} onChange={chosen} className="sr-only" aria-describedby={`${inputId}-hint`} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
              <ImagePlus aria-hidden className="size-4" />
              Upload
            </button>
            {images.length > 0 && (
              <button type="button" onClick={() => setGallery(true)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
                <Images aria-hidden className="size-4" />
                Uploaded
              </button>
            )}
            {!usingDefault && (
              <button type="button" onClick={onClear} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:text-ink">
                <RotateCcw aria-hidden className="size-4" />
                {defaultLabel === "Category picture" ? "Use category picture" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
      {shownError && <p className="mt-1.5 text-sm text-red-700">{shownError}</p>}

      <Dialog open={gallery} onClose={() => setGallery(false)} title="Pictures uploaded for this category" description="Pick one to use here.">
        <ul className="grid grid-cols-2 gap-3 pb-5 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.imageId}>
              <button
                type="button"
                onClick={() => {
                  onPick(img);
                  setGallery(false);
                }}
                className="group relative block aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-line transition hover:ring-2 hover:ring-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded picture */}
                <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
                {img.url === url && (
                  <span className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-white">
                    <Check aria-hidden className="size-4" />
                    <span className="sr-only">In use</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
