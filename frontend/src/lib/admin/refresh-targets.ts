// What an admin change can leave stale (see refresh-action.ts).
export const ADMIN_REFRESH = ["categories", "products", "categoryPage", "home", "campaigns", "legal", "orders", "ledger", "support", "stores"] as const;
export type AdminRefresh = (typeof ADMIN_REFRESH)[number];
