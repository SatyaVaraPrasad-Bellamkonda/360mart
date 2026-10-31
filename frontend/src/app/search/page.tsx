import { ChevronLeft, ChevronRight, PackageSearch, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import { RememberSearch } from "@/components/search/RememberSearch";
import { getShopCategoriesNow } from "@/lib/catalog/data";
import type { Category } from "@/lib/catalog/types";
import { categoryHref } from "@/lib/catalog/validation";
import * as api from "@/lib/home-page/service";
import { cleanQuery, MAX_QUERY, RESULTS_SIZE, searchHref } from "@/lib/search/query";

// Search results are endless and thin for Google: never indexed.
export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = cleanQuery((await searchParams).q);
  return { title: q ? `Search: ${q}` : "Search", robots: { index: false, follow: true } };
}

// /search?q=mango[&page=1]: products and categories matching the text. Live,
// never cached (the first page also counts towards trending searches).
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const q = cleanQuery(raw);
  const pageParam = typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Number(params.page) : 0;

  if (!q) {
    const categories = await getShopCategoriesNow();
    return (
      <>
        <SearchBox value={raw} />
        <div className="mt-10 text-center">
          <Search aria-hidden className="mx-auto size-10 text-brand-deep" />
          <h1 className="mt-3 text-xl font-extrabold text-ink">{raw.trim() ? "Type at least 2 letters" : "What are you looking for?"}</h1>
          <p className="mt-1 text-sm text-muted">Search products from stores near you, or start with a category.</p>
        </div>
        {categories.ok && <CategoryChips categories={categories.data} parents={categories.data} title="Browse categories" />}
      </>
    );
  }

  const [res, top] = await Promise.all([api.search(q, pageParam, RESULTS_SIZE, false), getShopCategoriesNow()]);
  const parents = top.ok ? top.data : [];
  if (!res.ok) {
    return (
      <>
        <SearchBox value={q} />
        <p role="alert" className="mt-8 rounded-2xl bg-surface px-5 py-6 text-sm text-muted ring-1 ring-line">
          {res.error.status === 400 ? res.error.fieldErrors.q || res.error.message : "Search isn't available right now. Please try again in a moment."}
        </p>
      </>
    );
  }

  const { products, categories } = res.data;
  const total = products.totalItems;
  if (total === 0 && categories.length === 0) {
    return (
      <>
        <RememberSearch q={q} />
        <SearchBox value={q} />
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <PackageSearch aria-hidden className="size-10 text-brand-deep" />
          <h1 className="mt-3 text-xl font-extrabold text-ink">No results for &ldquo;{q}&rdquo;</h1>
          <p className="mt-1 max-w-md text-sm text-muted">Check the spelling, or try a shorter or more general word. We note searches like this so stores know what shoppers are looking for.</p>
        </div>
        <CategoryChips categories={parents} parents={parents} title="Browse categories instead" />
      </>
    );
  }

  return (
    <>
      <RememberSearch q={q} />
      <SearchBox value={q} />
      <h1 className="mt-6 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        {total > 0 ? `${total.toLocaleString("en-IN")} ${total === 1 ? "result" : "results"}` : "Results"} for &ldquo;{q}&rdquo;
      </h1>
      {categories.length > 0 && <CategoryChips categories={categories} parents={parents} title="Matching categories" compact />}
      {products.items.length > 0 && (
        <section aria-label="Products" className="mt-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.items.map((p) => (
              <li key={p.productId}>
                <ShopProductCard product={p} href={`/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {products.totalPages > 1 && (
        <nav aria-label="Result pages" className="mt-8 flex items-center justify-center gap-3">
          {products.page > 0 ? (
            <Link href={pageHref(q, products.page - 1)} className="flex min-h-11 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </Link>
          ) : (
            <span className="w-24" />
          )}
          <span className="text-sm text-muted">
            Page {products.page + 1} of {products.totalPages}
          </span>
          {products.page + 1 < products.totalPages ? (
            <Link href={pageHref(q, products.page + 1)} className="flex min-h-11 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              Next
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <span className="w-24" />
          )}
        </nav>
      )}
    </>
  );
}

const pageHref = (q: string, page: number) => (page === 0 ? searchHref(q) : `${searchHref(q)}&page=${page}`);

// Works without JavaScript too (a plain GET form); with it, Next navigates without a full reload.
function SearchBox({ value }: { value: string }) {
  return (
    <Form action="/search" role="search" className="flex items-center gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/50">
      <Search aria-hidden className="ml-2.5 size-5 shrink-0 text-muted" />
      <input
        key={value}
        name="q"
        type="search"
        enterKeyHint="search"
        defaultValue={value}
        maxLength={MAX_QUERY}
        autoComplete="off"
        aria-label="Search products and categories"
        placeholder="Search fruits, milk, snacks…"
        className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
      />
      <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
        Search
      </button>
    </Form>
  );
}

function CategoryChips({ categories, parents, title, compact }: { categories: Category[]; parents: Category[]; title: string; compact?: boolean }) {
  if (!categories.length) return null;
  return (
    <section aria-label={title} className={compact ? "mt-4" : "mt-10"}>
      <h2 className={`mb-3 font-bold text-ink ${compact ? "text-sm text-muted" : "text-lg"}`}>{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.categoryId}>
            <Link href={categoryHref(c, parents)} className="flex min-h-11 items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink/40">
              <span className="size-9 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                <CategoryImage src={c.imageUrl} alt="" className="size-full" iconClassName="size-4" />
              </span>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      <div className="mt-6 h-7 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
