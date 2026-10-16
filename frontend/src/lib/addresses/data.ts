import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import { isUuid } from "@/lib/auth/validation";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./address-service";
import type { Address } from "./types";

// Address data for pages (server components). Call after requireRole("customer").
// An ended session goes to login and comes back here afterwards; any other
// failure is returned so the page can show a message instead of crashing.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export async function loadAddresses(returnTo: string): Promise<Loaded<Address[]>> {
  const token = await sessionOrLogin(returnTo);
  const res = await api.listAddresses(token);
  if (!res.ok) return failed(res.error, returnTo);
  return { ok: true, data: Array.isArray(res.data) ? res.data : [] };
}

/** null = no such address for this user (wrong, deleted, or someone else's id). */
export async function loadAddress(addressId: string, returnTo: string): Promise<Loaded<Address | null>> {
  if (!isUuid(addressId)) return { ok: true, data: null };
  const token = await sessionOrLogin(returnTo);
  const res = await api.getAddress(token, addressId);
  if (!res.ok && res.error.code === "ADDRESS_NOT_FOUND") return { ok: true, data: null };
  if (!res.ok) return failed(res.error, returnTo);
  return { ok: true, data: res.data };
}

async function sessionOrLogin(returnTo: string): Promise<string> {
  const token = await getSessionToken();
  if (!token) toLogin(returnTo);
  return token;
}

function failed(error: ApiFailure, returnTo: string): Loaded<never> {
  if (error.code === "UNAUTHENTICATED") toLogin(returnTo);
  return { ok: false, error };
}

function toLogin(returnTo: string): never {
  redirect(`/login?next=${encodeURIComponent(returnTo)}`);
}
