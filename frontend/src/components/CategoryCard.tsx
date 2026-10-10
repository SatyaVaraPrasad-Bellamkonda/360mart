import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/categories";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {category.image && (
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 270px, 50vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-110"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-base font-bold text-ink sm:text-lg">{category.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted sm:text-sm">{category.tagline}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-deep">
          Shop now <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
