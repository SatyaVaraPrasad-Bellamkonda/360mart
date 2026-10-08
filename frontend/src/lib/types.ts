// Shapes of the data the frontend works with. The Spring Boot API should
// return JSON in exactly these shapes so lib/api.ts can switch to it unchanged.

export type Faq = { question: string; answer: string };

export type Subcategory = {
  slug: string; // "mangoes"
  category: string; // "fruits"
  name: string; // "Mangoes"
  emoji: string;
  tint: string; // Tailwind background class for placeholder tiles
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  intro: string[]; // paragraphs shown on the subcategory page
  faqs: Faq[];
  sortOrder: number;
};

export type Store = {
  slug: string;
  name: string;
  area: string;
  city: string;
};

// One store's price for one variant of a product.
export type Offer = {
  storeSlug: string;
  price: number;
  mrp: number;
  inStock: boolean;
};

// A purchasable size of a product, e.g. "1 kg" or "6 pcs".
export type Variant = {
  id: string;
  label: string;
  offers: Offer[];
};

export type Product = {
  slug: string;
  category: string;
  subcategory: string;
  name: string;
  emoji: string;
  image: string | null; // path under /public, null until real photos exist
  shortDescription: string;
  description: string;
  origin: string;
  bestSeason: string;
  storageTip: string;
  inSeason: boolean;
  variants: Variant[];
};

// What listing pages need: the product plus its cheapest in-stock price.
export type ProductSummary = Pick<
  Product,
  "slug" | "category" | "subcategory" | "name" | "emoji" | "image" | "shortDescription" | "inSeason"
> & {
  variantLabel: string;
  price: number | null; // null when no store has it in stock
  mrp: number | null;
  sellerCount: number;
  tint: string;
};

export type OfferWithStore = Offer & { store: Store };

export type ProductDetail = Omit<Product, "variants"> & {
  tint: string;
  variants: (Omit<Variant, "offers"> & { offers: OfferWithStore[] })[];
};
