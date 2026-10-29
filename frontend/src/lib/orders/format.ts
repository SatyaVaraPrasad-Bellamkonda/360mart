// Labels, colours and India-time formatting for orders. Safe for client and
// server code. Tailwind classes are complete literals (never built from parts).

import type { LedgerAccountType, LedgerTransactionType, OrderAction, OrderActor, OrderItem, OrderStatus, UndeliveredReason } from "./types";

export { money } from "@/lib/inventory/validation";

type StatusMeta = { label: string; customer: string; tone: string; dot: string };

// label = short (pills, lists); customer = what the shopper reads on the order page.
export const STATUS: Record<OrderStatus, StatusMeta> = {
  PENDING_PAYMENT: { label: "Awaiting payment", customer: "Waiting for payment", tone: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  PLACED: { label: "New", customer: "Waiting for the store to accept", tone: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  ACCEPTED: { label: "Accepted", customer: "Accepted by the store", tone: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  PACKED: { label: "Packed", customer: "Packed and ready", tone: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  OUT_FOR_DELIVERY: { label: "On the way", customer: "On the way to you", tone: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  DELIVERED: { label: "Delivered", customer: "Delivered", tone: "bg-green-100 text-green-800", dot: "bg-green-600" },
  REJECTED: { label: "Declined", customer: "The store couldn't take this order", tone: "bg-red-100 text-red-800", dot: "bg-red-500" },
  CANCELLED: { label: "Cancelled", customer: "Cancelled", tone: "bg-red-100 text-red-800", dot: "bg-red-500" },
  UNDELIVERED: { label: "Not delivered", customer: "Couldn't be delivered", tone: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
};

export const statusLabel = (s: OrderStatus) => STATUS[s]?.label ?? s;

export const ACTOR: Record<OrderActor, string> = { CUSTOMER: "You", STORE: "Store", ADMIN: "360mart", SYSTEM: "Automatic" };
/** For store and admin screens, where "You" would be wrong. */
export const ACTOR_NEUTRAL: Record<OrderActor, string> = { CUSTOMER: "Customer", STORE: "Store", ADMIN: "360mart", SYSTEM: "Automatic" };

export const UNDELIVERED_REASONS: { value: UndeliveredReason; label: string }[] = [
  { value: "CUSTOMER_UNAVAILABLE", label: "Customer not available" },
  { value: "REFUSED", label: "Customer refused the order" },
  { value: "WRONG_ADDRESS", label: "Wrong or incomplete address" },
  { value: "OTHER", label: "Something else" },
];
export const undeliveredLabel = (r: UndeliveredReason | null) => UNDELIVERED_REASONS.find((x) => x.value === r)?.label ?? null;

export const ACTION_LABEL: Record<OrderAction, string> = {
  ACCEPT: "Accept order",
  REJECT: "Decline",
  PACK: "Mark packed",
  DISPATCH: "Out for delivery",
  DELIVER: "Mark delivered",
  MARK_UNDELIVERED: "Couldn't deliver",
  CANCEL: "Cancel order",
};

/** Why the order ended, in one sentence (null while it's going fine). */
export function endedReason(o: { status: OrderStatus; cancelledBy: OrderActor | null; cancelReason: string | null; undeliveredReason: UndeliveredReason | null }, audience: "customer" | "store"): string | null {
  if (o.status === "CANCELLED") {
    const who =
      o.cancelledBy === "SYSTEM"
        ? "The store didn't respond in time, so the order was cancelled automatically."
        : o.cancelledBy === "CUSTOMER"
          ? audience === "customer"
            ? "You cancelled this order."
            : "The customer cancelled this order."
          : o.cancelledBy === "STORE"
            ? "The store cancelled this order."
            : o.cancelledBy === "ADMIN"
              ? "360mart cancelled this order."
              : "This order was cancelled.";
    return o.cancelReason ? `${who} Reason: ${o.cancelReason}` : who;
  }
  if (o.status === "REJECTED") return o.cancelReason ? `Reason: ${o.cancelReason}` : null;
  if (o.status === "UNDELIVERED") return undeliveredLabel(o.undeliveredReason);
  return null;
}

/** "Sent 1 of 3" / "Not available" / null (sent in full or not accepted yet). */
export function fulfilment(item: OrderItem): string | null {
  if (item.quantityFulfilled == null || item.quantityFulfilled >= item.quantity) return null;
  return item.quantityFulfilled === 0 ? "Not available" : `${item.quantityFulfilled} of ${item.quantity} sent`;
}

export const TRANSACTION_LABEL: Record<LedgerTransactionType, string> = { ORDER_COMMISSION: "Commission", STORE_SETTLEMENT: "Settlement", ADJUSTMENT: "Adjustment" };

export const ACCOUNT_TYPE_LABEL: Record<LedgerAccountType, string> = {
  STORE: "Stores",
  PLATFORM_COMMISSION: "Commission earned",
  GST_OUTPUT_PAYABLE: "GST payable",
  BANK: "Bank",
  PAYMENT_GATEWAY: "Payment gateway",
  REFUNDS_PAYABLE: "Refunds payable",
  TCS_PAYABLE: "TCS payable",
};

// ---- India time ----

const IST = "Asia/Kolkata";
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const dateTimeYear = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const dateOnly = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
const timeOnly = new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });

/** "30 Oct, 10:42 am" (with the year when it isn't this year). */
export function when(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = new Intl.DateTimeFormat("en-IN", { timeZone: IST, year: "numeric" }).format(d) === new Intl.DateTimeFormat("en-IN", { timeZone: IST, year: "numeric" }).format(new Date());
  return (sameYear ? dateTime : dateTimeYear).format(d);
}

export const day = (iso: string) => dateOnly.format(new Date(iso));
export const clock = (iso: string) => timeOnly.format(new Date(iso));

/** "4:32" left until `iso` (mm:ss), or null once it has passed. */
export function countdown(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - now;
  if (!(ms > 0)) return null;
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Steps of the progress tracker, with the time each was reached. */
export function progressSteps(o: { status: OrderStatus; placedAt: string; acceptedAt: string | null; packedAt: string | null; outForDeliveryAt: string | null; deliveredAt: string | null }) {
  const order: OrderStatus[] = ["PLACED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];
  const at: Record<string, string | null> = { PLACED: o.placedAt, ACCEPTED: o.acceptedAt, PACKED: o.packedAt, OUT_FOR_DELIVERY: o.outForDeliveryAt, DELIVERED: o.deliveredAt };
  const current = order.indexOf(o.status);
  const labels: Record<string, string> = { PLACED: "Placed", ACCEPTED: "Accepted", PACKED: "Packed", OUT_FOR_DELIVERY: "On the way", DELIVERED: "Delivered" };
  return (
    order
      // Packing is optional: leave the step out when it was skipped.
      .filter((s) => !(s === "PACKED" && !o.packedAt && current > order.indexOf("PACKED")))
      .map((s) => ({ status: s, label: labels[s], at: at[s], done: !!at[s] || order.indexOf(s) <= current, current: s === o.status }))
  );
}
