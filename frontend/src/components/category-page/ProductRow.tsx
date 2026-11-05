import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import type { ProductCard } from "@/lib/category-page/types";

// A swipeable row on phones, four across on large screens.
export function ProductRow({ items }: { items: ProductCard[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 xl:grid-cols-6">
      {items.map((p) => (
        <li key={p.productId} className="w-[40%] shrink-0 snap-start min-[420px]:w-[31%] sm:w-[23%] lg:w-auto">
          <ShopProductCard product={p} href={`/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`} />
        </li>
      ))}
    </ul>
  );
}

