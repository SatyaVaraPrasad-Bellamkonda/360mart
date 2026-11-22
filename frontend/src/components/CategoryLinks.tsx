"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The desktop header's second row: every category as a text link, the current
// one underlined in orange, and "All categories" at the end. The list grows,
// so the row scrolls sideways (with a soft fade at the right edge) rather than
// wrapping. Client only for the "current" mark (usePathname, inside <Suspense>).
export function CategoryLinks({ items }: { items: { id: number; name: string; href: string }[] }) {
  const pathname = usePathname();
  const isHere = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const link = "flex min-h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 text-sm font-semibold transition";
  return (
    <ul className="-mx-3.5 flex gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none]">
      {items.map((c) => {
        const here = isHere(c.href);
        return (
          <li key={c.id} className="shrink-0">
            <Link href={c.href} aria-current={here ? "page" : undefined} className={`${link} ${here ? "border-[#ea6a0a] text-ink" : "border-transparent text-[#4a5367] hover:border-[#e4dfd7] hover:text-ink"}`}>
              {c.name}
            </Link>
          </li>
        );
      })}
      <li className="shrink-0 pr-10">
        <Link href="/categories" aria-current={pathname === "/categories" ? "page" : undefined} className={`${link} gap-1.5 ${pathname === "/categories" ? "border-[#ea6a0a] text-ink" : "border-transparent text-[#4a5367] hover:text-ink"}`}>
          <LayoutGrid aria-hidden className="size-4" />
          All categories
        </Link>
      </li>
    </ul>
  );
}
