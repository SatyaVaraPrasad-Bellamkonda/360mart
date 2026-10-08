"use client";

import { useState } from "react";
import type { ProductSummary } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const SORTS = {
  popular: { label: "Popular", compare: () => 0 },
  "price-asc": { label: "Price: low to high", compare: (a: ProductSummary, b: ProductSummary) => price(a) - price(b) },
  "price-desc": { label: "Price: high to low", compare: (a: ProductSummary, b: ProductSummary) => price(b) - price(a) },
  name: { label: "Name", compare: (a: ProductSummary, b: ProductSummary) => a.name.localeCompare(b.name) },
} as const;

type SortKey = keyof typeof SORTS;

// Out-of-stock products sort last regardless of direction.
function price(p: ProductSummary) {
  return p.price ?? Number.MAX_SAFE_INTEGER;
}

// Sorting happens in the browser so the page URL stays the same; Google only
// ever sees one version of each listing page.
export function SortableProductGrid({ products }: { products: ProductSummary[] }) {
  const [sort, setSort] = useState<SortKey>("popular");
  const sorted = [...products].sort(
    (a, b) => Number(b.price !== null) - Number(a.price !== null) || SORTS[sort].compare(a, b),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium text-ink"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((product) => (
          <li key={product.slug} className="flex">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
