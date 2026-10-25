"use client";

import { Check, CircleDot, ExternalLink, Eye, History, LoaderCircle, Monitor, RotateCcw, Smartphone, Undo2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageHero, type HeroContent, type HeroStat } from "@/components/category-page/PageHero";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { BACKEND_ACCEPTS_CUSTOM_COLOUR, colourLabel, colourSwatch, contrastWithWhite, HEX_COLOUR, MIN_CONTRAST, PAGE_THEMES, pageTheme, readableShade, themeColour, themeStyle } from "@/lib/catalog/food-theme";
import type { PageTheme } from "@/lib/catalog/types";
import { discardDraftAction, historyAction, loadAdminPageAction, publishAction, restoreAction, saveDraftAction, uploadPageImageAction } from "@/lib/category-page/actions";
import type { AdminCategoryPage, CategoryPage, HeroDoc, PageDocument, PageHistoryItem, PageImagePurpose, PageSection, PageStat } from "@/lib/category-page/types";
import { cleanDocument, pageErrors, sameDocument, toEditable, type PageErrors } from "@/lib/category-page/validation";
import { dateTimeText } from "@/lib/stores/validation";
import { HeroFields } from "./HeroFields";
import { defaultTitle, SectionsEditor } from "./SectionsEditor";

type CategoryInfo = { categoryId: number; name: string; slug: string; description: string | null; imageUrl: string | null; badgeLabel: string | null };
type Error = { code: string; message: string; fieldErrors: Record<string, string> };

