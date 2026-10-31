import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { categoryPicture } from "@/lib/categories";
import { getShopCategoriesNow } from "@/lib/catalog/data";
import { categoryPath } from "@/lib/catalog/validation";
import { CategoryImage } from "./catalog/CategoryImage";

// Header menu: the categories the admin marked Featured, in their display order
// (names only: badges show on the category cards). Everything else is one tap away under "All categories".
// Desktop shows up to DESKTOP_MAX in the bar; the phone strip scrolls, so it shows all.

const DESKTOP_MAX = 5;

async function featured() {
  const loaded = await getShopCategoriesNow();
  return loaded.ok ? loaded.data.filter((c) => c.isFeatured) : [];
}

export async function DesktopCategoryNav() {
  const items = (await featured()).slice(0, DESKTOP_MAX);
  return (
    <ul className="flex items-center gap-1">
      {items.map((category) => (
        <li key={category.categoryId}>
          <Link href={categoryPath(category)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface lg:px-4">
            <span className="max-w-40 truncate">{category.name}</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/categories" className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink lg:px-4">
          <LayoutGrid aria-hidden className="size-4" />
          All categories
        </Link>
      </li>
    </ul>
  );
}

export async function PhoneCategoryStrip() {
  const items = await featured();
  return (
    <ul className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
      {items.map((category) => (
        <li key={category.categoryId} className="shrink-0">
          <Link href={categoryPath(category)} className="flex min-h-10 items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-ink ring-1 ring-line">
            <CategoryImage src={categoryPicture(category)} alt="" className="size-8 shrink-0 rounded-full" iconClassName="size-4" />
            <span className="max-w-32 truncate">{category.name}</span>
          </Link>
        </li>
      ))}
      <li className="shrink-0">
        <Link href="/categories" className="flex min-h-10 items-center gap-2 rounded-full py-1 pl-2 pr-3.5 text-sm font-semibold text-ink ring-1 ring-line">
          <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white">
            <LayoutGrid aria-hidden className="size-4" />
          </span>
          All categories
        </Link>
      </li>
    </ul>
  );
}

export function DesktopCategoryNavFallback() {
  return (
    <div aria-hidden className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-8 w-20 animate-pulse rounded-full bg-surface" />
      ))}
    </div>
  );
}

export function PhoneCategoryStripFallback() {
  return (
    <div aria-hidden className="flex gap-2 overflow-hidden px-4 py-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-surface" />
      ))}
    </div>
  );
}
