import Link from "next/link";
import { categoryPicture } from "@/lib/categories";
import type { Category } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import { CategoryBadge } from "./catalog/CategoryBadge";
import { CategoryImage } from "./catalog/CategoryImage";

// Home page card for a category from the backend: picture (uploaded, else our
// photo for that slug, else a placeholder), the admin's badge and the name. The link goes to its designed page (app/fruits) or the shared one.
export function CategoryCard({ category, priority, href }: { category: Category; priority?: boolean; href?: string }) {
  return (
    <Link
      href={href ?? categoryPath(category)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <CategoryImage
          src={categoryPicture(category)}
          alt=""
          priority={priority}
          className="absolute inset-0 size-full transition duration-700 ease-out group-hover:scale-110"
          iconClassName="size-10"
        />
        {category.badgeLabel && <CategoryBadge label={category.badgeLabel} tone="onPhoto" className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] origin-top-left scale-90" />}
      </div>
      <div className="flex flex-1 items-center justify-center px-2 py-2.5">
        <h3 className="line-clamp-2 break-words text-center text-[13px] font-bold leading-5 text-ink sm:text-sm">{category.name}</h3>
      </div>
    </Link>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-square animate-pulse bg-line/60" />
      <div className="flex justify-center px-2 py-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-line/60" />
      </div>
    </div>
  );
}
