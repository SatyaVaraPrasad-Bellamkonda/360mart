import Link from "next/link";
import { LIVE_CATEGORIES } from "@/lib/categories";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />
        <nav aria-label="Categories" className="hidden items-center gap-1 md:flex">
          {LIVE_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
