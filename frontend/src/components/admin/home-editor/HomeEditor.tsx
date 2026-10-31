"use client";

import { Check, CircleDot, Clock, ExternalLink, Eye, History, LoaderCircle, Monitor, RotateCcw, Smartphone, Undo2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActionButton, HistoryDialog, Panel, PreviewDialog } from "@/components/admin/page-editor/shell";
import { Dialog } from "@/components/Dialog";
import { HomeHero } from "@/components/home/HomeHero";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { ActionError } from "@/lib/auth/actions";
import type { Category } from "@/lib/catalog/types";
import { heroDisplay, type PageImagePurpose } from "@/lib/category-page/types";
import { discardHomeDraftAction, homeHistoryAction, loadHomeAdminAction, publishHomeAction, restoreHomeAction, saveHomeDraftAction, uploadHomeImageAction } from "@/lib/home-page/actions";
import { HOME_DEFAULTS, isSlotSource, type AdminHomePage, type HomeHeroDoc, type HomeHeroView, type HomePage, type HomePageDocument, type HomeSection, type TimeSlot } from "@/lib/home-page/types";
import { cleanHomeDocument, floatingLabelsOf, homeErrors, indiaMinutes, sameHome, slotAt, timeLabel, toEditableHome } from "@/lib/home-page/validation";
import { dateTimeText } from "@/lib/stores/validation";
import { HomeHeroFields } from "./HomeHeroFields";
import { homeTitle, HomeSectionsEditor } from "./HomeSectionsEditor";
import { NamesContext, type Known, type Names } from "./names";
import { TimeSlotsEditor } from "./TimeSlotsEditor";

type Errors = Record<string, string>;

