// Shared by the proxy, server code and client forms (no secrets here).

export type Role = "customer" | "seller" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  seller: "Shopkeeper",
  admin: "Admin",
};

// Where each role logs in, and where they land afterwards.
export const ROLE_LOGIN: Record<Role, string> = {
  customer: "/login",
  seller: "/seller/login",
  admin: "/admin/login",
};

export const ROLE_HOME: Record<Role, string> = {
  customer: "/account",
  seller: "/seller",
  admin: "/admin",
};

// Protected areas and the role allowed in each.
export const PROTECTED_AREAS: { prefix: string; role: Role }[] = [
  { prefix: "/account", role: "customer" },
  { prefix: "/seller", role: "seller" },
  { prefix: "/admin", role: "admin" },
];

export const SESSION_COOKIE = "360mart_session";

// Only allow redirecting back to a page inside the role's own area, so a
// crafted ?next= link can't send someone to another site after login.
export function safeNextPath(next: string | null | undefined, role: Role): string {
  const home = ROLE_HOME[role];
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home;
  if (role === "customer") return next.startsWith("/seller") || next.startsWith("/admin") ? home : next;
  return next === home || next.startsWith(`${home}/`) ? next : home;
}
