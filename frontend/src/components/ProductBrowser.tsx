"use client";

import { SearchX } from "lucide-react";
import { useState } from "react";
import type { ProductSummary } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const SORTS = {
  popular: { label: "Popular", compare: () => 0 },
  "price-asc": { label: "Price: low to high", compare: (a: ProductSummary, b: ProductSummary) => price(a) - price(b) },
  "price-desc": { label: "Price: high to low", compare: (a: ProductSummary, b: ProductSummary) => price(b) - price(a) },
  name: { label: "Name (A–Z)", compare: (a: ProductSummary, b: ProductSummary) => a.name.localeCompare(b.name) },
} as const;

type SortKey = keyof typeof SORTS;

function price(p: ProductSummary) {
  return p.price ?? Number.MAX_SAFE_INTEGER;
}

type Props = {
  products: ProductSummary[];
  // When given, shows "filter by type" chips (used on the category page).
  types?: { slug: string; name: string }[];
};

// Product listing with type filter, "in stock only" switch and sorting.
// Everything happens in the browser, so the page URL never changes and Google
// only ever sees one version of each listing page.
export function ProductBrowser({ products, types }: Props) {
  const [type, setType] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("popular");

  const visible = products
    .filter((p) => type === "all" || p.subcategory === type)
    .filter((p) => !inStockOnly || p.price !== null)
    // Out-of-stock products always go last.
    .sort((a, b) => Number(b.price !== null) - Number(a.price !== null) || SORTS[sort].compare(a, b));

  const countFor = (slug: string) => products.filter((p) => p.subcategory === slug).length;

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        {types && (
          <div
            role="group"
            aria-label="Filter by type"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {[{ slug: "all", name: "All" }, ...types].map((t) => (
              <button
                key={t.slug}
                type="button"
                aria-pressed={type === t.slug}
                onClick={() => setType(t.slug)}
                className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
              >
                {t.name}
                <span className="text-xs font-medium opacity-60">{t.slug === "all" ? products.length : countFor(t.slug)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-medium text-ink">
            <input
              type="checkbox"
              role="switch"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-10 shrink-0 rounded-full bg-line transition peer-checked:bg-fresh peer-focus-visible:ring-2 peer-focus-visible:ring-brand after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4"
            />
            In stock only
          </label>

          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted">
            <span className="hidden sm:inline">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink"
            >
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="py-3 text-sm text-muted" aria-live="polite">
        Showing {visible.length} of {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <li key={product.slug} className="flex">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <SearchX aria-hidden className="size-10 text-muted" />
          <p className="mt-3 font-semibold text-ink">No products match these filters</p>
          <button
            type="button"
            onClick={() => {
              setType("all");
              setInStockOnly(false);
            }}
            className="mt-3 min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-ink"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
