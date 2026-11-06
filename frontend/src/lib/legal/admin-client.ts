import { failed, failure, invalid, refreshPages } from "@/lib/admin/refresh";
import { api } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { policyErrors, type PolicyDraft } from "./admin-validation";
import { isPolicyType } from "./types";

// Publish a new version of a policy, straight from the browser to
// POST /api/v1/admin/legal/policies/{type}/versions (shows in DevTools →
// Network). Versions are never edited: a fix is a new version. Checked here
// with the backend's rules, then by the backend, which also checks the caller
// is an admin. The public pages, footer and consent prompts read a cached
// list, so it's marked stale afterwards.

export async function publishPolicy(type: unknown, input: unknown): Promise<ActionResult<{ message: string; version: number | null }>> {
  if (!isPolicyType(type)) return failure("VALIDATION_FAILED", "Choose a policy.");

  const raw = (input ?? {}) as Partial<Record<keyof PolicyDraft, unknown>>;
  const draft: PolicyDraft = {
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    changeSummary: typeof raw.changeSummary === "string" ? raw.changeSummary : "",
    // The refund policy is only shown, never accepted.
    requiresReacceptance: type !== "REFUND" && raw.requiresReacceptance === true,
  };
  const errors = policyErrors(draft);
  if (Object.keys(errors).length) return invalid(errors as Record<string, string>, "Some fields need fixing.");

  const res = await api<{ success: boolean; message: string; id?: string | number }>(`/admin/legal/policies/${type}/versions`, {
    method: "POST",
    body: { title: draft.title.trim(), content: draft.content, changeSummary: draft.changeSummary.trim() || null, requiresReacceptance: draft.requiresReacceptance },
  });
  if (!res.ok) return failed(res.error, "Only admins can publish policies.");
  await refreshPages("legal");
  const version = Number(res.data.id);
  return { ok: true, data: { message: res.data.message, version: Number.isInteger(version) ? version : null } };
}
