import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LIVE_CATEGORIES } from "@/lib/categories";
import { AccountLink, AccountLinkFallback } from "./auth/AccountLink";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />
        <nav aria-label="Categories" className="ml-auto hidden items-center gap-1 md:flex">
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
        <Suspense fallback={<AccountLinkFallback />}>
          <AccountLink />
        </Suspense>
      </div>

      {/* Phones: the menu above is hidden, so show categories as a swipeable row */}
      <nav aria-label="Categories" className="border-t border-line md:hidden">
        <ul className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {LIVE_CATEGORIES.map((category) => (
            <li key={category.slug} className="shrink-0">
              <Link
                href={`/${category.slug}`}
                className="flex min-h-10 items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3.5 text-sm font-semibold text-ink ring-1 ring-line"
              >
                {category.image && (
                  <span className="relative size-8 overflow-hidden rounded-full">
                    <Image src={category.image} alt="" fill sizes="32px" className="object-cover" />
                  </span>
                )}
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
