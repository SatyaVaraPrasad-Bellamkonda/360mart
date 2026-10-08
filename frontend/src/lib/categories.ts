export type Category = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  // Background for the category's icon tile (full class name so Tailwind keeps it).
  tint: string;
  // Only live categories appear on the site, in navigation and in the sitemap.
  isLive: boolean;
};

export const CATEGORIES: Category[] = [
  { slug: "fruits", name: "Fruits", tagline: "Fresh seasonal fruits from local farms and stores", emoji: "🍎", tint: "bg-green-50", isLive: true },
  { slug: "meat", name: "Meat & Fish", tagline: "Fresh chicken, mutton and fish, kept cold to your door", emoji: "🐟", tint: "bg-rose-50", isLive: true },
  { slug: "groceries", name: "Groceries", tagline: "Daily essentials, staples and kitchen needs", emoji: "🛒", tint: "bg-amber-50", isLive: true },
  { slug: "fashion", name: "Fashion", tagline: "Clothing and accessories from local boutiques", emoji: "👗", tint: "bg-violet-50", isLive: true },
  { slug: "fabrics", name: "Fabrics", tagline: "Textiles and materials sold by the metre", emoji: "🧵", tint: "bg-sky-50", isLive: false },
  { slug: "electricals", name: "Electricals", tagline: "Hardware and home appliances", emoji: "💡", tint: "bg-yellow-50", isLive: false },
];

export const LIVE_CATEGORIES = CATEGORIES.filter((c) => c.isLive);
