// Support requests ("tickets"): shapes of the backend's /support, /seller/store/support-tickets
// and /admin/support-tickets answers, the labels shown for them, and which
// problems an order can still report. Safe for client and server code.

import type { OrderStatus } from "@/lib/orders/types";

export type SupportCategory =
  | "MISSING_ITEM"
  | "DAMAGED_ITEM"
  | "WRONG_ITEM"
  | "QUALITY_ISSUE"
  | "EXPIRED_ITEM"
  | "NOT_RECEIVED"
  | "OVERCHARGED"
  | "DELIVERY_EXPERIENCE"
  | "ORDER_OTHER"
  | "ACCOUNT"
  | "PAYMENT"
  | "FEEDBACK"
  | "OTHER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "WITHDRAWN";
export type TicketResolution = "REFUND" | "REPLACEMENT" | "EXPLAINED" | "NO_ISSUE_FOUND" | "OTHER";
export type TicketAuthor = "CUSTOMER" | "STORE" | "ADMIN" | "SYSTEM";
export type TicketAction = "REPLY" | "ADD_PHOTO" | "WITHDRAW" | "START" | "RESOLVE" | "REJECT";

/** A row in every ticket list (customer, shop, admin). */
export type TicketSummary = {
  ticketId: string;
  ticketNumber: string;
  category: SupportCategory;
  status: TicketStatus;
  orderId: string | null;
  orderNumber: string | null;
  storeName: string | null;
  createdAt: string;
  lastActivityAt: string;
  /** The legal deadlines: an answer within 48 h, an outcome within 30 days. */
  acknowledgeBy: string;
  resolveBy: string;
  overdue: boolean;
};

export type TicketMessage = { author: TicketAuthor; body: string; internal: boolean; createdAt: string };

export type Ticket = TicketSummary & {
  description: string;
  items: { listingId: string; productName: string; variantLabel: string | null; quantity: number }[];
  /** Signed links that expire: use at once, never store. */
  images: { imageId: string; url: string }[];
  messages: TicketMessage[];
  resolution: TicketResolution | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  /** The only buttons to show. */
  allowedActions: TicketAction[];
  /** Customer: null. Shop: first name only. Admin: full name + phone. */
  customer: { userId: string | null; name: string | null; mobileNumber: string | null } | null;
};

export type TicketPage = { items: TicketSummary[]; page: number; size: number; totalItems: number; totalPages: number };

export type NewTicket = { category: SupportCategory; orderId?: string; description: string; items?: { listingId: string; quantity: number }[] };

