// Legal pages and the user's consent: shapes of the backend's /legal and
// /users/me/consents answers. Safe for client and server code.

export const POLICY_TYPES = ["TERMS", "PRIVACY", "REFUND", "SELLER_AGREEMENT"] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];
export const isPolicyType = (v: unknown): v is PolicyType => typeof v === "string" && (POLICY_TYPES as readonly string[]).includes(v);

/** GET /legal/policies (no content), /legal/policies/{type} (with content), admin versions (with acceptances). */
export type Policy = {
  policyType: PolicyType;
  version: number;
  title: string;
  /** Markdown; null in lists. */
  content: string | null;
  changeSummary: string | null;
  requiresReacceptance: boolean;
  publishedAt: string;
  /** Admin list only: how many people accepted this version. */
  acceptances: number | null;
};

/** GET /legal/contact. Empty values are null: hide them. */
export type SupportContact = {
  supportEmail: string | null;
  supportPhone: string | null;
  supportHours: string | null;
  grievanceOfficer: { name: string | null; designation: string | null; email: string | null; phone: string | null };
  companyName: string | null;
  companyAddress: string | null;
  acknowledgeWithin: string;
  resolveWithin: string;
};

export type ConsentPurpose = "CHECKOUT" | "STORE_APPLICATION";

export type ConsentPolicy = {
  policyType: PolicyType;
  title: string;
  currentVersion: number;
  acceptedVersion: number | null;
  needsAcceptance: boolean;
  requiredFor: ConsentPurpose[];
};

/** GET /users/me/consents. */
export type ConsentStatus = { needsAcceptance: boolean; policies: ConsentPolicy[] };

export type Acceptance = { policyType: PolicyType; version: number };

/** Where each policy lives on the site, and its short name. */
export const POLICY_PAGES: Record<PolicyType, { path: string; name: string }> = {
  TERMS: { path: "/terms", name: "Terms of Use" },
  PRIVACY: { path: "/privacy", name: "Privacy Policy" },
  REFUND: { path: "/refund-policy", name: "Refund Policy" },
  SELLER_AGREEMENT: { path: "/seller-agreement", name: "Seller Agreement" },
};

/** Policies a purpose needs (same as the backend's ConsentRules). REFUND is never accepted. */
export const REQUIRED_FOR: Record<ConsentPurpose, PolicyType[]> = {
  CHECKOUT: ["TERMS", "PRIVACY"],
  STORE_APPLICATION: ["TERMS", "PRIVACY", "SELLER_AGREEMENT"],
};

/** A list of acceptances from the browser, checked: 1–4 policies, never REFUND, whole versions. */
export function readAcceptances(input: unknown): Acceptance[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 4) return null;
  const list: Acceptance[] = [];
  for (const item of input) {
    const type = (item as { policyType?: unknown })?.policyType;
    const version = (item as { version?: unknown })?.version;
    if (!isPolicyType(type) || type === "REFUND" || typeof version !== "number" || !Number.isInteger(version) || version < 1) return null;
    if (list.some((a) => a.policyType === type)) return null;
    list.push({ policyType: type, version });
  }
  return list;
}

/** "3" from a URL → 3; null when it isn't a version number. */
export function parseVersion(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return null;
  return Number(value);
}
