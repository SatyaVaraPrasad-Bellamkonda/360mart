"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/auth/actions";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { isUuid } from "@/lib/auth/validation";
import type { ApiFailure } from "@/lib/backend/client";
import { reverseGeocode, searchPlaces, type PlaceMatch, type PlaceSuggestion } from "@/lib/maps/geocoder";
import * as api from "./address-service";
import type { Address } from "./types";
import { addressErrors, insideIndia, readDraft, toAddressInput, toDraft } from "./validation";

// Address server actions. The owner is always the logged-in user: the session
// cookie travels to the backend, nothing from the browser says whose address
// it is. Field rules are checked here again because browser input can be forged.

type ListResult = ActionResult<{ addresses: Address[]; notice?: string }>;

const GONE = "That address was already removed. Here is your current list.";

/** Add (addressId = null) or edit an address, then go back to the list. */
export async function saveAddressAction(addressId: string | null, input: unknown): Promise<ActionResult> {
  const draft = readDraft(input);
  if (!draft) return fail(unexpected());
  if (addressId !== null && !isUuid(addressId)) return fail(notFound());
  const fieldErrors = addressErrors(draft);
  if (Object.keys(fieldErrors).length) {
    return fail({ code: "VALIDATION_FAILED", message: "Some fields are invalid.", fieldErrors: fieldErrors as Record<string, string> });
  }

  const result = await withSession(async (token) => {
    // New: ask for default only when ticked (the backend makes the first one default anyway).
    // Edit: send true to make it the default, otherwise leave it out, which keeps the
    // current state. Never false: un-setting the default is refused (409).
    const res = addressId
      ? await api.updateAddress(token, addressId, toAddressInput(draft, draft.isDefault ? true : undefined))
      : await api.createAddress(token, toAddressInput(draft, draft.isDefault));
    return res.ok ? { ok: true, data: null } : fail(res.error);
  });
  if (!result.ok) return result;
  changed();
  redirect(`/account/addresses?saved=${addressId ? "updated" : "added"}`);
}

/** "Make default" must resend every field (PUT replaces them all), then the list is re-read
 *  because the previous default changed too. */
export async function makeDefaultAddressAction(addressId: unknown): Promise<ListResult> {
  if (!isUuid(addressId)) return fail(notFound());
  return withSession(async (token) => {
    const current = await api.getAddress(token, addressId);
    if (!current.ok) return current.error.code === "ADDRESS_NOT_FOUND" ? freshList(token, GONE) : fail(current.error);
    if (!current.data.isDefault) {
      const res = await api.updateAddress(token, addressId, toAddressInput(toDraft(current.data), true));
      if (!res.ok) return res.error.code === "ADDRESS_NOT_FOUND" ? freshList(token, GONE) : fail(res.error);
    }
    return freshList(token);
  });
}

/** Delete, then re-read the list: removing the default promotes the newest remaining address. */
export async function deleteAddressAction(addressId: unknown): Promise<ListResult> {
  if (!isUuid(addressId)) return fail(notFound());
  return withSession(async (token) => {
    const res = await api.deleteAddress(token, addressId);
    if (!res.ok && res.error.code !== "ADDRESS_NOT_FOUND") return fail(res.error);
    return freshList(token);
  });
}

/** City, state, pincode and area for a map pin, to fill the form (the user reviews them). */
export async function suggestFromPinAction(latitude: unknown, longitude: unknown): Promise<ActionResult<PlaceSuggestion>> {
  if (typeof latitude !== "number" || typeof longitude !== "number" || !insideIndia({ latitude, longitude })) {
    return fail({ code: "VALIDATION_FAILED", message: "The pin must be inside India.", fieldErrors: {} });
  }
  // Only for logged-in shoppers, so the lookup service can't be used through us by anyone.
  if (!(await getSessionToken())) return fail(unauthenticated());
  const place = await reverseGeocode(latitude, longitude);
  return place.ok ? { ok: true, data: place.data } : fail({ code: place.code, message: place.message, fieldErrors: {} });
}

/** "Search area, street or landmark": up to 5 places in India for the map. */
export async function searchPlacesAction(query: unknown): Promise<ActionResult<PlaceMatch[]>> {
  const q = typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
  if (q.length < 3 || q.length > 200 || /[<>\x00-\x1F\x7F]/.test(q)) {
    return fail({ code: "VALIDATION_FAILED", message: "Type at least 3 letters of an area, street or landmark.", fieldErrors: {} });
  }
  if (!(await getSessionToken())) return fail(unauthenticated());
  const found = await searchPlaces(q);
  return found.ok ? { ok: true, data: found.data } : fail({ code: found.code, message: found.message, fieldErrors: {} });
}

async function freshList(token: string, notice?: string): Promise<ListResult> {
  changed();
  const res = await api.listAddresses(token);
  if (!res.ok) return fail(res.error);
  return { ok: true, data: { addresses: Array.isArray(res.data) ? res.data : [], notice } };
}

// Pages under /account show addresses (the list, the account card, "first address"
// on the add form); without this the browser could show a copy from before the change.
function changed() {
  revalidatePath("/account", "layout");
}

async function withSession<T>(run: (token: string) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const token = await getSessionToken();
  if (!token) return fail(unauthenticated());
  const result = await run(token);
  // The backend ended this session: forget it here too; the page sends them to login.
  if (!result.ok && result.error.code === "UNAUTHENTICATED") await clearSession();
  return result;
}

function fail(error: Pick<ApiFailure, "code" | "message" | "fieldErrors">): { ok: false; error: Pick<ApiFailure, "code" | "message" | "fieldErrors"> } {
  return { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
}

const unauthenticated = () => ({ code: "UNAUTHENTICATED", message: "Please login to continue.", fieldErrors: {} });
const notFound = () => ({ code: "ADDRESS_NOT_FOUND", message: "Address not found.", fieldErrors: {} });
const unexpected = () => ({ code: "UNKNOWN", message: "Something went wrong. Please try again.", fieldErrors: {} });
