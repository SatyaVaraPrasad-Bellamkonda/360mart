"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "./action-helpers";
import { STORE_TABS, type StoreTab } from "./data";
import * as api from "./order-service";
import { DELIVERY_CODE, MAX_QUANTITY, NOTE_MAX, REASON_MAX, REASON_MIN, type OrderSummary, type Page, type StoreOrder, type UndeliveredReason } from "./types";

// The store owner's order steps. Each step = one write, then the order is read
// again (2 calls) so the screen shows the new status and buttons. A step that
// isn't allowed any more (double tap, the customer cancelled first) comes back
// as ORDER_STATE_CONFLICT with the fresh order, so the screen catches up.

export type StoreStep =
  | { action: "ACCEPT"; items?: { listingId: string; quantity: number }[] }
  | { action: "REJECT" | "CANCEL"; reason: string }
  | { action: "PACK" | "DISPATCH" }
  | { action: "DELIVER"; deliveryCode: string }
  | { action: "MARK_UNDELIVERED"; reason: UndeliveredReason; note?: string };

const UNDELIVERED: UndeliveredReason[] = ["CUSTOMER_UNAVAILABLE", "REFUSED", "WRONG_ADDRESS", "OTHER"];
const reasonProblem = (r: string) => (r.length < REASON_MIN || r.length > REASON_MAX ? `Write ${REASON_MIN} to ${REASON_MAX} characters.` : null);

export async function storeOrderStepAction(orderId: unknown, step: StoreStep): Promise<ActionResult<{ message: string; order: StoreOrder | null }> & { order?: StoreOrder | null }> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(orderId) || !step || typeof step !== "object") return invalid("Order not found.");

  let res;
  switch (step.action) {
    case "ACCEPT": {
      const items = (Array.isArray(step.items) ? step.items : []).filter((i) => isUuidLike(i?.listingId) && Number.isInteger(i.quantity) && i.quantity >= 0 && i.quantity <= MAX_QUANTITY);
      res = await api.acceptOrder(token, orderId, items);
      break;
    }
    case "REJECT":
    case "CANCEL": {
      const reason = cleanText(step.reason);
      const problem = reasonProblem(reason);
      if (problem) return invalid(problem, { reason: problem });
      res = step.action === "REJECT" ? await api.rejectOrder(token, orderId, reason) : await api.storeCancelOrder(token, orderId, reason);
      break;
    }
    case "PACK":
      res = await api.packOrder(token, orderId);
      break;
    case "DISPATCH":
      res = await api.dispatchOrder(token, orderId);
      break;
    case "DELIVER": {
      const code = cleanText(step.deliveryCode);
      if (!DELIVERY_CODE.test(code)) return invalid("Enter the 4-digit code from the customer.", { deliveryCode: "Enter the 4-digit code from the customer." });
      res = await api.deliverOrder(token, orderId, code);
      break;
    }
    case "MARK_UNDELIVERED": {
      if (!UNDELIVERED.includes(step.reason)) return invalid("Choose what happened.", { reason: "Choose what happened." });
      const note = cleanText(step.note);
      if (note.length > NOTE_MAX) return invalid(`Keep the note under ${NOTE_MAX} characters.`, { note: `Keep the note under ${NOTE_MAX} characters.` });
      res = await api.markUndelivered(token, orderId, step.reason, note || undefined);
      break;
    }
    default:
      return invalid("This step isn't available.");
  }

  if (!res.ok) {
    // Someone else moved the order first: send the fresh copy along with the error.
    if (res.error.code === "ORDER_STATE_CONFLICT") {
      const fresh = await api.getStoreOrder(token, orderId);
      return { ...(await failWith(res.error)), order: fresh.ok ? fresh.data : null };
    }
    return failWith(res.error);
  }
  revalidatePath("/seller/orders", "layout");
  const fresh = await api.getStoreOrder(token, orderId);
  return ok({ message: res.data.message, order: fresh.ok ? fresh.data : null });
}

/** The order page's refresh while it's open. */
export async function loadStoreOrderAction(orderId: unknown): Promise<ActionResult<StoreOrder>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(orderId)) return invalid("Order not found.");
  const res = await api.getStoreOrder(token, orderId);
  return res.ok ? ok(res.data) : failWith(res.error);
}

/** The orders list's refresh (new orders arrive without a reload). */
export async function loadStoreOrdersAction(tab: unknown, page: unknown): Promise<ActionResult<Page<OrderSummary>>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const t: StoreTab = tab === "active" || tab === "done" ? tab : "new";
  const p = typeof page === "number" && Number.isInteger(page) && page >= 0 ? page : 0;
  const res = await api.listStoreOrders(token, { status: [...STORE_TABS[t].statuses], page: p, size: 20 });
  return res.ok ? ok(res.data) : failWith(res.error);
}
