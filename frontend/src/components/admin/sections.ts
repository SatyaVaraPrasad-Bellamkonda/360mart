import { ClipboardList, FileSpreadsheet, FolderTree, House, LifeBuoy, Megaphone, Package, Scale, Search, Store, UserRound, Users, Wallet, type LucideIcon } from "lucide-react";

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
  { href: "/admin/home", title: "Home page", text: "Design the home page: banner, times of day, product rows.", icon: House, tone: "bg-orange-100 text-orange-700", ready: true },
  { href: "/admin/campaigns", title: "Offers & notifications", text: "Send offers to shoppers' phones and inboxes, and see who opened them.", icon: Megaphone, tone: "bg-pink-100 text-pink-700", ready: true },
  { href: "/admin/search", title: "Search report", text: "What shoppers search for, and what they didn't find.", icon: Search, tone: "bg-cyan-100 text-cyan-700", ready: true },
  { href: "/admin/categories", title: "Categories", text: "Categories and subcategories shoppers browse.", icon: FolderTree, tone: "bg-amber-100 text-amber-700", ready: true },
  { href: "/admin/profile", title: "Your profile", text: "Your name, email and photo.", icon: UserRound, tone: "bg-sky-100 text-sky-700", ready: true },
  { href: "/admin/products", title: "Products", text: "Products in each subcategory, with their sizes.", icon: Package, tone: "bg-green-100 text-green-700", ready: true },
  { href: "/admin/products/sheet", title: "Bulk edit products", text: "Change or add many products and sizes at once in Excel.", icon: FileSpreadsheet, tone: "bg-lime-100 text-lime-700", ready: true },
  { href: "/admin/stores", title: "Stores", text: "Review store applications: documents, approval and live stores.", icon: Store, tone: "bg-violet-100 text-violet-700", ready: true },
  { href: "/admin/support", title: "Support queue", text: "Customer requests and complaints, with their 48-hour and 30-day deadlines.", icon: LifeBuoy, tone: "bg-red-100 text-red-700", ready: true },
  { href: "/admin/orders", title: "Orders", text: "Every order across stores; cancel when needed.", icon: ClipboardList, tone: "bg-rose-100 text-rose-700", ready: true },
  { href: "/admin/ledger", title: "Ledger", text: "What stores owe and settlements received.", icon: Wallet, tone: "bg-emerald-100 text-emerald-700", ready: true },
  { href: "/admin/legal", title: "Legal pages", text: "Terms, privacy, refund policy and seller agreement: publish new versions.", icon: Scale, tone: "bg-indigo-100 text-indigo-700", ready: true },
  { href: "/admin/customers", title: "Customers", text: "Look up customers and help with accounts.", icon: Users, tone: "bg-slate-200 text-slate-700", ready: false },
];
