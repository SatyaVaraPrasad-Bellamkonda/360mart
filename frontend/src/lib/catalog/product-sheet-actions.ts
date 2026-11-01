"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { callApi } from "@/lib/backend/client";
import { PRODUCTS_TAG } from "./data";
import { PRODUCT_SHEET_API, productSheetFileError, type SheetIssue } from "./product-sheet";

export type ProductSheetFailure = { code: string; message: string; issues: SheetIssue[] };
export type ProductSheetResult = { ok: true; message: string } | { ok: false; error: ProductSheetFailure };

// Upload of the edited product sheet. All or nothing on the backend: every row
// is applied, or nothing is and every problem comes back with its tab, row and
// column (SHEET_INVALID). The file is checked here first (browser input can be
// forged), then again by the backend, which also checks the caller is an admin.
export async function uploadProductSheetAction(form: FormData): Promise<ProductSheetResult> {
  if (!(form instanceof FormData)) return fail("UNKNOWN", "Something went wrong. Please try again.");
  const file = form.get("file");
  if (!(file instanceof File)) return fail("VALIDATION_FAILED", "Choose the sheet to upload.");
  const problem = productSheetFileError(file);
  if (problem) return fail("SHEET_UNREADABLE", problem);

  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return fail("FORBIDDEN", "Only admins can upload the product sheet.");

  const body = new FormData();
  body.append("file", file, file.name);
  const res = await callApi<{ success: boolean; message: string }>(PRODUCT_SHEET_API, { method: "POST", body, sessionToken: token });
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    if (res.error.status === 413 || res.error.code === "FILE_TOO_LARGE") return fail("FILE_TOO_LARGE", "The file is too big. Upload the sheet you downloaded (at most 5 MB).");
    return { ok: false, error: { code: res.error.code, message: res.error.message, issues: res.error.issues ?? [] } };
  }
  // Shop pages read products from the cache: drop it so they show the change at once.
  updateTag(PRODUCTS_TAG);
  revalidatePath("/admin", "layout");
  return { ok: true, message: res.data.message };
}

function fail(code: string, message: string): { ok: false; error: ProductSheetFailure } {
  return { ok: false, error: { code, message, issues: [] } };
}
