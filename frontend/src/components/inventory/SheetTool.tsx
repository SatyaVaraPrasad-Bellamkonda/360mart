"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Info, LoaderCircle, RefreshCw, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { Category } from "@/lib/catalog/types";
import { loadCatalogSubcategoriesAction } from "@/lib/inventory/actions";
import { uploadSheetAction } from "@/lib/inventory/sheet-actions";
import { MAX_SUBCATEGORIES, needsFreshSheet, nothingReceived, SHEET_ACCEPT, sheetFileError, sheetProblems, SHEETS, type SheetFormat, type SheetKind } from "@/lib/inventory/sheets";

type Failure = { code: string; message: string; fieldErrors: Record<string, string> };
type Outcome = { kind: "done"; message: string } | { kind: "notice"; message: string } | { kind: "failed"; error: Failure };

type Copy = {
  chooseTitle: string;
  chooseText: string;
  downloadTitle: string;
  downloadText: string;
  yellow: string;
  tips: ReactNode[];
  uploadTitle: string;
  uploadText: string;
  uploadLabel: string;
  uploadingLabel: string;
  downloaded: string;
  invalid: (n: number) => string;
};

// What each sheet says; the steps, checks and results are shared.
const COPY: Record<SheetKind, Copy> = {
  price: {
    chooseTitle: "Choose what to update",
    chooseText: `Pick the subcategories you want in the sheet (up to ${MAX_SUBCATEGORIES}).`,
    downloadTitle: "Download the prices & stock sheet",
    downloadText: "It lists every size in those subcategories, with your current prices, stock and settings.",
    yellow: "Yellow: change these (the New columns)",
    tips: [
      "Rows you leave as they are are skipped. To keep a value, leave it.",
      <>
        To start selling a size marked <b>Listed: No</b>, fill in at least New MRP and New price.
      </>,
      "The price can't be more than the MRP. Rupees with up to 2 decimals; ₹, Rs and commas (1,050) are fine.",
      "New stock is the units you have now. Items with expiry dates get their stock from the deliveries sheet instead.",
      "New available: Yes to sell, No to hide. New max per order: 1 to 1000, empty = no limit.",
      "Don't change Variant ID, and don't copy rows between sheets. If you change something in the app after downloading, download a new sheet.",
    ],
    uploadTitle: "Upload your edited sheet",
    uploadText: "Everything is checked first. If any row has a problem, nothing changes and you'll see exactly what to fix.",
    uploadLabel: "Upload and update",
    uploadingLabel: "Checking and updating…",
    downloaded: "Edit the yellow columns, then upload it below.",
    invalid: (n) => `Nothing was changed. Fix ${n === 1 ? "this problem" : `these ${n} problems`} in your sheet and upload it again.`,
  },
  batch: {
    chooseTitle: "Choose where the deliveries are",
    chooseText: `Pick the subcategories of the items that arrived (up to ${MAX_SUBCATEGORIES}). Only items that track expiry dates are in this sheet.`,
    downloadTitle: "Download the deliveries sheet",
    downloadText: "One row per item with expiry dates, with its current stock and next expiry, plus empty rows for a second delivery of an item.",
    yellow: "Yellow: fill in for each delivery",
    tips: [
      <>
        <b>Quantity</b> (units received) and <b>Expires on</b> are required. Batch no, Cost price (per unit) and Manufactured on are optional.
      </>,
      "Leave an item's yellow cells empty if nothing arrived; that row is skipped.",
      "Dates like 25-12-2026. The expiry can't be in the past, and the manufacturing date can't be in the future or after the expiry.",
      "Two deliveries of the same item? Use an empty row at the bottom and type the item's Variant ID. In a CSV, add a new line with the same Variant ID and Sheet ID.",
      "Don't change the Sheet ID. A sheet can be uploaded only once, so a delivery is never added twice: download a new one for your next deliveries.",
    ],
    uploadTitle: "Upload the filled-in sheet",
    uploadText: "Everything is checked first. If any row has a problem, nothing is added and you'll see exactly what to fix.",
    uploadLabel: "Upload and add stock",
    uploadingLabel: "Checking and adding stock…",
    downloaded: "Fill in the deliveries in the yellow columns, then upload it below.",
    invalid: (n) => `Nothing was added. Fix ${n === 1 ? "this row" : `these ${n} problems`} in the same file and upload it again.`,
  },
};

