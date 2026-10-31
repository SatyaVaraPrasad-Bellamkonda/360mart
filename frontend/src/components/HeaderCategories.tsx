import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { categoryPicture } from "@/lib/categories";
import { getShopCategoriesNow } from "@/lib/catalog/data";
import { categoryPath } from "@/lib/catalog/validation";
import { CategoryImage } from "./catalog/CategoryImage";
import { CategoryMenu } from "./CategoryMenu";

// Header categories. Not the Featured ones: the list grows, so the desktop
// header has one "Categories" button opening every category (CategoryMenu),
// and the phone strip under the header scrolls through all of them. Order =
// the admin's display order; names only (badges show on the category cards).

async function all() {
  const loaded = await getShopCategoriesNow();
  return loaded.ok ? loaded.data : [];
}

export async function DesktopCategoryNav() {
  const items = await all();
  return <CategoryMenu categories={items.map((c) => ({ id: c.categoryId, name: c.name, href: categoryPath(c), image: categoryPicture(c) }))} />;
}

export async function PhoneCategoryStrip() {
  const items = await all();
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
  return <span aria-hidden className="block h-10 w-32 animate-pulse rounded-full bg-surface" />;
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
