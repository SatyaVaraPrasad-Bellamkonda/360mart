// Builders for schema.org structured data (rendered with <JsonLd />).

import { productPath } from "./paths";
import { SITE } from "./site";
import type { ProductDetail, ProductSummary } from "./types";

// A listing page's products, so Google understands the page is a collection.
export function itemListJsonLd(name: string, products: ProductSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE.url}${productPath(p)}`,
      name: p.name,
    })),
  };
}

// One product sold by several stores: an AggregateOffer over the in-stock
// prices of its default size, which Google can show as "₹179 – ₹189".
export function productJsonLd(product: ProductDetail) {
  const [variant] = product.variants;
  const inStock = variant.offers.filter((o) => o.inStock);
  const prices = (inStock.length ? inStock : variant.offers).map((o) => o.price);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} (${variant.label})`,
    description: product.description,
    category: "Fruits",
    url: `${SITE.url}${productPath(product)}`,
    ...(product.image && { image: `${SITE.url}${product.image}` }),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: inStock.length,
      availability: inStock.length ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}
