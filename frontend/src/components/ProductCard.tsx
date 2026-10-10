import { ArrowRight, Leaf, Store } from "lucide-react";
import Link from "next/link";
import { discountPercent, formatPrice } from "@/lib/format";
import { productPath } from "@/lib/paths";
import type { ProductSummary } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: ProductSummary }) {
  const available = product.price !== null && product.mrp !== null;
  const off = available ? discountPercent(product.price!, product.mrp!) : 0;

  return (
    <Link
      href={productPath(product)}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative">
        <ProductImage
          name={product.name}
          image={product.image}
          sizes="(min-width: 1024px) 270px, (min-width: 768px) 33vw, 50vw"
          className={`aspect-square ${available ? "" : "opacity-60 grayscale"}`}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {off > 0 && (
            <span className="rounded-md bg-fresh px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">{off}% OFF</span>
          )}
          {product.inSeason && available && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-fresh shadow-sm backdrop-blur">
              <Leaf aria-hidden className="size-3" /> In season
            </span>
          )}
        </div>
        {!available && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-1.5 text-center text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink sm:text-[15px]">{product.name}</h3>
        <p className="mt-0.5 text-xs text-muted">{product.variantLabel}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {available ? (
            <div>
              <p className="text-base font-extrabold leading-tight text-ink sm:text-lg">{formatPrice(product.price!)}</p>
              {off > 0 && <p className="text-xs text-muted line-through">{formatPrice(product.mrp!)}</p>}
            </div>
          ) : (
            <p className="text-sm font-semibold text-muted">Unavailable</p>
          )}
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition group-hover:bg-brand-deep"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>

        {available && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Store aria-hidden className="size-3.5" />
            {product.sellerCount} {product.sellerCount === 1 ? "store" : "stores"} nearby
          </p>
        )}
      </div>
    </Link>
  );
}
