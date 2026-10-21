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
