"use client";

import { Eye, ExternalLink, LoaderCircle, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import type { Page } from "@/lib/inventory/types";
import { dateTimeText } from "@/lib/stores/validation";

// Pieces shared by the page designers (category pages, home page): panels,
// the save / publish buttons, the full preview and the published versions.

export function Panel({ title, text, children }: { title: string; text: string; children: ReactNode }) {
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

export function ActionButton({ onClick, busy, disabled, icon, label, shortLabel, primary }: { onClick: () => void; busy: boolean; disabled: boolean; icon: ReactNode; label: string; shortLabel?: string; primary?: boolean }) {
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

// ---- full preview (the real page in a frame) ----

export function PreviewDialog({ src, onClose }: { src: string | null; onClose: () => void }) {
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

export type HistoryItem = { version: number; publishedAt: string };

/** Published versions: preview one, or restore it into the draft (after a confirmation when the draft has changes). */
export function HistoryDialog<T extends HistoryItem>({
  open,
  onClose,
  load,
  swatch,
  liveVersion,
  hasDraftChanges,
  onPreview,
  onRestore,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  /** One page of versions, newest first. */
  load: (page: number) => Promise<ActionResult<Page<T>>>;
  /** Something drawn next to the version number (the category page colour). */
  swatch?: (item: T) => ReactNode;
  liveVersion: number | null;
  hasDraftChanges: boolean;
  onPreview: (version: number) => void;
  onRestore: (fromVersion: number) => Promise<void>;
  onError: (error: ActionError) => void;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, startLoading] = useTransition();
  const [restoring, setRestoring] = useState<number | null>(null);
  const [asked, setAsked] = useState<number | null>(null);

  function fetchPage(next: number) {
    startLoading(async () => {
      const res = await load(next);
      if (!res.ok) return onError(res.error);
      setItems((now) => (next === 0 ? res.data.items : [...(now ?? []), ...res.data.items]));
      if (next === 0) setAsked(null);
      setPage(next);
      setHasMore(next + 1 < res.data.totalPages);
    });
  }

  // Opening the dialog loads the first page (fresh every time: publishes add versions).
  useEffect(() => {
    if (open) fetchPage(0);
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
                    {swatch?.(h)}
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
          <button type="button" onClick={() => fetchPage(page + 1)} disabled={loading} className="flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60">
            {loading ? "Loading…" : "Show older versions"}
          </button>
        )}
      </div>
    </Dialog>
  );
}
