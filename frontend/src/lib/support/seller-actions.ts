"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/dal";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import * as api from "./service";
import type { Ticket } from "./types";
import { messageError } from "./validation";

// The shop's side of a complaint: read it and reply. Only 360mart support
// decides the outcome, so there are no other actions here.

export async function replyStoreTicketAction(ticketId: unknown, bodyInput: unknown): Promise<ActionResult<{ message: string; ticket: Ticket | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("seller");
  if (!isUuidLike(ticketId)) return invalid("Complaint not found.");
  const body = cleanText(bodyInput);
  const problem = messageError(body);
  if (problem) return invalid(problem, { body: problem });
  const res = await api.replyStoreTicket(token, ticketId, body);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/seller/complaints");
  const fresh = await api.getStoreTicket(token, ticketId);
  return ok({ message: res.data.message, ticket: fresh.ok ? fresh.data : null });
}

export async function loadStoreTicketAction(ticketId: unknown): Promise<ActionResult<Ticket>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("seller");
  if (!isUuidLike(ticketId)) return invalid("Complaint not found.");
  const res = await api.getStoreTicket(token, ticketId);
  return res.ok ? ok(res.data) : failWith(res.error);
}