export const OPEN_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS"];
export const isOpenTicket = (s: TicketStatus) => s === "OPEN" || s === "IN_PROGRESS";

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: string; dot: string }> = {
  OPEN: { label: "Received", tone: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  IN_PROGRESS: { label: "We're on it", tone: "bg-amber-50 text-amber-900 ring-amber-200", dot: "bg-amber-500" },
  RESOLVED: { label: "Resolved", tone: "bg-green-50 text-green-800 ring-green-200", dot: "bg-green-600" },
  REJECTED: { label: "Closed: no issue found", tone: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  WITHDRAWN: { label: "Closed by you", tone: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
};

/** What the problem is about, and when it can be reported (same as the backend's SupportCategory kinds). */
type Kind = "ITEM" | "DELIVERED_ORDER" | "DELIVERY" | "ANY_ORDER" | "GENERAL";

export const CATEGORIES: Record<SupportCategory, { label: string; hint: string; kind: Kind }> = {
  MISSING_ITEM: { label: "Item missing", hint: "Something you paid for wasn't in the bag", kind: "ITEM" },
  DAMAGED_ITEM: { label: "Damaged or leaking", hint: "Broken, crushed, leaking or spoilt", kind: "ITEM" },
  WRONG_ITEM: { label: "Wrong item", hint: "A different product or size came", kind: "ITEM" },
  QUALITY_ISSUE: { label: "Quality not right", hint: "Not fresh, poor taste or smell", kind: "ITEM" },
  EXPIRED_ITEM: { label: "Expired or near expiry", hint: "Past or close to its date", kind: "ITEM" },
  NOT_RECEIVED: { label: "Didn't get the order", hint: "Marked delivered, but nothing came", kind: "DELIVERED_ORDER" },
  OVERCHARGED: { label: "Charged too much", hint: "Paid more than the bill", kind: "DELIVERED_ORDER" },
  DELIVERY_EXPERIENCE: { label: "Delivery experience", hint: "Late, rude or didn't follow instructions", kind: "DELIVERY" },
  ORDER_OTHER: { label: "Something else", hint: "Any other question about this order", kind: "ANY_ORDER" },
  ACCOUNT: { label: "My account", hint: "Login, profile, addresses", kind: "GENERAL" },
  PAYMENT: { label: "Payments", hint: "Cash on delivery, refunds, charges", kind: "GENERAL" },
  FEEDBACK: { label: "Feedback or an idea", hint: "Tell us what to make better", kind: "GENERAL" },
  OTHER: { label: "Something else", hint: "Anything not listed here", kind: "GENERAL" },
};

export const ORDER_CATEGORIES = (Object.keys(CATEGORIES) as SupportCategory[]).filter((c) => CATEGORIES[c].kind !== "GENERAL");
export const GENERAL_CATEGORIES = (Object.keys(CATEGORIES) as SupportCategory[]).filter((c) => CATEGORIES[c].kind === "GENERAL");
/** Categories that name the items affected (and their quantities). */
export const needsItems = (c: SupportCategory) => CATEGORIES[c].kind === "ITEM";
export const needsOrder = (c: SupportCategory) => CATEGORIES[c].kind !== "GENERAL";

const HOUR = 3_600_000;
const WINDOWS: Record<Exclude<Kind, "GENERAL">, number> = { ITEM: 48 * HOUR, DELIVERED_ORDER: 48 * HOUR, DELIVERY: 7 * 24 * HOUR, ANY_ORDER: 30 * 24 * HOUR };

type OrderForWindow = { status: OrderStatus; placedAt: string; deliveredAt: string | null; undeliveredAt: string | null };

/**
 * The problems this order can still report right now (the backend checks again):
 * item and "didn't get it / charged too much" problems within 48 h of delivery,
 * delivery experience within 7 days of the delivery attempt, anything else
 * within 30 days of ordering.
 */
export function categoriesFor(order: OrderForWindow, now: number): SupportCategory[] {
  const within = (from: string | null, ms: number) => !!from && now <= Date.parse(from) + ms;
  return ORDER_CATEGORIES.filter((c) => {
    const kind = CATEGORIES[c].kind;
    if (kind === "ITEM" || kind === "DELIVERED_ORDER") return order.status === "DELIVERED" && within(order.deliveredAt, WINDOWS[kind]);
    if (kind === "DELIVERY") {
      if (order.status === "DELIVERED") return within(order.deliveredAt, WINDOWS.DELIVERY);
      if (order.status === "UNDELIVERED") return within(order.undeliveredAt, WINDOWS.DELIVERY);
      return false;
    }
    return within(order.placedAt, WINDOWS.ANY_ORDER);
  });
}

export const RESOLUTIONS: Record<TicketResolution, { label: string; hint: string }> = {
  REFUND: { label: "Refund", hint: "Money back for the problem" },
  REPLACEMENT: { label: "Replacement", hint: "The store sends the right item again" },
  EXPLAINED: { label: "Explained", hint: "Answered the question; nothing to give back" },
  OTHER: { label: "Other", hint: "Solved another way" },
  NO_ISSUE_FOUND: { label: "No issue found (close)", hint: "We checked and found no problem. The request is closed as rejected." },
};

export const AUTHOR_LABEL: Record<TicketAuthor, string> = { CUSTOMER: "Customer", STORE: "Store", ADMIN: "360mart support", SYSTEM: "360mart" };
