"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import { policyErrors, type PolicyDraft } from "./admin-validation";
import { LEGAL_TAG } from "./data";
import * as api from "./service";
import { isPolicyType } from "./types";

// Publish a new version of a policy. Versions are never edited: a fix is a
// new version. Checked here with the backend's rules, then by the backend,
// which also checks the caller is an admin.
export async function publishPolicyAction(type: unknown, input: unknown): Promise<ActionResult<{ message: string; version: number | null }>> {
  if (!isPolicyType(type)) return invalid("Choose a policy.");
  const token = await sessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return failWith(LOGIN_NEEDED);
  if (user.role !== "admin") return failWith({ code: "FORBIDDEN", message: "Only admins can publish policies.", fieldErrors: {} });

  const raw = (input ?? {}) as Partial<Record<keyof PolicyDraft, unknown>>;
  const draft: PolicyDraft = {
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    changeSummary: typeof raw.changeSummary === "string" ? raw.changeSummary : "",
    // The refund policy is only shown, never accepted.
    requiresReacceptance: type !== "REFUND" && raw.requiresReacceptance === true,
  };
  const errors = policyErrors(draft);
  if (Object.keys(errors).length) return invalid("Some fields need fixing.", errors as Record<string, string>);

  const res = await api.publishVersion(token, type, {
    title: draft.title.trim(),
    content: draft.content,
    changeSummary: draft.changeSummary.trim() || null,
    requiresReacceptance: draft.requiresReacceptance,
  });
  if (!res.ok) return failWith(res.error);
  // The public pages, footer and consent prompts read the cached list: show the new version at once.
  updateTag(LEGAL_TAG);
  revalidatePath("/admin/legal", "layout");
  const version = Number(res.data.id);
  return ok({ message: res.data.message, version: Number.isInteger(version) ? version : null });
}
