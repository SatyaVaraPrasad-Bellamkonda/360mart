// Shared by the proxy, server code and client forms (no secrets here).

import type { ApiRole } from "./api-types";

export type Role = "customer" | "seller" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  seller: "Shopkeeper",
  admin: "Admin",
};

// The backend's role names → ours.
export const ROLE_FROM_API: Record<ApiRole, Role> = {
  CUSTOMER: "customer",
  STORE_OWNER: "seller",
  ADMIN: "admin",
};

// Where each role logs in, and where they land afterwards. Customers and
// shopkeepers share one login: the backend knows each number's role.
export const ROLE_LOGIN: Record<Role, string> = {
  customer: "/login",
  seller: "/login",
  admin: "/admin/login",
};

export const ROLE_HOME: Record<Role, string> = {
  customer: "/account",
  seller: "/seller",
  admin: "/admin",
};

// Shopkeepers shop too: the shopping account (/account, later cart and orders)
// is open to both. Store pages stay shopkeeper-only, the panel admin-only.
export const SHOPPERS: Role[] = ["customer", "seller"];

// Protected areas and the login page for each (who may enter is checked by the page).
export const PROTECTED_AREAS: { prefix: string; role: Role }[] = [
  { prefix: "/account", role: "customer" },
  { prefix: "/seller", role: "seller" },
  { prefix: "/admin", role: "admin" },
];

// Same name as the backend's cookie, so it can be forwarded unchanged.
export const SESSION_COOKIE = "MART360_SESSION";

// Only allow redirecting back to a page this role may open, so a crafted
// ?next= link can't send someone to another site after login.
export function safeNextPath(next: unknown, role: Role): string {
  const home = ROLE_HOME[role];
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home;
  const inside = (prefix: string) => next === prefix || next.startsWith(`${prefix}/`);
  if (role === "admin") return inside("/admin") ? next : home;
  if (inside("/admin")) return home;
  // A shopkeeper may go back to any shopping page; a customer never into the store pages.
  return role === "customer" && inside("/seller") ? home : next;
}
