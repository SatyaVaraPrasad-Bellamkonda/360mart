import { ChevronRight, PackagePlus, PackageSearch, Search, X } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ListingBadges, PriceBlock, ProductThumb, StockPill } from "@/components/inventory/ListingParts";
import { Pager, SellerHeader } from "@/components/inventory/SellerHeader";
import { requireRole } from "@/lib/auth/dal";
import { loadListings, pageFromParam } from "@/lib/inventory/data";
import { LISTING_TABS, type Listing, type ListingTab } from "@/lib/inventory/types";

export const metadata: Metadata = { title: "Products & prices", robots: { index: false, follow: false } };

const ADD_BUTTON = "flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/85";

// /seller/products?tab=low&q=mango&page=2: one backend call (API 3), filters in the URL.
export default function SellerProductsPage({ searchParams }: PageProps<"/seller/products">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader
          title="Products & prices"
          subtitle="What you sell, at what price, and how many you have."
          action={
            <Link href="/seller/products/add" className={ADD_BUTTON}>
              <PackagePlus aria-hidden className="size-4" />
              Add products
            </Link>
          }
        />
        <Suspense fallback={<ListSkeleton />}>
          <Products searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function tabOf(value: unknown): ListingTab {
  return LISTING_TABS.some((t) => t.id === value) ? (value as ListingTab) : "all";
}

function url(tab: ListingTab, q: string, page = 0) {
  const p = new URLSearchParams();
  if (tab !== "all") p.set("tab", tab);
  if (q) p.set("q", q);
  if (page > 0) p.set("page", String(page + 1));
  const s = p.toString();
  return `/seller/products${s ? `?${s}` : ""}`;
}

async function Products({ searchParams }: Pick<PageProps<"/seller/products">, "searchParams">) {
  await requireRole("seller");
  const params = await searchParams;
  const tab = tabOf(params.tab);
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = pageFromParam(params.page);
  const res = await loadListings(tab, q, page, url(tab, q, page));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter products" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1 rounded-full bg-white p-1 ring-1 ring-line">
            {LISTING_TABS.map((t) => (
              <li key={t.id}>
                <Link
                  href={url(t.id, q)}
                  aria-current={t.id === tab ? "page" : undefined}
                  className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition ${t.id === tab ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* A GET form: the search goes into the URL (?q=), so it survives reloads and the back button. */}
        <Form action="/seller/products" className="relative sm:w-80" role="search">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="product-search" className="sr-only">
            Search your products
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id="product-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search name or size"
            maxLength={100}
            className="min-h-11 w-full rounded-full bg-white pl-11 pr-10 text-base text-ink outline-none ring-1 ring-line placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40"
          />
          {q && (
            <Link href={url(tab, "")} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink">
              <X aria-hidden className="size-4" />
            </Link>
          )}
        </Form>
      </div>

      {!res.ok ? (
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {res.error.message}
        </p>
      ) : res.data.items.length === 0 ? (
        <Empty tab={tab} q={q} />
      ) : (
        <>
          <p className="text-sm text-muted">
            {res.data.totalItems.toLocaleString("en-IN")} {res.data.totalItems === 1 ? "product" : "products"}
            {q && ` matching "${q}"`}
          </p>
          <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            {res.data.items.map((l, i) => (
              <Row key={l.listingId} listing={l} delay={i} />
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => url(tab, q, p)} />
        </>
      )}
    </div>
  );
}

function Row({ listing: l, delay }: { listing: Listing; delay: number }) {
  return (
    <li className="border-b border-line last:border-b-0 motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(delay, 10) * 30}ms` }}>
      <Link href={`/seller/products/${l.listingId}`} className="flex items-center gap-3 p-3 transition hover:bg-surface sm:gap-4 sm:p-4">
        <ProductThumb src={l.productImageUrl} name={l.productName} className={`size-14 rounded-2xl sm:size-16 ${l.isAvailable ? "" : "opacity-60 grayscale"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{l.productName}</p>
          <p className="text-sm text-muted">
            {l.variantLabel}
            {l.storeSku && <span className="ml-2 text-xs">· {l.storeSku}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
            <PriceBlock price={l.price} mrp={l.mrp} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StockPill listing={l} />
            <ListingBadges listing={l} />
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <PriceBlock price={l.price} mrp={l.mrp} />
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function Empty({ tab, q }: { tab: ListingTab; q: string }) {
  const text = q
    ? { title: `Nothing matches "${q}"`, body: "Try another name or size." }
    : tab === "low"
      ? { title: "Nothing is running low", body: "Items at or below their low-stock alert show up here." }
      : tab === "hidden"
        ? { title: "No hidden products", body: "Products you stop selling show up here, ready to switch back on." }
        : { title: "No products yet", body: "Pick products from the 360mart catalogue, set your price and stock, and they're ready to sell." };
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
        <PackageSearch aria-hidden className="size-8" />
      </span>
      <p className="mt-4 text-lg font-bold text-ink">{text.title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text.body}</p>
      {tab === "all" && !q && (
        <Link href="/seller/products/add" className={`mt-5 ${ADD_BUTTON}`}>
          <PackagePlus aria-hidden className="size-4" />
          Add products
        </Link>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-11 w-full animate-pulse rounded-full bg-line/60 sm:w-96" />
      <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
