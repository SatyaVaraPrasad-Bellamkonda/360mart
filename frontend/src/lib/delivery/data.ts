import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import { callApi, type ApiFailure, type ApiResult } from "@/lib/backend/client";
import { isUuidLike } from "@/lib/inventory/validation";
import type { AdminRider, AdminRiderSummary, DeliverySettings, Page, RiderCash, RiderCurrent, RiderProfile, RiderStatus, RiderTaskSummary } from "./types";

// Delivery data for pages (server components), one backend call each, never
// cached (personal and live). Call after requireRole(). An ended session goes
// to the area's login and comes back; "not found" is null so the page can 404;
// anything else is returned for the page to show.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export const RIDER_PAGE_SIZE = 20;

async function token(login: string, returnTo: string): Promise<string> {
  const t = await getSessionToken();
  if (!t) redirect(`${login}?next=${encodeURIComponent(returnTo)}`);
  return t;
}

function settle<T>(res: ApiResult<T>, login: string, returnTo: string, notFound: string[] = []): Loaded<T | null> {
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.code === "UNAUTHENTICATED") redirect(`${login}?next=${encodeURIComponent(returnTo)}`);
  if (notFound.includes(res.error.code)) return { ok: true, data: null };
  return { ok: false, error: res.error };
}

const page = (n: number) => (Number.isInteger(n) && n >= 0 ? n : 0);

// ---- the rider ----

export async function loadRiderProfile(returnTo: string): Promise<Loaded<RiderProfile>> {
  const res = await callApi<RiderProfile>("/rider/profile", { sessionToken: await token("/login", returnTo) });
  return settle(res, "/login", returnTo) as Loaded<RiderProfile>;
}

/** The offer / delivery in progress (only for approved riders: others get 403 RIDER_NOT_ACTIVE). */
export async function loadRiderCurrent(returnTo: string): Promise<Loaded<RiderCurrent>> {
  const res = await callApi<RiderCurrent>("/rider/current", { sessionToken: await token("/login", returnTo) });
  return settle(res, "/login", returnTo) as Loaded<RiderCurrent>;
}

export async function loadRiderTasks(n: number, returnTo: string): Promise<Loaded<Page<RiderTaskSummary>>> {
  const res = await callApi<Page<RiderTaskSummary>>(`/rider/tasks?page=${page(n)}&size=${RIDER_PAGE_SIZE}`, { sessionToken: await token("/login", returnTo) });
  return settle(res, "/login", returnTo) as Loaded<Page<RiderTaskSummary>>;
}

export async function loadRiderCash(n: number, returnTo: string): Promise<Loaded<RiderCash>> {
  const res = await callApi<RiderCash>(`/rider/cash?page=${page(n)}&size=${RIDER_PAGE_SIZE}`, { sessionToken: await token("/login", returnTo) });
  return settle(res, "/login", returnTo) as Loaded<RiderCash>;
}

// ---- admin ----

/** The admin's tabs; "all" = no status filter. */
export const ADMIN_RIDER_TABS = {
  review: { label: "Waiting for review", statuses: ["PENDING_APPROVAL"] },
  active: { label: "Approved", statuses: ["ACTIVE"] },
  onboarding: { label: "Applying", statuses: ["ONBOARDING"] },
  rejected: { label: "Changes needed", statuses: ["REJECTED"] },
  suspended: { label: "Suspended", statuses: ["SUSPENDED"] },
  all: { label: "All", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: RiderStatus[] }>;
export type AdminRiderTab = keyof typeof ADMIN_RIDER_TABS;
export const adminRiderTab = (v: unknown): AdminRiderTab => (typeof v === "string" && v in ADMIN_RIDER_TABS ? (v as AdminRiderTab) : "review");

export async function loadAdminRiders(tab: AdminRiderTab, n: number, returnTo: string): Promise<Loaded<Page<AdminRiderSummary>>> {
  const q = new URLSearchParams({ page: String(page(n)), size: String(RIDER_PAGE_SIZE) });
  for (const s of ADMIN_RIDER_TABS[tab].statuses) q.append("status", s);
  const res = await callApi<Page<AdminRiderSummary>>(`/admin/riders?${q}`, { sessionToken: await token("/admin/login", returnTo) });
  return settle(res, "/admin/login", returnTo) as Loaded<Page<AdminRiderSummary>>;
}

export async function loadAdminRider(riderId: string, returnTo: string): Promise<Loaded<AdminRider | null>> {
  if (!isUuidLike(riderId)) return { ok: true, data: null };
  const res = await callApi<AdminRider>(`/admin/riders/${encodeURIComponent(riderId)}`, { sessionToken: await token("/admin/login", returnTo) });
  return settle(res, "/admin/login", returnTo, ["RIDER_NOT_FOUND"]);
}

export async function loadDeliverySettings(returnTo: string): Promise<Loaded<DeliverySettings>> {
  const res = await callApi<DeliverySettings>("/admin/delivery/settings", { sessionToken: await token("/admin/login", returnTo) });
  return settle(res, "/admin/login", returnTo) as Loaded<DeliverySettings>;
}
