import "server-only";
import { callApi } from "@/lib/backend/client";
import type { DayHoursInput, DocumentInput, ReviewDecision, Store, StoreApplication, StoreInput, StoreStatus } from "./types";

// One function per store endpoint. The owner's calls have no store id: it's
// always the signed-in owner's own store. Every owner call returns the whole
// application, so a screen can refresh from any single response. The backend
// checks the role on every call (403 FORBIDDEN).

export function getMyStore(token: string) {
  return callApi<StoreApplication>("/seller/store", { sessionToken: token });
}

export function createStore(token: string, input: StoreInput, logo: File | null) {
  return callApi<StoreApplication>("/seller/store", { method: "POST", body: storeForm(input, logo), sessionToken: token });
}

export function updateStore(token: string, input: StoreInput, logo: File | null) {
  return callApi<StoreApplication>("/seller/store", { method: "PUT", body: storeForm(input, logo), sessionToken: token });
}

export function saveHours(token: string, days: DayHoursInput[]) {
  return callApi<StoreApplication>("/seller/store/hours", { method: "PUT", body: { days }, sessionToken: token });
}

export function uploadDocument(token: string, input: DocumentInput, file: File) {
  const form = new FormData();
  form.append("document", new Blob([JSON.stringify(input)], { type: "application/json" }), "document.json");
  form.append("file", file, file.name || "document");
  return callApi<StoreApplication>("/seller/store/documents", { method: "POST", body: form, sessionToken: token });
}

export function deleteDocument(token: string, documentId: string) {
  return callApi<StoreApplication>(`/seller/store/documents/${documentId}`, { method: "DELETE", sessionToken: token });
}

export function submitStore(token: string) {
  return callApi<StoreApplication>("/seller/store/submit", { method: "POST", sessionToken: token });
}

export function withdrawStore(token: string) {
  return callApi<StoreApplication>("/seller/store/withdraw", { method: "POST", sessionToken: token });
}

// ---- admin ----

/** Stores in one status (pending: oldest submission first). */
export function listStores(token: string, status: StoreStatus) {
  return callApi<Store[]>(`/admin/stores?status=${status}`, { sessionToken: token });
}

export function getStore(token: string, storeId: string) {
  return callApi<StoreApplication>(`/admin/stores/${storeId}`, { sessionToken: token });
}

export function reviewDocument(token: string, storeId: string, documentId: string, decision: ReviewDecision) {
  return callApi<StoreApplication>(`/admin/stores/${storeId}/documents/${documentId}/review`, { method: "POST", body: decision, sessionToken: token });
}

export function reviewStore(token: string, storeId: string, decision: ReviewDecision) {
  return callApi<StoreApplication>(`/admin/stores/${storeId}/review`, { method: "POST", body: decision, sessionToken: token });
}

// Two parts: "store" (JSON with its own content type, or Spring answers 415)
// and an optional "logo". No logo part on update = keep the current logo.
function storeForm(input: StoreInput, logo: File | null): FormData {
  const form = new FormData();
  form.append("store", new Blob([JSON.stringify(input)], { type: "application/json" }), "store.json");
  if (logo) form.append("logo", logo, logo.name || "store-logo");
  return form;
}
