import Link from "next/link";
import type { Subcategory } from "@/lib/types";

export function SubcategoryCard({ subcategory }: { subcategory: Subcategory }) {
  return (
    <Link
      href={`/${subcategory.category}/${subcategory.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-brand hover:shadow-md"
    >
      <span
        aria-hidden
        className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-3xl ${subcategory.tint}`}
      >
        {subcategory.emoji}
      </span>
      <span>
        <span className="block font-bold text-ink group-hover:underline">{subcategory.name}</span>
        <span className="block text-xs text-muted">{subcategory.shortDescription}</span>
      </span>
    </Link>
  );
}
