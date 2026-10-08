import Link from "next/link";
import { productPath } from "@/lib/paths";
import type { ProductSummary } from "@/lib/types";
import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: ProductSummary }) {
  const available = product.price !== null;

  return (
    <Link
      href={productPath(product)}
      className="group flex w-full flex-col rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <div className={available ? "" : "opacity-60 grayscale"}>
        <ProductImage name={product.name} emoji={product.emoji} image={product.image} tint={product.tint} />
      </div>
      <h3 className="mt-3 font-bold leading-snug text-ink group-hover:underline">{product.name}</h3>
      <p className="text-sm text-muted">{product.variantLabel}</p>
      <div className="mt-2 flex-1">
        <PriceTag price={product.price} mrp={product.mrp} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {available
          ? `${product.sellerCount} ${product.sellerCount === 1 ? "store" : "stores"} nearby`
          : "Out of stock"}
      </p>
    </Link>
  );
}
