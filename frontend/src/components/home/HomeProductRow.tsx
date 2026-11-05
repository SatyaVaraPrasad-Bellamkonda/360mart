import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import type { ProductCard } from "@/lib/category-page/types";
import { RowScroller } from "./RowScroller";

// A home page row of product cards: swipe on phones, arrows on computers.
export function HomeProductRow({ items, label }: { items: ProductCard[]; label: string }) {
  return (
    <RowScroller label={label}>
      {items.map((p) => (
        <li key={p.productId} className="w-[40%] shrink-0 snap-start min-[420px]:w-[31%] sm:w-[23%] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]">
          <ShopProductCard product={p} href={`/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`} />
        </li>
      ))}
    </RowScroller>
  );
}
