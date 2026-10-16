import type { Address } from "./types";

// Display helpers, safe for client components.

/** The address as the lines printed on a parcel. */
export function addressLines(address: Address): string[] {
  return [
    address.addressLine1,
    address.addressLine2,
    address.landmark, // as typed: people write "Near …", "Opp. …", "Behind …"
    `${address.city}, ${address.state} ${address.pincode}`,
  ].filter((line): line is string => !!line);
}

/** One line, e.g. for a summary card. */
export function addressSummary(address: Address): string {
  return addressLines(address).join(", ");
}

export const hasPin = (address: Address) => address.latitude != null && address.longitude != null;

/**
 * Changes whenever any address is added, edited, deleted or becomes the default.
 * Next.js keeps visited pages alive in the background (React <Activity>) with
 * their state, so a page you return to could keep showing the list or form from
 * before a change; components compare this (or use it as a key) to start fresh.
 */
export function listVersion(addresses: Address[]): string {
  return addresses.map((a) => `${a.addressId}@${a.modifiedAt}${a.isDefault ? "*" : ""}`).join("|") || "empty";
}