// The store owner's sheets: choose subcategories → download → fill in Excel →
// upload → see what changed (or exactly which cells to fix). The backend
// applies an upload all or nothing. `kind` = the prices & stock sheet or the
// deliveries (expiry batches) sheet.
export function SheetTool({ categories, kind }: { categories: Category[]; kind: SheetKind }) {
  const copy = COPY[kind];
  const { sessionExpired } = useAuth();
  const [subs, setSubs] = useState<Record<number, Category[] | "loading" | "failed">>({});
  const [open, setOpen] = useState<number | null>(null);
  const [chosen, setChosen] = useState<Map<number, { name: string; parent: number }>>(new Map());
  const [format, setFormat] = useState<SheetFormat>("XLSX");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<{ ids: number[]; format: SheetFormat } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [uploading, startUpload] = useTransition();
  const [, startLoad] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const full = chosen.size >= MAX_SUBCATEGORIES;

  function toggleCategory(id: number) {
    const next = open === id ? null : id;
    setOpen(next);
    if (next !== null && (!subs[next] || subs[next] === "failed")) {
      setSubs((s) => ({ ...s, [next]: "loading" }));
      startLoad(async () => {
        const res = await loadCatalogSubcategoriesAction(next);
        if (!res.ok && res.error.code === "UNAUTHENTICATED") return sessionExpired();
        setSubs((s) => ({ ...s, [next]: res.ok ? res.data : "failed" }));
      });
    }
  }

  function pick(list: { categoryId: number; name: string; parentCategoryId: number | null }[], on: boolean) {
    setChosen((now) => {
      const next = new Map(now);
      for (const s of list) {
        if (!on) next.delete(s.categoryId);
        else if (next.size < MAX_SUBCATEGORIES) next.set(s.categoryId, { name: s.name, parent: s.parentCategoryId ?? 0 });
      }
      return next;
    });
  }

  async function download(ids = [...chosen.keys()], fmt = format) {
    if (ids.length === 0) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const query = new URLSearchParams({ format: fmt });
      ids.forEach((id) => query.append("subcategoryIds", String(id)));
      // "manual": a signed-out session would otherwise follow the redirect to the login page.
      const res = await fetch(`${SHEETS[kind].download}?${query}`, { redirect: "manual" });
      if (res.type === "opaqueredirect" || res.status === 401) return sessionExpired();
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as Failure | null;
        if (p?.code === "CATEGORY_NOT_FOUND") {
          // Drop the subcategories that are gone (errors point at their index in the list) and ask again.
          const gone = Object.keys(p.fieldErrors ?? {}).map((f) => ids[Number(/\[(\d+)\]/.exec(f)?.[1])]).filter((x) => x !== undefined);
          if (gone.length) setChosen((now) => new Map([...now].filter(([id]) => !gone.includes(id))));
          setSubs({});
          setOpen(null);
          return setDownloadError("Some of the subcategories you chose aren't in the shop any more. Choose again and download.");
        }
        return setDownloadError(p?.message ?? "The sheet couldn't be downloaded. Please try again.");
      }
      const blob = await res.blob();
      const name = /filename="?([^";]+)"?/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `${SHEETS[kind].fileStem}.${fmt.toLowerCase()}`;
      const href = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href, download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setLastDownload({ ids, format: fmt });
      toastSuccess(`Downloaded ${name}. ${copy.downloaded}`);
    } catch {
      setDownloadError("The sheet couldn't be downloaded. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  function choose(next: File | null) {
    setOutcome(null);
    if (!next) return setFile(null);
    const problem = sheetFileError(next, kind);
    setFileError(problem ?? null);
    setFile(problem ? null : next);
  }

  function upload() {
    if (!file) return;
    setOutcome(null);
    startUpload(async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await uploadSheetAction(kind, form);
      if (!res.ok && res.error.code === "UNAUTHENTICATED") return sessionExpired();
      if (res.ok && nothingReceived(res.data.message)) {
        // Nothing filled in: nothing changed and the sheet isn't used up, so keep the file chosen.
        setOutcome({ kind: "notice", message: res.data.message });
      } else if (res.ok) {
        setOutcome({ kind: "done", message: res.data.message });
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        toastSuccess(res.data.message);
      } else {
        setOutcome({ kind: "failed", error: res.error });
        toastError(res.error.code === "SHEET_INVALID" ? "Nothing was changed: some rows need fixing." : res.error.message);
      }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="space-y-5">
      {/* 1. Choose */}
      <Step n={1} title={copy.chooseTitle} text={copy.chooseText}>
        {chosen.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {[...chosen].slice(0, 8).map(([id, { name, parent }]) => (
              <span key={id} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-ink py-1 pl-3 pr-1 text-sm font-semibold text-white">
                {name}
                <button type="button" onClick={() => pick([{ categoryId: id, name, parentCategoryId: parent }], false)} aria-label={`Remove ${name}`} className="flex size-7 items-center justify-center rounded-full hover:bg-white/15">
                  <X aria-hidden className="size-3.5" />
                </button>
              </span>
            ))}
            {chosen.size > 8 && <span className="text-sm font-semibold text-muted">+{chosen.size - 8} more</span>}
            <button type="button" onClick={() => setChosen(new Map())} className="min-h-10 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
              Clear
            </button>
          </div>
        )}
        <p className={`text-sm ${full ? "font-semibold text-amber-800" : "text-muted"}`} aria-live="polite">
          {chosen.size} of {MAX_SUBCATEGORIES} chosen{full ? ": that's the most one sheet can hold." : ""}
        </p>

        {categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">The catalogue has no categories yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
            {categories.map((c) => {
              const list = subs[c.categoryId];
              const isOpen = open === c.categoryId;
              const picked = [...chosen.values()].filter((v) => v.parent === c.categoryId).length;
              return (
                <li key={c.categoryId} className="bg-white">
                  <button type="button" onClick={() => toggleCategory(c.categoryId)} aria-expanded={isOpen} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
                    <span className="font-semibold text-ink">{c.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {picked > 0 && <span className="rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">{picked} chosen</span>}
                      <ChevronDown aria-hidden className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line bg-surface/60 px-4 py-3">
                      {list === "loading" && <p className="flex items-center gap-2 py-2 text-sm text-muted"><LoaderCircle aria-hidden className="size-4 animate-spin" /> Loading…</p>}
                      {list === "failed" && (
                        <p className="flex flex-wrap items-center gap-2 py-2 text-sm text-red-700">
                          Couldn&apos;t load these.
                          <button type="button" onClick={() => { setOpen(null); toggleCategory(c.categoryId); }} className="min-h-10 rounded-full px-3 font-semibold text-ink ring-1 ring-line">Try again</button>
                        </p>
                      )}
                      {Array.isArray(list) && list.length === 0 && <p className="py-2 text-sm text-muted">No subcategories here yet.</p>}
                      {Array.isArray(list) && list.length > 0 && (
                        <fieldset>
                          <legend className="sr-only">Subcategories of {c.name}</legend>
                          <Check
                            label={`Select all in ${c.name}`}
                            strong
                            checked={list.every((s) => chosen.has(s.categoryId))}
                            mixed={list.some((s) => chosen.has(s.categoryId)) && !list.every((s) => chosen.has(s.categoryId))}
                            disabled={full && !list.some((s) => chosen.has(s.categoryId))}
                            onChange={(on) => pick(list, on)}
                          />
                          <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
                            {list.map((s) => (
                              <Check key={s.categoryId} label={s.name} checked={chosen.has(s.categoryId)} disabled={full && !chosen.has(s.categoryId)} onChange={(on) => pick([s], on)} />
                            ))}
                          </div>
                        </fieldset>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Step>

      {/* 2. Download */}
      <Step n={2} title={copy.downloadTitle} text={copy.downloadText}>
        <div className="flex flex-wrap items-end gap-3">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">File type</legend>
            <div className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
              {(["XLSX", "CSV"] as const).map((f) => (
                <label key={f} className="flex min-h-10 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold text-muted has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40">
                  <input type="radio" name="sheet-format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                  {f === "XLSX" ? "Excel (recommended)" : "CSV"}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={() => download()}
            disabled={chosen.size === 0 || downloading}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
            {downloading ? "Preparing…" : chosen.size === 0 ? "Choose subcategories first" : `Download (${chosen.size})`}
          </button>
        </div>
        {downloadError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{downloadError}</p>}

        <div className="rounded-2xl bg-surface p-4 text-sm text-ink/80 ring-1 ring-line">
          <p className="font-semibold text-ink">How to fill it in</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-4 rounded bg-yellow-200 ring-1 ring-yellow-400" /> {copy.yellow}
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-4 rounded bg-slate-200 ring-1 ring-slate-300" /> Grey: for reading, don&apos;t change
            </span>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-brand-deep">
            {copy.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </Step>

      {/* 3. Upload */}
      <Step n={3} title={copy.uploadTitle} text={copy.uploadText}>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${dragging ? "border-ink bg-surface" : fileError ? "border-red-400 bg-red-50/40" : "border-line bg-white hover:border-ink/40"}`}
        >
          <input ref={fileRef} type="file" accept={SHEET_ACCEPT} onChange={(e) => choose(e.target.files?.[0] ?? null)} className="sr-only" />
          {file ? (
            <>
              <FileSpreadsheet aria-hidden className="size-8 text-fresh" />
              <span className="max-w-full break-all font-semibold text-ink">{file.name}</span>
              <span className="text-xs text-muted">{(file.size / 1024).toFixed(file.size < 102_400 ? 1 : 0)} KB · tap to choose another</span>
            </>
          ) : (
            <>
              <UploadCloud aria-hidden className="size-8 text-muted" />
              <span className="font-semibold text-ink">Choose the sheet, or drop it here</span>
              <span className="text-xs text-muted">.xlsx or .csv, up to 2 MB</span>
            </>
          )}
        </label>
        {fileError && <p role="alert" className="text-sm text-red-700">{fileError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <UploadCloud aria-hidden className="size-4" />}
            {uploading ? copy.uploadingLabel : copy.uploadLabel}
          </button>
          {file && !uploading && (
            <button type="button" onClick={() => { choose(null); if (fileRef.current) fileRef.current.value = ""; }} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Remove file
            </button>
          )}
        </div>
        {uploading && <p className="text-sm text-muted" aria-live="polite">A big sheet can take a few seconds. Please keep this page open.</p>}
      </Step>

      {/* 4. Result */}
      <div ref={resultRef} className="scroll-mt-24" aria-live="polite">
        {outcome?.kind === "done" && <Done kind={kind} message={outcome.message} onFreshSheet={lastDownload ? () => download(lastDownload.ids, lastDownload.format) : undefined} freshing={downloading} />}
        {outcome?.kind === "notice" && (
          <p role="status" className="flex items-start gap-2 rounded-3xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 sm:p-6">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              {outcome.message} Nothing was added, and you can upload this same file again once it&apos;s filled in.
            </span>
          </p>
        )}
        {outcome?.kind === "failed" && (
          <Problems
            kind={kind}
            error={outcome.error}
            onRetry={file ? upload : undefined}
            onFreshSheet={lastDownload ? () => download(lastDownload.ids, lastDownload.format) : undefined}
            freshing={downloading}
          />
        )}
      </div>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={`step-${n}`} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Check({ label, checked, mixed, disabled, strong, onChange }: { label: string; checked: boolean; mixed?: boolean; disabled?: boolean; strong?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm ${strong ? "font-semibold text-ink" : "text-ink"} ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = !!mixed;
        }}
        onChange={(e) => onChange(mixed ? true : e.target.checked)}
        className="size-5 shrink-0 accent-ink"
      />
      <span className="min-w-0 break-words">{label}</span>
    </label>
  );
}

function Done({ kind, message, onFreshSheet, freshing }: { kind: SheetKind; message: string; onFreshSheet?: () => void; freshing: boolean }) {
  const newItems = kind === "price" && /new items? listed/i.test(message);
  return (
    <section className="space-y-3 rounded-3xl bg-green-50 p-4 ring-1 ring-green-200 sm:p-6">
      <p className="flex items-start gap-2 font-semibold text-green-900">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
        {message}
      </p>
      {kind === "batch" && <p className="text-sm text-green-900">This sheet is now used. For your next deliveries, download a new sheet.</p>}
      <div className="flex flex-wrap gap-2">
        {kind === "batch" && onFreshSheet && (
          <button type="button" onClick={onFreshSheet} disabled={freshing} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
            {freshing ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
            Download a new sheet
          </button>
        )}
        {newItems && (
          <Link href="/seller/products?tab=low" className="flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            Add stock to the new items
          </Link>
        )}
        <Link href="/seller/products" className="flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
          View your products
        </Link>
      </div>
    </section>
  );
}

const HINTS: Record<string, string> = {
  SHEET_UNREADABLE: "Upload the .xlsx or .csv sheet you downloaded here, after filling it in. Other files can't be read.",
  FILE_TOO_LARGE: "Upload the sheet you downloaded here; it is well under 2 MB.",
  SHEET_TOO_LARGE: "Choose fewer subcategories and download a smaller sheet.",
  LISTINGS_LOCKED: "Your store can't change products or stock right now. You can still download sheets.",
  SHEET_CONFLICT: "Your products changed while the sheet was being saved. Nothing was changed; please upload it again.",
  SHEET_ALREADY_UPLOADED: "Nothing was added again. For new deliveries, download a new sheet.",
};

function Problems({ kind, error, onRetry, onFreshSheet, freshing }: { kind: SheetKind; error: Failure; onRetry?: () => void; onFreshSheet?: () => void; freshing: boolean }) {
  const invalid = error.code === "SHEET_INVALID";
  const rows = invalid ? sheetProblems(error.fieldErrors, kind) : [];
  const stale = needsFreshSheet(error.fieldErrors) || error.code === "SHEET_ALREADY_UPLOADED";
  return (
    <section className="space-y-4 rounded-3xl bg-red-50 p-4 ring-1 ring-red-200 sm:p-6">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div className="min-w-0">
          <p className="font-semibold text-red-900">{invalid ? COPY[kind].invalid(rows.length) : error.message}</p>
          {HINTS[error.code] && <p className="mt-1 text-sm text-red-800">{HINTS[error.code]}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          {/* A table on wider screens, cards on phones. */}
          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-red-200 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-red-100/60 text-xs uppercase tracking-wide text-red-900">
                <tr>
                  <th scope="col" className="w-16 px-3 py-2">Row</th>
                  <th scope="col" className="w-36 px-3 py-2">Column</th>
                  <th scope="col" className="px-3 py-2">Problem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-3 py-2 font-bold tabular-nums text-ink">{r.row ?? ""}</td>
                    <td className="px-3 py-2 font-semibold text-ink">{r.column}</td>
                    <td className="px-3 py-2 text-ink/80">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 sm:hidden">
            {rows.map((r) => (
              <li key={r.key} className="rounded-2xl bg-white p-3 ring-1 ring-red-200">
                <p className="text-xs font-bold uppercase tracking-wide text-red-900">
                  {r.row !== null ? `Row ${r.row}` : r.column || "More"}
                  {r.row !== null && r.column ? ` · ${r.column}` : ""}
                </p>
                <p className="mt-0.5 text-sm text-ink">{r.message}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-900/80">Row numbers are as Excel shows them (row 1 is the headings).</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {stale && onFreshSheet && (
          <button type="button" onClick={onFreshSheet} disabled={freshing} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
            {freshing ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
            Download a new sheet
          </button>
        )}
        {stale && !onFreshSheet && <p className="text-sm text-red-900">This sheet can&apos;t be used any more. Choose the subcategories above and download a new sheet.</p>}
        {error.code === "SHEET_CONFLICT" && onRetry && (
          <button type="button" onClick={onRetry} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            <RefreshCw aria-hidden className="size-4" />
            Upload again
          </button>
        )}
      </div>
    </section>
  );
}
