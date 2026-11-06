import { api } from "@/lib/api-client";
import { failed, failure, invalid, refreshPages, unexpected } from "@/lib/admin/refresh";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuid } from "@/lib/auth/validation";
import type { ReviewDecision, StoreApplication } from "./types";
import { reasonError } from "./validation";

// The admin's store review, called from the browser (/api/v1/admin/stores/...,
// visible in DevTools → Network). The backend checks the ADMIN role on every
// call. A review only answers a short confirmation, so each one then reads the
// application back (GET) and returns it: the screen refreshes from the answer.

type Result = Promise<ActionResult<StoreApplication>>;
type Written = { success: boolean; message: string };

const FORBIDDEN = "Only admins can review stores.";

export async function reviewDocument(storeId: unknown, documentId: unknown, decision: unknown): Result {
  if (!isUuid(storeId) || !isUuid(documentId)) return failure("DOCUMENT_NOT_FOUND", "Document not found.");
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return writeThenRead(storeId, `/admin/stores/${storeId}/documents/${documentId}/review`, checked.data);
}

export async function reviewStore(storeId: unknown, decision: unknown): Result {
  if (!isUuid(storeId)) return failure("STORE_NOT_FOUND", "Store not found.");
  const checked = readDecision(decision);
  if (!checked.ok) return checked;
  return writeThenRead(storeId, `/admin/stores/${storeId}/review`, checked.data);
}

function readDecision(input: unknown): ActionResult<ReviewDecision> {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (raw.approved === true) return { ok: true, data: { approved: true } };
  if (raw.approved !== false) return unexpected();
  const reason = typeof raw.reason === "string" ? raw.reason.trim().replace(/ {2,}/g, " ") : "";
  const problem = reasonError(reason);
  if (problem) return invalid({ reason: problem }, problem);
  return { ok: true, data: { approved: false, reason } };
}

async function writeThenRead(storeId: string, path: string, decision: ReviewDecision): Result {
  const res = await api<Written>(path, { method: "POST", body: decision });
  if (!res.ok) {
    if (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE") return failure(res.error.code, "File storage is busy right now. Please try again in a minute.");
    return failed(res.error, FORBIDDEN);
  }
  // The queue page caches the list: mark it changed (this page shows the fresh copy below).
  await refreshPages("stores");
  const fresh = await api<StoreApplication>(`/admin/stores/${storeId}`);
  // The change is saved either way; only showing it failed.
  if (!fresh.ok) return failure("RELOAD_FAILED", `${res.data?.message ?? "Saved."} Reload the page to see the change.`);
  return { ok: true, data: fresh.data };
}
