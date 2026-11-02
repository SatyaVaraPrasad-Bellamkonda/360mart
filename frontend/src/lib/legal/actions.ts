"use server";

import type { ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import { getPolicies } from "./data";
import * as api from "./service";
import { readAcceptances, REQUIRED_FOR, type ConsentPolicy } from "./types";

// The signed-in user's consent to the Terms, Privacy Policy and Seller
// Agreement. Asked for when a newer version needs accepting (the "We've
// updated our terms" dialog), at checkout and at store submit when the backend
// answers CONSENT_REQUIRED.

export type ConsentPrompt = {
  needsAcceptance: boolean;
  /** Policies that need accepting, with what changed (from the public list). */
  pending: (ConsentPolicy & { changeSummary: string | null; publishedAt: string | null })[];
};

/** What this user still has to accept. Two calls: their consents + the cached policy list. */
export async function loadConsentsAction(): Promise<ActionResult<ConsentPrompt>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const [status, policies] = await Promise.all([api.getConsents(token), getPolicies()]);
  if (!status.ok) return failWith(status.error);
  const summaries = new Map((policies.ok ? policies.data : []).map((p) => [p.policyType, p]));
  // Customers aren't asked about the Seller Agreement (it's only needed for a store application).
  const seller = (await getCurrentUser())?.role === "seller";
  const pending = status.data.policies
    .filter((p) => p.needsAcceptance && p.policyType !== "REFUND" && (seller || p.requiredFor.includes("CHECKOUT")))
    .map((p) => ({ ...p, changeSummary: summaries.get(p.policyType)?.changeSummary ?? null, publishedAt: summaries.get(p.policyType)?.publishedAt ?? null }));
  return ok({ needsAcceptance: pending.length > 0, pending });
}

/** Accept the versions the user was shown. POLICY_VERSION_OUTDATED = a newer one was just published. */
export async function acceptPoliciesAction(input: unknown): Promise<ActionResult<{ message: string }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const list = readAcceptances(input);
  if (!list) return invalid("Something went wrong. Please refresh the page and try again.");
  const res = await api.acceptPolicies(token, list);
  if (!res.ok) return failWith(res.error);
  return ok({ message: res.data.message });
}

/**
 * The versions a store application needs (Terms, Privacy, Seller Agreement),
 * for the submit step's checkbox. Only published policies are listed.
 */
export async function loadStoreConsentsAction(): Promise<ActionResult<ConsentPolicy[]>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.getConsents(token);
  if (!res.ok) return failWith(res.error);
  return ok(res.data.policies.filter((p) => REQUIRED_FOR.STORE_APPLICATION.includes(p.policyType)));
}
