"use client";

import { ExternalLink, FileText, MessageSquareText, Store, XCircle } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Dialog } from "@/components/Dialog";
import { AddressBlock, OrderItems, OrderTotals, Panel, ProgressTracker, StatusPill, Timeline } from "@/components/orders/OrderParts";
import { toastError, toastSuccess } from "@/components/Toaster";
import { adminCancelOrderAction } from "@/lib/orders/admin-actions";
import { endedReason, when } from "@/lib/orders/format";
import { REASON_MAX, REASON_MIN, type StoreOrder } from "@/lib/orders/types";

// An order as support sees it: everything the store sees (the customer's phone
// is never masked here) plus the one admin step, Cancel (before dispatch).
// The order lives in state so a cancel shows its result without a reload.
export function AdminOrderView({ initial }: { initial: StoreOrder }) {
  const [order, setOrder] = useState(initial);
  const [cancelling, setCancelling] = useState(false);
  const ended = endedReason(order, "store");
  const canCancel = order.allowedActions.includes("CANCEL");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={order.status} />
        <span className="text-sm text-muted">Placed {when(order.placedAt)}</span>
        <span className="text-sm text-muted">· Cash on delivery · payment {order.paymentStatus.toLowerCase()}</span>
        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelling(true)}
            className="flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 sm:ml-auto"
          >
            <XCircle aria-hidden className="size-4" />
            Cancel order
          </button>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Panel title="Progress">
            {ended ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{ended}</p>
            ) : (
              <ProgressTracker {...order} />
            )}
          </Panel>

          <Panel title={`Items (${order.items.length})`}>
            <OrderItems items={order.items} />
            {order.customerNote && (
              <p className="mt-4 flex gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-ink">
                <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                <span className="min-w-0 break-words">
                  <span className="font-semibold">Customer note: </span>
                  {order.customerNote}
                </span>
              </p>
            )}
          </Panel>

          <Panel title="History">
            <Timeline entries={order.timeline} audience="store" />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Bill">
            <OrderTotals o={order} paymentMethod={order.paymentMethod} />
            {order.hasInvoice && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                <FileText aria-hidden className="size-4 shrink-0" />
                Invoice issued (viewable by the customer and the store)
              </p>
            )}
          </Panel>

          <Panel title="Customer">
            <AddressBlock a={order.deliveryAddress} />
            {order.distanceKm != null && <p className="mt-2 text-xs text-muted">{order.distanceKm.toFixed(1)} km from the store</p>}
          </Panel>

          <Panel title="Store">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Store aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 truncate">{order.storeName}</span>
            </p>
            <div className="mt-3 flex flex-col gap-1">
              <Link href={`/admin/stores/${order.storeId}`} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink hover:underline">
                Store details
                <ExternalLink aria-hidden className="size-3.5" />
              </Link>
              <Link href={`/admin/orders?storeId=${order.storeId}`} className="flex min-h-10 items-center text-sm font-semibold text-ink hover:underline">
                All orders from this store
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <CancelDialog
        open={cancelling}
        orderId={order.orderId}
        orderNumber={order.orderNumber}
        onClose={() => setCancelling(false)}
        onDone={(fresh) => {
          if (fresh) setOrder(fresh);
          setCancelling(false);
        }}
      />
    </div>
  );
}

function CancelDialog({ open, orderId, orderNumber, onClose, onDone }: { open: boolean; orderId: string; orderNumber: string; onClose: () => void; onDone: (order: StoreOrder | null) => void }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const r = reason.trim();
    if (r.length < REASON_MIN || r.length > REASON_MAX) return setError(`Write ${REASON_MIN} to ${REASON_MAX} characters.`);
    start(async () => {
      const res = await adminCancelOrderAction(orderId, r);
      if (!res.ok) {
        setError(res.error.fieldErrors.reason ?? res.error.message);
        toastError(res.error.message);
        return;
      }
      toastSuccess(res.data.message);
      setReason("");
      onDone(res.data.order);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Cancel order ${orderNumber}?`} description="The customer and the store see the reason. Stock goes back to the store.">
      <div className="space-y-2 pb-5">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          Reason
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={REASON_MAX}
          autoFocus
          placeholder="For example: The customer asked support to cancel"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-h-24 w-full rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <div className="flex justify-between gap-3 text-sm">
          <span id={`${id}-error`} className="text-red-700">
            {error}
          </span>
          <span aria-hidden className="shrink-0 tabular-nums text-muted">
            {reason.length}/{REASON_MAX}
          </span>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Keep the order
          </button>
          <button type="button" onClick={submit} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {pending ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
