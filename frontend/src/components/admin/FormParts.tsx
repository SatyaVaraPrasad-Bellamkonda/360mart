"use client";

import { Check, EyeOff, ImagePlus, RotateCcw } from "lucide-react";
import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import { FieldError } from "@/components/auth/AuthFields";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { FoodMark } from "@/components/catalog/FoodMark";
import { FOOD_TYPES } from "@/lib/catalog/product-validation";
import type { FoodType } from "@/lib/catalog/types";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/catalog/validation";

// Pieces shared by the admin forms (categories, products): a card per group of
// fields, the picture picker, an on/off toggle and the Google preview.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function ImagePicker({ currentUrl, file, onFile, error, onPreview }: { currentUrl: string | null; file: File | null; onFile: (file: File | null) => void; error?: string; onPreview?: (url: string | null) => void }) {
  const id = useId();
  // A local preview of the chosen file (a data: URL, so there's nothing to release later).
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = ""; // choosing the same file again still fires a change
    if (!picked) return;
    onFile(picked);
    if (categoryImageError(picked)) {
      onPreview?.(null);
      return setPreview(null); // shown as an error instead
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setPreview({ file: picked, url: reader.result });
      onPreview?.(reader.result);
    };
    reader.readAsDataURL(picked);
  }

  function undo() {
    onFile(null);
    setPreview(null);
    onPreview?.(null);
  }

  const shown = (preview && preview.file === file ? preview.url : null) ?? currentUrl;
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`relative size-32 shrink-0 overflow-hidden rounded-2xl ring-1 ${error ? "ring-red-500" : "ring-line"}`}>
          <CategoryImage key={shown ?? "none"} src={shown} alt={file ? "New picture" : shown ? "Current picture" : ""} className="size-full" iconClassName="size-10" />
          {file && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">New</span>}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
            >
              <ImagePlus aria-hidden className="size-4" />
              {shown ? "Replace picture" : "Choose picture"}
            </label>
            {file && (
              <button type="button" onClick={undo} className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                <RotateCcw aria-hidden className="size-4" />
                {currentUrl ? "Keep current" : "Remove"}
              </button>
            )}
          </div>
          <input
            id={id}
            name="image"
            type="file"
            accept={CATEGORY_IMAGE_TYPES.join(",")}
            onChange={choose}
            aria-invalid={!!error}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            className="sr-only"
          />
          <p id={`${id}-hint`} className="text-sm text-muted">
            {file ? <span className="break-all font-semibold text-ink">{file.name}</span> : "JPEG or PNG, up to 2 MB."} Shown square; large pictures are resized to 512 × 512.
            {currentUrl && !file && " A new picture replaces the current one (removing it isn't possible yet)."}
          </p>
        </div>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange, warn }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void; warn?: boolean }) {
  const id = useId();
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 hover:border-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-describedby={`${id}-hint`} />
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          {label}
          {warn && <EyeOff aria-hidden className="size-3.5 text-brand-deep" />}
        </span>
        <span id={`${id}-hint`} className={`mt-0.5 block text-sm ${warn ? "text-brand-deep" : "text-muted"}`}>
          {hint}
        </span>
      </span>
    </label>
  );
}

export function GooglePreview({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <figure className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <figcaption className="text-xs font-semibold uppercase tracking-wider text-muted">Google preview</figcaption>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm text-ink/80">{url}</p>
        <p className="mt-0.5 line-clamp-2 break-words text-lg leading-snug text-[#1a0dab]">{title}</p>
        <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{description}</p>
      </div>
    </figure>
  );
}

// Veg / non-veg / egg as big tap targets with the familiar mark (or not a food item).
export function FoodTypePicker({ value, onChange, error, legend = "Food type", hint }: { value: FoodType | ""; onChange: (value: FoodType | "") => void; error?: string; legend?: string; hint?: string }) {
  const options: { value: FoodType | ""; label: string }[] = [...FOOD_TYPES, { value: "", label: "Not food" }];
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <label
            key={o.value || "none"}
            className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
          >
            <input type="radio" name="foodType" value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.value ? <FoodMark type={o.value} decorative /> : <span aria-hidden className="size-4 rounded-[3px] border-[1.5px] border-dashed border-current opacity-50" />}
            {o.label}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-sm text-red-700">{error}</p> : hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </fieldset>
  );
}
