import Image from "next/image";
import Link from "next/link";
import type { Subcategory } from "@/lib/types";

// Photo tile for a product type (Mangoes, Apples…) with its name over the image.
export function SubcategoryTile({ subcategory, productCount }: { subcategory: Subcategory; productCount: number }) {
  return (
    <Link
      href={`/${subcategory.category}/${subcategory.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-surface ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Image
        src={subcategory.image}
        alt=""
        fill
        sizes="(min-width: 1024px) 190px, (min-width: 768px) 33vw, 50vw"
        className="object-cover transition duration-700 ease-out group-hover:scale-110"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-base font-bold text-white sm:text-lg">{subcategory.name}</p>
        <p className="text-xs text-white/85">
          {productCount} {productCount === 1 ? "product" : "products"}
        </p>
      </div>
    </Link>
  );
}
