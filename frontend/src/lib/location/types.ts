// Where the shopper wants things delivered: one point (from a saved address,
// the device's location, or a pin on the map) and a short label for it.
// Types and pure helpers only, so client components may import them.

import { insideIndia, round6 } from "@/lib/addresses/validation";

export type DeliveryLocation = {
  latitude: number;
  longitude: number;
  /** "Kukatpally, Hyderabad", "Home", "Current location"… */
  label: string;
  source: "address" | "device" | "map";
  /** Set when it came from a saved address. */
  addressId?: string;
};

/** A saved address the picker can offer (only ones with a map pin can be used). */
export type AddressChoice = { addressId: string; title: string; line: string; latitude: number | null; longitude: number | null; isDefault: boolean };

/** Untrusted input (storage, the browser) → a location, or null. */
export function readLocation(input: unknown): DeliveryLocation | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const lat = r.latitude;
  const lng = r.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !insideIndia({ latitude: lat, longitude: lng })) return null;
  const source = r.source === "address" || r.source === "device" || r.source === "map" ? r.source : "map";
  const label = typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 80) : "Selected location";
  return { latitude: round6(lat), longitude: round6(lng), label, source, ...(typeof r.addressId === "string" ? { addressId: r.addressId } : {}) };
}

/** Within about 100 m: the same place for "recent places" and for marking the current choice. */
export function sameSpot(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): boolean {
  return Math.abs(a.latitude - b.latitude) < 0.001 && Math.abs(a.longitude - b.longitude) < 0.001;
}

/** The first part of a label ("Kukatpally" from "Kukatpally, Hyderabad"), for tight spaces like the phone header. */
export const shortLabel = (label: string) => label.split(",")[0].trim() || label;

/** GET /serviceability: do live stores deliver to this point? Counts only, never store names. */
export type Serviceability = {
  serviceable: boolean;
  storeCount: number;
  openNowCount: number;
  /** null when not serviceable. */
  nearestStoreKm: number | null;
  /** The lowest fee among those stores (0 = some store delivers free), not a promise for every store. */
  lowestDeliveryFee: number | null;
  lowestMinOrderAmount: number | null;
};

/** Nobody delivers there (also used for a point the backend refuses). */
export const NOT_SERVICEABLE: Serviceability = { serviceable: false, storeCount: 0, openNowCount: 0, nearestStoreKm: null, lowestDeliveryFee: null, lowestMinOrderAmount: null };

/** How to name a place in a sentence: "Ameerpet", or "your area" for an unnamed point ("Your location", "Pinned location"). */
export function areaName(label: string): string {
  return ["Your location", "Pinned location", "Selected location", "Current location"].includes(label) ? "your area" : shortLabel(label);
}
