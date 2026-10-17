"use client";

import { Leaf, Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Product } from "@/lib/catalog/types";
import { FoodMark } from "./FoodMark";
import { ShopProductCard } from "./ShopProductCard";

type Filter = "all" | "season" | "veg" | "featured";
type Sort = "popular" | "az";

// The products of a subcategory with quick filters (only the ones that would
// change the list are offered) and a sort. Works on the list already on the
// page: no extra requests.
export function ProductGrid({ products, basePath }: { products: Product[]; basePath: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("popular");

  const count = (f: Filter) => products.filter(PICK[f]).length;
  const offered = (["season", "veg", "featured"] as const).filter((f) => {
    const n = count(f);
    return n > 0 && n < products.length;
  });
  const shown = products.filter(PICK[filter]);
  if (sort === "az") shown.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {offered.length > 0 ? (
          <div role="group" aria-label="Filter products" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>
              All <span className="tabular-nums opacity-70">{products.length}</span>
            </Chip>
            {offered.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {LABEL[f]} <span className="tabular-nums opacity-70">{count(f)}</span>
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-muted">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        )}
        {products.length > 1 && (
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <option value="popular">Popular first</option>
              <option value="az">Name, A to Z</option>
            </select>
          </label>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((product, i) => (
          <li key={product.productId} className="motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <ShopProductCard product={product} href={`${basePath}/${product.slug}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const PICK: Record<Filter, (p: Product) => boolean> = {
  all: () => true,
  season: (p) => p.isInSeason,
  veg: (p) => p.foodType === "VEG",
  featured: (p) => p.isFeatured,
};

const LABEL: Record<Exclude<Filter, "all">, ReactNode> = {
  season: (
    <>
      <Leaf aria-hidden className="size-4" /> In season
    </>
  ),
  veg: (
    <>
      <FoodMark type="VEG" decorative /> Veg only
    </>
  ),
  featured: (
    <>
      <Star aria-hidden className="size-4" /> Featured
    </>
  ),
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
    >
      {children}
    </button>
  );
}
