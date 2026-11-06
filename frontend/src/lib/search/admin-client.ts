import { failed, failure, refreshPages, unexpected } from "@/lib/admin/refresh";
import { api } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { cleanQuery } from "./query";

// The admin search report's writes, straight from the browser to
// /api/v1/admin/search/hidden-terms (each shows in DevTools → Network). The
// report itself is loaded by its page on the server. Hiding a term changes
// trending searches on the home page, so our cached home page is marked stale.

const FORBIDDEN = "Only admins can see the search report.";

/** Keep a term out of trending searches; the home page shows the change at once. */
export async function hideTerm(term: string): Promise<ActionResult<{ id: number }>> {
  const text = cleanQuery(term);
  if (!text) return failure("VALIDATION_FAILED", "Enter the search term to hide.");
  const res = await api<{ success: boolean; message: string; id: number }>("/admin/search/hidden-terms", { method: "POST", body: { term: text } });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("home");
  return { ok: true, data: { id: res.data.id } };
}

export async function unhideTerm(hiddenTermId: number): Promise<ActionResult<null>> {
  if (!Number.isInteger(hiddenTermId) || hiddenTermId < 1) return unexpected();
  const res = await api<{ success: boolean; message: string }>(`/admin/search/hidden-terms/${hiddenTermId}`, { method: "DELETE" });
  if (!res.ok) return failed(res.error, FORBIDDEN);
  await refreshPages("home");
  return { ok: true, data: null };
}
