import { addressSummary, hasPin } from "@/lib/addresses/format";
import { ADDRESS_TYPE_LABEL, type Address } from "@/lib/addresses/types";

// The saved addresses as the cart and checkout offer them. Checkout needs a
// map pin (the backend works out distance from it), so an address without one
// is shown but can't be chosen. Safe for client components.

export type AddressChoice = {
  addressId: string;
  title: string;
  recipientName: string;
  summary: string;
  latitude: number | null;
  longitude: number | null;
  hasPin: boolean;
  isDefault: boolean;
};

export function toAddressChoices(list: Address[]): AddressChoice[] {
  return list.map((a) => ({
    addressId: a.addressId,
    title: ADDRESS_TYPE_LABEL[a.addressType] ?? "Address",
    recipientName: a.recipientName,
    summary: addressSummary(a),
    latitude: a.latitude,
    longitude: a.longitude,
    hasPin: hasPin(a),
    isDefault: a.isDefault,
  }));
}

/** The one in the URL if it can be used, else the default with a pin, else any with a pin. */
export function pickAddress(choices: AddressChoice[], wanted?: string): AddressChoice | null {
  const usable = choices.filter((c) => c.hasPin);
  return usable.find((c) => c.addressId === wanted) ?? usable.find((c) => c.isDefault) ?? usable[0] ?? null;
}
