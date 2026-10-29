"use client";

import { CircleAlert, FileText, MapPinned, MessageSquareText, Phone, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddressBlock, OrderItems, OrderTotals, Panel, ProgressTracker, StatusPill, Timeline } from "@/components/orders/OrderParts";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { ActionError } from "@/lib/auth/actions";
import { ACTION_LABEL, countdown, endedReason, when } from "@/lib/orders/format";
import { loadStoreOrderAction, storeOrderStepAction, type StoreStep } from "@/lib/orders/store-actions";
import { isOpen, type OrderAction, type StoreOrder } from "@/lib/orders/types";
import { AcceptDialog, DeliverDialog, ReasonDialog, UndeliveredDialog } from "./StoreOrderDialogs";
import { useNow } from "./useNow";

const POLL_MS = 25_000;
type DialogName = "accept" | "reject" | "cancel" | "deliver" | "undelivered" | null;

// One order for the store: what to send, where, and the next step. Only the
// buttons the backend lists in allowedActions are shown. While the order is
// open it's read again every 25 s (the customer may cancel, or the 10-minute
// accept window may run out).
export function StoreOrderView({ initial }: { initial: StoreOrder }) {
  const { sessionExpired } = useAuth();
  const [order, setOrder] = useState(initial);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, start] = useTransition();
  const open = isOpen(order.status);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await loadStoreOrderAction(order.orderId);
      if (!live) return;
      if (res.ok) setOrder(res.data);
      else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    }, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [open, order.orderId, sessionExpired]);

  function run(step: StoreStep) {
    setError(null);
    start(async () => {
      const res = await storeOrderStepAction(order.orderId, step);
      if (res.ok) {
        if (res.data.order) setOrder(res.data.order);
        setDialog(null);
        toastSuccess(res.data.message);
        return;
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      if (res.error.code === "ORDER_STATE_CONFLICT") {
        // The customer cancelled first, or a double tap: catch up and close the dialog.
        if (res.order) setOrder(res.order);
        setDialog(null);
        toastError(`This order changed: ${res.error.message}`);
        return;
      }
      // Field problems are shown inside the open dialog; anything else as a toast too.
      setError(res.error);
      if (!dialog || !Object.keys(res.error.fieldErrors).length) toastError(res.error.message);
    });
  }

  const openDialog = (d: DialogName) => {
    setError(null);
    setDialog(d);
  };

  const ended = endedReason(order, "store");
  const phone = order.deliveryAddress.phone;
  const callable = !!phone && !phone.includes("*");
  const { latitude: lat, longitude: lng } = order.deliveryAddress;

  return (
    <div className="space-y-4 pb-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={order.status} />
              <span className="text-sm text-muted">Placed {when(order.placedAt)}</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Cash on delivery · <span className="font-semibold text-ink">{order.items.length} {order.items.length === 1 ? "item" : "items"}</span>
              {order.distanceKm != null && ` · ${order.distanceKm.toFixed(1)} km away`}
            </p>
          </div>
          {order.hasInvoice && (
            <Link href={`/seller/orders/${order.orderId}/invoice`} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              <FileText aria-hidden className="size-4" />
              Invoice
            </Link>
          )}
        </div>
        {order.status === "PLACED" && <AcceptWithin acceptBy={order.acceptBy} />}
        <div className="mt-5">
          {ended ? (
            <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {ended}
            </p>
          ) : (
            <ProgressTracker {...order} />
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Panel title={`Items to send (${order.items.length})`}>
            <OrderItems items={order.items} />
          </Panel>
          <Panel title="Bill">
            <OrderTotals o={order} paymentMethod={order.paymentMethod} />
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Deliver to">
            <AddressBlock a={order.deliveryAddress} />
            <div className="mt-4 flex flex-wrap gap-2">
              {callable && open && (
                <a href={`tel:${phone}`} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85">
                  <Phone aria-hidden className="size-4" />
                  Call customer
                </a>
              )}
              {lat != null && lng != null && open && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink"
                >
                  <MapPinned aria-hidden className="size-4" />
                  Open in Maps
                </a>
              )}
            </div>
          </Panel>
          {order.customerNote && (
            <Panel title="Note from the customer">
              <p className="flex gap-2 break-words text-sm text-ink">
                <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                {order.customerNote}
              </p>
            </Panel>
          )}
          <Panel title="History">
            <Timeline entries={order.timeline} audience="store" />
          </Panel>
        </div>
      </div>

      {order.allowedActions.length > 0 && (
        <ActionButtons actions={order.allowedActions} pending={pending} onRun={run} onOpen={openDialog} />
      )}

      <AcceptDialog open={dialog === "accept"} onClose={() => setDialog(null)} items={order.items} pending={pending} error={error} onSubmit={(items) => run({ action: "ACCEPT", items })} />
      <ReasonDialog kind="reject" open={dialog === "reject"} onClose={() => setDialog(null)} pending={pending} error={error} onSubmit={(reason) => run({ action: "REJECT", reason })} />
      <ReasonDialog kind="cancel" open={dialog === "cancel"} onClose={() => setDialog(null)} pending={pending} error={error} onSubmit={(reason) => run({ action: "CANCEL", reason })} />
      <DeliverDialog open={dialog === "deliver"} onClose={() => setDialog(null)} attemptsLeft={order.deliveryCodeAttemptsLeft} pending={pending} error={error} onSubmit={(deliveryCode) => run({ action: "DELIVER", deliveryCode })} />
      <UndeliveredDialog open={dialog === "undelivered"} onClose={() => setDialog(null)} pending={pending} error={error} onSubmit={(reason, note) => run({ action: "MARK_UNDELIVERED", reason, note })} />
    </div>
  );
}

function AcceptWithin({ acceptBy }: { acceptBy: string | null }) {
  const now = useNow();
  if (!acceptBy || now === null) return null;
  const left = countdown(acceptBy, now);
  return (
    <p className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${left ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}`} aria-live="off">
      <Timer aria-hidden className="size-5 shrink-0" />
      {left ? (
        <span>
          Accept within <span className="tabular-nums">{left}</span> or it&apos;s cancelled automatically.
        </span>
      ) : (
        "Time's up: this order is being cancelled automatically."
      )}
    </p>
  );
}

// The order of the buttons: the main next step first and dark, the rest quieter.
const PRIMARY: OrderAction[] = ["ACCEPT", "DISPATCH", "DELIVER", "PACK"];
const DANGER: OrderAction[] = ["REJECT", "CANCEL", "MARK_UNDELIVERED"];

function ActionButtons({ actions, pending, onRun, onOpen }: { actions: OrderAction[]; pending: boolean; onRun: (step: StoreStep) => void; onOpen: (d: DialogName) => void }) {
  const primary = PRIMARY.find((a) => actions.includes(a));
  const base = "flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition active:scale-95 disabled:opacity-60";
  const tap = (a: OrderAction) => {
    if (a === "ACCEPT") return onRun({ action: "ACCEPT" });
    if (a === "PACK" || a === "DISPATCH") return onRun({ action: a });
    onOpen(a === "REJECT" ? "reject" : a === "CANCEL" ? "cancel" : a === "DELIVER" ? "deliver" : "undelivered");
  };
  const ordered = [...actions].sort((a, b) => (a === primary ? -1 : b === primary ? 1 : DANGER.indexOf(a) - DANGER.indexOf(b)));

  return (
    // Phones: stuck to the bottom of the screen, so the next step is always one tap away.
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-3xl sm:border sm:p-4 sm:backdrop-blur-none">
      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:flex-wrap sm:items-center">
        {ordered.map((a) => (
          <button
            key={a}
            type="button"
            disabled={pending}
            onClick={() => tap(a)}
            className={`${base} ${a === primary ? "bg-ink text-white hover:bg-ink/85 sm:min-w-48" : DANGER.includes(a) ? "text-red-700 ring-1 ring-red-200 hover:bg-red-50" : "text-ink ring-1 ring-line hover:ring-ink"}`}
          >
            {pending && a === primary ? "Working…" : ACTION_LABEL[a]}
          </button>
        ))}
        {actions.includes("ACCEPT") && (
          <button type="button" disabled={pending} onClick={() => onOpen("accept")} className={`${base} text-ink ring-1 ring-line hover:ring-ink`}>
            Accept with changes
          </button>
        )}
      </div>
    </div>
  );
}
