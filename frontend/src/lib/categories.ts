export type Category = {
  slug: string;
  name: string;
  tagline: string;
  image: string | null; // e.g. "/images/categories/fruits.jpg"
  // Only live categories appear on the site, in navigation and in the sitemap.
  isLive: boolean;
};

export const CATEGORIES: Category[] = [
  { slug: "fruits", name: "Fruits", tagline: "Fresh seasonal fruits from local farms and stores", image: "/images/categories/fruits.jpg", isLive: true },
  { slug: "meat", name: "Meat & Fish", tagline: "Fresh chicken, mutton and fish, kept cold to your door", image: "/images/categories/meat-fish.jpg", isLive: true },
  { slug: "groceries", name: "Groceries", tagline: "Daily essentials, staples and kitchen needs", image: "/images/categories/groceries.jpg", isLive: true },
  { slug: "fashion", name: "Fashion", tagline: "Clothing and accessories from local boutiques", image: "/images/categories/fashion.jpg", isLive: true },
  { slug: "fabrics", name: "Fabrics", tagline: "Textiles and materials sold by the metre", image: null, isLive: false },
  { slug: "electricals", name: "Electricals", tagline: "Hardware and home appliances", image: null, isLive: false },
];

export const LIVE_CATEGORIES = CATEGORIES.filter((c) => c.isLive);
