"use client";

import { ArrowLeft, CircleCheckBig, FileText, KeyRound, Loader2, Phone, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { cancelOrderAction, loadOrderAction } from "@/lib/orders/actions";
import { endedReason, STATUS, when } from "@/lib/orders/format";
import { isOpen, REASON_MAX, REASON_MIN, type CustomerOrder } from "@/lib/orders/types";
import { AddressBlock, OrderItems, OrderTotals, Panel, ProgressTracker, StatusPill, Timeline } from "./OrderParts";

const POLL_MS = 25_000;

const NEXT_STEP: Partial<Record<CustomerOrder["status"], string>> = {
  PLACED: "The store usually accepts within a few minutes. If it doesn't answer in time, the order is cancelled automatically and you pay nothing.",
  ACCEPTED: "The store is getting your items ready.",
  PACKED: "Your order is packed and will leave the store soon.",
  OUT_FOR_DELIVERY: "Keep your delivery code ready and your phone nearby.",
  DELIVERED: "Thanks for shopping local. Your invoice is ready.",
};

// The shopper's order page. Status changes aren't pushed yet, so while the
// order is open it re-reads it every 25 s (only while the tab is visible).
export function CustomerOrderView({ initial, justPlaced }: { initial: CustomerOrder; justPlaced: boolean }) {
  const { sessionExpired } = useAuth();
  const [order, setOrder] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const open = isOpen(order.status);

  async function refresh(quiet = true) {
    if (!quiet) setRefreshing(true);
    const res = await loadOrderAction(order.orderId);
    if (!quiet) setRefreshing(false);
    if (res.ok) {
      if (res.data.status !== order.status && quiet) toastSuccess(`Order ${STATUS[res.data.status]?.label.toLowerCase() ?? "updated"}`);
      setOrder(res.data);
    } else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    else if (!quiet) toastError(res.error.message);
  }

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    // Coming back to the tab: catch up right away.
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // refresh only reads the current order id and status, which re-run this effect when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.orderId, order.status]);

  const ended = endedReason(order, "customer");
  const status = STATUS[order.status];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/account/orders" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          Your orders
        </Link>
        {open && (
          <button type="button" onClick={() => refresh(false)} disabled={refreshing} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted ring-1 ring-line hover:bg-white hover:text-ink disabled:opacity-60">
            <RefreshCw aria-hidden className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {justPlaced && (
        <div role="status" className="flex items-center gap-3 rounded-3xl bg-fresh p-5 text-white motion-safe:animate-pop-in">
          <CircleCheckBig aria-hidden className="size-9 shrink-0" />
          <div>
            <p className="text-lg font-extrabold">Order placed</p>
            <p className="text-sm text-white/85">{order.store.name} has your order. We&apos;ll show each step here.</p>
          </div>
        </div>
      )}

      {/* Status: what's happening and what comes next. */}
      <section aria-live="polite" className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              Order {order.orderNumber} · {when(order.placedAt)}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{status?.customer ?? order.status}</h1>
            {(ended || NEXT_STEP[order.status]) && <p className="mt-1 max-w-2xl text-muted">{ended ?? NEXT_STEP[order.status]}</p>}
          </div>
          <StatusPill status={order.status} />
        </div>
        {!ended && (
          <div className="mt-6">
            <ProgressTracker {...order} />
          </div>
        )}
      </section>

      {order.deliveryCode && (
        <section className="flex flex-col gap-4 rounded-3xl bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <KeyRound aria-hidden className="size-5 text-brand" />
            </span>
            <div>
              <p className="font-bold">Delivery code</p>
              <p className="text-sm text-white/75">Share it with the delivery person when your order arrives, not before.</p>
            </div>
          </div>
          <p aria-label={`Delivery code ${order.deliveryCode.split("").join(" ")}`} className="flex gap-2">
            {order.deliveryCode.split("").map((d, i) => (
              <span key={i} className="flex h-14 w-12 items-center justify-center rounded-xl bg-white font-mono text-3xl font-extrabold text-ink">
                {d}
              </span>
            ))}
          </p>
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Panel title={`Items (${order.items.length})`}>
            <OrderItems items={order.items} />
            {order.customerNote && <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-sm text-muted">Your note: &ldquo;{order.customerNote}&rdquo;</p>}
          </Panel>
          <Panel title="Bill">
            <OrderTotals o={order} savings={order.savings} paymentMethod={order.paymentMethod} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-center gap-3">
              <CategoryImage src={order.store.logoUrl} alt="" className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface object-cover ring-1 ring-line" iconClassName="size-1/2" />
              <div className="min-w-0">
                <p className="text-xs text-muted">Sold and delivered by</p>
                <p className="truncate font-bold text-ink">{order.store.name}</p>
              </div>
            </div>
            {order.store.contactPhone && (
              <a href={`tel:${order.store.contactPhone}`} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
                <Phone aria-hidden className="size-4" />
                Call store
              </a>
            )}
          </Panel>

          <Panel title="Delivering to">
            <AddressBlock a={order.deliveryAddress} />
          </Panel>

          {(order.canCancel || order.hasInvoice) && (
            <div className="space-y-2">
              {order.hasInvoice && (
                <Link href={`/account/orders/${order.orderId}/invoice`} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink/85">
                  <FileText aria-hidden className="size-4" />
                  View invoice
                </Link>
              )}
              {order.canCancel && (
                <button type="button" onClick={() => setCancelOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                  <XCircle aria-hidden className="size-4" />
                  Cancel order
                </button>
              )}
            </div>
          )}
          {open && !order.canCancel && <p className="px-1 text-xs text-muted">The store has started on this order. To change or cancel it now, please call the store.</p>}

          <details className="group rounded-3xl bg-white p-5 ring-1 ring-line">
            <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between text-base font-bold text-ink">
              Order history
              <span className="text-sm font-semibold text-muted group-open:hidden">Show</span>
              <span className="hidden text-sm font-semibold text-muted group-open:inline">Hide</span>
            </summary>
            <div className="mt-4">
              <Timeline entries={order.timeline} audience="customer" />
            </div>
          </details>
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        orderId={order.orderId}
        onDone={(next) => {
          setCancelOpen(false);
          if (next) setOrder(next);
          else void refresh();
        }}
        onExpired={sessionExpired}
      />
    </div>
  );
}

const QUICK_REASONS = ["Ordered by mistake", "Want to change items", "Delivery address is wrong", "Found it elsewhere"];

function CancelDialog({ open, onClose, orderId, onDone, onExpired }: { open: boolean; onClose: () => void; orderId: string; onDone: (o: CustomerOrder | null) => void; onExpired: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const length = reason.trim().length;

  async function confirm() {
    if (length < REASON_MIN) return setError(`Tell the store why (at least ${REASON_MIN} characters).`);
    setBusy(true);
    setError(null);
    const res = await cancelOrderAction(orderId, reason);
    setBusy(false);
    if (!res.ok) {
      if (res.error.code === "UNAUTHENTICATED") return onExpired();
      // ORDER_STATE_CONFLICT: the store accepted meanwhile; its message says to call the store.
      setError(res.error.fieldErrors.reason ?? res.error.message);
      if (res.error.code === "ORDER_STATE_CONFLICT") onDone(null);
      return;
    }
    toastSuccess(res.data.message);
    onDone(res.data.order);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Cancel this order?" description="You can cancel until the store accepts it. Nothing is charged.">
      <div className="space-y-4 pb-5">
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={`min-h-10 rounded-full px-3 text-sm font-semibold ring-1 transition ${reason === r ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink/40"}`}>
              {r}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1.5 flex justify-between text-sm font-semibold text-ink">
            Reason
            <span className="text-xs font-normal text-muted">
              {length}/{REASON_MAX}
            </span>
          </span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={REASON_MAX} aria-invalid={!!error} className="w-full rounded-xl border border-line px-3 py-2 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40" />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-5 font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Keep order
          </button>
          <button type="button" onClick={confirm} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-70">
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Cancel order
          </button>
        </div>
      </div>
    </Dialog>
  );
}
