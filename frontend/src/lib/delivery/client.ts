import { api, type ApiResult } from "@/lib/api-client";
import { isUuidLike } from "@/lib/inventory/validation";
import { refreshPagesAction } from "@/lib/orders/refresh-action";
import { REASON_MAX, REASON_MIN, type AvailableRider, type DeliveryTracking, type DeliveryWrite, type StoreDelivery } from "./types";

// Delivery calls made straight from the browser (/api/v1/..., visible in
// DevTools → Network): the store's delivery panel on an order, the admin's
// panel on the same order, and the shopper's live tracking. Like an AngularJS
// $http service: each function is one endpoint, answering { ok, data } or
// { ok: false, error } with the backend's code and words.

const id = encodeURIComponent;

function fail(code: string, message: string, fieldErrors: Record<string, string> = {}): ApiResult<never> {
  return { ok: false, error: { status: 0, code, message, fieldErrors, issues: [] } };
}

/** Whose panel: the store owner's (/seller/store/orders) or support's (/admin/orders). */
export type PanelOwner = "store" | "admin";
const base = (owner: PanelOwner, orderId: string) => (owner === "store" ? `/seller/store/orders/${id(orderId)}/delivery` : `/admin/orders/${id(orderId)}/delivery`);

export function loadDelivery(owner: PanelOwner, orderId: string, signal?: AbortSignal) {
  if (!isUuidLike(orderId)) return Promise.resolve(fail("ORDER_NOT_FOUND", "Order not found."));
  return api<StoreDelivery>(base(owner, orderId), { signal });
}

/** Free riders near the store (the store's "Choose a rider"). */
export const loadAvailableRiders = (orderId: string) => api<AvailableRider[]>(`${base("store", orderId)}/riders`);

async function write(owner: PanelOwner, orderId: string, step: string, body?: unknown): Promise<ApiResult<{ message: string }>> {
  if (!isUuidLike(orderId)) return fail("ORDER_NOT_FOUND", "Order not found.");
  const res = await api<DeliveryWrite>(`${base(owner, orderId)}/${step}`, { method: "POST", body });
  if (!res.ok) return res;
  void refreshPagesAction("orders");
  return { ok: true, data: { message: res.data?.message ?? "Done." } };
}

/** The rider still has to accept. */
export function assignRider(orderId: string, riderId: string) {
  if (!isUuidLike(riderId)) return Promise.resolve(fail("VALIDATION_FAILED", "Choose a rider."));
  return write("store", orderId, "assign", { riderId });
}
export const confirmHandover = (orderId: string) => write("store", orderId, "handover");
export const deliverMyself = (orderId: string) => write("store", orderId, "self");
export const confirmReturn = (owner: PanelOwner, orderId: string) => write(owner, orderId, "returned");

/** Admin: take it from the rider before pickup, or restart a stuck search. */
export function reassignDelivery(orderId: string, reasonInput: string) {
  const reason = reasonInput.trim();
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    const m = `Write ${REASON_MIN} to ${REASON_MAX} characters.`;
    return Promise.resolve(fail("VALIDATION_FAILED", m, { reason: m }));
  }
  return write("admin", orderId, "reassign", { reason });
}

/** The shopper's live tracking (never cached by the backend either). */
export const loadTracking = (orderId: string, signal?: AbortSignal) => api<DeliveryTracking>(`/orders/${id(orderId)}/tracking`, { signal });
