import { ADDRESS_TYPE_LABEL, type Address } from "@/lib/addresses/types";
import { api, type ApiResult } from "@/lib/api-client";
import { NOT_SERVICEABLE, type AddressChoice, type Serviceability } from "./types";

// Browser calls for "Deliver to" (they show in DevTools → Network).

/** The signed-in shopper's saved addresses (one GET /addresses), default first as the backend sorts them. */
export async function loadAddressChoices(): Promise<ApiResult<AddressChoice[]>> {
  const res = await api<Address[]>("/addresses");
  if (!res.ok) return res;
  const list = Array.isArray(res.data) ? res.data : [];
  return {
    ok: true,
    data: list.map((a) => ({
      addressId: a.addressId,
      title: ADDRESS_TYPE_LABEL[a.addressType] ?? "Address",
      line: [a.addressLine2, a.city].filter(Boolean).join(", ") || a.addressLine1,
      latitude: a.latitude,
      longitude: a.longitude,
      isDefault: a.isDefault,
    })),
  };
}

/** The address to use when nothing is chosen yet: the default one with a map pin, else any with a pin. */
export const defaultChoice = (list: AddressChoice[]) => list.find((a) => a.isDefault && a.latitude != null) ?? list.find((a) => a.latitude != null) ?? null;

/**
 * Do stores deliver to this point? Never cached (stores open, close, change
 * their radius). A point the backend refuses (400, e.g. outside India) counts
 * as "not here"; other failures (429, offline) come back as errors so the
 * caller keeps what it showed before.
 */
export async function checkServiceability(latitude: number, longitude: number): Promise<ApiResult<Serviceability>> {
  const res = await api<Serviceability>(`/serviceability?latitude=${latitude.toFixed(6)}&longitude=${longitude.toFixed(6)}`);
  if (!res.ok && res.error.code === "VALIDATION_FAILED") return { ok: true, data: NOT_SERVICEABLE };
  return res;
}
