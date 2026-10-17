import Link from "next/link";
import { Suspense } from "react";
import { getShopCategoriesNow } from "@/lib/catalog/data";
import { categoryPath } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";
import { Logo } from "./Logo";

const FOOTER_MAX = 8;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Your neighbourhood stores, online. Fresh products from trusted local sellers, delivered to your door.
          </p>
        </div>
        <nav aria-label="Footer" className="sm:justify-self-end">
          <h2 className="mb-3 text-sm font-bold text-ink">Shop</h2>
          <Suspense fallback={<ul aria-hidden className="space-y-2">{[0, 1, 2].map((i) => <li key={i} className="h-4 w-24 animate-pulse rounded bg-line/60" />)}</ul>}>
            <FooterCategories />
          </Suspense>
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {SITE.domain}. All rights reserved.
      </p>
    </footer>
  );
}

// The shop's categories from the backend (first FOOTER_MAX), then "All categories".
async function FooterCategories() {
  const loaded = await getShopCategoriesNow();
  const categories = loaded.ok ? loaded.data.slice(0, FOOTER_MAX) : [];
  return (
    <ul className="space-y-1 text-sm">
      {categories.map((category) => (
        <li key={category.categoryId}>
          <Link href={categoryPath(category)} className="-mx-1 inline-flex min-h-8 items-center px-1 text-muted hover:text-ink">
            {category.name}
          </Link>
        </li>
      ))}
      <li>
        <Link href="/categories" className="-mx-1 inline-flex min-h-8 items-center px-1 font-semibold text-ink hover:underline">
          All categories
        </Link>
      </li>
    </ul>
  );
}
