import { api } from "@/lib/api-client";
import { failed, invalid, refreshPages } from "@/lib/admin/refresh";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { REASON_MAX, REASON_MIN, SETTLEMENT_REFERENCE, type SettlementDirection, type SettlementInput, type StoreOrder, type WriteResult } from "./types";

// Admin: cancel an order (support) and record money that actually moved
// between a store and 360mart. Called from the browser (/api/v1/admin/...,
// visible in DevTools → Network); the backend checks the ADMIN role too.

const FORBIDDEN = "Only admins can do this. Log in with an admin account.";
const id = encodeURIComponent;
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Cancel, then read the order back so the screen shows its new state (null if only that read failed). */
export async function adminCancelOrder(orderId: unknown, reasonInput: unknown): Promise<ActionResult<{ message: string; order: StoreOrder | null }>> {
  if (!isUuidLike(orderId)) return invalid({}, "Order not found.");
  const reason = clean(reasonInput);
  const problem = `Write ${REASON_MIN} to ${REASON_MAX} characters.`;
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return invalid({ reason: problem }, problem);
  const res = await api<WriteResult>(`/admin/orders/${id(orderId)}/cancel`, { method: "POST", body: { reason } });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("orders");
  const fresh = await api<StoreOrder>(`/admin/orders/${id(orderId)}`);
  return { ok: true, data: { message: res.data.message, order: fresh.ok ? fresh.data : null } };
}

export async function recordSettlement(input: { storeId: unknown; direction: unknown; amount: unknown; reference: unknown; note?: unknown }): Promise<ActionResult<{ message: string }>> {
  if (!isUuidLike(input.storeId)) return invalid({}, "Store not found.");
  const errors: Record<string, string> = {};
  const direction = input.direction === "STORE_PAID_PLATFORM" || input.direction === "PLATFORM_PAID_STORE" ? (input.direction as SettlementDirection) : null;
  if (!direction) errors.direction = "Choose who paid whom.";
  const amount = typeof input.amount === "number" ? Math.round(input.amount * 100) / 100 : NaN;
  if (!(amount > 0) || amount > 10_000_000) errors.amount = "Enter the amount that was paid.";
  const reference = clean(input.reference);
  if (!SETTLEMENT_REFERENCE.test(reference)) errors.reference = "3 to 60 letters, digits, / _ or -, like the bank's UTR number.";
  const note = clean(input.note);
  if (note.length > 200) errors.note = "Keep the note under 200 characters.";
  if (Object.keys(errors).length || !direction) return invalid(errors, "Check the highlighted fields.");

  const body: SettlementInput = { direction, amount, reference, note: note || undefined };
  const res = await api<WriteResult>(`/admin/stores/${id(input.storeId)}/settlements`, { method: "POST", body });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("ledger");
  return { ok: true, data: { message: res.data.message } };
}
