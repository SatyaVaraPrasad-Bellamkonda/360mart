"use client";

import { AlertTriangle, CalendarClock, Check, Code2, Copy, ImagePlus, Info, LoaderCircle, Monitor, Smartphone, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { toastError } from "@/components/Toaster";
import type { PageLink } from "@/components/admin/page-editor/ContentSectionFields";
import { Segmented } from "@/components/admin/page-editor/parts";
import { istInput, isoFromIstInput } from "@/lib/campaigns/validation";
import { CATEGORY_IMAGE_TYPES, categoryImageError } from "@/lib/catalog/validation";
import { HTML_HELP, HTML_LIMITS, HTML_TEMPLATES, htmlBlockState, htmlProblem } from "@/lib/home-page/html-block";
import type { HtmlBlockSection } from "@/lib/home-page/types";
import { when } from "@/lib/orders/format";
import { useNow } from "@/components/support/Deadline";

export type HtmlPictures = {
  /** Pictures uploaded for HTML blocks (newest first), with their permanent links. */
  list: { imageId: string; url: string }[];
  uploading: boolean;
  onUpload: (file: File, done: (url: string) => void) => void;
};

type Device = "desktop" | "phone";
const PAGE_WIDTH = 1152; // the shop's page column (max-w-6xl)
const PHONE_WIDTH = 360;

// An HTML block in the home designer: starter templates, the code (and an
// optional phone version) with a live preview at desktop and phone width,
// pictures with their links, the block link, width and schedule. The preview
// is a sandboxed frame (no scripts run); the backend's sanitizer is the real
// check when the draft is saved, and its messages land under the fields.
export function HtmlBlockFields({
  section: s,
  at,
  errors,
  update,
  links,
  pictures,
}: {
  section: HtmlBlockSection;
  at: string;
  errors: Record<string, string>;
  update: (patch: Partial<HtmlBlockSection>) => void;
  links: PageLink[];
  pictures: HtmlPictures;
}) {
  const [tab, setTab] = useState<Device>("desktop");
  const [phoneDesign, setPhoneDesign] = useState(!!s.mobileHtml?.trim());
  const desktopRef = useRef<HTMLTextAreaElement>(null);
  const phoneRef = useRef<HTMLTextAreaElement>(null);
  const linked = !!s.linkPath?.trim();
  const editingPhone = tab === "phone" && phoneDesign;
  const code = editingPhone ? (s.mobileHtml ?? "") : s.html;
  const field = editingPhone ? "mobileHtml" : "html";
  const serverError = errors[`${at}.${field}`];
  const otherError = errors[`${at}.${editingPhone ? "html" : "mobileHtml"}`];
  const check = htmlProblem(code, linked);
  // What the preview shows: the phone design on the phone tab when there is one.
  const previewHtml = tab === "phone" && phoneDesign && s.mobileHtml?.trim() ? s.mobileHtml : s.html;

  function setCode(value: string) {
    update(editingPhone ? { mobileHtml: value } : { html: value });
  }

  function applyTemplate(html: string) {
    if (code.trim() && code.trim() !== html.trim() && !window.confirm("Replace the HTML you have with this template?")) return;
    setCode(html);
  }

  /** Puts text at the cursor of the box being edited. */
  function insert(text: string) {
    const box = editingPhone ? phoneRef.current : desktopRef.current;
    const start = box?.selectionStart ?? code.length;
    const end = box?.selectionEnd ?? code.length;
    setCode(code.slice(0, start) + text + code.slice(end));
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Sparkles aria-hidden className="size-4 text-brand-deep" /> Start from a template
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {HTML_TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyTemplate(t.html)} className="min-h-14 rounded-2xl bg-white px-3 py-2 text-left ring-1 ring-line transition hover:ring-ink">
              <span className="block text-sm font-bold text-ink">{t.name}</span>
              <span className="block text-xs text-muted">{t.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Code + preview */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Screen" className="inline-flex gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
            {(
              [
                ["desktop", "All screens", Monitor],
                ["phone", "Phones", Smartphone],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className="flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-muted transition aria-selected:bg-white aria-selected:text-ink aria-selected:shadow-sm"
              >
                <Icon aria-hidden className="size-4" />
                {label}
                {value === "phone" && phoneDesign && <span className="rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-brand-deep">own</span>}
              </button>
            ))}
          </div>
          {tab === "phone" && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={phoneDesign}
                onChange={(e) => {
                  const on = e.target.checked;
                  setPhoneDesign(on);
                  // Starting a phone design from the main one is quicker than from nothing; off = phones use the main design.
                  update({ mobileHtml: on ? s.mobileHtml?.trim() || s.html : "" });
                }}
                className="size-5 accent-ink"
              />
              A different design on phones
            </label>
          )}
        </div>

        {tab === "phone" && !phoneDesign ? (
          <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            Phones show the same HTML as other screens, as below. Tick the box above to give phones their own design.
          </p>
        ) : (
          <CodeBox
            ref={editingPhone ? phoneRef : desktopRef}
            label={editingPhone ? "HTML for phones" : "HTML"}
            value={code}
            onChange={setCode}
            error={serverError}
            warning={serverError ? undefined : (check ?? undefined)}
          />
        )}
        {otherError && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertTriangle aria-hidden className="size-4 shrink-0" />
            The {editingPhone ? "main" : "phone"} design needs a fix too: {otherError}
          </p>
        )}

        <Preview html={previewHtml} device={tab} />
      </div>

      {/* Pictures */}
      <PicturePanel pictures={pictures} onInsert={(url) => insert(`<img src="${url}" alt="Describe the picture" width="800" height="400" style="max-width:100%;height:auto;border-radius:16px;" />`)} />

      {/* Link */}
      <div className="space-y-3">
        <TextField
          label="Link the whole block"
          name={`${at}-link`}
          optional
          autoComplete="off"
          maxLength={230}
          value={s.linkPath ?? ""}
          onChange={(linkPath) => update({ linkPath: linkPath.replace(/\s/g, "") })}
          error={errors[`${at}.linkPath`]}
          placeholder="/fruits/mangoes"
          hint="A page on 360mart. Tapping anywhere on the block opens it. With a link, the HTML can't have links of its own."
        />
        <div className="flex flex-wrap gap-1.5">
          {[...links, { label: "Search", path: "/search?q=mango" }].map((l) => (
            <button
              key={l.path}
              type="button"
              onClick={() => update({ linkPath: l.path })}
              aria-pressed={s.linkPath === l.path}
              className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold text-ink ring-1 ring-line transition hover:ring-ink aria-pressed:bg-ink aria-pressed:text-white aria-pressed:ring-ink"
            >
              {l.label}
            </button>
          ))}
          {linked && (
            <button type="button" onClick={() => update({ linkPath: "", linkLabel: "" })} className="flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
              <X aria-hidden className="size-3.5" /> No link
            </button>
          )}
        </div>
        {linked && (
          <TextField
            label="Link text for screen readers"
            name={`${at}-link-label`}
            autoComplete="off"
            maxLength={HTML_LIMITS.linkLabel}
            value={s.linkLabel ?? ""}
            onChange={(linkLabel) => update({ linkLabel })}
            error={errors[`${at}.linkLabel`]}
            placeholder="See this week's mango offers"
            hint="What the link does, read aloud to people who can't see the block."
          />
        )}
      </div>

      <Segmented
        label="Width"
        value={s.width === "FULL" ? "FULL" : "CONTAINED"}
        options={[
          { value: "CONTAINED", label: "Page width" },
          { value: "FULL", label: "Edge to edge" },
        ]}
        onChange={(width) => update({ width })}
      />

      <Schedule section={s} at={at} errors={errors} update={update} />

      <details className="group rounded-2xl bg-surface ring-1 ring-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <Code2 aria-hidden className="size-4 text-brand-deep" />
          What you can use in the HTML
        </summary>
        <div className="space-y-3 border-t border-line px-4 py-3 text-sm text-ink/80">
          <HelpList title="Elements" rows={HTML_HELP.elements} />
          <HelpList title="Attributes" rows={HTML_HELP.attributes} />
          <p>
            <span className="font-semibold text-ink">CSS (style attribute only): </span>
            {HTML_HELP.css}
          </p>
          <p>
            <span className="font-semibold text-red-800">Not allowed: </span>
            {HTML_HELP.refused}
          </p>
          <p className="text-xs text-muted">The server may rewrite a few characters when it saves (&apos; as &amp;#39;, &lt;br&gt; as &lt;br /&gt;, a &lt;tbody&gt; in tables). It means the same.</p>
        </div>
      </details>
    </div>
  );
}

function CodeBox({ ref, label, value, onChange, error, warning }: { ref: React.Ref<HTMLTextAreaElement>; label: string; value: string; onChange: (v: string) => void; error?: string; warning?: string }) {
  const id = useId();
  const over = value.length > HTML_LIMITS.html;
  // Tab indents instead of leaving the box (Shift+Tab or Esc then Tab still moves on).
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const box = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = box;
    onChange(value.slice(0, a) + "  " + value.slice(b));
    requestAnimationFrame(() => box.setSelectionRange(a + 2, a + 2));
  }
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className={`text-xs tabular-nums ${over ? "font-bold text-red-700" : "text-muted"}`}>
          {value.length.toLocaleString("en-IN")} / {HTML_LIMITS.html.toLocaleString("en-IN")}
        </span>
      </div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={12}
        aria-invalid={!!error}
        aria-describedby={`${id}-note`}
        className={`block w-full resize-y rounded-2xl bg-ink px-4 py-3 font-mono text-[13px] leading-6 text-slate-100 caret-brand outline-none ring-2 selection:bg-brand/40 focus:ring-brand/60 ${error ? "ring-red-400" : "ring-transparent"}`}
      />
      <p id={`${id}-note`} className={`mt-1.5 flex items-start gap-1.5 text-sm ${error ? "text-red-700" : warning ? "text-amber-800" : "text-muted"}`}>
        {error ? <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> : warning ? <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> : <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-fresh" />}
        <span>{error ?? (warning ? `This will be refused on save: ${warning}` : "Looks fine. The server checks it again when you save.")}</span>
      </p>
    </div>
  );
}

