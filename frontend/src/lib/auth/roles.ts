// Shared by the proxy, server code and client forms (no secrets here).

import type { ApiRole } from "./api-types";

export type Role = "customer" | "seller" | "admin" | "rider";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  seller: "Shopkeeper",
  admin: "Admin",
  rider: "Delivery partner",
};

// The backend's role names → ours.
export const ROLE_FROM_API: Record<ApiRole, Role> = {
  CUSTOMER: "customer",
  STORE_OWNER: "seller",
  ADMIN: "admin",
  DELIVERY_PARTNER: "rider",
};

// Where each role logs in, and where they land afterwards. Customers and
// shopkeepers share one login: the backend knows each number's role.
export const ROLE_LOGIN: Record<Role, string> = {
  customer: "/login",
  seller: "/login",
  admin: "/admin/login",
  rider: "/login",
};

export const ROLE_HOME: Record<Role, string> = {
  customer: "/account",
  seller: "/seller",
  admin: "/admin",
  rider: "/rider",
};

// Shopkeepers and delivery partners shop too: the shopping account (/account,
// cart, orders) is open to them. Store pages stay shopkeeper-only, rider pages
// rider-only, the panel admin-only.
export const SHOPPERS: Role[] = ["customer", "seller", "rider"];

// Protected areas and the login page for each (who may enter is checked by the page).
export const PROTECTED_AREAS: { prefix: string; role: Role }[] = [
  { prefix: "/account", role: "customer" },
  { prefix: "/seller", role: "seller" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/rider", role: "rider" },
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
  // Anyone may go back to a shopping page; only shopkeepers into the store pages, only riders into the rider pages.
  if (inside("/seller") && role !== "seller") return home;
  if (inside("/rider") && role !== "rider") return home;
  return next;
}
