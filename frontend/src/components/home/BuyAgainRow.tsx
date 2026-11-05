"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SectionHeading } from "@/components/SectionHeading";
import type { ProductCard } from "@/lib/category-page/types";
import { api } from "@/lib/api-client";
import { HomeProductRow } from "./HomeProductRow";

export const BUY_AGAIN_TEXT = { title: "Buy again", subtitle: "The things you order, a tap away" };

// "Buy again" for signed-in shoppers: products from their delivered orders, at
// the place the admin gave the section. Loaded in the browser after the page
// (it's per shopper, so the cached home page stays the same for everyone).
// While it loads: a skeleton, so the page doesn't jump. Guests, or nothing
// bought yet: no row (its wrapper collapses).
export function BuyAgainRow({ id = "buy-again", title, subtitle, limit = 12, className = "" }: { id?: string; title?: string | null; subtitle?: string | null; limit?: number; className?: string }) {
  const { status, user } = useAuth();
  const userId = status === "authenticated" ? user?.userId : null;
  // Keyed by who and how many, so a new shopper or limit shows the skeleton again.
  const wanted = userId ? `${userId}:${limit}` : null;
  const [loaded, setLoaded] = useState<{ key: string; items: ProductCard[] } | null>(null);

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    // Straight from the browser (GET /api/v1/users/me/buy-again): per shopper, never cached. Any problem = no row.
    const n = Number.isInteger(limit) ? Math.min(20, Math.max(4, limit)) : 12;
    api<ProductCard[]>(`/users/me/buy-again?limit=${n}`).then((res) => {
      if (live) setLoaded({ key: wanted, items: res.ok && Array.isArray(res.data) ? res.data : [] });
    });
    return () => {
      live = false;
    };
  }, [wanted, limit]);

  if (!wanted) return null;
  const headingId = `section-${id}`;
  const heading = (
    <>
      <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-line">
        <RotateCcw aria-hidden className="size-3.5" />
        From your orders
      </p>
      <SectionHeading id={headingId} title={title || BUY_AGAIN_TEXT.title} subtitle={subtitle || BUY_AGAIN_TEXT.subtitle} />
    </>
  );
  if (loaded?.key !== wanted) {
    return (
      <section aria-labelledby={headingId} aria-busy className={className}>
        {heading}
        <div aria-hidden className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[3/4] w-[40%] shrink-0 animate-pulse rounded-2xl bg-line/60 min-[420px]:w-[31%] sm:w-[23%] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]" />
          ))}
        </div>
      </section>
    );
  }
  if (loaded.items.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className={`motion-safe:animate-fade-up ${className}`}>
      {heading}
      <HomeProductRow items={loaded.items} label={title || BUY_AGAIN_TEXT.title} />
    </section>
  );
}
