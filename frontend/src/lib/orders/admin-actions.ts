"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { requireRole } from "@/lib/auth/dal";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "./action-helpers";
import * as api from "./order-service";
import { REASON_MAX, REASON_MIN, SETTLEMENT_REFERENCE, type SettlementDirection, type StoreOrder } from "./types";

// Admin: cancel an order (support) and record money that actually moved
// between a store and 360mart. The backend checks the ADMIN role too.

export async function adminCancelOrderAction(orderId: unknown, reasonInput: unknown): Promise<ActionResult<{ message: string; order: StoreOrder | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(orderId)) return invalid("Order not found.");
  const reason = cleanText(reasonInput);
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return invalid(`Write ${REASON_MIN} to ${REASON_MAX} characters.`, { reason: `Write ${REASON_MIN} to ${REASON_MAX} characters.` });
  const res = await api.adminCancelOrder(token, orderId, reason);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/admin/orders", "layout");
  const fresh = await api.getAdminOrder(token, orderId);
  return ok({ message: res.data.message, order: fresh.ok ? fresh.data : null });
}

export async function recordSettlementAction(input: { storeId: unknown; direction: unknown; amount: unknown; reference: unknown; note?: unknown }): Promise<ActionResult<{ message: string }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  await requireRole("admin");
  if (!isUuidLike(input.storeId)) return invalid("Store not found.");
  const errors: Record<string, string> = {};
  const direction = input.direction === "STORE_PAID_PLATFORM" || input.direction === "PLATFORM_PAID_STORE" ? (input.direction as SettlementDirection) : null;
  if (!direction) errors.direction = "Choose who paid whom.";
  const amount = typeof input.amount === "number" ? Math.round(input.amount * 100) / 100 : NaN;
  if (!(amount > 0) || amount > 10_000_000) errors.amount = "Enter the amount that was paid.";
  const reference = cleanText(input.reference);
  if (!SETTLEMENT_REFERENCE.test(reference)) errors.reference = "3 to 60 letters, digits, / _ or -, like the bank's UTR number.";
  const note = cleanText(input.note);
  if (note.length > 200) errors.note = "Keep the note under 200 characters.";
  if (Object.keys(errors).length || !direction) return invalid("Check the highlighted fields.", errors);

  const res = await api.recordSettlement(token, input.storeId, { direction, amount, reference, note: note || undefined });
  if (!res.ok) return failWith(res.error);
  revalidatePath("/admin/ledger", "layout");
  return ok({ message: res.data.message });
}
