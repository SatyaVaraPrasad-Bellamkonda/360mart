import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import { isUuid } from "@/lib/auth/validation";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./store-service";
import type { Store, StoreApplication, StoreStatus } from "./types";

// Store data for pages (server components), one backend call each. Call after
// requireRole(). An ended session goes to that area's login and comes back
// afterwards; any other failure is returned so the page can show a message.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

/** The owner's application, or null when they haven't started one yet. */
export async function loadMyStore(returnTo: string): Promise<Loaded<StoreApplication | null>> {
  const token = await tokenOrLogin("/login", returnTo);
  const res = await api.getMyStore(token);
  if (!res.ok && res.error.code === "STORE_NOT_FOUND") return { ok: true, data: null };
  if (!res.ok) return failed(res.error, "/login", returnTo);
  return { ok: true, data: res.data };
}

export const ADMIN_STORE_TABS: StoreStatus[] = ["PENDING_APPROVAL", "ACTIVE", "REJECTED", "DRAFT"];

export async function loadStores(status: StoreStatus, returnTo: string): Promise<Loaded<Store[]>> {
  const token = await tokenOrLogin("/admin/login", returnTo);
  const res = await api.listStores(token, status);
  if (!res.ok) return failed(res.error, "/admin/login", returnTo);
  return { ok: true, data: Array.isArray(res.data) ? res.data : [] };
}

/** null = no such store. */
export async function loadStore(storeId: string, returnTo: string): Promise<Loaded<StoreApplication | null>> {
  if (!isUuid(storeId)) return { ok: true, data: null };
  const token = await tokenOrLogin("/admin/login", returnTo);
  const res = await api.getStore(token, storeId);
  if (!res.ok && res.error.code === "STORE_NOT_FOUND") return { ok: true, data: null };
  if (!res.ok) return failed(res.error, "/admin/login", returnTo);
  return { ok: true, data: res.data };
}

async function tokenOrLogin(login: string, returnTo: string): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect(`${login}?next=${encodeURIComponent(returnTo)}`);
  return token;
}

function failed(error: ApiFailure, login: string, returnTo: string): Loaded<never> {
  if (error.code === "UNAUTHENTICATED") redirect(`${login}?next=${encodeURIComponent(returnTo)}`);
  return { ok: false, error };
}
