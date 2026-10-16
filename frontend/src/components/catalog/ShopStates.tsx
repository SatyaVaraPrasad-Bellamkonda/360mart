import type { LucideIcon } from "lucide-react";
import Link from "next/link";

// Shared states of the category pages.

/** Honest empty state while a category has no products yet (no made-up items). */
export function ComingSoonProducts({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <section className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-deep ring-1 ring-line">
        <Icon aria-hidden className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      <Link href="/" className="mt-5 flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
        Browse other categories
      </Link>
    </section>
  );
}

export function CatalogUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-ink">This page couldn&apos;t load</h1>
      <p role="alert" className="mt-2 text-muted">
        {message}
      </p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-6 font-semibold text-white">
        Back to home
      </Link>
    </div>
  );
}

export function ShopPageSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:py-6">
      <div className="h-5 w-40 animate-pulse rounded bg-line/60" />
      <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-line/60" />
        ))}
      </div>
    </div>
  );
}
