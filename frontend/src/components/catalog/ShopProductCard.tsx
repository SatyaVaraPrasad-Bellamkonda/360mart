import { ArrowRight, Leaf } from "lucide-react";
import Link from "next/link";
import { foodTheme } from "@/lib/catalog/food-theme";
import type { Product } from "@/lib/catalog/types";
import { CategoryBadge } from "./CategoryBadge";
import { CategoryImage } from "./CategoryImage";
import { FoodMark } from "./FoodMark";

const SIZES_SHOWN = 2;

/** What a card needs: a full product, or a rail item from the category page API. */
export type CardProduct = Pick<Product, "name" | "imageUrl" | "badgeLabel" | "foodType" | "isInSeason" | "brand" | "shortDescription"> & {
  variants: { variantId: number; label: string; displayOrder?: number }[];
};

// A product from the backend as a compact card: picture, marks, name and its
// sizes (the description lives on the product page). No prices: each store sets
// its own, by location. `context` is kept for callers; the card no longer shows it.
export function ShopProductCard({ product, href, eager }: { product: CardProduct; href: string; context?: string; eager?: boolean }) {
  // Rail items come already in order; full products carry displayOrder.
  const sizes = product.variants.some((v) => v.displayOrder !== undefined) ? [...product.variants].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.variantId - b.variantId) : product.variants;
  return (
    <Link
      href={href}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/10 hover:ring-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <CategoryImage src={product.imageUrl} alt="" priority={eager} className="size-full transition duration-700 ease-out group-hover:scale-105" iconClassName="size-10" />
        <div className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-2">
          {product.badgeLabel ? <CategoryBadge label={product.badgeLabel} tone="onPhoto" className="max-w-[75%] scale-90 origin-top-left" /> : <span />}
          <FoodMark type={product.foodType} className="shadow-sm" />
        </div>
        {product.isInSeason && (
          <span className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[11px] font-bold shadow-sm ${foodTheme(product.foodType).text}`}>
            <Leaf aria-hidden className="size-3" />
            In season
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <h3 className="line-clamp-2 min-h-10 break-words text-[13px] font-bold leading-5 text-ink sm:text-sm">{product.name}</h3>

        <div className="mt-auto flex items-center justify-between gap-1.5 pt-2">
          {sizes.length > 0 ? (
            <ul aria-label="Sizes" className="flex min-w-0 flex-wrap gap-1">
              {sizes.slice(0, SIZES_SHOWN).map((v) => (
                <li key={v.variantId} className="max-w-full truncate rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-line">
                  {v.label}
                </li>
              ))}
              {sizes.length > SIZES_SHOWN && <li className="py-0.5 text-[11px] font-semibold text-muted">+{sizes.length - SIZES_SHOWN}</li>}
            </ul>
          ) : (
            <p className="text-[11px] font-semibold text-muted">Sizes soon</p>
          )}
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand-deep">
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
