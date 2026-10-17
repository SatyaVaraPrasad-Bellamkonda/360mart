import { ClipboardList, FolderTree, Package, Store, UserRound, Users, type LucideIcon } from "lucide-react";

export type AdminSection = {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  /** Complete Tailwind classes for the icon tile (never built from parts). */
  tone: string;
  ready: boolean;
};

// The admin panel's sections, shown as tiles on the dashboard (there is no side
// menu). A new section = one entry here + a folder in app/admin/(panel)/.
// ready: false = shown as "Coming soon", not a link.
export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin/categories", title: "Categories", text: "Categories and subcategories shoppers browse.", icon: FolderTree, tone: "bg-amber-100 text-amber-700", ready: true },
  { href: "/admin/profile", title: "Your profile", text: "Your name, email and photo.", icon: UserRound, tone: "bg-sky-100 text-sky-700", ready: true },
  { href: "/admin/products", title: "Products", text: "Products in each subcategory, with their sizes.", icon: Package, tone: "bg-green-100 text-green-700", ready: true },
  { href: "/admin/stores", title: "Stores", text: "Approve shopkeepers and manage storefronts.", icon: Store, tone: "bg-violet-100 text-violet-700", ready: false },
  { href: "/admin/orders", title: "Orders", text: "Orders across stores, refunds and payouts.", icon: ClipboardList, tone: "bg-rose-100 text-rose-700", ready: false },
  { href: "/admin/customers", title: "Customers", text: "Look up customers and help with accounts.", icon: Users, tone: "bg-slate-200 text-slate-700", ready: false },
];