// The category page editor. Works on a local copy of the page; "Save draft"
// sends the whole document (PUT replaces it), "Publish" makes the saved draft
// live. Every write carries the version it started from: if someone else saved
// in between, the backend refuses (409) and the admin picks theirs or mine.
export function PageEditor({ category, parent, initial, live, shopHref, customDesign }: { category: CategoryInfo; parent: { name: string; slug: string } | null; initial: AdminCategoryPage; live: CategoryPage | null; shopHref: string; customDesign: boolean }) {
  const { sessionExpired } = useAuth();
  const isSub = initial.isSubcategory;
  const id = category.categoryId;

  const [meta, setMeta] = useState(initial);
  const [doc, setDoc] = useState<PageDocument>(() => toEditable(initial.effectiveDraft, initial.theme));
  const [saved, setSaved] = useState<PageDocument>(doc);
  const [version, setVersion] = useState(initial.version);
  const [unpublished, setUnpublished] = useState(initial.hasUnpublishedChanges);
  const [images, setImages] = useState(initial.images);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<PageErrors>({});
  const [uploading, setUploading] = useState<PageImagePurpose | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | "preview" | "discard" | "load" | null>(null);
  const [, startTransition] = useTransition();
  const [conflict, setConflict] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const dirty = !sameDocument(doc, saved, isSub);
  const theme = isSub ? (live?.theme ?? meta.theme) : (doc.theme ?? "INDIGO");

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const urlOf = (imageId: string | null | undefined) => (imageId ? (localUrls[imageId] ?? images.find((i) => i.imageId === imageId)?.url ?? null) : null);

  function reset(data: AdminCategoryPage) {
    const fresh = toEditable(data.effectiveDraft, data.theme);
    setMeta(data);
    setDoc(fresh);
    setSaved(fresh);
    setVersion(data.version);
    setUnpublished(data.hasUnpublishedChanges);
    setImages(data.images);
    setErrors({});
  }

  function failed(error: Error) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    if (error.code === "PAGE_VERSION_CONFLICT") return setConflict(true);
    const fields = error.fieldErrors ?? {};
    if (Object.keys(fields).length) {
      setErrors(fields);
      focusFirstError();
    }
    toastError(error.message);
  }

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  const setHero = (patch: Partial<HeroDoc>) => {
    setDoc((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
    setErrors((e) => (Object.keys(e).some((k) => k.startsWith("hero")) ? Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("hero"))) : e));
  };
  // Errors are keyed by position, so a move/add/remove drops the section ones.
  const setSections = (sections: PageSection[], structural?: boolean) => {
    setDoc((d) => ({ ...d, sections }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("sections") || !structural)));
  };

  /** Save the draft; the new version, or null when it didn't save. */
  async function persist(from = version): Promise<number | null> {
    const clean = cleanDocument(doc, isSub);
    const found = pageErrors(clean, isSub);
    if (Object.keys(found).length) {
      setErrors(found);
      toastError("Please fix the highlighted fields.");
      focusFirstError();
      return null;
    }
    const res = await saveDraftAction(id, from, isSub, clean);
    if (!res.ok) {
      failed(res.error);
      return null;
    }
    setVersion(res.data.version);
    setSaved(doc);
    setUnpublished(true);
    setErrors({});
    return res.data.version;
  }

  function run(kind: NonNullable<typeof busy>, work: () => Promise<void>) {
    setBusy(kind);
    startTransition(async () => {
      try {
        await work();
      } finally {
        setBusy(null);
      }
    });
  }

  const save = () =>
    run("save", async () => {
      if ((await persist()) !== null) toastSuccess("Draft saved. Publish when you're ready.");
    });

  const publish = () =>
    run("publish", async () => {
      const from = dirty ? await persist() : version;
      if (from === null) return;
      if (!dirty && !unpublished) return void toastSuccess("Everything is already live.");
      const res = await publishAction(id, from);
      if (!res.ok) return failed(res.error);
      setVersion(res.data.version);
      setUnpublished(false);
      setMeta((m) => ({ ...m, theme: isSub ? m.theme : (doc.theme ?? m.theme), publishedVersion: res.data.version, publishedAt: new Date().toISOString() }));
      toastSuccess(res.data.message || "Published. Shoppers see the new page now.");
    });

  const preview = (history?: number) =>
    run("preview", async () => {
      // The preview is built from the saved draft, so unsaved changes are saved first.
      const at = history ? version : dirty ? await persist() : version;
      if (at === null) return;
      setPreviewSrc(`/admin/page-preview/${id}?${history ? `history=${history}` : `v=${at}`}`);
    });

  async function reload(message?: string) {
    const res = await loadAdminPageAction(id);
    if (!res.ok) return failed(res.error);
    reset(res.data);
    if (message) toastSuccess(message);
  }

  const discard = () =>
    run("discard", async () => {
      setConfirmDiscard(false);
      const res = await discardDraftAction(id, version);
      if (!res.ok) return failed(res.error);
      await reload("Draft discarded. The editor shows the live page again.");
    });

  const resolveConflict = (keepMine: boolean) =>
    run("load", async () => {
      setConflict(false);
      const res = await loadAdminPageAction(id);
      if (!res.ok) return failed(res.error);
      if (!keepMine) {
        reset(res.data);
        return void toastSuccess("Loaded the latest version.");
      }
      // Mine on top of theirs: save my copy against their version.
      setMeta(res.data);
      setImages(res.data.images);
      const next = await persist(res.data.version);
      if (next !== null) toastSuccess("Your changes are saved over the latest version.");
    });

  function upload(purpose: PageImagePurpose, file: File) {
    setUploading(purpose);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("image", file);
      startTransition(async () => {
        const res = await uploadPageImageAction(id, form);
        setUploading(null);
        if (!res.ok) return failed(res.error);
        const imageId = res.data.imageId;
        if (dataUrl) setLocalUrls((m) => ({ ...m, [imageId]: dataUrl }));
        setImages((list) => [{ imageId, url: dataUrl ?? "", purpose }, ...list]);
        setHero(purpose === "HERO_MOBILE" ? { mobileImageId: imageId } : { imageId });
        toastSuccess("Picture uploaded. Save the draft to keep it on the page.");
      });
    };
    reader.onerror = () => {
      setUploading(null);
      toastError("That picture couldn't be read. Try another one.");
    };
    reader.readAsDataURL(file);
  }

  const counts: Partial<Record<PageStat, number>> | null = live
    ? { PRODUCTS: live.summary.productCount, TYPES: live.summary.subcategoryCount, IN_SEASON: live.summary.inSeasonCount }
    : null;
  const railCounts = Object.fromEntries(Object.entries(live?.rails ?? {}).map(([k, v]) => [k, v.length]));

  const status = dirty
    ? { tone: "bg-amber-50 text-amber-800 ring-amber-200", text: "Unsaved changes" }
    : unpublished
      ? { tone: "bg-sky-50 text-sky-800 ring-sky-200", text: "Draft saved · not live yet" }
      : meta.publishedVersion
        ? { tone: "bg-green-50 text-green-800 ring-green-200", text: `Live · version ${meta.publishedVersion}${meta.publishedAt ? ` · ${dateTimeText(meta.publishedAt)}` : ""}` }
        : { tone: "bg-surface text-muted ring-line", text: "Default page · never published" };

  return (
    <div className="space-y-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${status.tone}`} aria-live="polite">
          <CircleDot aria-hidden className="size-4" />
          {status.text}
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={shopHref} target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <ExternalLink aria-hidden className="size-4" />
            View in shop
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button type="button" onClick={() => setHistoryOpen(true)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <History aria-hidden className="size-4" />
            History
          </button>
          {(unpublished || dirty) && (
            <button type="button" onClick={() => (unpublished ? setConfirmDiscard(true) : setDoc(saved))} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:text-red-700 hover:ring-red-300">
              <Undo2 aria-hidden className="size-4" />
              {unpublished ? "Discard draft" : "Undo changes"}
            </button>
          )}
        </div>
      </div>

      {customDesign && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {category.name} still uses its own hand-made page in the shop. This design is saved and will show once it moves to the shared page.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div ref={formRef} className="min-w-0 space-y-5">
          {!isSub ? (
            <Panel title="Page colour" text="The accent colour of the page: headline, icons, chips and banner tint. Its subcategory pages use it too.">
              <ThemePicker
                value={doc.theme ?? "INDIGO"}
                custom={doc.customColour ?? null}
                error={errors.customColour}
                onPreset={(t) => {
                  setDoc((d) => ({ ...d, theme: t, customColour: null }));
                  setErrors(withoutColourError);
                }}
                onCustom={(hex) => {
                  setDoc((d) => ({ ...d, customColour: hex }));
                  setErrors(withoutColourError);
                }}
              />
            </Panel>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-muted ring-1 ring-line">
              Colours come from {parent?.name ?? "the parent category"}&apos;s page ({live?.customColour ? `custom ${live.customColour}` : colourLabel(theme)}).
            </p>
          )}
          <Panel title="Banner" text="The top of the page. Empty fields use the category's own name, description, badge and picture.">
            <HeroFields
              hero={doc.hero}
              onChange={setHero}
              errors={errors}
              fallbacks={{ name: category.name, description: category.description, badge: category.badgeLabel, imageUrl: category.imageUrl }}
              isSubcategory={isSub}
              counts={counts}
              images={images}
              urlOf={urlOf}
              uploading={uploading}
              onUpload={upload}
            />
          </Panel>
          <Panel title="Sections" text="Shown under the banner in this order. Switch one off to hide it without losing its settings.">
            <SectionsEditor sections={doc.sections} onChange={setSections} errors={errors} isSubcategory={isSub} categoryName={category.name} railCounts={railCounts} />
          </Panel>
        </div>

        <aside aria-label="Live preview" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <LivePreview
            theme={theme}
            customColour={isSub ? (live?.customColour ?? null) : (doc.customColour ?? null)}
            hero={heroContent(doc.hero, category, urlOf)}
            stats={statsFor(doc.hero.stats ?? [], counts, isSub)}
            parent={parent}
            sections={doc.sections}
            categoryName={category.name}
            live={live}
            onFullPreview={() => preview()}
            previewBusy={busy === "preview"}
          />
        </aside>
      </div>

      {/* Save / publish, always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <p className="hidden min-w-0 truncate text-sm text-muted sm:block">{dirty ? "You have unsaved changes." : unpublished ? "Your draft is saved. Publish to make it live." : "Everything is saved."}</p>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <ActionButton onClick={() => preview()} busy={busy === "preview"} disabled={!!busy} icon={<Eye aria-hidden className="size-4" />} label="Preview" />
            <ActionButton onClick={save} busy={busy === "save"} disabled={!!busy || !dirty} icon={<Check aria-hidden className="size-4" />} label="Save draft" shortLabel="Save" />
            <ActionButton onClick={publish} busy={busy === "publish"} disabled={!!busy || (!dirty && !unpublished)} icon={<UploadCloud aria-hidden className="size-4" />} label="Publish" primary />
          </div>
        </div>
      </div>

      <Dialog open={conflict} onClose={() => setConflict(false)} title="Someone else changed this page" description="It was saved by another admin after you opened it.">
        <div className="space-y-3 pb-5">
          <p className="text-sm text-muted">Load their latest version (your changes here are dropped), or keep your version and save it over theirs.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => resolveConflict(false)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <RotateCcw aria-hidden className="size-4" />
              Load the latest
            </button>
            <button type="button" onClick={() => resolveConflict(true)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
              <Check aria-hidden className="size-4" />
              Keep mine and save
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard the draft?" description="The unpublished changes are thrown away. The live page stays as it is.">
        <div className="flex flex-col-reverse gap-2 pb-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setConfirmDiscard(false)} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-muted hover:text-ink">
            Keep the draft
          </button>
          <button type="button" onClick={discard} className="flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800">
            Discard draft
          </button>
        </div>
      </Dialog>

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        categoryId={id}
        liveVersion={meta.publishedVersion}
        hasDraftChanges={dirty || unpublished}
        onPreview={(v) => preview(v)}
        onRestore={async (from) => {
          const res = await restoreAction(id, version, from);
          if (!res.ok) return failed(res.error);
          setHistoryOpen(false);
          await reload(`Version ${from} is back in the draft. Publish to make it live.`);
        }}
        onError={failed}
      />

      <PreviewDialog src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  );
}

function withoutColourError(e: PageErrors): PageErrors {
  const rest = { ...e };
  delete rest.customColour;
  return rest;
}

function heroContent(h: HeroDoc, c: CategoryInfo, urlOf: (id: string | null | undefined) => string | null): HeroContent {
  return {
    headline: h.headline?.trim() || c.name,
    accentLine: h.accentLine?.trim() || "from stores near you",
    intro: h.intro?.trim() || c.description,
    imageUrl: urlOf(h.imageId) ?? c.imageUrl,
    mobileImageUrl: urlOf(h.mobileImageId),
    imageAlt: h.imageAlt?.trim() || c.name,
    badge: h.badge?.trim() || c.badgeLabel,
    trustPoints: (h.trustPoints ?? []).filter((p) => p.text.trim()),
  };
}

function statsFor(stats: PageStat[], counts: Partial<Record<PageStat, number>> | null, isSub: boolean): HeroStat[] {
  const label: Partial<Record<PageStat, string>> = { PRODUCTS: "Products", TYPES: "Types", IN_SEASON: "In season" };
  return stats
    .filter((s) => label[s] && !(s === "TYPES" && isSub))
    .map((s) => ({ label: label[s]!, value: counts?.[s] ?? 0 }))
    .filter((s) => s.value > 0);
}

function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-4 sm:p-6">
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {children}
    </section>
  );
}

// Colour swatches with their names, plus "Custom" for any colour (checked for
// readability: it's used as text on white and under white text).
function ThemePicker({ value, custom, error, onPreset, onCustom }: { value: PageTheme; custom: string | null; error?: string; onPreset: (t: PageTheme) => void; onCustom: (hex: string) => void }) {
  const current = themeColour(value);
  const [draftHex, setDraftHex] = useState(custom ?? "");
  const hex = custom && HEX_COLOUR.test(custom) ? custom : null;
  const readable = hex ? contrastWithWhite(hex) >= MIN_CONTRAST : true;
  const fix = hex && !readable ? readableShade(hex) : null;

  function typed(v: string) {
    const clean = v.trim().startsWith("#") ? v.trim() : `#${v.trim()}`;
    setDraftHex(v);
    if (HEX_COLOUR.test(clean)) onCustom(clean.toLowerCase());
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Page colour" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {PAGE_THEMES.map((t) => {
          const on = !custom && current === t.colour;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPreset(t.value)}
              className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-1 py-2 ring-1 transition ${on ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"}`}
            >
              <span className={`flex size-9 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white ${t.swatch}`}>{on && <Check aria-hidden className="size-4" strokeWidth={3} />}</span>
              <span className="text-xs font-semibold text-ink">{t.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={!!custom}
          onClick={() => {
            const start = custom ?? "#0e7490";
            setDraftHex(start);
            onCustom(start);
          }}
          className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white px-1 py-2 ring-1 transition ${custom ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"}`}
        >
          <span
            className="flex size-9 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white"
            style={{ background: hex ?? "conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)" }}
          >
            {custom && <Check aria-hidden className="size-4" strokeWidth={3} />}
          </span>
          <span className="text-xs font-semibold text-ink">Custom</span>
        </button>
      </div>

      {custom !== null && (
        <div className={`space-y-3 rounded-2xl p-3 ring-1 ${error ? "ring-red-300" : "ring-line"}`}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-ink">
              Pick
              <input
                type="color"
                value={hex ?? "#0e7490"}
                onChange={(e) => {
                  setDraftHex(e.target.value);
                  onCustom(e.target.value.toLowerCase());
                }}
                className="mt-1.5 block h-11 w-16 cursor-pointer rounded-xl border border-line bg-white p-1"
              />
            </label>
            <label className="min-w-0 flex-1 text-sm font-semibold text-ink">
              Hex code
              <input
                value={draftHex}
                onChange={(e) => typed(e.target.value)}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                placeholder="#0e7490"
                aria-invalid={!!error}
                className={`mt-1.5 block min-h-11 w-full rounded-xl border bg-white px-3 font-mono text-base uppercase text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
              />
            </label>
          </div>
          {hex && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-3 py-2">
              <span className="text-sm font-bold" style={{ color: hex }}>
                from stores near you
              </span>
              <span className="rounded-md px-2 py-0.5 text-xs font-bold uppercase text-white" style={{ background: hex }}>
                Best price
              </span>
              <span className={`ml-auto text-xs font-semibold ${readable ? "text-green-700" : "text-red-700"}`}>
                {readable ? "Easy to read" : "Too light to read"} · {contrastWithWhite(hex).toFixed(1)}:1
              </span>
            </div>
          )}
          {fix && (
            <button
              type="button"
              onClick={() => {
                setDraftHex(fix);
                onCustom(fix);
              }}
              className="flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink"
            >
              <span aria-hidden className="size-5 rounded-full" style={{ background: fix }} />
              Use a darker shade ({fix.toUpperCase()})
            </button>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!BACKEND_ACCEPTS_CUSTOM_COLOUR && !error && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">Try it in the live preview. Saving a custom colour needs a small backend update first.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, busy, disabled, icon, label, shortLabel, primary }: { onClick: () => void; busy: boolean; disabled: boolean; icon: ReactNode; label: string; shortLabel?: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5 ${primary ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
    >
      {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {shortLabel ? (
        <>
          <span className="whitespace-nowrap sm:hidden">{shortLabel}</span>
          <span className="hidden whitespace-nowrap sm:inline">{label}</span>
        </>
      ) : (
        <span className="whitespace-nowrap">{label}</span>
      )}
    </button>
  );
}

// ---- live preview ----

const DESKTOP_WIDTH = 1120;
const wide = {
  subscribe: (cb: () => void) => {
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
  get: () => window.matchMedia("(min-width: 1024px)").matches,
};

// The banner as shoppers see it, updated as the admin types. On a computer it's
// the desktop layout scaled down to fit the column; on a phone, the phone layout.
function LivePreview({
  theme,
  customColour,
  hero,
  stats,
  parent,
  sections,
  categoryName,
  live,
  onFullPreview,
  previewBusy,
}: {
  theme: PageTheme;
  customColour: string | null;
  hero: HeroContent;
  stats: HeroStat[];
  parent: { name: string; slug: string } | null;
  sections: PageSection[];
  categoryName: string;
  live: CategoryPage | null;
  onFullPreview: () => void;
  previewBusy: boolean;
}) {
  const isWide = useSyncExternalStore(wide.subscribe, wide.get, () => false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !isWide) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESKTOP_WIDTH));
    observer.observe(box);
    return () => observer.disconnect();
  }, [isWide]);

  const th = useMemo(() => pageTheme(theme, customColour), [theme, customColour]);
  const banner = <PageHero hero={hero} theme={th} stats={stats} parent={parent ? { name: parent.name, href: "#" } : null} compact={!!parent} />;

  return (
    <div className="space-y-3 rounded-3xl bg-surface p-3 ring-1 ring-line sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          {isWide ? <Monitor aria-hidden className="size-4" /> : <Smartphone aria-hidden className="size-4" />}
          Live preview
        </p>
        <button type="button" onClick={onFullPreview} disabled={previewBusy} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60">
          {previewBusy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Eye aria-hidden className="size-4" />}
          Full page
        </button>
      </div>
      <div ref={boxRef} aria-hidden style={themeStyle(customColour)} className="pointer-events-none overflow-hidden rounded-2xl bg-white">
        {isWide ? <div style={{ width: DESKTOP_WIDTH, zoom: scale }}>{banner}</div> : banner}
      </div>
      <ol className="space-y-1.5">
        {sections.map((s) => {
          const items = s.type === "PRODUCT_RAIL" ? live?.rails[s.id]?.length : s.type === "SUBCATEGORIES" ? live?.subcategories.length : live?.summary.productCount;
          const off = s.enabled === false;
          return (
            <li key={s.id} className={`flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line ${off ? "opacity-50" : ""}`}>
              <span className="min-w-0 truncate font-semibold text-ink">{s.title?.trim() || defaultTitle(s, categoryName)}</span>
              <span className="shrink-0 text-xs text-muted">{off ? "Off" : items === undefined ? "" : items === 0 ? "Empty, hidden" : `${items} ${s.type === "SUBCATEGORIES" ? "types" : "products"}`}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted">Counts are from the live shop. &ldquo;Full page&rdquo; saves your draft and shows the real page with its products.</p>
    </div>
  );
}

// ---- full preview (the real page in a frame) ----

function PreviewDialog({ src, onClose }: { src: string | null; onClose: () => void }) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  return (
    <Dialog open={!!src} onClose={onClose} title="Page preview" description="The real page built from your draft. Shoppers don't see it until you publish." size="wide">
      <div className="space-y-3 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Screen size" className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
            {(["phone", "desktop"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className="flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-muted aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-sm"
              >
                {d === "phone" ? <Smartphone aria-hidden className="size-4" /> : <Monitor aria-hidden className="size-4" />}
                {d === "phone" ? "Phone" : "Desktop"}
              </button>
            ))}
          </div>
          {src && (
            <a href={src} target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <ExternalLink aria-hidden className="size-4" />
              Open in a new tab
            </a>
          )}
        </div>
        {src && (
          <div className="flex justify-center overflow-hidden rounded-2xl bg-surface p-2 ring-1 ring-line">
            <iframe key={src} title="Page preview" src={src} className={`h-[70dvh] rounded-xl bg-white ring-1 ring-line ${device === "phone" ? "w-[390px] max-w-full" : "w-full"}`} />
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ---- published versions ----

function HistoryDialog({
  open,
  onClose,
  categoryId,
  liveVersion,
  hasDraftChanges,
  onPreview,
  onRestore,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  liveVersion: number | null;
  hasDraftChanges: boolean;
  onPreview: (version: number) => void;
  onRestore: (fromVersion: number) => Promise<void>;
  onError: (error: Error) => void;
}) {
  const [items, setItems] = useState<PageHistoryItem[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, startLoading] = useTransition();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [asked, setAsked] = useState<number | null>(null);

  function load(next: number) {
    startLoading(async () => {
      const res = await historyAction(categoryId, next);
      if (!res.ok) return onError(res.error);
      setItems((now) => (next === 0 ? res.data.items : [...(now ?? []), ...res.data.items]));
      if (next === 0) setAsked(null);
      setPage(next);
      setHasMore(next + 1 < res.data.totalPages);
    });
  }

  // Opening the dialog loads the first page (fresh every time: publishes add versions).
  useEffect(() => {
    if (open) load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Published versions" description="Preview an older design, or bring it back into the draft.">
      <div className="space-y-3 pb-5">
        {(items === null || (loading && page === 0)) && <p className="py-6 text-center text-sm text-muted">Loading…</p>}
        {items?.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Nothing published yet. Each publish adds a version here.</p>}
        <ul className="space-y-2">
          {items?.map((h) => (
            <li key={h.version} className="rounded-2xl bg-white p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Version {h.version}
                    {h.version === liveVersion && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800 ring-1 ring-green-200">Live</span>}
                    {h.customColour ? (
                      <span className="size-3 rounded-full" style={{ background: h.customColour }} title={`Custom ${h.customColour.toUpperCase()}`} />
                    ) : (
                      <span className={`size-3 rounded-full ${colourSwatch(h.theme)}`} title={colourLabel(h.theme)} />
                    )}
                  </p>
                  <p className="text-xs text-muted">Published {dateTimeText(h.publishedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onPreview(h.version)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                    <Eye aria-hidden className="size-4" />
                    Preview
                  </button>
                  {h.version !== liveVersion && (
                    <button
                      type="button"
                      disabled={restoring !== null}
                      onClick={async () => {
                        if (hasDraftChanges && asked !== h.version) return setAsked(h.version);
                        setRestoring(h.version);
                        await onRestore(h.version);
                        setRestoring(null);
                      }}
                      className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
                    >
                      {restoring === h.version ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <RotateCcw aria-hidden className="size-4" />}
                      {asked === h.version ? "Yes, replace my draft" : "Restore"}
                    </button>
                  )}
                </div>
              </div>
              {asked === h.version && <p className="mt-2 text-sm text-amber-800">Your current draft will be replaced by version {h.version}. Tap again to confirm.</p>}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button type="button" onClick={() => load(page + 1)} disabled={loading} className="flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60">
            {loading ? "Loading…" : "Show older versions"}
          </button>
        )}
      </div>
    </Dialog>
  );
}
