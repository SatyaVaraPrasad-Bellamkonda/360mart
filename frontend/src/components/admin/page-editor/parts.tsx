"use client";

import { ArrowDown, ArrowUp, Check, ChevronDown, ImagePlus, Images, LoaderCircle, Plus, RotateCcw, Trash2, Wand2, type LucideIcon } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import { TRUST_ICON } from "@/components/category-page/icons";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/catalog/validation";
import { TRUST_ICONS, type PageImage, type RevealAnimation, type TrustIcon, type TrustPoint } from "@/lib/category-page/types";
import { PAGE_LIMITS } from "@/lib/category-page/validation";

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

/** Choices shown as cards with a small drawing and a line of text (radio buttons underneath). */
export function ChoiceCards<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  columns = "grid-cols-2 sm:grid-cols-4",
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string; text: string; art?: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  columns?: string;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className={`mt-1.5 grid gap-2 ${columns}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer flex-col gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-line transition hover:ring-ink/40 has-[:checked]:ring-2 has-[:checked]:ring-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50 ${o.disabled ? "pointer-events-none opacity-45" : ""}`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className="sr-only" />
            {o.art}
            <span className="text-sm font-semibold leading-tight text-ink">{o.label}</span>
            <span className="text-xs leading-snug text-muted">{o.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Up to `max` short points with an icon each: edit, move up, remove, add. Errors at `${path}[i].text`. */
export function PointsEditor({
  points,
  onChange,
  max,
  path,
  errors,
  suggested,
}: {
  points: TrustPoint[];
  onChange: (points: TrustPoint[]) => void;
  max: number;
  path: string;
  errors: Record<string, string>;
  suggested?: TrustPoint[];
}) {
  return (
    <div>
      <ul className="space-y-2">
        {points.map((p, i) => {
          const error = errors[`${path}[${i}].text`];
          const set = (patch: Partial<TrustPoint>) => onChange(points.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <li key={i}>
              <div className="flex items-start gap-2">
                <IconPicker label={`Point ${i + 1} icon`} value={p.icon} onChange={(icon) => set({ icon })} />
                <input
                  aria-label={`Point ${i + 1}`}
                  value={p.text}
                  maxLength={PAGE_LIMITS.trustText}
                  onChange={(e) => set({ text: e.target.value })}
                  aria-invalid={!!error}
                  className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
                />
                {i > 0 && (
                  <button type="button" onClick={() => onChange(points.map((x, j) => (j === i - 1 ? p : j === i ? points[i - 1] : x)))} aria-label={`Move point ${i + 1} up`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                )}
                <button type="button" onClick={() => onChange(points.filter((_, j) => j !== i))} aria-label={`Remove point ${i + 1}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-red-700 hover:ring-red-300">
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
              {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {points.length < max && (
          <button type="button" onClick={() => onChange([...points, { icon: "store", text: "" }])} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <Plus aria-hidden className="size-4" />
            Add point
          </button>
        )}
        {points.length === 0 && suggested && (
          <button type="button" onClick={() => onChange(suggested)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <Wand2 aria-hidden className="size-4" />
            Use suggested points
          </button>
        )}
      </div>
      {errors[path] && <p className="mt-1.5 text-sm text-red-700">{errors[path]}</p>}
    </div>
  );
}

/** How a section appears when scrolled to (every section has it). */
export function RevealPicker({ value, onChange }: { value: RevealAnimation; onChange: (value: RevealAnimation) => void }) {
  return (
    <Segmented
      label="When it scrolls into view"
      value={value}
      options={[
        { value: "NONE", label: "Just show" },
        { value: "FADE", label: "Fade in" },
        { value: "RISE", label: "Rise up" },
      ]}
      onChange={onChange}
    />
  );
}

/**
 * One section in a designer's list: tap to open its fields, switch it on or
 * off, move it, remove it. `problem` (a save error) shows while it's closed.
 */
export function SectionCard({
  icon: Icon,
  title,
  summary,
  enabled,
  onEnabled,
  expanded,
  onExpanded,
  problem,
  error,
  first,
  last,
  onMove,
  onRemove,
  keepNote,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  expanded: boolean;
  onExpanded: (v: boolean) => void;
  problem?: string;
  /** An error about the section as a whole, shown inside. */
  error?: string;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  /** Absent = it can't be removed (then `keepNote` says why). */
  onRemove?: () => void;
  keepNote?: string;
  children: ReactNode;
}) {
  return (
    <li className={`rounded-2xl bg-white ring-1 transition ${problem ? "ring-red-300" : expanded ? "ring-ink/40" : "ring-line"} ${enabled ? "" : "opacity-70"}`}>
      <div className="flex items-center gap-2 p-2 sm:p-3">
        <button type="button" onClick={() => onExpanded(!expanded)} aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-line">
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{title}</span>
            <span className="block truncate text-xs text-muted">
              {summary}
              {!enabled && " · off"}
            </span>
          </span>
          <ChevronDown aria-hidden className={`ml-auto size-4 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`} />
        </button>
        <Switch checked={enabled} onChange={onEnabled} srLabel={`Show ${title}`} />
      </div>
      {problem && !expanded && <p className="px-4 pb-3 text-sm text-red-700">{problem}</p>}

      {expanded && (
        <div className="min-w-0 space-y-4 border-t border-line p-4">
          {children}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button type="button" disabled={first} onClick={() => onMove(-1)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-40">
              <ArrowUp aria-hidden className="size-4" />
              Move up
            </button>
            <button type="button" disabled={last} onClick={() => onMove(1)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-40">
              <ArrowDown aria-hidden className="size-4" />
              Move down
            </button>
            {onRemove ? (
              <button type="button" onClick={onRemove} className="ml-auto flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-red-700">
                <Trash2 aria-hidden className="size-4" />
                Remove
              </button>
            ) : (
              keepNote && <p className="ml-auto text-xs text-muted">{keepNote}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** "Add a section": every kind this page can have; the ones used up are shown switched off. */
export function AddSectionGrid({ kinds, onAdd, full }: { kinds: { type: string; label: string; text: string; icon: LucideIcon; disabled?: string }[]; onAdd: (type: string) => void; full?: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">Add a section</p>
      {full && <p className="mb-2 text-sm text-muted">{full}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {kinds.map((k) => (
          <button
            key={k.type}
            type="button"
            onClick={() => onAdd(k.type)}
            disabled={!!k.disabled}
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-line bg-white px-3 py-2 text-left transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink ring-1 ring-line">
              <k.icon aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                <Plus aria-hidden className="size-3.5" />
                {k.label}
              </span>
              <span className="block text-xs text-muted">{k.disabled ?? k.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