// The home page designer. Works on a local copy; "Save draft" sends the whole
// document (PUT replaces it), "Publish" makes the saved draft live. Every write
// carries the version it started from: if another admin saved in between, the
// backend refuses (409) and the admin picks theirs or mine.
export function HomeEditor({ initial, preview, categories }: { initial: AdminHomePage; preview: HomePage | null; categories: Category[] }) {
  const { sessionExpired } = useAuth();
  const [meta, setMeta] = useState(initial);
  const [doc, setDoc] = useState<HomePageDocument>(() => toEditableHome(initial.effectiveDraft));
  const [saved, setSaved] = useState<HomePageDocument>(doc);
  const [version, setVersion] = useState(initial.version);
  const [unpublished, setUnpublished] = useState(initial.hasUnpublishedChanges);
  const [images, setImages] = useState(initial.images);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | "preview" | "discard" | "load" | null>(null);
  const [, startTransition] = useTransition();
  const [conflict, setConflict] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const names = useNamesRegistry(preview, categories);

  const dirty = !sameHome(doc, saved);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const urlOf = (imageId: string | null | undefined) => (imageId ? (localUrls[imageId] ?? images.find((i) => i.imageId === imageId)?.url ?? null) : null);

  function reset(data: AdminHomePage) {
    const fresh = toEditableHome(data.effectiveDraft);
    setMeta(data);
    setDoc(fresh);
    setSaved(fresh);
    setVersion(data.version);
    setUnpublished(data.hasUnpublishedChanges);
    setImages(data.images);
    setErrors({});
  }

  function failed(error: ActionError) {
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
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true], .ring-red-300, .ring-red-400")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  const dropErrors = (prefix: string) => setErrors((e) => (Object.keys(e).some((k) => k.startsWith(prefix)) ? Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(prefix))) : e));
  const setHero = (patch: Partial<HomeHeroDoc>) => {
    setDoc((d) => ({ ...d, hero: { ...d.hero, ...patch } }));
    dropErrors("hero");
  };
  // Errors are keyed by position, so a move/add/remove drops them for that list.
  const setSlots = (timeSlots: TimeSlot[], structural?: boolean) => {
    setDoc((d) => ({ ...d, timeSlots }));
    if (structural) dropErrors("timeSlots");
  };
  const setSections = (sections: HomeSection[], structural?: boolean) => {
    setDoc((d) => ({ ...d, sections }));
    if (structural) dropErrors("sections");
  };

  /** Save the draft; the new version, or null when it didn't save. */
  async function persist(from = version): Promise<number | null> {
    const clean = cleanHomeDocument(doc);
    const found = homeErrors(clean);
    if (Object.keys(found).length) {
      setErrors(found);
      toastError("Please fix the highlighted fields.");
      focusFirstError();
      return null;
    }
    const res = await saveHomeDraftAction(from, clean);
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
      const res = await publishHomeAction(from);
      if (!res.ok) return failed(res.error);
      setVersion(res.data.version);
      setUnpublished(false);
      setMeta((m) => ({ ...m, publishedVersion: res.data.version, publishedAt: new Date().toISOString() }));
      toastSuccess(res.data.message || "Published. Shoppers see the new home page now.");
    });

  const showPreview = (history?: number) =>
    run("preview", async () => {
      // The preview is built from the saved draft, so unsaved changes are saved first.
      const at = history ? version : dirty ? await persist() : version;
      if (at === null) return;
      setPreviewSrc(`/admin/home-preview?${history ? `history=${history}` : `v=${at}`}`);
    });

  async function reload(message?: string) {
    const res = await loadHomeAdminAction();
    if (!res.ok) return failed(res.error);
    reset(res.data);
    if (message) toastSuccess(message);
  }

  const discard = () =>
    run("discard", async () => {
      setConfirmDiscard(false);
      const res = await discardHomeDraftAction(version);
      if (!res.ok) return failed(res.error);
      await reload("Draft discarded. The designer shows the live page again.");
    });

  const resolveConflict = (keepMine: boolean) =>
    run("load", async () => {
      setConflict(false);
      const res = await loadHomeAdminAction();
      if (!res.ok) return failed(res.error);
      if (!keepMine) {
        reset(res.data);
        return void toastSuccess("Loaded the latest version.");
      }
      setMeta(res.data);
      setImages(res.data.images);
      const next = await persist(res.data.version);
      if (next !== null) toastSuccess("Your changes are saved over the latest version.");
    });

  /** Uploads a picture, then `apply` puts its id where it belongs. */
  function upload(purpose: PageImagePurpose, slot: string, file: File, apply: (imageId: string) => void) {
    setUploading(slot);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("image", file);
      startTransition(async () => {
        const res = await uploadHomeImageAction(form);
        setUploading(null);
        if (!res.ok) return failed(res.error);
        const imageId = res.data.imageId;
        if (dataUrl) setLocalUrls((m) => ({ ...m, [imageId]: dataUrl }));
        setImages((list) => [{ imageId, url: dataUrl ?? "", purpose }, ...list]);
        apply(imageId);
        toastSuccess("Picture uploaded. Save the draft to keep it on the page.");
      });
    };
    reader.onerror = () => {
      setUploading(null);
      toastError("That picture couldn't be read. Try another one.");
    };
    reader.readAsDataURL(file);
  }

  const uploadHero = (slot: "HERO" | "HERO_MOBILE", file: File) => upload(slot, slot, file, (imageId) => setHero(slot === "HERO_MOBILE" ? { mobileImageId: imageId } : { imageId }));
  const uploadBanner = (sectionId: string, mobile: boolean, file: File) =>
    upload("BANNER", `${mobile ? "banner-mobile" : "banner"}:${sectionId}`, file, (imageId) => {
      setDoc((d) => ({ ...d, sections: d.sections.map((x) => (x.id === sectionId && x.type === "PROMO_BANNER" ? { ...x, [mobile ? "mobileImageId" : "imageId"]: imageId } : x)) }));
      dropErrors("sections");
    });

  const links = [{ label: "Home", path: "/" }, { label: "All categories", path: "/categories" }, ...categories.slice(0, 10).map((c) => ({ label: c.name, path: `/${c.slug}` }))];
  const live = useMemo(() => liveCounts(preview), [preview]);

  const status = dirty
    ? { tone: "bg-amber-50 text-amber-800 ring-amber-200", text: "Unsaved changes" }
    : unpublished
      ? { tone: "bg-sky-50 text-sky-800 ring-sky-200", text: "Draft saved · not live yet" }
      : meta.publishedVersion
        ? { tone: "bg-green-50 text-green-800 ring-green-200", text: `Live · version ${meta.publishedVersion}${meta.publishedAt ? ` · ${dateTimeText(meta.publishedAt)}` : ""}` }
        : { tone: "bg-surface text-muted ring-line", text: "Standard home page · never published" };

  return (
    <NamesContext.Provider value={names}>
      <div className="space-y-5 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${status.tone}`} aria-live="polite">
            <CircleDot aria-hidden className="size-4" />
            {status.text}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/" target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <ExternalLink aria-hidden className="size-4" />
              View home page
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

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div ref={formRef} className="min-w-0 space-y-5">
            <Panel title="Banner" text="The top of the home page. Empty fields use the standard words.">
              <HomeHeroFields hero={doc.hero} onChange={setHero} errors={errors} categories={categories} images={images} urlOf={urlOf} uploading={uploading} onUpload={uploadHero} />
            </Panel>
            <Panel title="Times of day" text="Split the day and choose what each part shows. A time-of-day row (under Sections) shows the products of the part that's on now, India time.">
              <TimeSlotsEditor slots={doc.timeSlots} onChange={setSlots} errors={errors} categories={categories} />
            </Panel>
            <Panel
              title="Sections"
              text="Shown under the banner in this order. A product shows in one row only: the first row from the top that has it, so put Bestsellers and your picks above wide rows like In season. Empty rows hide themselves."
            >
              <HomeSectionsEditor
                sections={doc.sections}
                onChange={setSections}
                errors={errors}
                hasSlots={doc.timeSlots.length > 0}
                categories={categories}
                pictures={{ gallery: images.map((img) => ({ imageId: img.imageId, url: urlOf(img.imageId) ?? img.url })), urlOf, uploading, onUpload: uploadBanner }}
                links={links}
                live={live}
              />
            </Panel>
          </div>

          <aside aria-label="Live preview" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <LivePreview hero={heroView(doc.hero, urlOf)} doc={doc} live={live} onFullPreview={() => showPreview()} previewBusy={busy === "preview"} />
          </aside>
        </div>

        {/* Save / publish, always in reach. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
            <p className="hidden min-w-0 truncate text-sm text-muted sm:block">{dirty ? "You have unsaved changes." : unpublished ? "Your draft is saved. Publish to make it live." : "Everything is saved."}</p>
            <div className="flex flex-1 justify-end gap-2 sm:flex-none">
              <ActionButton onClick={() => showPreview()} busy={busy === "preview"} disabled={!!busy} icon={<Eye aria-hidden className="size-4" />} label="Preview" />
              <ActionButton onClick={save} busy={busy === "save"} disabled={!!busy || !dirty} icon={<Check aria-hidden className="size-4" />} label="Save draft" shortLabel="Save" />
              <ActionButton onClick={publish} busy={busy === "publish"} disabled={!!busy || (!dirty && !unpublished)} icon={<UploadCloud aria-hidden className="size-4" />} label="Publish" primary />
            </div>
          </div>
        </div>

        <Dialog open={conflict} onClose={() => setConflict(false)} title="Someone else changed the home page" description="It was saved by another admin after you opened it.">
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

        <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard the draft?" description="The unpublished changes are thrown away. The live home page stays as it is.">
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
          load={homeHistoryAction}
          liveVersion={meta.publishedVersion}
          hasDraftChanges={dirty || unpublished}
          onPreview={(v) => showPreview(v)}
          onRestore={async (from) => {
            const res = await restoreHomeAction(version, from);
            if (!res.ok) return failed(res.error);
            setHistoryOpen(false);
            await reload(`Version ${from} is back in the draft. Publish to make it live.`);
          }}
          onError={failed}
        />

        <PreviewDialog src={previewSrc} onClose={() => setPreviewSrc(null)} />
      </div>
    </NamesContext.Provider>
  );
}

/** The hero as shoppers will see it: empty fields show the standard words. */
function heroView(h: HomeHeroDoc, urlOf: (id: string | null | undefined) => string | null): HomeHeroView {
  const d = heroDisplay(h);
  return {
    headline: h.headline?.trim() || HOME_DEFAULTS.headline,
    accentLine: h.accentLine?.trim() || HOME_DEFAULTS.accentLine,
    intro: h.intro?.trim() || HOME_DEFAULTS.intro,
    badge: h.badge?.trim() || HOME_DEFAULTS.badge,
    buttonLabel: h.buttonLabel?.trim() || HOME_DEFAULTS.buttonLabel,
    buttonLink: h.buttonLink?.trim() || HOME_DEFAULTS.buttonLink,
    visual: h.visual === "PHOTO" ? "PHOTO" : "CART_ANIMATION",
    imageId: h.imageId ?? null,
    imageUrl: urlOf(h.imageId),
    mobileImageId: h.mobileImageId ?? null,
    mobileImageUrl: urlOf(h.mobileImageId),
    imageAlt: h.imageAlt?.trim() || null,
    floatingLabels: floatingLabelsOf(h),
    enabled: d.enabled,
    layout: d.layout,
    size: d.size,
    showBadge: d.showBadge,
    animation: d.animation,
  };
}

/** What each section of the saved page shows now, from the preview ("8 products now", "empty now, hidden"). */
function liveCounts(page: HomePage | null): Record<string, string> {
  if (!page) return {};
  const out: Record<string, string> = {};
  const n = (count: number, one: string, many: string) => (count === 0 ? "empty now, hidden" : `${count} ${count === 1 ? one : many} now`);
  for (const s of page.sections) {
    if (s.type === "CATEGORY_GRID") out[s.id] = n(page.categoryGrids[s.id]?.length ?? 0, "category", "categories");
    if (s.type === "TRENDING_SEARCHES") out[s.id] = n(page.trendingSearches[s.id]?.length ?? 0, "search", "searches");
    if (s.type === "PRODUCT_RAIL" && !isSlotSource(s.source)) out[s.id] = n(page.rails[s.id]?.length ?? 0, "product", "products");
    if (s.type === "PRODUCT_RAIL" && isSlotSource(s.source)) {
      const rows = Object.values(page.slotRails[s.id] ?? {});
      const sales = rows.filter((r) => r.basedOn === "SALES").length;
      out[s.id] = rows.some((r) => r.products.length) ? `${rows.filter((r) => r.products.length).length} of ${page.timeSlots.length} slots filled${sales ? `, ${sales} from sales` : ""}` : "empty now, hidden";
    }
  }
  return out;
}

/** Names for product and category ids: from the preview, the category list, and every pick made here. */
function useNamesRegistry(preview: HomePage | null, categories: Category[]): Names {
  const [products, setProducts] = useState<Record<number, Known>>(() => {
    const m: Record<number, Known> = {};
    const add = (p: { productId: number; name: string; imageUrl: string | null; brand?: string | null }) => (m[p.productId] = { name: p.name, imageUrl: p.imageUrl, note: p.brand ?? undefined });
    Object.values(preview?.rails ?? {}).forEach((list) => list.forEach(add));
    Object.values(preview?.slotRails ?? {}).forEach((slots) => Object.values(slots).forEach((r) => r.products.forEach(add)));
    return m;
  });
  const [cats, setCats] = useState<Record<number, Known>>(() => {
    const m: Record<number, Known> = {};
    categories.forEach((c) => (m[c.categoryId] = { name: c.name, imageUrl: c.imageUrl }));
    Object.values(preview?.categoryGrids ?? {}).forEach((list) =>
      list.forEach((c) => (m[c.categoryId] = { name: c.name, imageUrl: c.imageUrl, note: c.parentCategoryId ? `in ${categories.find((p) => p.categoryId === c.parentCategoryId)?.name ?? "a category"}` : undefined })),
    );
    return m;
  });
  const learnProducts = useCallback<Names["learnProducts"]>((items) => setProducts((m) => ({ ...m, ...Object.fromEntries(items.map((p) => [p.productId, { name: p.name, imageUrl: p.imageUrl, note: p.brand ?? undefined }])) })), []);
  const learnCategories = useCallback<Names["learnCategories"]>((items, note) => setCats((m) => ({ ...m, ...Object.fromEntries(items.map((c) => [c.categoryId, { name: c.name, imageUrl: c.imageUrl, note: note ? `in ${note}` : undefined }])) })), []);
  return useMemo(
    () => ({
      product: (id) => products[id] ?? { name: `Product ${id}`, imageUrl: null, note: "Picked earlier" },
      category: (id) => cats[id] ?? { name: `Subcategory ${id}`, imageUrl: null, note: "Open its category in the picker to see the name" },
      learnProducts,
      learnCategories,
    }),
    [products, cats, learnProducts, learnCategories],
  );
}

// ---- live preview ----

const DESKTOP_WIDTH = 1180;
const wide = {
  subscribe: (cb: () => void) => {
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
  get: () => window.matchMedia("(min-width: 1024px)").matches,
};
const clock = {
  subscribe: (cb: () => void) => {
    const t = setInterval(cb, 60_000);
    return () => clearInterval(t);
  },
  get: () => indiaMinutes(new Date()),
};

// The banner as shoppers see it, updated while typing (on a computer: the
// desktop layout scaled to the column), then the sections in order with what
// each shows now. "Full page" saves the draft and opens the real page.
function LivePreview({ hero, doc, live, onFullPreview, previewBusy }: { hero: HomeHeroView; doc: HomePageDocument; live: Record<string, string>; onFullPreview: () => void; previewBusy: boolean }) {
  const isWide = useSyncExternalStore(wide.subscribe, wide.get, () => false);
  const now = useSyncExternalStore(clock.subscribe, clock.get, () => null);
  const slot = now === null ? undefined : slotAt(doc.timeSlots, now);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !isWide) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESKTOP_WIDTH));
    observer.observe(box);
    return () => observer.disconnect();
  }, [isWide]);

  // Keyed by the look, so a new layout or animation plays again.
  const banner = <HomeHero key={`${hero.layout}-${hero.animation}-${hero.size}-${hero.enabled}-${hero.visual}`} hero={hero} />;
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
      <div ref={boxRef} aria-hidden className="pointer-events-none overflow-hidden rounded-2xl bg-white">
        {isWide ? <div style={{ width: DESKTOP_WIDTH, zoom: scale }}>{banner}</div> : banner}
      </div>
      {slot && (
        <p className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs text-muted ring-1 ring-line">
          <Clock aria-hidden className="size-3.5 shrink-0 text-brand-deep" />
          Now: <span className="font-semibold text-ink">{slot.label || "a slot"}</span> ({timeLabel(slot.start)} – {timeLabel(slot.end)}) · &ldquo;{slot.title || "no title yet"}&rdquo;
        </p>
      )}
      <ol className="space-y-1.5">
        {doc.sections.map((s) => {
          const off = s.enabled === false;
          return (
            <li key={s.id} className={`flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line ${off ? "opacity-50" : ""}`}>
              <span className="min-w-0 truncate font-semibold text-ink">{homeTitle(s)}</span>
              <span className="shrink-0 text-xs text-muted">{off ? "Off" : (live[s.id] ?? "")}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted">Counts are from when you opened the designer. &ldquo;Full page&rdquo; saves your draft and shows the real page with its products.</p>
    </div>
  );
}
