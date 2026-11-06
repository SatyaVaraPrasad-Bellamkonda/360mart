"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Info, LoaderCircle, RefreshCw, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { MAX_SHEET_CATEGORIES, nothingChanged, PRODUCT_SHEET_ACCEPT, PRODUCT_SHEET_DOWNLOAD, productSheetFileError, productSheetProblems } from "@/lib/catalog/product-sheet";
import { fetchSubcategories, uploadProductSheet, type ProductSheetFailure } from "@/lib/catalog/admin-client";

type TopCategory = { id: number; name: string };
type Sub = { id: number; name: string };
type Scope = "some" | "all";
type Outcome = { kind: "done" | "notice"; message: string } | { kind: "failed"; error: ProductSheetFailure };

// The admin's bulk product editor: choose categories (or the whole catalog) →
// download the sheet → edit in Excel → upload → see what changed, or every
// cell to fix. The backend applies an upload all or nothing.
export function ProductSheetTool({ categories }: { categories: TopCategory[] }) {
  const { sessionExpired } = useAuth();
  const [scope, setScope] = useState<Scope>(categories.length ? "some" : "all");
  const [subs, setSubs] = useState<Record<number, Sub[] | "loading" | "failed">>({});
  const [open, setOpen] = useState<number | null>(null);
  // id → name + its parent (null = a top-level category, which brings all its subcategories).
  const [chosen, setChosen] = useState<Map<number, { name: string; parent: number | null }>>(new Map());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<number[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [uploading, startUpload] = useTransition();
  const [, startLoad] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const full = chosen.size >= MAX_SHEET_CATEGORIES;
  const ids = scope === "all" ? [] : [...chosen.keys()];
  const canDownload = scope === "all" || chosen.size > 0;

  function toggleOpen(id: number) {
    const next = open === id ? null : id;
    setOpen(next);
    if (next !== null && (!subs[next] || subs[next] === "failed")) {
      setSubs((s) => ({ ...s, [next]: "loading" }));
      startLoad(async () => {
        const res = await fetchSubcategories(next);
        if (!res.ok && res.error.code === "UNAUTHENTICATED") return sessionExpired();
        setSubs((s) => ({ ...s, [next]: res.ok ? res.data.map((c) => ({ id: c.categoryId, name: c.name })) : "failed" }));
      });
    }
  }

  function pickCategory(c: TopCategory, on: boolean) {
    setChosen((now) => {
      // The whole category replaces any of its subcategories picked one by one.
      const next = new Map([...now].filter(([, v]) => v.parent !== c.id));
      if (on) {
        if (next.size >= MAX_SHEET_CATEGORIES) return now;
        next.set(c.id, { name: c.name, parent: null });
      } else next.delete(c.id);
      return next;
    });
  }

  function pickSub(parent: number, s: Sub, on: boolean) {
    setChosen((now) => {
      const next = new Map(now);
      if (!on) next.delete(s.id);
      else if (next.size < MAX_SHEET_CATEGORIES) next.set(s.id, { name: s.name, parent });
      return next;
    });
  }

  async function download(list = ids) {
    setDownloading(true);
    setDownloadError(null);
    try {
      const query = new URLSearchParams();
      list.forEach((id) => query.append("categoryIds", String(id)));
      const qs = query.toString();
      // "manual": a signed-out session would otherwise follow the redirect to the login page and save it as the file.
      const res = await fetch(qs ? `${PRODUCT_SHEET_DOWNLOAD}?${qs}` : PRODUCT_SHEET_DOWNLOAD, { redirect: "manual" });
      if (res.type === "opaqueredirect" || res.status === 401) return sessionExpired();
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
        if (p?.code === "CATEGORY_NOT_FOUND") {
          setSubs({});
          setOpen(null);
          return setDownloadError("One of the categories you chose isn't in the catalog any more. Reload the page, choose again and download.");
        }
        return setDownloadError(p?.message ?? "The sheet couldn't be downloaded. Please try again.");
      }
      const blob = await res.blob();
      const name = /filename="?([^";]+)"?/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "products.xlsx";
      const href = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href, download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      setLastDownload(list);
      toastSuccess(`Downloaded ${name}. Edit it in Excel or Google Sheets, then upload it below.`);
    } catch {
      setDownloadError("The sheet couldn't be downloaded. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  function choose(next: File | null) {
    setOutcome(null);
    if (!next) {
      setFileError(null);
      return setFile(null);
    }
    const problem = productSheetFileError(next);
    setFileError(problem ?? null);
    setFile(problem ? null : next);
  }

  // Forget the chosen file but keep the result on screen (after a success).
  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function upload() {
    if (!file) return;
    setOutcome(null);
    startUpload(async () => {
      const res = await uploadProductSheet(file);
      if (!res.ok && res.error.code === "UNAUTHENTICATED") return sessionExpired();
      if (res.ok && nothingChanged(res.message)) {
        setOutcome({ kind: "notice", message: res.message });
      } else if (res.ok) {
        setOutcome({ kind: "done", message: res.message });
        clearFile();
        toastSuccess(res.message);
      } else {
        setOutcome({ kind: "failed", error: res.error });
        toastError(res.error.code === "SHEET_INVALID" ? "Nothing was changed: some rows need fixing." : res.error.code === "SHEET_UNREADABLE" ? "This file can't be read. Nothing was changed." : res.error.message);
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
      <Step n={1} title="Choose the products" text={`Pick whole categories or single subcategories (up to ${MAX_SHEET_CATEGORIES}), or take the whole catalog.`}>
        <fieldset>
          <legend className="sr-only">Which products</legend>
          <div className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
            {(
              [
                ["some", "Some categories"],
                ["all", "Whole catalog"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-10 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold text-muted has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40">
                <input type="radio" name="sheet-scope" value={value} checked={scope === value} onChange={() => setScope(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {scope === "all" ? (
          <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-ink/80 ring-1 ring-line">Every product and size in every subcategory. A very big catalog may not fit in one sheet; then choose categories instead.</p>
        ) : categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">There are no categories yet.</p>
        ) : (
          <>
            {chosen.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {[...chosen].slice(0, 10).map(([id, v]) => (
                  <span key={id} className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full bg-ink py-1 pl-3 pr-1 text-sm font-semibold text-white">
                    <span className="truncate">{v.parent === null ? `All of ${v.name}` : v.name}</span>
                    <button
                      type="button"
                      onClick={() => setChosen((now) => new Map([...now].filter(([k]) => k !== id)))}
                      aria-label={`Remove ${v.name}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </span>
                ))}
                {chosen.size > 10 && <span className="text-sm font-semibold text-muted">+{chosen.size - 10} more</span>}
                <button type="button" onClick={() => setChosen(new Map())} className="min-h-10 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
                  Clear
                </button>
              </div>
            )}
            <p className={`text-sm ${full ? "font-semibold text-amber-800" : "text-muted"}`} aria-live="polite">
              {chosen.size} of {MAX_SHEET_CATEGORIES} chosen{full ? ": that's the most one sheet can take." : ""}
            </p>

            <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
              {categories.map((c) => {
                const list = subs[c.id];
                const isOpen = open === c.id;
                const whole = chosen.has(c.id);
                const picked = [...chosen.values()].filter((v) => v.parent === c.id).length;
                return (
                  <li key={c.id} className="bg-white">
                    <div className="flex items-center gap-2 pr-2">
                      <label className={`flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 ${full && !whole ? "cursor-not-allowed opacity-60" : ""}`}>
                        <input type="checkbox" checked={whole} disabled={full && !whole} onChange={(e) => pickCategory(c, e.target.checked)} className="size-5 shrink-0 accent-ink" />
                        <span className="min-w-0 break-words font-semibold text-ink">{c.name}</span>
                        {whole && <span className="shrink-0 rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">All</span>}
                        {!whole && picked > 0 && <span className="shrink-0 rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">{picked} chosen</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleOpen(c.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Hide" : "Show"} subcategories of ${c.name}`}
                        className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink"
                      >
                        <span className="hidden sm:inline">Subcategories</span>
                        <ChevronDown aria-hidden className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-line bg-surface/60 px-4 py-3">
                        {list === "loading" && (
                          <p className="flex items-center gap-2 py-2 text-sm text-muted">
                            <LoaderCircle aria-hidden className="size-4 animate-spin" /> Loading…
                          </p>
                        )}
                        {list === "failed" && (
                          <p className="flex flex-wrap items-center gap-2 py-2 text-sm text-red-700">
                            Couldn&apos;t load these.
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(null);
                                toggleOpen(c.id);
                              }}
                              className="min-h-10 rounded-full px-3 font-semibold text-ink ring-1 ring-line"
                            >
                              Try again
                            </button>
                          </p>
                        )}
                        {Array.isArray(list) && list.length === 0 && <p className="py-2 text-sm text-muted">No subcategories here yet.</p>}
                        {Array.isArray(list) && list.length > 0 && (
                          <fieldset className="min-w-0">
                            <legend className="sr-only">Subcategories of {c.name}</legend>
                            {whole && <p className="pb-1 text-sm text-muted">All of {c.name} is in the sheet. Untick it above to choose single subcategories.</p>}
                            <div className="grid gap-x-4 sm:grid-cols-2">
                              {list.map((s) => (
                                <Check
                                  key={s.id}
                                  label={s.name}
                                  checked={whole || chosen.has(s.id)}
                                  disabled={whole || (full && !chosen.has(s.id))}
                                  onChange={(on) => pickSub(c.id, s, on)}
                                />
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
          </>
        )}
      </Step>

      {/* 2. Download */}
      <Step n={2} title="Download the sheet" text="An Excel file with two tabs: Products (one row per product) and Sizes (one row per size), plus empty rows to add new ones.">
        <button
          type="button"
          onClick={() => download()}
          disabled={!canDownload || downloading}
          className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
          {downloading ? "Preparing the sheet…" : !canDownload ? "Choose categories first" : scope === "all" ? "Download sheet (whole catalog)" : `Download sheet (${chosen.size})`}
        </button>
        {downloadError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {downloadError}
          </p>
        )}
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Open it in <b>Microsoft Excel</b> or <b>Google Sheets</b>. The dropdowns (category, food type, unit, Yes/No) don&apos;t show in Apple Numbers.
          </span>
        </p>
        <SheetHelp />
      </Step>

      {/* 3. Upload */}
      <Step n={3} title="Upload the edited sheet" text="Everything is checked first. If any row has a problem, nothing is changed and you'll see every cell to fix.">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${dragging ? "border-ink bg-surface" : fileError ? "border-red-400 bg-red-50/40" : "border-line bg-white hover:border-ink/40"}`}
        >
          <input ref={fileRef} type="file" accept={PRODUCT_SHEET_ACCEPT} onChange={(e) => choose(e.target.files?.[0] ?? null)} className="sr-only" />
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
              <span className="text-xs text-muted">.xlsx only, up to 5 MB</span>
            </>
          )}
        </label>
        {fileError && (
          <p role="alert" className="text-sm text-red-700">
            {fileError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <UploadCloud aria-hidden className="size-4" />}
            {uploading ? "Applying…" : "Upload and apply"}
          </button>
          {file && !uploading && (
            <button type="button" onClick={() => choose(null)} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Remove file
            </button>
          )}
        </div>
        {uploading && (
          <p className="text-sm text-muted" aria-live="polite">
            A big sheet can take a few seconds. Please keep this page open.
          </p>
        )}
      </Step>

      {/* 4. Result */}
      <div ref={resultRef} className="scroll-mt-24" aria-live="polite">
        {outcome?.kind === "done" && (
          <section className="space-y-3 rounded-3xl bg-green-50 p-4 ring-1 ring-green-200 sm:p-6">
            <p className="flex items-start gap-2 font-semibold text-green-900">
              <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
              {outcome.message}
            </p>
            <p className="text-sm text-green-900">Before your next edit, download a fresh sheet: this one now has old ids and versions, and an upload of it may be refused.</p>
            <div className="flex flex-wrap gap-2">
              <FreshSheet list={lastDownload} downloading={downloading} onDownload={download} primary />
              <Link href="/admin/products" className="flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                View products
              </Link>
            </div>
          </section>
        )}
        {outcome?.kind === "notice" && (
          <p role="status" className="flex items-start gap-2 rounded-3xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 sm:p-6">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>{outcome.message} Nothing was changed.</span>
          </p>
        )}
        {outcome?.kind === "failed" && <Problems error={outcome.error} onRetry={file ? upload : undefined} fresh={<FreshSheet list={lastDownload} downloading={downloading} onDownload={download} />} />}
      </div>
    </div>
  );
}

/** "Download a new sheet" with the categories of the last download. */
function FreshSheet({ list, downloading, onDownload, primary }: { list: number[] | null; downloading: boolean; onDownload: (list: number[]) => void; primary?: boolean }) {
  // Nothing downloaded on this visit: send the admin to step 1 to choose again.
  if (!list) {
    return (
      <a href="#sheet-step-1" className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold ${primary ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}>
        <Download aria-hidden className="size-4" />
        Choose and download a new sheet
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onDownload(list)}
      disabled={downloading}
      className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-60 ${primary ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
    >
      {downloading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
      Download a new sheet
    </button>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sheet-step-${n}`} className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={`sheet-step-${n}`} className="scroll-mt-28 text-lg font-bold text-ink">
            {title}
          </h2>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`flex min-h-11 items-center gap-3 rounded-lg px-1 text-sm text-ink ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-white"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-ink" />
      <span className="min-w-0 break-words">{label}</span>
    </label>
  );
}

const PRODUCT_HELP: [string, string][] = [
  ["Product ID", "Grey, locked"],
  ["Category", "Dropdown of subcategories"],
  ["Name, Slug", "Empty slug = made from the name"],
  ["Brand", ""],
  ["Food type", "Dropdown: Veg / Non-veg / Egg / empty"],
  ["Short description, Description", "Description can have several lines"],
  ["Origin", ""],
  ["Season start, Season end", "MM-DD, like 04-15; both or neither"],
  ["Always in season", "Yes/No dropdown"],
  ["Storage tip, Shelf life", ""],
  ["Badge label", ""],
  ["HSN code", ""],
  ["GST %", "0 to 40"],
  ["SEO title, SEO description", ""],
  ["Display order", ""],
  ["Featured, Active", "Yes/No dropdowns"],
  ["Sizes", "How many sizes it has; locked"],
];

const SIZE_HELP: [string, string][] = [
  ["Variant ID", "Locked"],
  ["Product ID", "Locked on existing rows; fill it in on new rows"],
  ["Product", "The product's name; locked"],
  ["Label", ""],
  ["Quantity", "Up to 3 decimals"],
  ["Unit", "Dropdown"],
  ["SKU", ""],
  ["Display order", ""],
  ["Active", "Yes/No dropdown"],
];

// What the admin sees in the file: the columns of both tabs and how to add rows.
function SheetHelp() {
  return (
    <details className="group rounded-2xl bg-surface ring-1 ring-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        What&apos;s in the file and how to add rows
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-line px-4 py-4 text-sm text-ink/80">
        <div className="grid gap-5 lg:grid-cols-2">
          <HelpTable title="Products tab · one row per product" rows={PRODUCT_HELP} />
          <HelpTable title="Sizes tab · one row per size" rows={SIZE_HELP} />
        </div>
        <div>
          <p className="font-semibold text-ink">Adding new rows</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-brand-deep">
            <li>
              <b>New product:</b> fill an empty row at the bottom of the Products tab (there are 100 spare rows). Name and Category are required.
            </li>
            <li>
              <b>New size:</b> fill an empty row at the bottom of the Sizes tab (200 spare rows). In Product ID, type the product&apos;s id. For a product you&apos;re adding in the same file, type <b>R</b> and its row number on the Products tab, like <b>R57</b>.
            </li>
            <li>Don&apos;t change the grey columns. Rows you leave as they are are skipped.</li>
            <li>If anyone changes a product in the admin panel after you downloaded, that row is refused: download a new sheet and make your change there.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}

function HelpTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{title}</p>
      <dl className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-white ring-1 ring-line">
        {rows.map(([column, note]) => (
          <div key={column} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3 px-3 py-2">
            <dt className="font-semibold text-ink">{column}</dt>
            <dd className="text-muted">{note || "Free text"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const HINTS: Record<string, string> = {
  SHEET_UNREADABLE: "Upload the .xlsx you downloaded from this page and edited in Excel or Google Sheets. Other files, damaged files and files over 5 MB can't be read.",
  FILE_TOO_LARGE: "The file is too big. Upload the sheet you downloaded here.",
  SHEET_TOO_LARGE: "Remove empty or extra rows, or download a sheet with fewer categories.",
  SHEET_CONFLICT: "Nothing was changed. Upload it again; if it's refused again, download a new sheet and make your change there.",
};

function Problems({ error, onRetry, fresh }: { error: ProductSheetFailure; onRetry?: () => void; fresh: ReactNode }) {
  const invalid = error.code === "SHEET_INVALID";
  const rows = invalid ? productSheetProblems(error.issues) : [];
  const counted = rows.filter((r) => r.tab).length;
  return (
    <section className="space-y-4 rounded-3xl bg-red-50 p-4 ring-1 ring-red-200 sm:p-6">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div className="min-w-0">
          <p className="font-semibold text-red-900">
            {invalid
              ? `${counted === 1 ? "1 problem" : `${counted} problems`} found. Fix ${counted === 1 ? "it" : "these"} in your file and upload it again. Nothing was changed.`
              : error.code === "SHEET_UNREADABLE"
                ? "This file can't be read. Nothing was changed."
                : error.message}
          </p>
          {!invalid && HINTS[error.code] && <p className="mt-1 text-sm text-red-800">{HINTS[error.code]}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          {/* A table on wider screens, cards on phones. */}
          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-red-200 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-red-100/60 text-xs uppercase tracking-wide text-red-900">
                <tr>
                  <th scope="col" className="w-24 px-3 py-2">Tab</th>
                  <th scope="col" className="w-16 px-3 py-2">Row</th>
                  <th scope="col" className="w-40 px-3 py-2">Column</th>
                  <th scope="col" className="px-3 py-2">Problem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-3 py-2 font-semibold text-ink">{r.tab}</td>
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
                {r.tab && (
                  <p className="text-xs font-bold uppercase tracking-wide text-red-900">
                    {[r.tab, r.row !== null ? `Row ${r.row}` : "", r.column].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-ink">{r.message}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-900/80">
            Row numbers are the ones Excel shows on the left (row 1 is the headings). Cells that can&apos;t be read are listed first; once they&apos;re fixed, the next upload checks the rest (like two products with the same name).
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {error.code === "SHEET_CONFLICT" && onRetry && (
          <button type="button" onClick={onRetry} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            <RefreshCw aria-hidden className="size-4" />
            Upload again
          </button>
        )}
        {(invalid || error.code === "SHEET_CONFLICT") && fresh}
      </div>
    </section>
  );
}
