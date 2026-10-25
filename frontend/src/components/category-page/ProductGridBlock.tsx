"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { toastError } from "@/components/Toaster";
import type { Product } from "@/lib/catalog/types";
import { loadMoreProductsAction } from "@/lib/category-page/actions";
import type { Page } from "@/lib/inventory/types";

// A subcategory's products: the first page comes with the page (server
// rendered, cached), "Show more" adds the next 24 (also cached on our server).
export function ProductGridBlock({ subcategoryId, first, basePath, showFilters, preview }: { subcategoryId: number; first: Page<Product>; basePath: string; showFilters: boolean; preview?: boolean }) {
  const [items, setItems] = useState(first.items);
  const [page, setPage] = useState(first.page);
  const [pending, startTransition] = useTransition();
  const total = first.totalItems;
  const more = items.length < total && page + 1 < first.totalPages;

  function showMore() {
    startTransition(async () => {
      const res = await loadMoreProductsAction(subcategoryId, page + 1);
      if (!res.ok) return toastError(res.error.message);
      // A product could move between pages while browsing: never list it twice.
      setItems((now) => [...now, ...res.data.items.filter((p) => !now.some((n) => n.productId === p.productId))]);
      setPage(res.data.page);
    });
  }

  return (
    <div className="space-y-6">
      <ProductGrid products={items} basePath={basePath} showFilters={showFilters} total={total} />
      {more && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted">
            Showing {items.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
          </p>
          <button
            type="button"
            onClick={showMore}
            disabled={pending || preview}
            className="flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink disabled:opacity-60"
          >
            <ChevronDown aria-hidden className="size-4" />
            {pending ? "Loading…" : "Show more products"}
          </button>
        </div>
      )}
    </div>
  );
}
