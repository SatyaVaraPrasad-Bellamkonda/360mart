"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SectionHeading } from "@/components/SectionHeading";
import type { ProductCard } from "@/lib/category-page/types";
import { buyAgainAction } from "@/lib/home-page/actions";
import { HomeProductRow } from "./HomeProductRow";

// "Buy again" for signed-in shoppers: products from their delivered orders.
// Loaded in the browser after the page (it's per shopper, so the cached home
// page stays the same for everyone). Nothing to show = no row.
export function BuyAgainRow() {
  const { status, user } = useAuth();
  const [items, setItems] = useState<ProductCard[]>([]);
  const userId = status === "authenticated" ? user?.userId : null;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    buyAgainAction().then((res) => {
      if (live && res.ok) setItems(res.data);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!userId || items.length === 0) return null;
  return (
    <section aria-labelledby="section-buy-again" className="motion-safe:animate-fade-up">
      <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-line">
        <RotateCcw aria-hidden className="size-3.5" />
        From your orders
      </p>
      <SectionHeading id="section-buy-again" title="Buy again" subtitle="The things you order, a tap away" />
      <HomeProductRow items={items} label="Buy again" />
    </section>
  );
}
