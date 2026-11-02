import type { PolicyType } from "./types";

// The admin Legal page's ?type= values (lowercase in the address bar).
const TAB_OF: Record<string, PolicyType> = { terms: "TERMS", privacy: "PRIVACY", refund: "REFUND", "seller-agreement": "SELLER_AGREEMENT" };

export const policyFromTab = (v: unknown): PolicyType => (typeof v === "string" && TAB_OF[v]) || "TERMS";
export const tabOf = (t: PolicyType) => Object.entries(TAB_OF).find(([, v]) => v === t)?.[0] ?? "terms";
export const legalTabHref = (t: PolicyType) => (t === "TERMS" ? "/admin/legal" : `/admin/legal?type=${tabOf(t)}`);
