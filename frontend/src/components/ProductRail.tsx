import type { ProductSummary } from "@/lib/types";
import { ProductCard } from "./ProductCard";

// A row of products: swipeable on phones (shows part of the next card as a
// hint), a normal grid from tablet width up.
export function ProductRail({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug} className="flex w-[44%] shrink-0 snap-start sm:w-auto">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
