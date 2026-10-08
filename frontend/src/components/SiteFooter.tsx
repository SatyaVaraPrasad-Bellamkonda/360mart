import Link from "next/link";
import { LIVE_CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Your neighbourhood stores, online. Fresh products from trusted local sellers, delivered to your door.
          </p>
        </div>
        <nav aria-label="Footer" className="sm:justify-self-end">
          <h2 className="mb-3 text-sm font-bold text-ink">Shop</h2>
          <ul className="space-y-2 text-sm">
            {LIVE_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link href={`/${category.slug}`} className="text-muted hover:text-ink">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        © {SITE.domain}. All rights reserved.
      </p>
    </footer>
  );
}
