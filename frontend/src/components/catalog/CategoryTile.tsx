import Link from "next/link";
import type { Category } from "@/lib/catalog/types";
import { CategoryImage } from "./CategoryImage";

// Picture tile for a subcategory on a category page, name over the picture
// (the same look as the Fruits page's type tiles).
export function CategoryTile({ category, href }: { category: Category; href: string }) {
  return (
    <Link
      href={href}
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-surface ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <CategoryImage src={category.imageUrl} alt="" className="absolute inset-0 size-full transition duration-700 ease-out group-hover:scale-110" iconClassName="size-10 -translate-y-4" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      {category.badgeLabel && (
        <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-brand-deep shadow-sm">{category.badgeLabel}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5">
        <p className="line-clamp-2 break-words text-[13px] font-bold leading-5 text-white sm:text-sm">{category.name}</p>
      </div>
    </Link>
  );
}
