import { api } from "@/lib/api-client";
import { failed, invalid, refreshPages, result } from "@/lib/admin/refresh";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { RESOLUTIONS, type Ticket, type TicketResolution } from "./types";
import { messageError, noteError, refundError, refundValue } from "./validation";

// The admin's support queue: reply (or an internal note), take a request, and
// record the outcome. Called from the browser (/api/v1/admin/support-tickets/...,
// visible in DevTools → Network); the backend checks the ADMIN role and every
// rule again. A refund amount is only recorded: the money is paid by UPI or cash.

type Result = Promise<ActionResult<{ message: string; ticket: Ticket | null }>>;
type Write = { success: boolean; message: string; id?: string };

const FORBIDDEN = "Only admins can handle support requests. Log in with an admin account.";
const NOT_FOUND = "Request not found.";
const base = (ticketId: string) => `/admin/support-tickets/${encodeURIComponent(ticketId)}`;
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function adminMessage(ticketId: unknown, bodyInput: unknown, internalInput: unknown): Result {
  if (!isUuidLike(ticketId)) return invalid({}, NOT_FOUND);
  const body = clean(bodyInput);
  const problem = messageError(body);
  if (problem) return invalid({ body: problem }, problem);
  return writeThenRead(ticketId, "messages", { body, internal: internalInput === true });
}

export async function startTicket(ticketId: unknown): Result {
  if (!isUuidLike(ticketId)) return invalid({}, NOT_FOUND);
  return writeThenRead(ticketId, "start");
}

export async function resolveTicket(ticketId: unknown, input: { resolution: unknown; note: unknown; refundAmount?: unknown; orderTotal?: unknown }): Result {
  if (!isUuidLike(ticketId)) return invalid({}, NOT_FOUND);
  const resolution = typeof input.resolution === "string" && input.resolution in RESOLUTIONS ? (input.resolution as TicketResolution) : null;
  const errors: Record<string, string> = {};
  if (!resolution) errors.resolution = "Choose how it was resolved";
  const note = clean(input.note);
  const noteProblem = noteError(note);
  if (noteProblem) errors.note = noteProblem;
  let refundAmount: number | undefined;
  if (resolution === "REFUND" && typeof input.refundAmount === "string" && input.refundAmount.trim()) {
    const max = typeof input.orderTotal === "number" && Number.isFinite(input.orderTotal) ? input.orderTotal : null;
    const refundProblem = refundError(input.refundAmount, max);
    if (refundProblem) errors.refundAmount = refundProblem;
    else refundAmount = refundValue(input.refundAmount);
  }
  if (Object.keys(errors).length || !resolution) return invalid(errors, "Some fields need fixing.");
  return writeThenRead(ticketId, "resolve", { resolution, note, ...(refundAmount !== undefined ? { refundAmount } : {}) });
}

export async function loadAdminTicket(ticketId: unknown): Promise<ActionResult<Ticket>> {
  if (!isUuidLike(ticketId)) return invalid({}, NOT_FOUND);
  return result(await api<Ticket>(base(ticketId)), FORBIDDEN);
}

/** The write, then the ticket as it is now (null if only that read failed). */
async function writeThenRead(ticketId: string, step: "messages" | "start" | "resolve", body?: unknown): Result {
  const res = await api<Write>(`${base(ticketId)}/${step}`, { method: "POST", body });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("support");
  const fresh = await api<Ticket>(base(ticketId));
  return { ok: true, data: { message: res.data.message, ticket: fresh.ok ? fresh.data : null } };
}