/**
 * The HTML in a frame with no scripts (sandbox without allow-scripts), at the
 * shop's page width scaled down to fit, or at phone width. allow-same-origin
 * only lets this page read the frame's height; nothing inside can run.
 */
function Preview({ html, device }: { html: string; device: Device }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [boxWidth, setBoxWidth] = useState(600);
  const [height, setHeight] = useState(160);
  const width = device === "phone" ? PHONE_WIDTH : PAGE_WIDTH;
  const scale = Math.min(1, boxWidth / width);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function measure() {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(Math.max(60, Math.ceil(doc.documentElement.scrollHeight)));
  }

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${width}"><style>html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.5;overflow-wrap:anywhere}img{max-width:100%;height:auto}.html-block{overflow:hidden;isolation:isolate}</style></head><body><div class="html-block">${html}</div></body></html>`;

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {device === "phone" ? <Smartphone aria-hidden className="size-4" /> : <Monitor aria-hidden className="size-4" />}
        Preview {device === "phone" ? "on a phone (360 px)" : "at page width"}
        {scale < 1 && <span className="font-normal text-muted">· shown at {Math.round(scale * 100)}%</span>}
      </p>
      <div ref={box} className="overflow-hidden rounded-2xl bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] p-3 ring-1 ring-line">
        <div className="mx-auto overflow-hidden" style={{ width: width * scale, height: height * scale }}>
          <iframe
            ref={frame}
            title="Preview of the HTML block"
            sandbox="allow-same-origin"
            srcDoc={srcDoc}
            onLoad={measure}
            className="origin-top-left border-0 bg-white"
            style={{ width, height, transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  );
}

function PicturePanel({ pictures, onInsert }: { pictures: HtmlPictures; onInsert: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function chosen(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    const problem = categoryImageError(file);
    if (problem) return toastError(problem);
    pictures.onUpload(file, (url) => onInsert(url));
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 2000);
    } catch {
      toastError("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Pictures for your HTML</p>
          <p className="text-xs text-muted">JPEG or PNG up to 2 MB. Uploading puts an &lt;img&gt; at the cursor. Any https picture link works too.</p>
        </div>
        <input ref={input} type="file" accept={CATEGORY_IMAGE_TYPES.join(",")} onChange={(e) => chosen(e.target.files?.[0])} className="sr-only" aria-label="Upload a picture for the HTML" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pictures.uploading}
          className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pictures.uploading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
          {pictures.uploading ? "Uploading…" : "Upload a picture"}
        </button>
      </div>
      {pictures.list.length > 0 && (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
          {pictures.list.slice(0, 12).map((p) => (
            <li key={p.imageId} className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded picture's own public link */}
              <img src={p.url} alt="" className="aspect-[2/1] w-full bg-surface object-cover" />
              <div className="flex">
                <button type="button" onClick={() => copy(p.url)} className="flex min-h-10 flex-1 items-center justify-center gap-1 text-xs font-semibold text-ink hover:bg-surface">
                  {copied === p.url ? <Check aria-hidden className="size-3.5 text-fresh" /> : <Copy aria-hidden className="size-3.5" />}
                  {copied === p.url ? "Copied" : "Copy link"}
                </button>
                <button type="button" onClick={() => onInsert(p.url)} className="flex min-h-10 flex-1 items-center justify-center border-l border-line text-xs font-semibold text-brand-deep hover:bg-surface">
                  Insert
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Schedule({ section: s, at, errors, update }: { section: HtmlBlockSection; at: string; errors: Record<string, string>; update: (patch: Partial<HtmlBlockSection>) => void }) {
  // The browser's clock, kept fresh (never read during render: React wants renders pure).
  const now = useNow();
  const state = htmlBlockState(s, now ?? 0);
  const status =
    !s.startsAt && !s.endsAt
      ? "Always shown (no dates)."
      : state === "ENDED"
        ? `Ended ${when(s.endsAt)}: shoppers don't see it.`
        : state === "SCHEDULED"
          ? `Shows from ${when(s.startsAt)}${s.endsAt ? ` until ${when(s.endsAt)}` : ""}.`
          : `Showing now${s.endsAt ? ` until ${when(s.endsAt)}` : ""}.`;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <CalendarClock aria-hidden className="size-4" /> Schedule <span className="font-normal text-muted">(optional, India time)</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <DateTime label="Show from" value={s.startsAt ?? null} onChange={(startsAt) => update({ startsAt })} />
        <DateTime label="Show until" value={s.endsAt ?? null} onChange={(endsAt) => update({ endsAt })} error={errors[`${at}.endsAt`]} />
      </div>
      <p className={`mt-2 text-sm ${state === "ENDED" ? "font-semibold text-amber-800" : "text-muted"}`}>{status}</p>
    </fieldset>
  );
}

function DateTime({ label, value, onChange, error }: { label: string; value: string | null; onChange: (iso: string | null) => void; error?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm text-ink">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="datetime-local"
          value={value ? istInput(value) : ""}
          onChange={(e) => onChange(e.target.value ? isoFromIstInput(e.target.value) : null)}
          aria-invalid={!!error}
          className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        {value && (
          <button type="button" onClick={() => onChange(null)} aria-label={`Clear "${label}"`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function HelpList({ title, rows }: { title: string; rows: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <dl className="mt-1 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-mono text-[13px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
