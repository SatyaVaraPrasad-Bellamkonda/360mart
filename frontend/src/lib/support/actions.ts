"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import * as api from "./service";
import { CATEGORIES, needsItems, needsOrder, type SupportCategory, type Ticket } from "./types";
import { descriptionError, messageError, photoError, SUPPORT_LIMITS } from "./validation";

// The shopper's support requests ("Help & support", "Report a problem").
// Everything from the browser is checked again here; the backend checks the
// time windows, the order and the quantities once more.

export type CreateTicketResult = { ok: true; data: { ticketId: string; message: string } } | { ok: false; error: ActionError & { openTicketId?: string } };

export async function createTicketAction(input: { category: unknown; orderId?: unknown; description: unknown; items?: unknown }): Promise<CreateTicketResult> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const category = typeof input.category === "string" && input.category in CATEGORIES ? (input.category as SupportCategory) : null;
  if (!category) return invalid("Choose what the problem is about.", { category: "Choose what the problem is about" });
  const description = cleanText(input.description);
  const problem = descriptionError(description);
  if (problem) return invalid(problem, { description: problem });

  const body: { category: SupportCategory; orderId?: string; description: string; items?: { listingId: string; quantity: number }[] } = { category, description };
  if (needsOrder(category)) {
    if (!isUuidLike(input.orderId)) return invalid("Choose the order this is about.", { orderId: "Choose the order this is about" });
    body.orderId = input.orderId;
  }
  if (needsItems(category)) {
    const items = (Array.isArray(input.items) ? input.items : [])
      .map((i) => ({ listingId: (i as { listingId?: unknown })?.listingId, quantity: (i as { quantity?: unknown })?.quantity }))
      .filter((i): i is { listingId: string; quantity: number } => isUuidLike(i.listingId) && typeof i.quantity === "number" && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= SUPPORT_LIMITS.itemQty);
    if (items.length === 0) return invalid("Choose the items with the problem.", { items: "Choose the items with the problem" });
    if (items.length > 50 || new Set(items.map((i) => i.listingId)).size !== items.length) return invalid("Something went wrong. Please refresh the page and try again.");
    body.items = items;
  }

  const res = await api.createTicket(token, body);
  if (!res.ok) {
    if (res.error.code === "TICKET_ALREADY_OPEN" && body.orderId) {
      // Point the shopper at the request that's already open for this order.
      const open = await api.listMyTickets(token, { orderId: body.orderId, page: 0, size: 20 });
      const found = open.ok ? open.data.items.find((t) => t.status === "OPEN" || t.status === "IN_PROGRESS") : undefined;
      const failed = await failWith(res.error);
      return { ok: false, error: { ...failed.error, openTicketId: found?.ticketId } };
    }
    return failWith(res.error);
  }
  if (!res.data.id) return invalid("Your request was sent, but we couldn't open it. Find it under Help & support.");
  revalidatePath("/account/support");
  return { ok: true, data: { ticketId: res.data.id, message: res.data.message } };
}

/** One photo (JPEG/PNG ≤ 2 MB; at most 3 per request), right after creating or from the request page. */
export async function addTicketPhotoAction(ticketId: unknown, form: FormData): Promise<ActionResult<{ message: string }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(ticketId) || !(form instanceof FormData)) return invalid("Request not found.");
  const file = form.get("image");
  if (!(file instanceof File)) return invalid("Choose a photo.");
  const problem = photoError(file);
  if (problem) return invalid(problem, { image: problem });
  const res = await api.addTicketPhoto(token, ticketId, file);
  if (!res.ok) {
    if (res.error.status === 413 || res.error.code === "FILE_TOO_LARGE") return invalid("Each photo must be at most 2 MB", { image: "Each photo must be at most 2 MB" });
    return failWith(res.error);
  }
  return ok({ message: res.data.message });
}

export async function replyTicketAction(ticketId: unknown, bodyInput: unknown): Promise<ActionResult<{ message: string; ticket: Ticket | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const body = cleanText(bodyInput);
  const problem = messageError(body);
  if (problem) return invalid(problem, { body: problem });
  const res = await api.replyMyTicket(token, ticketId, body);
  if (!res.ok) return failWith(res.error);
  return withFresh(token, ticketId, res.data.message);
}

export async function withdrawTicketAction(ticketId: unknown): Promise<ActionResult<{ message: string; ticket: Ticket | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const res = await api.withdrawMyTicket(token, ticketId);
  if (!res.ok) return failWith(res.error);
  return withFresh(token, ticketId, res.data.message);
}

/** The request again (after adding photos, or to pick up replies). */
export async function loadMyTicketAction(ticketId: unknown): Promise<ActionResult<Ticket>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const res = await api.getMyTicket(token, ticketId);
  return res.ok ? ok(res.data) : failWith(res.error);
}

async function withFresh(token: string, ticketId: string, message: string): Promise<ActionResult<{ message: string; ticket: Ticket | null }>> {
  revalidatePath("/account/support");
  const fresh = await api.getMyTicket(token, ticketId);
  return ok({ message, ticket: fresh.ok ? fresh.data : null });
}
