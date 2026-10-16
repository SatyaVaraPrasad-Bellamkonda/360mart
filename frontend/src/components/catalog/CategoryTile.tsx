import Link from "next/link";
import type { Category } from "@/lib/catalog/types";
import { CategoryImage } from "./CategoryImage";

// Picture tile for a subcategory on a category page, name over the picture
// (the same look as the Fruits page's type tiles).
export function CategoryTile({ category, href }: { category: Category; href: string }) {
  return (
    <Link
      href={href}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <CategoryImage src={category.imageUrl} alt="" className="absolute inset-0 size-full transition duration-700 ease-out group-hover:scale-110" iconClassName="size-12 -translate-y-6" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      {category.badgeLabel && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-brand-deep shadow-sm">{category.badgeLabel}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="break-words text-base font-bold text-white sm:text-lg">{category.name}</p>
      </div>
    </Link>
  );
}
