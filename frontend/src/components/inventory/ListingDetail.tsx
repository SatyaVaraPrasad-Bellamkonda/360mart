"use client";

import { ArchiveRestore, CalendarClock, CalendarPlus, Lock, PackageMinus, PackagePlus, Pencil, RotateCcw, Scale, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { RichText } from "@/components/RichText";
import { toastError, toastSuccess } from "@/components/Toaster";
import { loadBatchesAction, loadMovementsAction, loadPriceHistoryAction, updateListingAction } from "@/lib/inventory/actions";
import { MOVEMENT_LABEL, type Batch, type Listing, type Page, type PriceChange, type StockAction, type StockMovement } from "@/lib/inventory/types";
import { daysUntil, money, stockState, toListingDraft } from "@/lib/inventory/validation";
import { dateText, dateTimeText } from "@/lib/stores/validation";
import { ListingBadges, PriceBlock, ProductThumb, StockPill } from "./ListingParts";
import { ListingForm } from "./ListingForm";
import { BatchForm, StockForm } from "./StockForms";

type Tab = "stock" | "price" | "batches";
type Dialogs = { kind: "edit" } | { kind: "stock"; action: StockAction } | { kind: "batch" } | null;

/** Changes whenever the listing changes (stock, price, settings). */
const version = (l: Listing) => `${l.listingId}@${Date.parse(l.updatedAt)}:${l.stockQuantity}:${l.isAvailable}`;

// One product the store sells: price and settings, stock and its actions, and
// the history tabs. Every save answers with the fresh listing, which is kept
// here; the open tab reloads after a stock change, other tabs load when opened.
export function ListingDetail({ initial, initialMovements }: { initial: Listing; initialMovements: Page<StockMovement> }) {
  const { sessionExpired } = useAuth();
  const [listing, setListing] = useState(initial);
  // Take the page's copy only when the page's own data changes (see StoreWizard).
  const [pageVersion, setPageVersion] = useState(version(initial));
  if (version(initial) !== pageVersion) {
    setPageVersion(version(initial));
    setListing(initial);
  }
  // Suspended or closed store: the backend refuses changes (LISTINGS_LOCKED).
  const [locked, setLocked] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [tab, setTab] = useState<Tab>("stock");
  const [movements, setMovements] = useState<Page<StockMovement> | null>(initialMovements);
  const [prices, setPrices] = useState<Page<PriceChange> | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [showUsed, setShowUsed] = useState(false);
  const [loading, startLoading] = useTransition();
  const [toggling, startToggle] = useTransition();

  function failed(e: { code: string; message: string }) {
    if (e.code === "UNAUTHENTICATED") return sessionExpired();
    if (e.code === "LISTINGS_LOCKED") setLocked(e.message);
    toastError(e.message);
  }

  function loadTab(next: Tab, opts: { page?: number; append?: boolean; includeEmpty?: boolean } = {}) {
    startLoading(async () => {
      if (next === "stock") {
        const res = await loadMovementsAction(listing.listingId, opts.page ?? 0);
        if (!res.ok) return failed(res.error);
        setMovements((m) => (opts.append && m ? { ...res.data, items: [...m.items, ...res.data.items] } : res.data));
      } else if (next === "price") {
        const res = await loadPriceHistoryAction(listing.listingId, opts.page ?? 0);
        if (!res.ok) return failed(res.error);
        setPrices((p) => (opts.append && p ? { ...res.data, items: [...p.items, ...res.data.items] } : res.data));
      } else {
        const res = await loadBatchesAction(listing.listingId, opts.includeEmpty ?? showUsed);
        if (!res.ok) return failed(res.error);
        setBatches(res.data);
      }
    });
  }

  function openTab(next: Tab) {
    setTab(next);
    // First time only; afterwards the tab keeps what it has until something changes.
    if ((next === "stock" && !movements) || (next === "price" && !prices) || (next === "batches" && !batches)) loadTab(next);
  }

  /** After a save: keep the fresh listing; the open tab reloads, the others reload when opened. */
  function changed(next: Listing, what: "stock" | "settings") {
    setListing(next);
    setDialog(null);
    if (what === "stock") {
      setBatches(null);
      setMovements(null);
      if (tab === "stock" || tab === "batches") loadTab(tab);
    } else {
      setPrices(null);
      if (tab === "price") loadTab("price");
    }
  }

  function toggleSelling() {
    startToggle(async () => {
      // The update replaces every field: send the whole listing with only "show to customers" flipped.
      const res = await updateListingAction(listing.listingId, { ...toListingDraft(listing), isAvailable: !listing.isAvailable });
      if (!res.ok) return failed(res.error);
      toastSuccess(res.data.listing.isAvailable ? "Back on sale. Customers can buy it again." : "Hidden from customers. You can switch it back on any time.");
      changed(res.data.listing, "settings");
    });
  }

  const state = stockState(listing);
  const stockActions: { action: StockAction | "BATCH"; label: string; icon: LucideIcon; tone: string }[] = [
    listing.tracksBatches
      ? { action: "BATCH", label: "Add batch", icon: CalendarPlus, tone: "bg-ink text-white hover:bg-ink/85" }
      : { action: "RESTOCK", label: "Add stock", icon: PackagePlus, tone: "bg-ink text-white hover:bg-ink/85" },
    { action: "DAMAGED", label: "Mark damaged", icon: PackageMinus, tone: "bg-white text-ink ring-1 ring-line hover:ring-ink" },
    { action: "RETURN", label: "Customer return", icon: RotateCcw, tone: "bg-white text-ink ring-1 ring-line hover:ring-ink" },
    { action: "ADJUSTMENT", label: "Correct count", icon: Scale, tone: "bg-white text-ink ring-1 ring-line hover:ring-ink" },
  ];

  return (
    <div className="space-y-6">
      {locked && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          {locked}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---- Product, price and selling ---- */}
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line motion-safe:animate-fade-up sm:p-6">
          <div className="flex items-start gap-4">
            <ProductThumb src={listing.productImageUrl} name={listing.productName} className={`size-20 rounded-2xl ${listing.isAvailable ? "" : "opacity-60 grayscale"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-muted">{listing.variantLabel}</p>
              <div className="mt-1">
                <PriceBlock price={listing.price} mrp={listing.mrp} size="lg" />
              </div>
              <div className="mt-2">
                <ListingBadges listing={listing} />
              </div>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <Fact label="Low-stock alert" value={`At ${listing.lowStockThreshold}`} />
            <Fact label="Max per order" value={listing.maxPerOrder ? String(listing.maxPerOrder) : "No limit"} />
            <Fact label="SKU" value={listing.storeSku ?? "None"} />
          </dl>
          <ShelfLifeFact own={listing.shelfLife} catalog={listing.catalogShelfLife} />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" disabled={!!locked} onClick={() => setDialog({ kind: "edit" })} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50">
              <Pencil aria-hidden className="size-4" />
              Edit price & settings
            </button>
            {/* Stop / start selling: the whole listing is sent with only this flipped. */}
            <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line ${locked || toggling ? "pointer-events-none opacity-60" : "hover:ring-ink"}`}>
              <input type="checkbox" checked={listing.isAvailable} onChange={toggleSelling} disabled={!!locked || toggling} className="peer sr-only" />
              <span aria-hidden className={`relative h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${listing.isAvailable ? "bg-fresh" : "bg-line"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${listing.isAvailable ? "left-[1.375rem]" : "left-0.5"}`} />
              </span>
              {toggling ? "Saving…" : listing.isAvailable ? "On sale" : "Hidden"}
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">Listed {dateTimeText(listing.createdAt)} · Prices include GST.</p>
        </section>

        {/* ---- Stock ---- */}
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">In stock</p>
              <p className={`mt-1 text-4xl font-extrabold tracking-tight ${state === "out" ? "text-red-700" : state === "low" ? "text-amber-700" : "text-ink"}`}>{listing.stockQuantity.toLocaleString("en-IN")}</p>
            </div>
            <StockPill listing={listing} />
          </div>
          {state !== "ok" && (
            <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${state === "out" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
              {state === "out" ? `Customers can't order this until you ${listing.tracksBatches ? "add a batch" : "add stock"}.` : `At or below your alert of ${listing.lowStockThreshold}. Time to restock.`}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {stockActions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={!!locked}
                onClick={() => setDialog(a.action === "BATCH" ? { kind: "batch" } : { kind: "stock", action: a.action })}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${a.tone}`}
              >
                <a.icon aria-hidden className="size-4 shrink-0" />
                {a.label}
              </button>
            ))}
          </div>
          {listing.tracksBatches && <p className="mt-3 text-xs text-muted">This item tracks expiry: new stock comes in as batches, and changes are made to a batch.</p>}
        </section>
      </div>

      {/* ---- History ---- */}
      <section className="rounded-3xl bg-white ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-delay:160ms]">
        <div role="tablist" aria-label="History" className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-3 [scrollbar-width:none] sm:px-5">
          {(
            [
              { id: "stock", label: "Stock history" },
              { id: "price", label: "Price history" },
              ...(listing.tracksBatches ? [{ id: "batches", label: "Batches" }] : []),
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => openTab(t.id)}
              className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition ${tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="p-3 sm:p-5" aria-busy={loading}>
          {tab === "stock" && <MovementList page={movements} loading={loading} emptyText={`No stock changes yet. ${listing.tracksBatches ? "Add a batch" : "Add stock"} to start.`} onMore={() => movements && loadTab("stock", { page: movements.page + 1, append: true })} />}
          {tab === "price" && <PriceList page={prices} loading={loading} onMore={() => prices && loadTab("price", { page: prices.page + 1, append: true })} />}
          {tab === "batches" && (
            <BatchList
              batches={batches}
              loading={loading}
              showUsed={showUsed}
              onShowUsed={(v) => {
                setShowUsed(v);
                loadTab("batches", { includeEmpty: v });
              }}
            />
          )}
        </div>
      </section>

      <Dialog open={dialog?.kind === "edit"} onClose={() => setDialog(null)} title="Edit price & settings" description={`${listing.productName} · ${listing.variantLabel}`}>
        {dialog?.kind === "edit" && (
          <ListingForm mode="edit" listingId={listing.listingId} stock={listing.stockQuantity} catalogShelfLife={listing.catalogShelfLife} initial={toListingDraft(listing)} onCancel={() => setDialog(null)} onSaved={(next) => changed(next, "settings")} />
        )}
      </Dialog>
      <Dialog open={dialog?.kind === "stock"} onClose={() => setDialog(null)} title={dialog?.kind === "stock" ? STOCK_TITLE[dialog.action] : ""} description={`${listing.productName} · ${listing.variantLabel} · ${listing.stockQuantity} in stock now`}>
        {dialog?.kind === "stock" && <StockForm listing={listing} action={dialog.action} onCancel={() => setDialog(null)} onSaved={(next) => changed(next, "stock")} onFailed={failed} />}
      </Dialog>
      <Dialog open={dialog?.kind === "batch"} onClose={() => setDialog(null)} title="Add a batch" description="A delivery with its expiry date. It's sold first-to-expire first.">
        {dialog?.kind === "batch" && <BatchForm listing={listing} onCancel={() => setDialog(null)} onSaved={(next) => changed(next, "stock")} onFailed={failed} />}
      </Dialog>
    </div>
  );
}

const STOCK_TITLE: Record<StockAction, string> = { RESTOCK: "Add stock", DAMAGED: "Mark damaged", RETURN: "Customer return", ADJUSTMENT: "Correct the count" };

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="truncate font-bold text-ink">{value}</dd>
    </div>
  );
}

// What customers see: the store's own text, else the catalogue's.
function ShelfLifeFact({ own, catalog }: { own: string | null; catalog: string | null }) {
  const text = own ?? catalog;
  return (
    <div className="mt-2 rounded-xl bg-surface px-3 py-2 text-sm ring-1 ring-line">
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Shelf life
        <span className="rounded-full bg-white px-2 py-0.5 normal-case tracking-normal ring-1 ring-line">{own != null ? "Your own" : "From catalogue"}</span>
      </p>
      {text ? <RichText text={text} className="mt-0.5 font-medium text-ink" /> : <p className="mt-0.5 text-muted">Not set. Customers won&apos;t see a shelf life.</p>}
    </div>
  );
}

const MOVE_TONE: Record<string, { icon: LucideIcon; tone: string }> = {
  RESTOCK: { icon: PackagePlus, tone: "bg-green-50 text-green-700" },
  RETURN: { icon: RotateCcw, tone: "bg-sky-50 text-sky-700" },
  DAMAGED: { icon: PackageMinus, tone: "bg-red-50 text-red-700" },
  ADJUSTMENT: { icon: Scale, tone: "bg-violet-50 text-violet-700" },
  SALE: { icon: TrendingDown, tone: "bg-slate-100 text-slate-700" },
  ORDER_CANCELLED: { icon: ArchiveRestore, tone: "bg-sky-50 text-sky-700" },
  EXPIRED: { icon: CalendarClock, tone: "bg-amber-50 text-amber-800" },
};

function MovementList({ page, loading, emptyText, onMore }: { page: Page<StockMovement> | null; loading: boolean; emptyText: string; onMore: () => void }) {
  if (!page) return <ListLoading />;
  if (page.items.length === 0) return <EmptyTab text={emptyText} />;
  return (
    <>
      <ul className="divide-y divide-line">
        {page.items.map((m, i) => {
          const t = MOVE_TONE[m.movementType] ?? MOVE_TONE.ADJUSTMENT;
          return (
            <li key={`${m.createdAt}-${i}`} className="flex items-center gap-3 py-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.tone}`}>
                <t.icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                  {m.batchId && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">Batch</span>}
                </p>
                <p className="truncate text-sm text-muted">{[m.reason, dateTimeText(m.createdAt)].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-extrabold tabular-nums ${m.quantityChange > 0 ? "text-green-700" : "text-red-700"}`}>
                  {m.quantityChange > 0 ? "+" : "−"}
                  {Math.abs(m.quantityChange).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted">Now {m.quantityAfter.toLocaleString("en-IN")}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <More page={page} loading={loading} onMore={onMore} />
    </>
  );
}

function PriceList({ page, loading, onMore }: { page: Page<PriceChange> | null; loading: boolean; onMore: () => void }) {
  if (!page) return <ListLoading />;
  if (page.items.length === 0) return <EmptyTab text="The price hasn't changed since you listed it." />;
  return (
    <>
      <ul className="divide-y divide-line">
        {page.items.map((p, i) => {
          const up = p.newPrice > p.oldPrice;
          return (
            <li key={`${p.changedAt}-${i}`} className="flex items-center gap-3 py-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${up ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                {up ? <TrendingUp aria-hidden className="size-5" /> : <TrendingDown aria-hidden className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  <span className="text-muted line-through">{money(p.oldPrice)}</span> → {money(p.newPrice)}
                </p>
                <p className="truncate text-sm text-muted">
                  {p.oldMrp !== p.newMrp ? `MRP ${money(p.oldMrp)} → ${money(p.newMrp)} · ` : `MRP ${money(p.newMrp)} · `}
                  {dateTimeText(p.changedAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <More page={page} loading={loading} onMore={onMore} />
    </>
  );
}

function BatchList({ batches, loading, showUsed, onShowUsed }: { batches: Batch[] | null; loading: boolean; showUsed: boolean; onShowUsed: (v: boolean) => void }) {
  return (
    <div className="space-y-3">
      <label className="flex min-h-10 w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={showUsed} onChange={(e) => onShowUsed(e.target.checked)} className="size-4 accent-ink" />
        Show used-up batches
      </label>
      {!batches || loading ? (
        <ListLoading />
      ) : batches.length === 0 ? (
        <EmptyTab text={showUsed ? "No batches yet." : "No batches with stock left. Add a batch when a delivery comes in."} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {batches.map((b, i) => {
            const days = daysUntil(b.expiresOn);
            const used = b.quantityRemaining === 0;
            const expiry =
              days < 0
                ? { text: "Expired", tone: "bg-red-50 text-red-700 ring-red-200" }
                : days <= 2
                  ? { text: days === 0 ? "Expires today: sell soon" : `Sell soon: ${days} ${days === 1 ? "day" : "days"} left`, tone: "bg-amber-50 text-amber-800 ring-amber-200" }
                  : { text: `Expires ${dateText(b.expiresOn)}`, tone: "bg-slate-50 text-ink ring-line" };
            const pct = b.quantityReceived ? Math.round((b.quantityRemaining / b.quantityReceived) * 100) : 0;
            return (
              <li key={b.batchId} className={`rounded-2xl p-4 ring-1 ring-line ${used ? "bg-surface opacity-70" : "bg-white"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ink">
                    {b.batchNo ? `Batch ${b.batchNo}` : "Batch"}
                    {i === 0 && !used && !showUsed && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Sell first</span>}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${expiry.tone}`}>{expiry.text}</span>
                </div>
                <p className="mt-2 text-sm text-ink">
                  <span className="font-bold">{b.quantityRemaining}</span> of {b.quantityReceived} left
                </p>
                <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
                  <div className={`h-full rounded-full ${days <= 2 ? "bg-amber-500" : "bg-fresh"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {[b.manufacturedOn && `Made ${dateText(b.manufacturedOn)}`, `Received ${dateText(b.receivedAt)}`, b.costPrice != null && `Cost ${money(b.costPrice)} (only you see this)`].filter(Boolean).join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function More({ page, loading, onMore }: { page: Page<unknown>; loading: boolean; onMore: () => void }) {
  if (page.page + 1 >= page.totalPages) return null;
  return (
    <button type="button" onClick={onMore} disabled={loading} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60">
      {loading ? "Loading…" : `Show more (${page.totalItems - page.items.length} more)`}
    </button>
  );
}

function ListLoading() {
  return (
    <div aria-hidden className="space-y-3 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-line/60" />
      ))}
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-muted">{text}</p>;
}
