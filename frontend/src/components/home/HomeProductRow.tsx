import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import type { ProductCard } from "@/lib/category-page/types";
import { RowScroller } from "./RowScroller";

// A home page row of product cards: swipe on phones, arrows on computers.
export function HomeProductRow({ items, label }: { items: ProductCard[]; label: string }) {
  return (
    <RowScroller label={label}>
      {items.map((p) => (
        <li key={p.productId} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc((100%-3rem)/4)]">
          <ShopProductCard product={p} href={`/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`} />
        </li>
      ))}
    </RowScroller>
  );
}
