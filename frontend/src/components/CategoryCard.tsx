import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { categoryPicture } from "@/lib/categories";
import type { Category } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import { CategoryBadge } from "./catalog/CategoryBadge";
import { CategoryImage } from "./catalog/CategoryImage";

// Home page card for a top-level category from the backend: picture (uploaded,
// else our photo for that slug, else a placeholder), the admin's badge, name and
// description. The link goes to its designed page (app/fruits) or the shared one.
export function CategoryCard({ category, priority }: { category: Category; priority?: boolean }) {
  return (
    <Link
      href={categoryPath(category)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <CategoryImage
          src={categoryPicture(category)}
          alt=""
          priority={priority}
          className="absolute inset-0 size-full transition duration-700 ease-out group-hover:scale-110"
          iconClassName="size-12"
        />
        {category.badgeLabel && <CategoryBadge label={category.badgeLabel} tone="onPhoto" className="absolute left-2.5 top-2.5 max-w-[calc(100%-1.25rem)]" />}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="break-words text-base font-bold text-ink sm:text-lg">{category.name}</h3>
        {category.description && <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted sm:text-sm">{category.description}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-brand-deep">
          Shop now <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[4/3] animate-pulse bg-line/60" />
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-line/60" />
        <div className="h-4 w-full animate-pulse rounded bg-line/40" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-line/40" />
      </div>
    </div>
  );
}
