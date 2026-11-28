"use client";

import { Bike, Camera, CircleCheckBig, CircleSlash, DoorOpen, ExternalLink, Hourglass, Loader2, MapPinned, PackageCheck, Phone, Radar, RefreshCw, Store, Undo2, UserRoundCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { useNow } from "@/components/orders/seller/useNow";
import { toastError, toastSuccess } from "@/components/Toaster";
import { formatMobile } from "@/lib/auth/validation";
import type { ApiResult } from "@/lib/api-client";
import { assignRider, confirmHandover, confirmReturn, deliverMyself, loadAvailableRiders, loadDelivery, reassignDelivery, type PanelOwner } from "@/lib/delivery/client";
import { ago, distanceText } from "@/lib/delivery/format";
import { isBeforePickup, isTaskFinished, REASON_MAX, REASON_MIN, vehicleLabel, type AvailableRider, type DeliveryTaskStatus, type StoreDelivery } from "@/lib/delivery/types";
import { countdown, undeliveredLabel, when } from "@/lib/orders/format";
import type { OrderStatus } from "@/lib/orders/types";
import { VEHICLE_ICON } from "./vehicle-icons";

const POLL_MS = 10_000;
// Before acceptance there's nothing to deliver yet; a declined order never had a rider.
const NO_PANEL: OrderStatus[] = ["PENDING_PAYMENT", "PLACED", "REJECTED"];

type Props = {
  owner: PanelOwner;
  orderId: string;
  orderStatus: OrderStatus;
  /** The delivery moved on (or the store took it over): the order's own buttons may have changed. */
  onOrderChanged: () => void;
};

// Delivery by a 360mart rider, on the store's (and support's) order page:
// who has it, where it is, and the store's next step (choose a rider, hand
// over after checking the rider's photo, confirm a return, or deliver it
// yourself). Read again every 10 s while a rider search or delivery is on and
// the tab is visible; each change re-reads the order too, because once a rider
// has accepted the order's own Dispatch / Deliver buttons go away.
export function DeliveryPanel({ owner, orderId, orderStatus, onOrderChanged }: Props) {
  const { sessionExpired } = useAuth();
  const [delivery, setDelivery] = useState<StoreDelivery | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "failed">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"riders" | "self" | "reassign" | "photo" | null>(null);
  const shown = !NO_PANEL.includes(orderStatus);
  const last = useRef<string | null>(null);
  const changed = useRef(onOrderChanged);
  useEffect(() => {
    changed.current = onOrderChanged;
  });

  // Takes in one answer (the effects below and the buttons share it).
  const apply = useCallback(
    (res: Awaited<ReturnType<typeof loadDelivery>>, signal?: AbortSignal) => {
      if (signal?.aborted) return;
      if (!res.ok) {
        if (res.error.code === "ABORTED") return;
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        // No delivery for this order (e.g. it was cancelled before any search).
        if (res.error.code === "DELIVERY_NOT_FOUND" || res.error.status === 404) return setState("none");
        return setState((s) => (s === "ready" ? s : "failed"));
      }
      const key = `${res.data.taskId}:${res.data.status}:${res.data.allowedActions.join()}`;
      if (last.current !== null && last.current !== key) changed.current();
      last.current = key;
      setDelivery(res.data);
      setState("ready");
    },
    [sessionExpired],
  );
  const reload = useCallback(async (signal?: AbortSignal) => apply(await loadDelivery(owner, orderId, signal), signal), [apply, owner, orderId]);

  // First load, and again whenever the order itself moves (e.g. the store dispatched it).
  useEffect(() => {
    if (!shown) return;
    const ctrl = new AbortController();
    loadDelivery(owner, orderId, ctrl.signal).then((res) => apply(res, ctrl.signal));
    return () => ctrl.abort();
  }, [shown, orderStatus, owner, orderId, apply]);

  const live = state === "ready" && !!delivery?.taskId && !isTaskFinished(delivery.status);
  useEffect(() => {
    if (!live) return;
    const tick = () => document.visibilityState === "visible" && void reload();
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, reload]);

  async function act(name: string, call: () => Promise<ApiResult<{ message: string }>>, after?: () => void) {
    setBusy(name);
    const res = await call();
    setBusy(null);
    if (res.ok) {
      toastSuccess(res.data.message);
      after?.();
      await reload();
      changed.current();
      return true;
    }
    if (res.error.code === "UNAUTHENTICATED") {
      sessionExpired();
      return false;
    }
    toastError(res.error.message);
    // Someone else moved it first (a rider accepted, support reassigned): catch up.
    if (res.error.code === "DELIVERY_STATE_CONFLICT" || res.error.code === "ORDER_STATE_CONFLICT") {
      after?.();
      await reload();
      changed.current();
    }
    return false;
  }

  if (!shown || state === "none") return null;
  if (state === "loading") return <div aria-hidden className="h-40 animate-pulse rounded-3xl bg-line/60" />;
  if (state === "failed" || !delivery) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 ring-1 ring-line">
        <p className="text-sm text-muted">We couldn&apos;t load the delivery details.</p>
        <button type="button" onClick={() => void reload()} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
          <RefreshCw aria-hidden className="size-4" />
          Try again
        </button>
      </section>
    );
  }

  const d = delivery;
  // Nothing to show or do: e.g. an order delivered by the store's own staff.
  if (!d.taskId && d.allowedActions.length === 0) return null;
  const rider = d.rider;
  const name = rider?.firstName ?? "The rider";
  const view = describe(d, owner, name);
  const actions = d.allowedActions;
  const canReassign = owner === "admin" && (d.status === "SEARCHING" || d.status === "OFFERED" || isBeforePickup(d.status));
  const canAdminReturn = owner === "admin" && d.status === "RETURNING";

  return (
    <section aria-labelledby={`${orderId}-delivery`} aria-live="polite" className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
      <div className="flex items-start gap-3 p-5 sm:p-6">
        <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl ${view.tone}`}>
          <view.icon aria-hidden className="size-6" />
          {(d.status === "SEARCHING" || d.status === "OFFERED") && <span aria-hidden className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/60 motion-safe:animate-ping" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted" id={`${orderId}-delivery`}>
            360mart delivery
          </p>
          <h2 className="mt-0.5 text-lg font-bold leading-snug text-ink">{view.title}</h2>
          {view.text && <p className="mt-1 text-sm text-muted">{view.text}</p>}
          {d.offer && d.status === "OFFERED" && <OfferLine offer={d.offer} owner={owner} />}
        </div>
      </div>

      {d.taskId && d.status !== "CANCELLED" && <Steps status={d.status} />}

      {rider && <RiderCard rider={rider} owner={owner} showContact={!isTaskFinished(d.status)} />}

      {d.pickupPhotoUrl && (d.status === "PICKUP_PENDING" || owner === "admin") && (
        <div className="px-5 pb-1 sm:px-6">
          <button type="button" onClick={() => setDialog("photo")} className="group flex w-full items-center gap-3 rounded-2xl bg-surface p-2 pr-4 text-left ring-1 ring-line transition hover:ring-ink/40">
            {/* A signed, short-lived link: a plain <img> (next/image would cache it). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.pickupPhotoUrl} alt="The rider's photo of the packed order" className="size-16 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Camera aria-hidden className="size-4" />
                Pickup photo
              </span>
              <span className="block text-xs text-muted">Tap to see it bigger{d.pickupRequestedAt ? ` · ${when(d.pickupRequestedAt)}` : ""}</span>
            </span>
          </button>
        </div>
      )}

      {(actions.length > 0 && owner === "store") || canReassign || canAdminReturn ? (
        <div className="flex flex-col gap-2 border-t border-line bg-surface/60 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
          {owner === "store" && actions.includes("CONFIRM_HANDOVER") && (
            <PanelButton primary busy={busy === "handover"} onClick={() => act("handover", () => confirmHandover(orderId))} icon={PackageCheck}>
              Hand over to {name}
            </PanelButton>
          )}
          {owner === "store" && actions.includes("CONFIRM_RETURN") && (
            <PanelButton primary busy={busy === "return"} onClick={() => act("return", () => confirmReturn("store", orderId))} icon={Undo2}>
              Items are back: confirm return
            </PanelButton>
          )}
          {owner === "store" && actions.includes("ASSIGN_RIDER") && (
            <PanelButton primary={!actions.includes("CONFIRM_HANDOVER")} onClick={() => setDialog("riders")} icon={UserRoundCheck}>
              {d.offer ? "Choose another rider" : "Choose a rider"}
            </PanelButton>
          )}
          {owner === "store" && actions.includes("DELIVER_MYSELF") && (
            <PanelButton onClick={() => setDialog("self")} icon={Store}>
              Deliver myself
            </PanelButton>
          )}
          {canAdminReturn && (
            <PanelButton primary busy={busy === "return"} onClick={() => act("return", () => confirmReturn("admin", orderId))} icon={Undo2}>
              Confirm the return
            </PanelButton>
          )}
          {canReassign && (
            <PanelButton onClick={() => setDialog("reassign")} icon={RefreshCw}>
              {d.status === "SEARCHING" || d.status === "OFFERED" ? "Restart the search" : "Take it from the rider"}
            </PanelButton>
          )}
        </div>
      ) : null}

      {owner === "store" && dialog === "riders" && (
        <RiderChooser
          open
          orderId={orderId}
          onClose={() => setDialog(null)}
          onAssign={(r) => act(`assign:${r.riderId}`, () => assignRider(orderId, r.riderId), () => setDialog(null))}
          busyRider={busy?.startsWith("assign:") ? busy.slice(7) : null}
        />
      )}
      <Dialog open={dialog === "self"} onClose={() => setDialog(null)} title="Deliver it yourself?" description={rider && isBeforePickup(d.status) ? `${name} won't take this order any more.` : "We stop looking for a rider."}>
        <div className="space-y-4 pb-5">
          <p className="text-sm text-muted">Send it with your own staff. The usual Out for delivery and Mark delivered buttons come back on this order, and the customer&apos;s delivery code still has to be entered.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDialog(null)} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
              Keep the rider delivery
            </button>
            <button type="button" disabled={busy === "self"} onClick={() => act("self", () => deliverMyself(orderId), () => setDialog(null))} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
              {busy === "self" && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Yes, I&apos;ll deliver it
            </button>
          </div>
        </div>
      </Dialog>
      {owner === "admin" && (
        <ReassignDialog
          open={dialog === "reassign"}
          searching={d.status === "SEARCHING" || d.status === "OFFERED"}
          riderName={name}
          busy={busy === "reassign"}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => act("reassign", () => reassignDelivery(orderId, reason), () => setDialog(null))}
        />
      )}
      {d.pickupPhotoUrl && (
        <Dialog open={dialog === "photo"} onClose={() => setDialog(null)} title="Pickup photo" description="Check it shows this order before you hand it over.">
          <div className="pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.pickupPhotoUrl} alt="The rider's photo of the packed order" className="max-h-[70dvh] w-full rounded-2xl bg-surface object-contain" />
          </div>
        </Dialog>
      )}
    </section>
  );
}

