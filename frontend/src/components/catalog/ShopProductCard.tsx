import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";
import { foodTheme } from "@/lib/catalog/food-theme";
import type { Product } from "@/lib/catalog/types";
import { CategoryBadge } from "./CategoryBadge";
import { CategoryImage } from "./CategoryImage";
import { FoodMark } from "./FoodMark";

const SIZES_SHOWN = 3;

/** What a card needs: a full product, or a rail item from the category page API. */
export type CardProduct = Pick<Product, "name" | "imageUrl" | "badgeLabel" | "foodType" | "isInSeason" | "brand" | "shortDescription"> & {
  variants: { variantId: number; label: string; displayOrder?: number }[];
};

// A product from the backend as a card: picture, marks, name and its sizes.
// No prices (each store sets its own, by location), so the card never shows one.
export function ShopProductCard({ product, href, context, eager }: { product: CardProduct; href: string; context?: string; eager?: boolean }) {
  // Rail items come already in order; full products carry displayOrder.
  const sizes = product.variants.some((v) => v.displayOrder !== undefined) ? [...product.variants].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.variantId - b.variantId) : product.variants;
  return (
    <Link
      href={href}
      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 hover:ring-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <CategoryImage src={product.imageUrl} alt="" priority={eager} className="size-full transition duration-700 ease-out group-hover:scale-105" iconClassName="size-12" />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          {product.badgeLabel ? <CategoryBadge label={product.badgeLabel} tone="onPhoto" className="max-w-[75%]" /> : <span />}
          <FoodMark type={product.foodType} className="shadow-sm" />
        </div>
        {product.isInSeason && (
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold shadow-sm ${foodTheme(product.foodType).text}`}>
            <Leaf aria-hidden className="size-3" />
            In season
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {(product.brand || context) && <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">{product.brand ?? context}</p>}
        <h3 className="mt-0.5 line-clamp-2 break-words text-sm font-bold leading-5 text-ink sm:text-[15px]">{product.name}</h3>
        {product.shortDescription && <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted">{product.shortDescription}</p>}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {sizes.length > 0 ? (
            <ul aria-label="Sizes" className="flex min-w-0 flex-wrap gap-1">
              {sizes.slice(0, SIZES_SHOWN).map((v) => (
                <li key={v.variantId} className="max-w-full truncate rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-line">
                  {v.label}
                </li>
              ))}
              {sizes.length > SIZES_SHOWN && <li className="px-1 py-0.5 text-[11px] font-semibold text-muted">+{sizes.length - SIZES_SHOWN}</li>}
            </ul>
          ) : (
            <p className="text-xs font-semibold text-muted">Sizes coming soon</p>
          )}
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand-deep">
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
