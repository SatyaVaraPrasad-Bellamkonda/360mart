"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { callApi } from "@/lib/backend/client";
import { isSheetKind, sheetCode, sheetFileError, SHEETS } from "./sheets";

// Upload of a filled-in price sheet or batch sheet. All or nothing on the
// backend: every row is applied, or nothing is and each problem comes back with
// its row and column (SHEET_INVALID). Error codes are passed on in the shared
// SHEET_* form (sheetCode), whichever the backend sent.
export async function uploadSheetAction(kind: unknown, form: FormData): Promise<ActionResult<{ message: string }>> {
  if (!isSheetKind(kind) || !(form instanceof FormData)) return fail("UNKNOWN", "Something went wrong. Please try again.");
  const { api, name } = SHEETS[kind];
  const file = form.get("file");
  if (!(file instanceof File)) return fail("VALIDATION_FAILED", `Choose the ${name} to upload.`);
  const problem = sheetFileError(file, kind);
  if (problem) return fail("SHEET_UNREADABLE", problem);

  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "seller") return fail("FORBIDDEN", "Only shopkeeper accounts can upload sheets.");

  const body = new FormData();
  body.append("file", file, file.name);
  const res = await callApi<{ success: boolean; message: string }>(api, { method: "POST", body, sessionToken: token });
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    if (res.error.status === 413 || res.error.code === "FILE_TOO_LARGE") return fail("FILE_TOO_LARGE", `The file is too large. Upload the ${name} you downloaded (at most 2 MB).`);
    return { ok: false, error: { code: sheetCode(res.error.code), message: res.error.message, fieldErrors: res.error.fieldErrors } };
  }
  // Products, stock and batches show the changes at once.
  revalidatePath("/seller/products", "layout");
  return { ok: true, data: { message: res.data.message } };
}

function fail(code: string, message: string): { ok: false; error: ActionError } {
  return { ok: false, error: { code, message, fieldErrors: {} } };
}
