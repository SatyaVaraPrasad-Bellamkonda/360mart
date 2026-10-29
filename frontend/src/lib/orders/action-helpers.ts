import "server-only";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";

// Shared by the cart / order server actions: the session token (or a
// "please log in" error) and the error shape sent back to the browser.

export const LOGIN_NEEDED: ActionError = { code: "UNAUTHENTICATED", message: "Please log in again to continue.", fieldErrors: {} };

export async function sessionToken(): Promise<string | null> {
  return (await getSessionToken()) ?? null;
}

/** Only code, message and field errors go back (no status, no raw backend body). An ended session is cleared. */
export async function failWith(error: ApiFailure | ActionError): Promise<{ ok: false; error: ActionError }> {
  if (error.code === "UNAUTHENTICATED") await clearSession();
  return { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
}

export function invalid(message: string, fieldErrors: Record<string, string> = {}): { ok: false; error: ActionError } {
  return { ok: false, error: { code: "VALIDATION_FAILED", message, fieldErrors } };
}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const cleanText = (v: unknown) => (typeof v === "string" ? v.trim() : "");
