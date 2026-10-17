"use client";

import { AlertTriangle, ExternalLink, Info, Leaf, Package, Pencil, Plus, Search, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { FoodMark } from "@/components/catalog/FoodMark";
import { productsUrl } from "./picker-place";
import { SubcategoryPicker, type PickerStart } from "./SubcategoryPicker";
import { shopProductPath, sortVariants } from "@/lib/catalog/product-validation";
import type { Category, Product } from "@/lib/catalog/types";

const SAVED_TEXT = { updated: "Product saved." } as const;
const NOTICE_MS = 6000;

// The products admin: pick a subcategory (a searchable picker, so it stays one
// line however big the catalogue gets), then see, search and open its products.
type Selected = { category: Category; subcategory: Category };

export function ProductList({ start, selected, products, saved }: { start: PickerStart; selected: Selected | null; products: Product[]; saved: keyof typeof SAVED_TEXT | null }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(saved && SAVED_TEXT[saved]);
  // Another category picked, its subcategory not yet: the list waits for it.
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Drop ?saved= so a reload doesn't repeat the message.
  const listUrl = selected ? productsUrl(selected.category.categoryId, selected.subcategory.categoryId) : "/admin/products";
  useEffect(() => {
    if (saved) router.replace(listUrl, { scroll: false });
  }, [saved, router, listUrl]);

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="empty:hidden">
        {notice && <FormMessage notice={notice} />}
      </div>

      <div className="rounded-3xl bg-white p-3 ring-1 ring-line sm:p-4 lg:max-w-3xl">
        <SubcategoryPicker
          start={start}
          value={pendingCategory ? 0 : (selected?.subcategory.categoryId ?? 0)}
          onCategoryChange={(c) => setPendingCategory(c.categoryId === selected?.category.categoryId ? null : c.name)}
          onChange={(choice) => {
            if (!choice) return;
            if (choice.subcategory.categoryId === selected?.subcategory.categoryId) return setPendingCategory(null);
            router.push(productsUrl(choice.category.categoryId, choice.subcategory.categoryId), { scroll: false });
          }}
        />
      </div>

      {pendingCategory || !selected ? (
        <p className="rounded-3xl border border-dashed border-line bg-white px-5 py-10 text-center text-sm text-muted">
          {pendingCategory ? (
            <>
              Choose a subcategory of <span className="font-semibold text-ink">{pendingCategory}</span> to see its products.
            </>
          ) : (
            "Choose a category, then a subcategory, to see its products."
          )}
        </p>
      ) : (
        <Products selected={selected} products={products} />
      )}

      <p className="flex gap-2 px-1 text-sm text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Only products shown in the shop are listed. A hidden product drops out of this list until the backend can list hidden ones.
      </p>
    </div>
  );
}

function Products({ selected: { category, subcategory }, products }: { selected: Selected; products: Product[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q ? products.filter((p) => [p.name, p.slug, p.brand ?? ""].some((t) => t.toLowerCase().includes(q))) : products;
  const noSizes = products.filter((p) => p.variants.length === 0).length;

  return (
    <>
      {/* The chosen subcategory's products */}
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-extrabold text-ink">
              {subcategory.name} <span className="font-semibold text-muted">in {category.name}</span>
            </h2>
            <p className="text-sm text-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
              {noSizes > 0 && <span className="font-semibold text-brand-deep"> · {noSizes} without sizes</span>}
            </p>
          </div>
          {products.length > 3 && (
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/50 sm:w-64">
              <Search aria-hidden className="size-5 shrink-0 text-muted" />
              <span className="sr-only">Search products</span>
              <input type="search" name="filter" autoComplete="off" placeholder="Search name or brand" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-11 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted/70" />
            </label>
          )}
          <Link href={`/admin/products/new?category=${category.categoryId}&sub=${subcategory.categoryId}`} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            <Plus aria-hidden className="size-4" />
            Add to {subcategory.name}
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <Package aria-hidden className="size-8" />
            </span>
            <p className="mt-4 text-lg font-bold text-ink">No products in {subcategory.name} yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Add the first one, then the sizes it&apos;s sold in. It shows on the shop page right away.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Nothing matches &quot;{query.trim()}&quot;.</p>
        ) : (
          <ul aria-label={`Products in ${subcategory.name}`} className="divide-y divide-line">
            {shown.map((p) => (
              <ProductRow key={p.productId} product={p} href={`/admin/products/${p.productId}?category=${category.categoryId}&sub=${subcategory.categoryId}`} shopHref={shopProductPath(category, subcategory, p)} />
            ))}
          </ul>
        )}
      </div>

    </>
  );
}

function ProductRow({ product: p, href, shopHref }: { product: Product; href: string; shopHref: string }) {
  const sizes = sortVariants(p.variants);
  return (
    <li className="flex items-start gap-3 p-3 transition hover:bg-surface/60 sm:items-center sm:p-4">
      <div className="relative shrink-0">
        <CategoryImage src={p.imageUrl} alt="" className="size-16 rounded-2xl ring-1 ring-line sm:size-20" iconClassName="size-6" />
        {p.foodType && <FoodMark type={p.foodType} className="absolute -right-1 -top-1 shadow-sm" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-bold text-ink">{p.name}</p>
        {p.brand && <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{p.brand}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {sizes.length ? (
            sizes.map((v) => (
              <span key={v.variantId} className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
                {v.label}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle aria-hidden className="size-3" />
              No sizes yet
            </span>
          )}
          {p.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              <Star aria-hidden className="size-3" />
              Featured
            </span>
          )}
          {p.isInSeason && (
            <span className="inline-flex items-center gap-1 rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">
              <Leaf aria-hidden className="size-3" />
              In season
            </span>
          )}
          {p.badgeLabel && <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">{p.badgeLabel}</span>}
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">Order {p.displayOrder}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Link href={href} className={ICON_BUTTON} title={`Edit ${p.name}`}>
          <Pencil aria-hidden className="size-4" />
          <span className="hidden md:inline">Edit</span>
          <span className="sr-only md:hidden">Edit {p.name}</span>
        </Link>
        <a href={shopHref} target="_blank" rel="noopener" className={ICON_BUTTON} title={`View ${p.name} in the shop`}>
          <ExternalLink aria-hidden className="size-4" />
          <span className="hidden md:inline">View</span>
          <span className="sr-only md:hidden">View {p.name} in the shop</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </li>
  );
}

const ICON_BUTTON = "flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink md:px-3.5";
