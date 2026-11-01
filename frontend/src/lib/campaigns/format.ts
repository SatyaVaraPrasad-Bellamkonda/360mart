import type { AudienceRole, CampaignStats, CampaignStatus, OrderActivity, Platform } from "./types";

// Words and colours for campaigns (safe for client components).

export const STATUS_META: Record<CampaignStatus, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "bg-slate-100 text-slate-700" },
  SCHEDULED: { label: "Scheduled", tone: "bg-sky-100 text-sky-800" },
  SENDING: { label: "Sending", tone: "bg-amber-100 text-amber-800" },
  SENT: { label: "Sent", tone: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", tone: "bg-red-100 text-red-700" },
};

export const ROLE_LABEL: Record<AudienceRole, string> = { CUSTOMER: "Customers", STORE_OWNER: "Shop owners" };
export const PLATFORM_LABEL: Record<Platform, string> = { ANDROID: "Android", IOS: "iPhone" };

export const ACTIVITY_OPTIONS: { value: OrderActivity; label: string; text: string }[] = [
  { value: "ANY", label: "Anyone", text: "No filter on orders" },
  { value: "NEVER_ORDERED", label: "Never ordered", text: "No delivered order yet: a first-order offer" },
  { value: "ORDERED_RECENTLY", label: "Ordered recently", text: "Had an order delivered in the last few days" },
  { value: "LAPSED", label: "Stopped ordering", text: "Ordered before, nothing lately: a \"we miss you\" offer" },
];

/** The results tiles, in the order shown (label = the handoff's wording). */
export const STAT_ROWS: { key: Exclude<keyof CampaignStats, "pending" | "opened">; label: string; tone: string }[] = [
  { key: "sent", label: "Push delivered", tone: "bg-green-500" },
  { key: "noDevice", label: "Inbox only (no app)", tone: "bg-sky-500" },
  { key: "capped", label: "Inbox only (daily limit reached)", tone: "bg-indigo-400" },
  { key: "optedOut", label: "Turned offers off before it went out", tone: "bg-slate-400" },
  { key: "failed", label: "Phone refused it", tone: "bg-red-500" },
  { key: "expired", label: "Offer ended before it went out", tone: "bg-amber-500" },
  { key: "cancelled", label: "Cancelled before it went out", tone: "bg-slate-300" },
];

const number = new Intl.NumberFormat("en-IN");
export const count = (n: number) => number.format(n);

/** Opened / everyone who got it (push or inbox); null before anyone got it. */
export function openRate(s: { sent: number; noDevice: number; capped: number; opened: number }): number | null {
  const reached = s.sent + s.noDevice + s.capped;
  return reached ? Math.round((s.opened / reached) * 1000) / 10 : null;
}

export const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;
