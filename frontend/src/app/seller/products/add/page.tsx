import { Check, PackageSearch, Search, X } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { FoodMark } from "@/components/catalog/FoodMark";
import { AddSizeButton } from "@/components/inventory/AddSizeButton";
import { CatalogFilter } from "@/components/inventory/CatalogFilter";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { Pager, SellerHeader } from "@/components/inventory/SellerHeader";
import { requireRole } from "@/lib/auth/dal";
import { getShopCategories, getShopSubcategories } from "@/lib/catalog/data";
import { loadCatalog, pageFromParam } from "@/lib/inventory/data";
import type { CatalogProduct } from "@/lib/inventory/types";

export const metadata: Metadata = { title: "Add products", robots: { index: false, follow: false } };

// /seller/products/add?q=&category=&sub=&page=: the 360mart catalogue to pick from.
// One backend call (API 1); the category lists come from the shop's cache.
export default function AddProductsPage({ searchParams }: PageProps<"/seller/products/add">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader title="Add products" subtitle="Pick from the 360mart catalogue, then set your price and stock for each size." crumbs={[{ name: "Products", href: "/seller/products" }]} />
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

const idOf = (v: unknown) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
};

function url(q: string, category: number, sub: number, page = 0) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (category) p.set("category", String(category));
  if (sub) p.set("sub", String(sub));
  if (page > 0) p.set("page", String(page + 1));
  const s = p.toString();
  return `/seller/products/add${s ? `?${s}` : ""}`;
}

async function Catalog({ searchParams }: Pick<PageProps<"/seller/products/add">, "searchParams">) {
  await requireRole("seller");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const category = idOf(params.category);
  const sub = category ? idOf(params.sub) : 0;
  const page = pageFromParam(params.page);

  const [catalog, categories, subcategories] = await Promise.all([
    loadCatalog(q, sub || undefined, page, url(q, category, sub, page)),
    getShopCategories(),
    category ? getShopSubcategories(category) : Promise.resolve({ ok: true as const, data: [] }),
  ]);
  const place = (c: { categoryId: number; name: string }) => ({ categoryId: c.categoryId, name: c.name });

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-5">
        <Form action="/seller/products/add" className="relative" role="search">
          {category > 0 && <input type="hidden" name="category" value={category} />}
          {sub > 0 && <input type="hidden" name="sub" value={sub} />}
          <label htmlFor="catalog-search" className="sr-only">
            Search the catalogue
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="catalog-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search products, e.g. mango, toor dal"
            maxLength={100}
            className="min-h-12 w-full rounded-full bg-surface pl-11 pr-10 text-base text-ink outline-none ring-1 ring-line placeholder:text-muted/70 focus:bg-white focus:ring-2 focus:ring-brand/40"
          />
          {q && (
            <Link href={url("", category, sub)} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink">
              <X aria-hidden className="size-4" />
            </Link>
          )}
        </Form>
        <CatalogFilter
          // Fresh lists when the URL's category changes.
          key={category}
          categories={categories.ok ? categories.data.map(place) : []}
          categoryId={category}
          subcategories={subcategories.ok ? subcategories.data.map(place) : []}
          subId={sub}
          q={q}
        />
        {category > 0 && !sub && <p className="text-sm text-muted">Pick a subcategory to see its products.</p>}
      </section>

      {!catalog.ok ? (
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {catalog.error.message}
        </p>
      ) : catalog.data.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
            <PackageSearch aria-hidden className="size-8" />
          </span>
          <p className="mt-4 text-lg font-bold text-ink">{q ? `Nothing matches "${q}"` : "No products here yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Try another name or category. Missing something you sell? Product requests are coming soon.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{catalog.data.totalItems.toLocaleString("en-IN")} products</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {catalog.data.items.map((p, i) => (
              <ProductCard key={p.productId} product={p} delay={i} />
            ))}
          </ul>
          <Pager page={catalog.data.page} totalPages={catalog.data.totalPages} href={(n) => url(q, category, sub, n)} />
        </>
      )}
    </div>
  );
}

function ProductCard({ product: p, delay }: { product: CatalogProduct; delay: number }) {
  const listed = p.variants.filter((v) => v.listingId).length;
  return (
    <li className="flex flex-col rounded-3xl bg-white p-4 ring-1 ring-line motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(delay, 10) * 30}ms` }}>
      <div className="flex items-start gap-3">
        <ProductThumb src={p.imageUrl} name={p.name} className="size-16 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-1.5 font-bold text-ink">
            {p.foodType && <FoodMark type={p.foodType} className="mt-1" />}
            <span className="min-w-0 break-words">{p.name}</span>
          </p>
          {p.brand && <p className="truncate text-sm text-muted">{p.brand}</p>}
          {listed > 0 && <p className="mt-1 text-xs font-semibold text-green-700">You sell {listed === p.variants.length ? "every size" : `${listed} of ${p.variants.length} sizes`}</p>}
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface/60 ring-1 ring-line">
        {p.variants.map((v) => (
          <li key={v.variantId} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-semibold text-ink">{v.label}</span>
            {v.listingId ? (
              <Link href={`/seller/products/${v.listingId}`} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-green-700 hover:bg-green-50">
                <Check aria-hidden className="size-4" />
                Listed · Edit
              </Link>
            ) : (
              <AddSizeButton variantId={v.variantId} productName={p.name} sizeLabel={v.label} imageUrl={p.imageUrl} />
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}
