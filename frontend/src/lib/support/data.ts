import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import type { ApiFailure, ApiResult } from "@/lib/backend/client";
import { isUuidLike } from "@/lib/inventory/validation";
import * as api from "./service";
import type { SupportCategory, Ticket, TicketPage, TicketStatus } from "./types";

// Support data for pages (server components): one backend call each, never
// cached (personal, and photo links expire). Call after requireRole(). An
// ended session goes to login and comes back; "not found" is null (the page
// 404s); anything else is returned for the page to show.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };
export const TICKETS_PAGE_SIZE = 20;

async function token(returnTo: string): Promise<string> {
  const t = await getSessionToken();
  if (!t) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return t;
}

function settle<T>(res: ApiResult<T>, returnTo: string): Loaded<T> {
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.code === "UNAUTHENTICATED") redirect(`/${returnTo.startsWith("/admin") ? "admin/login" : "login"}?next=${encodeURIComponent(returnTo)}`);
  if (res.error.code === "STORE_NOT_FOUND" && returnTo.startsWith("/seller")) redirect("/seller/store");
  return { ok: false, error: res.error };
}

function settleOne(res: ApiResult<Ticket>, returnTo: string): Loaded<Ticket | null> {
  if (!res.ok && (res.error.code === "TICKET_NOT_FOUND" || res.error.status === 404)) return { ok: true, data: null };
  return settle(res, returnTo);
}

export async function loadMyTickets(page: number, returnTo: string): Promise<Loaded<TicketPage>> {
  return settle(await api.listMyTickets(await token(returnTo), { page, size: TICKETS_PAGE_SIZE }), returnTo);
}
export async function loadMyTicket(ticketId: string, returnTo: string): Promise<Loaded<Ticket | null>> {
  if (!isUuidLike(ticketId)) return { ok: true, data: null };
  return settleOne(await api.getMyTicket(await token(returnTo), ticketId), returnTo);
}

export async function loadStoreTickets(status: TicketStatus[], page: number, returnTo: string): Promise<Loaded<TicketPage>> {
  return settle(await api.listStoreTickets(await token(returnTo), { status, page, size: TICKETS_PAGE_SIZE }), returnTo);
}
export async function loadStoreTicket(ticketId: string, returnTo: string): Promise<Loaded<Ticket | null>> {
  if (!isUuidLike(ticketId)) return { ok: true, data: null };
  return settleOne(await api.getStoreTicket(await token(returnTo), ticketId), returnTo);
}

export async function loadAdminTickets(p: { status: TicketStatus[]; category?: SupportCategory; overdue: boolean; page: number }, returnTo: string): Promise<Loaded<TicketPage>> {
  return settle(await api.listAdminTickets(await token(returnTo), { ...p, size: TICKETS_PAGE_SIZE }), returnTo);
}
export async function loadAdminTicket(ticketId: string, returnTo: string): Promise<Loaded<Ticket | null>> {
  if (!isUuidLike(ticketId)) return { ok: true, data: null };
  return settleOne(await api.getAdminTicket(await token(returnTo), ticketId), returnTo);
}