type View = { icon: LucideIcon; tone: string; title: string; text?: string };

function describe(d: StoreDelivery, owner: PanelOwner, name: string): View {
  const you = owner === "store" ? "your store" : "the store";
  if (!d.taskId) return { icon: Bike, tone: "bg-surface text-ink", title: "No rider yet", text: "Choose a 360mart rider near you, or send it with your own staff." };
  switch (d.status) {
    case "SEARCHING":
      return { icon: Radar, tone: "bg-amber-50 text-amber-700", title: "Finding a rider", text: `${d.searchingSince ? `Since ${when(d.searchingSince)}. ` : ""}We offer it to the nearest free riders one by one.` };
    case "OFFERED":
      return { icon: Hourglass, tone: "bg-amber-50 text-amber-700", title: "Waiting for a rider to accept" };
    case "ASSIGNED":
      return { icon: Bike, tone: "bg-sky-50 text-sky-700", title: `${name} is coming to ${you}`, text: "Keep the order packed and ready." };
    case "AT_STORE":
      return { icon: Store, tone: "bg-sky-50 text-sky-700", title: `${name} is at ${you}`, text: "They take a photo of the packed order; then the handover is confirmed here." };
    case "PICKUP_PENDING":
      return { icon: Camera, tone: "bg-indigo-50 text-indigo-700", title: "Confirm the handover", text: owner === "store" ? "Check the photo shows this order, then hand it over." : "Waiting for the store to check the photo and hand it over." };
    case "PICKED_UP":
      return { icon: Bike, tone: "bg-violet-50 text-violet-700", title: `${name} is on the way`, text: "The customer gives them the delivery code at the door." };
    case "AT_CUSTOMER":
      return { icon: DoorOpen, tone: "bg-violet-50 text-violet-700", title: `${name} is at the customer's door`, text: "The order is delivered once the customer's code is entered." };
    case "DELIVERED":
      return { icon: CircleCheckBig, tone: "bg-green-50 text-green-700", title: `Delivered by ${name}`, text: d.deliveredAt ? when(d.deliveredAt) : undefined };
    case "RETURNING":
      return {
        icon: Undo2,
        tone: "bg-orange-50 text-orange-700",
        title: "Order coming back",
        text: `Not delivered: ${undeliveredLabel(d.failedReason) ?? "see the history"}. ${owner === "store" ? "Confirm when the items are back in the shop; the stock is returned then." : "The store confirms when the items are back."}`,
      };
    case "RETURNED":
      return { icon: PackageCheck, tone: "bg-slate-100 text-slate-700", title: `Returned to ${you}`, text: d.returnedAt ? when(d.returnedAt) : undefined };
    case "CANCELLED":
      return { icon: CircleSlash, tone: "bg-slate-100 text-slate-700", title: "Rider delivery called off", text: d.cancelReason ?? undefined };
    default:
      return { icon: Bike, tone: "bg-surface text-ink", title: "Delivery" };
  }
}

