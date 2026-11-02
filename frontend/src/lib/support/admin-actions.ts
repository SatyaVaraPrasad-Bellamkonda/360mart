"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/dal";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import * as api from "./service";
import { RESOLUTIONS, type Ticket, type TicketResolution } from "./types";
import { messageError, noteError, refundError, refundValue } from "./validation";

// The admin's support queue: reply (or an internal note), take a request, and
// record the outcome. The backend checks the ADMIN role and every rule again.
// A refund amount is only recorded: the money is paid by UPI or cash.

type Result = Promise<ActionResult<{ message: string; ticket: Ticket | null }>>;

export async function adminMessageAction(ticketId: unknown, bodyInput: unknown, internalInput: unknown): Result {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const body = cleanText(bodyInput);
  const problem = messageError(body);
  if (problem) return invalid(problem, { body: problem });
  const res = await api.adminMessage(token, ticketId, body, internalInput === true);
  if (!res.ok) return failWith(res.error);
  return withFresh(token, ticketId, res.data.message);
}

export async function startTicketAction(ticketId: unknown): Result {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const res = await api.startTicket(token, ticketId);
  if (!res.ok) return failWith(res.error);
  return withFresh(token, ticketId, res.data.message);
}

export async function resolveTicketAction(ticketId: unknown, input: { resolution: unknown; note: unknown; refundAmount?: unknown; orderTotal?: unknown }): Result {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const resolution = typeof input.resolution === "string" && input.resolution in RESOLUTIONS ? (input.resolution as TicketResolution) : null;
  const errors: Record<string, string> = {};
  if (!resolution) errors.resolution = "Choose how it was resolved";
  const note = cleanText(input.note);
  const noteProblem = noteError(note);
  if (noteProblem) errors.note = noteProblem;
  let refundAmount: number | undefined;
  if (resolution === "REFUND" && typeof input.refundAmount === "string" && input.refundAmount.trim()) {
    const max = typeof input.orderTotal === "number" && Number.isFinite(input.orderTotal) ? input.orderTotal : null;
    const refundProblem = refundError(input.refundAmount, max);
    if (refundProblem) errors.refundAmount = refundProblem;
    else refundAmount = refundValue(input.refundAmount);
  }
  if (Object.keys(errors).length || !resolution) return invalid("Some fields need fixing.", errors);
  const res = await api.resolveTicket(token, ticketId, { resolution, note, ...(refundAmount !== undefined ? { refundAmount } : {}) });
  if (!res.ok) return failWith(res.error);
  return withFresh(token, ticketId, res.data.message);
}

export async function loadAdminTicketAction(ticketId: unknown): Promise<ActionResult<Ticket>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(ticketId)) return invalid("Request not found.");
  const res = await api.getAdminTicket(token, ticketId);
  return res.ok ? ok(res.data) : failWith(res.error);
}

async function withFresh(token: string, ticketId: string, message: string): Result {
  revalidatePath("/admin/support");
  const fresh = await api.getAdminTicket(token, ticketId);
  return ok({ message, ticket: fresh.ok ? fresh.data : null });
}
