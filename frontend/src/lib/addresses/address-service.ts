import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Address, AddressInput } from "./types";

// One function per address endpoint. The owner is always the logged-in user
// (from the session cookie), so no user id appears in these URLs.

const one = (addressId: string) => `/addresses/${encodeURIComponent(addressId)}`;

export function listAddresses(token: string) {
  return callApi<Address[]>("/addresses", { sessionToken: token });
}

export function getAddress(token: string, addressId: string) {
  return callApi<Address>(one(addressId), { sessionToken: token });
}

export function createAddress(token: string, body: AddressInput) {
  return callApi<Address>("/addresses", { method: "POST", body, sessionToken: token });
}

export function updateAddress(token: string, addressId: string, body: AddressInput) {
  return callApi<Address>(one(addressId), { method: "PUT", body, sessionToken: token });
}

export function deleteAddress(token: string, addressId: string) {
  return callApi<null>(one(addressId), { method: "DELETE", sessionToken: token });
}
