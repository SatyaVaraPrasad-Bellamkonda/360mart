import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Acceptance, ConsentStatus, Policy, PolicyType, SupportContact } from "./types";

// One function per legal / consent endpoint. The /legal reads are public; the
// consents need the user's session; the admin calls need an admin session.

type Write = { success: boolean; message: string; id?: string };

// The public reads run inside "use cache" (shared by every visitor), where the
// visitor's headers can't be read: send none.
const NO_VISITOR = { incoming: new Headers() };

export const listPolicies = () => callApi<Policy[]>("/legal/policies", NO_VISITOR);
export const getPolicy = (type: PolicyType) => callApi<Policy>(`/legal/policies/${type}`, NO_VISITOR);
export const listVersions = (type: PolicyType) => callApi<Policy[]>(`/legal/policies/${type}/versions`, NO_VISITOR);
export const getVersion = (type: PolicyType, version: number) => callApi<Policy>(`/legal/policies/${type}/versions/${version}`, NO_VISITOR);
export const getContact = () => callApi<SupportContact>("/legal/contact", NO_VISITOR);

export const getConsents = (token: string) => callApi<ConsentStatus>("/users/me/consents", { sessionToken: token });
export const acceptPolicies = (token: string, policies: Acceptance[]) => callApi<Write>("/users/me/consents", { method: "POST", body: { policies }, sessionToken: token });

export const adminVersions = (token: string, type: PolicyType) => callApi<Policy[]>(`/admin/legal/policies/${type}/versions`, { sessionToken: token });
export const publishVersion = (token: string, type: PolicyType, body: { title: string; content: string; changeSummary: string | null; requiresReacceptance: boolean }) =>
  callApi<Write>(`/admin/legal/policies/${type}/versions`, { method: "POST", body, sessionToken: token });
