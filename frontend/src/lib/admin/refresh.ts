import type { ApiError, ApiResult } from "@/lib/api-client";
import type { ActionError } from "@/lib/auth/actions";
import { refreshAfterAdminChange } from "./refresh-action";
import type { AdminRefresh } from "./refresh-targets";

// Shared by the admin screens' browser modules (lib/*/admin-client.ts), which
// call /api/v1/admin/... straight from the browser. The backend checks the
// ADMIN role on every call; these only give the screens the same answers
// the old server actions gave.

/** After a successful write: mark our cached pages stale (awaited, so a following navigation shows the change). */
export const refreshPages = (what: AdminRefresh, categoryId?: number) => refreshAfterAdminChange(what, categoryId).catch(() => undefined);

export const GENERIC = "Something went wrong. Please try again.";
export const STORAGE_BUSY = "Picture storage is busy right now. Please try again in a minute.";

export function failure(code: string, message: string, fieldErrors: Record<string, string> = {}): { ok: false; error: ActionError } {
  return { ok: false, error: { code, message, fieldErrors } };
}

export const unexpected = () => failure("UNKNOWN", GENERIC);
export const invalid = (fieldErrors: Record<string, string>, message = "Please fix the highlighted fields.") => failure("VALIDATION_FAILED", message, fieldErrors);

/** The API's error as the screens know it; FORBIDDEN gets the screen's own words. */
export function toActionError(error: ApiError, forbidden?: string): ActionError {
  if (error.code === "FORBIDDEN" && forbidden) return { code: "FORBIDDEN", message: forbidden, fieldErrors: {} };
  return { code: error.code, message: error.message, fieldErrors: error.fieldErrors };
}

export function failed(error: ApiError, forbidden?: string): { ok: false; error: ActionError } {
  return { ok: false, error: toActionError(error, forbidden) };
}

/** A picture upload's failure: too big (413), storage busy (502), or the API's own words. */
export function uploadFailed(error: ApiError, forbidden?: string): { ok: false; error: ActionError } {
  if (error.status === 413 || error.code === "FILE_TOO_LARGE") return failure("IMAGE_TOO_LARGE", "The image must be at most 2 MB.");
  if (error.status === 502 || error.code === "STORAGE_UNAVAILABLE") return failure(error.code, STORAGE_BUSY);
  return failed(error, forbidden);
}

/** Passes a read through in the screens' result shape. */
export function result<T>(res: ApiResult<T>, forbidden?: string): { ok: true; data: T } | { ok: false; error: ActionError } {
  return res.ok ? { ok: true, data: res.data } : failed(res.error, forbidden);
}
