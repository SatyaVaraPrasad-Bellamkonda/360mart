import { api } from "@/lib/api-client";
import { failed, invalid, refreshPages, result } from "@/lib/admin/refresh";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { REASON_MAX, REASON_MIN, VEHICLE_TYPES, type AdminRider, type DeliverySettings, type DeliveryWrite, type RiderCash } from "./types";

// Admin: delivery partners (review, approve, suspend, cash) and the delivery
// settings, called from the browser (/api/v1/admin/riders..., visible in
// DevTools → Network). The backend checks the ADMIN role on every call.
// Each rider write is followed by one GET of the rider, so the screen shows
// the new status, documents and cash at once.

const FORBIDDEN = "Only admins can do this. Log in with an admin account.";
const id = encodeURIComponent;
const reasonProblem = (r: string) => (r.length < REASON_MIN || r.length > REASON_MAX ? `Write ${REASON_MIN} to ${REASON_MAX} characters.` : null);

/** On RIDER_STATUS_CONFLICT the fresh rider comes along, so the screen catches up. */
type RiderResult = ActionResult<{ message: string; rider: AdminRider | null }> & { rider?: AdminRider | null };

async function write(riderId: unknown, path: string, method: "POST" | "PUT", body?: unknown): Promise<RiderResult> {
  if (!isUuidLike(riderId)) return invalid({}, "Delivery partner not found.");
  const res = await api<DeliveryWrite>(`/admin/riders/${id(riderId)}${path}`, { method, body });
  if (!res.ok) {
    // Someone else changed the rider first: send the fresh copy along.
    if (res.error.code === "RIDER_STATUS_CONFLICT") {
      const fresh = await api<AdminRider>(`/admin/riders/${id(riderId)}`);
      return { ...failed(res.error, FORBIDDEN), rider: fresh.ok ? fresh.data : null };
    }
    return failed(res.error, FORBIDDEN);
  }
  await refreshPages("riders");
  const fresh = await api<AdminRider>(`/admin/riders/${id(riderId)}`);
  return { ok: true, data: { message: res.data?.message ?? "Saved.", rider: fresh.ok ? fresh.data : null } };
}

function withReason(riderId: unknown, path: string, reasonInput: unknown): Promise<RiderResult> {
  const reason = typeof reasonInput === "string" ? reasonInput.trim() : "";
  const problem = reasonProblem(reason);
  if (problem) return Promise.resolve(invalid({ reason: problem }, problem));
  return write(riderId, path, "POST", { reason });
}

export const verifyRiderDocument = (riderId: string, documentId: string) =>
  isUuidLike(documentId) ? write(riderId, `/documents/${id(documentId)}/verify`, "POST") : Promise.resolve(invalid({}, "Document not found."));
export const rejectRiderDocument = (riderId: string, documentId: string, reason: string) =>
  isUuidLike(documentId) ? withReason(riderId, `/documents/${id(documentId)}/reject`, reason) : Promise.resolve(invalid({}, "Document not found."));

export const approveRider = (riderId: string) => write(riderId, "/approve", "POST");
export const rejectRider = (riderId: string, reason: string) => withReason(riderId, "/reject", reason);
export const suspendRider = (riderId: string, reason: string) => withReason(riderId, "/suspend", reason);
export const reactivateRider = (riderId: string) => write(riderId, "/reactivate", "POST");

/** null = use the default limit. */
export function setCashLimit(riderId: string, limit: number | null): Promise<RiderResult> {
  if (limit !== null && !(Number.isFinite(limit) && limit >= 0 && limit <= 10_000_000)) return Promise.resolve(invalid({ cashLimit: "Enter 0 or more, or leave it empty for the default." }));
  return write(riderId, "/cash-limit", "PUT", { cashLimit: limit === null ? null : Math.round(limit * 100) / 100 });
}

export function recordDeposit(riderId: string, amount: number, referenceInput: string, cashInHand: number): Promise<RiderResult> {
  const errors: Record<string, string> = {};
  if (!(Number.isFinite(amount) && amount > 0)) errors.amount = "Enter the amount handed in.";
  else if (amount > cashInHand) errors.amount = "That's more than the rider holds.";
  const reference = referenceInput.trim();
  if (reference.length > 100) errors.reference = "Keep the reference under 100 characters.";
  else if (/[<>\p{Cc}]/u.test(reference)) errors.reference = "The reference contains characters that are not allowed.";
  if (Object.keys(errors).length) return Promise.resolve(invalid(errors));
  return write(riderId, "/cash/deposits", "POST", { amount: Math.round(amount * 100) / 100, reference: reference || null });
}

export async function loadRiderCashPage(riderId: string, page: number): Promise<ActionResult<RiderCash>> {
  if (!isUuidLike(riderId)) return invalid({}, "Delivery partner not found.");
  return result(await api<RiderCash>(`/admin/riders/${id(riderId)}/cash?page=${Math.max(0, page)}&size=20`), FORBIDDEN);
}

/** The whole settings document (the backend wants all six vehicles, each once). */
export async function saveDeliverySettings(settings: DeliverySettings): Promise<ActionResult<{ message: string; settings: DeliverySettings | null }>> {
  const vehicles = VEHICLE_TYPES.map((v) => settings.vehicles.find((r) => r.vehicleType === v)).filter((r) => !!r);
  if (vehicles.length !== VEHICLE_TYPES.length) return invalid({ vehicles: "Every vehicle type needs its rule." });
  const body = {
    defaultCashLimit: settings.defaultCashLimit,
    offerTimeoutSeconds: settings.offerTimeoutSeconds,
    searchRadiusKm: settings.searchRadiusKm,
    locationFreshSeconds: settings.locationFreshSeconds,
    retryIntervalSeconds: settings.retryIntervalSeconds,
    failedWaitMinutes: settings.failedWaitMinutes,
    averageSpeedKmph: settings.averageSpeedKmph,
    vehicles: vehicles.map((r) => ({ vehicleType: r.vehicleType, enabled: r.enabled, licenceRequired: r.licenceRequired, maxDistanceKm: r.maxDistanceKm, maxItems: r.maxItems })),
  };
  const res = await api<DeliveryWrite>("/admin/delivery/settings", { method: "PUT", body });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("riders");
  const fresh = await api<DeliverySettings>("/admin/delivery/settings");
  return { ok: true, data: { message: res.data?.message ?? "Settings saved.", settings: fresh.ok ? fresh.data : null } };
}