const STEPS: { label: string; reached: DeliveryTaskStatus[] }[] = [
  { label: "Rider found", reached: ["ASSIGNED", "AT_STORE", "PICKUP_PENDING", "PICKED_UP", "AT_CUSTOMER", "DELIVERED", "RETURNING", "RETURNED"] },
  { label: "At the store", reached: ["AT_STORE", "PICKUP_PENDING", "PICKED_UP", "AT_CUSTOMER", "DELIVERED", "RETURNING", "RETURNED"] },
  { label: "Picked up", reached: ["PICKED_UP", "AT_CUSTOMER", "DELIVERED", "RETURNING", "RETURNED"] },
  { label: "Delivered", reached: ["DELIVERED"] },
];

/** Four short steps; the line fills as the rider moves on. */
function Steps({ status }: { status: DeliveryTaskStatus | null }) {
  const done = STEPS.filter((s) => status && s.reached.includes(status)).length;
  const failed = status === "RETURNING" || status === "RETURNED";
  return (
    <ol className="grid grid-cols-4 gap-1.5 px-5 pb-4 sm:px-6" aria-label="Delivery progress">
      {STEPS.map((s, i) => {
        const reached = i < done;
        return (
          <li key={s.label} aria-current={i === done - 1 ? "step" : undefined} className="min-w-0">
            <span aria-hidden className={`block h-1.5 rounded-full ${reached ? (failed && i === done - 1 ? "bg-orange-500" : "bg-fresh") : "bg-line"}`} />
            <span className={`mt-1.5 block truncate text-[11px] font-semibold sm:text-xs ${reached ? "text-ink" : "text-muted"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OfferLine({ offer, owner }: { offer: NonNullable<StoreDelivery["offer"]>; owner: PanelOwner }) {
  const now = useNow();
  const left = now === null ? null : countdown(offer.expiresAt, now);
  const who = [offer.firstName ?? "a rider", vehicleLabel(offer.vehicleType)].filter(Boolean).join(" · ");
  const by = offer.source === "STORE" ? (owner === "store" ? `You offered it to ${who}` : `The store offered it to ${who}`) : offer.source === "ADMIN" ? `360mart offered it to ${who}` : `Offered to ${who}`;
  return (
    <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
      <span className="font-semibold">{by}</span>
      <span className="tabular-nums" aria-live="off">
        {left ? `${left} left to accept` : "finding the next rider…"}
      </span>
    </p>
  );
}

function RiderCard({ rider, owner, showContact }: { rider: NonNullable<StoreDelivery["rider"]>; owner: PanelOwner; showContact: boolean }) {
  const now = useNow();
  const Icon = rider.vehicleType ? VEHICLE_ICON[rider.vehicleType] : Bike;
  const located = rider.latitude != null && rider.longitude != null;
  return (
    <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 sm:mx-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-white">{(rider.firstName ?? "R").slice(0, 1).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{rider.firstName ?? "Rider"}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon aria-hidden className="size-4" />
            {vehicleLabel(rider.vehicleType) ?? "Vehicle"}
          </span>
          {rider.vehicleNumber && <span className="rounded-md bg-white px-1.5 font-mono text-xs font-semibold tracking-wider text-ink ring-1 ring-line">{rider.vehicleNumber}</span>}
        </p>
        {rider.locationAt && now !== null && <p className="text-xs text-muted">Location updated {ago(rider.locationAt, now)}</p>}
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        {showContact && rider.phone && (
          <a href={`tel:${rider.phone}`} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85 sm:flex-none">
            <Phone aria-hidden className="size-4" />
            <span>Call</span>
            <span className="sr-only"> {formatMobile(rider.phone)}</span>
          </a>
        )}
        {showContact && located && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${rider.latitude},${rider.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink sm:flex-none"
          >
            <MapPinned aria-hidden className="size-4" />
            Where
            <span className="sr-only"> (opens Google Maps)</span>
          </a>
        )}
        {owner === "admin" && (
          <Link href={`/admin/riders/${rider.riderId}`} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink sm:flex-none">
            Profile
            <ExternalLink aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function PanelButton({ children, onClick, icon: Icon, primary, busy }: { children: React.ReactNode; onClick: () => void; icon: LucideIcon; primary?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${primary ? "bg-ink text-white hover:bg-ink/85" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
    >
      {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Icon aria-hidden className="size-4" />}
      {children}
    </button>
  );
}

/** The store picks a free rider near it; that rider gets the offer and a short time to accept. */
function RiderChooser({ open, orderId, onClose, onAssign, busyRider }: { open: boolean; orderId: string; onClose: () => void; onAssign: (r: AvailableRider) => Promise<boolean>; busyRider: string | null }) {
  const { sessionExpired } = useAuth();
  const now = useNow();
  const [riders, setRiders] = useState<AvailableRider[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const take = useCallback(
    (res: Awaited<ReturnType<typeof loadAvailableRiders>>) => {
      if (res.ok) return setRiders(Array.isArray(res.data) ? res.data : []);
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setError(res.error.message);
    },
    [sessionExpired],
  );
  async function load() {
    setError(null);
    setRiders(null);
    take(await loadAvailableRiders(orderId));
  }

  // Mounted only while open (see the panel), so this runs once per opening.
  useEffect(() => {
    let live = true;
    loadAvailableRiders(orderId).then((res) => live && take(res));
    return () => {
      live = false;
    };
  }, [orderId, take]);

  async function pick(r: AvailableRider) {
    const done = await onAssign(r);
    // Taken meanwhile (RIDER_NOT_AVAILABLE): show who's free now.
    if (!done && open) void load();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Choose a rider" description="Free riders near your store. The one you pick gets the offer and has a short time to accept.">
      <div className="pb-5">
        {error ? (
          <div className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="min-h-10 rounded-full bg-white px-4 font-semibold text-ink ring-1 ring-line">
              Try again
            </button>
          </div>
        ) : riders === null ? (
          <ul aria-hidden className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-16 animate-pulse rounded-2xl bg-line/60" />
            ))}
          </ul>
        ) : riders.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface px-5 py-8 text-center">
            <Radar aria-hidden className="size-8 text-muted" />
            <p className="mt-3 font-semibold text-ink">No free rider near your store right now</p>
            <p className="mt-1 max-w-sm text-sm text-muted">We keep searching by ourselves, or you can deliver it yourself.</p>
            <button type="button" onClick={() => void load()} className="mt-4 flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <RefreshCw aria-hidden className="size-4" />
              Look again
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {riders.map((r) => {
              const Icon = r.vehicleType ? VEHICLE_ICON[r.vehicleType] : Bike;
              return (
                <li key={r.riderId} className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-line">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.firstName ?? "Rider"}</span>
                    <span className="block text-sm text-muted">
                      {[vehicleLabel(r.vehicleType), r.distanceKm != null ? `${distanceText(r.distanceKm)} away` : null, r.lastSeenAt && now !== null ? `seen ${ago(r.lastSeenAt, now)}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busyRider !== null}
                    onClick={() => void pick(r)}
                    className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
                  >
                    {busyRider === r.riderId && <Loader2 aria-hidden className="size-4 animate-spin" />}
                    Offer
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function ReassignDialog({ open, searching, riderName, busy, onClose, onSubmit }: { open: boolean; searching: boolean; riderName: string; busy: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={searching ? "Restart the rider search?" : `Take the order from ${riderName}?`}
      description={searching ? "The current offer ends and the search starts again." : "Only before pickup. The rider is told, and the search starts again."}
    >
      <div className="space-y-2 pb-5">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          Reason
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          placeholder={searching ? "The search has been stuck for 20 minutes" : "The rider isn't answering and hasn't moved"}
          onChange={(e) => {
            setReason(e.target.value.replace(/[\r\n]+/g, " "));
            setError(null);
          }}
          aria-invalid={!!error}
          className={`min-h-24 w-full rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-red-700">{error}</span>
          <span aria-hidden className="shrink-0 tabular-nums text-muted">
            {reason.length}/{REASON_MAX}
          </span>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Keep it
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (reason.trim().length < REASON_MIN) return setError(`Write ${REASON_MIN} to ${REASON_MAX} characters.`);
              onSubmit(reason);
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
          >
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {searching ? "Restart the search" : "Take it back"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
