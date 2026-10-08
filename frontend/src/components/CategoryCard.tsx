import Link from "next/link";
import type { Category } from "@/lib/categories";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <span
        aria-hidden
        className={`flex aspect-[4/3] items-center justify-center rounded-xl text-6xl ${category.tint}`}
      >
        {category.emoji}
      </span>
      <span className="mt-4 block text-lg font-bold text-ink">{category.name}</span>
      <span className="mt-1 block flex-1 text-sm text-muted">{category.tagline}</span>
      <span className="mt-3 text-sm font-semibold text-brand-deep group-hover:underline">
        Shop {category.name.toLowerCase()} →
      </span>
    </Link>
  );
}
