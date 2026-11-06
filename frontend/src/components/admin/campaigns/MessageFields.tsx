"use client";

import { ExternalLink, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { TextAreaField, TextField } from "@/components/auth/AuthFields";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/catalog/validation";
import { APP_LINK, LIMITS, type CampaignDraft } from "@/lib/campaigns/validation";
import type { CategoryOption } from "./CategoryChooser";
import { CountdownFields } from "./CountdownFields";

// The campaign's words, picture, link and offer end. What the lock screen
// shows: title (Android cuts it after about 65 characters) + message.
export function MessageFields({
  draft,
  set,
  errors,
  imageUrl,
  uploading,
  onUpload,
  onRemoveImage,
  categories,
}: {
  draft: CampaignDraft;
  set: (patch: Partial<CampaignDraft>) => void;
  errors: Record<string, string>;
  imageUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemoveImage: () => void;
  categories: CategoryOption[];
}) {
  const linkOk = !!draft.link.trim() && APP_LINK.test(draft.link.trim());
  return (
    <div className="space-y-5">
      <TextField
        label="Campaign name"
        name="name"
        autoComplete="off"
        maxLength={LIMITS.name}
        value={draft.name}
        onChange={(name) => set({ name })}
        error={errors.name}
        placeholder="Mango week – Hyderabad"
        hint="Only admins see it, in this list and the results."
      />
      <TextField
        label="Title"
        name="title"
        autoComplete="off"
        maxLength={LIMITS.title}
        value={draft.title}
        onChange={(title) => set({ title })}
        error={errors.title}
        placeholder="Mangoes are here"
        hint={`${draft.title.length}/${LIMITS.title} · the bold line on the lock screen. Short works best.`}
      />
      <TextAreaField
        label="Message"
        name="body"
        maxLength={LIMITS.body}
        value={draft.body}
        onChange={(body) => set({ body })}
        error={errors.body}
        placeholder="Fresh Alphonso, 20% off till Sunday."
        hint="Line breaks are kept. Collapsed notifications show only the first line."
      />

      <Picture url={imageUrl} uploading={uploading} onUpload={onUpload} onRemove={onRemoveImage} error={errors.imageId} />

      <div>
        <TextField
          label="Opens"
          name="link"
          autoComplete="off"
          optional
          maxLength={LIMITS.link}
          value={draft.link}
          onChange={(link) => set({ link: link.replace(/\s/g, "") })}
          error={errors.link}
          placeholder="/fruits"
          hint="A page of 360mart: /fruits, /search?q=mango, /#categories. Empty = the inbox."
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[{ name: "Home page", path: "/" }, ...categories.slice(0, 10).map((c) => ({ name: c.name, path: `/${c.slug}` }))].map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => set({ link: p.path })}
              aria-pressed={draft.link === p.path}
              className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold text-ink ring-1 ring-line transition hover:ring-ink aria-pressed:bg-ink aria-pressed:text-white aria-pressed:ring-ink"
            >
              {p.name}
            </button>
          ))}
          {linkOk && (
            <a href={draft.link.trim()} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
              <ExternalLink aria-hidden className="size-3.5" />
              Check the page
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>

      <EndsField value={draft.expiresAt} onChange={(expiresAt) => set({ expiresAt })} error={errors.expiresAt} timer={draft.timerStyle !== "NONE"} />
      <CountdownFields draft={draft} set={set} errors={errors} />
    </div>
  );
}

function Picture({ url, uploading, onUpload, onRemove, error }: { url: string | null; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void; error?: string }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function chosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be chosen again after an error
    if (!file) return;
    const bad = categoryImageError(file);
    setProblem(bad ?? null);
    if (!bad) onUpload(file);
  }

  const shown = problem ?? error;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">
        Picture <span className="font-normal text-muted">(optional)</span>
      </p>
      <div className={`overflow-hidden rounded-2xl ring-1 ${shown ? "ring-red-400" : "ring-line"}`}>
        <div className={`relative w-full bg-surface ${url ? "aspect-[2/1]" : "h-28"}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview or the uploaded picture
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex size-full flex-col items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-ink">
              <ImagePlus aria-hidden className="size-7" />
              Add a picture
            </button>
          )}
          {url && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-1/2 -translate-x-1/2 border-x border-dashed border-white/70" />}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoaderCircle aria-hidden className="size-6 animate-spin text-ink" />
              <span className="sr-only">Uploading</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white p-3">
          <input ref={fileRef} id={id} type="file" accept={CATEGORY_IMAGE_TYPES.join(",")} onChange={chosen} className="sr-only" aria-describedby={`${id}-hint`} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
            <ImagePlus aria-hidden className="size-4" />
            {url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button type="button" onClick={onRemove} disabled={uploading} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:text-ink">
              <Trash2 aria-hidden className="size-4" />
              Remove
            </button>
          )}
          <p id={`${id}-hint`} className="w-full text-xs text-muted">
            JPEG or PNG up to 2 MB. Best wide, 2:1 (like 1200 × 600): Android crops to about that. Keep the important part inside the dashed middle.
          </p>
        </div>
      </div>
      {shown && <p className="mt-1.5 text-sm text-red-700">{shown}</p>}
    </div>
  );
}

function EndsField({ value, onChange, error, timer }: { value: string; onChange: (v: string) => void; error?: string; timer: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Offer ends {timer ? <span className="font-normal text-brand-deep">(needed for the countdown)</span> : <span className="font-normal text-muted">(optional)</span>}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={`${id}-hint`}
          className={`min-h-12 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        {value && !timer && (
          <button type="button" onClick={() => onChange("")} className="flex size-12 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-ink hover:ring-ink" aria-label="No end date">
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-700">{error}</p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {timer
            ? "India time. The countdown runs to this time (15 minutes to 24 hours after sending). After it the offer isn't sent any more and leaves the inbox."
            : "India time. After it the offer isn't sent any more and leaves the inbox. At least 15 minutes after sending."}
        </p>
      )}
    </div>
  );
}
