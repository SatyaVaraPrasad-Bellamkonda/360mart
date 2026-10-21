"use server";

import type { ActionResult } from "@/lib/auth/actions";
import { listAddresses } from "@/lib/addresses/address-service";
import { ADDRESS_TYPE_LABEL } from "@/lib/addresses/types";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { AddressChoice } from "./types";

/**
 * The signed-in shopper's saved addresses for "Deliver to" (one call, when the
 * picker opens or on the first product page without a chosen location).
 * Default first, as the backend sorts them.
 */
export async function loadAddressChoicesAction(): Promise<ActionResult<AddressChoice[]>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: { code: "UNAUTHENTICATED", message: "Please login to use your saved addresses.", fieldErrors: {} } };
  const res = await listAddresses(token);
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    return { ok: false, error: { code: res.error.code, message: res.error.message, fieldErrors: {} } };
  }
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
