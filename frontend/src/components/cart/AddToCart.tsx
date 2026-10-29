"use client";

import { ArrowRight, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FoodType } from "@/lib/catalog/types";
import { money } from "@/lib/orders/format";
import type { StoreOffer } from "@/lib/offers/types";
import { quantityIn, setItemQuantity, useCartState } from "./cart-store";

export type CartProduct = { productId: number; productName: string; imageUrl: string | null; foodType: FoodType | null; href: string; variantId: number; variantLabel: string };

// The product page's cart control for the chosen store's offer: "Add to cart",
// then − 2 + (Blinkit style) with a link to the cart. The cart sets a quantity
// (it doesn't add on top), so the steppers show what's already in the cart.
// Guests can add too: their cart is kept in this browser until they log in.
export function AddToCart({ offer, product }: { offer: StoreOffer | null; product: CartProduct }) {
  const cart = useCartState();
  const [pending, setPending] = useState(false);
  const inCart = offer ? quantityIn(cart, offer.listingId) : 0;
  const busy = pending || (!!offer && cart.busy.includes(offer.listingId));
  const max = offer ? Math.min(offer.maxOrderQuantity, 99) : 0;

  async function change(quantity: number) {
    if (!offer || busy) return;
    setPending(true);
    await setItemQuantity(offer.listingId, quantity, {
      listingId: offer.listingId,
      storeId: offer.storeId,
      storeName: offer.storeName,
      productId: product.productId,
      variantId: product.variantId,
      productName: product.productName,
      variantLabel: product.variantLabel,
      imageUrl: product.imageUrl,
      foodType: product.foodType,
      price: offer.price,
      mrp: offer.mrp,
      maxOrderQuantity: offer.maxOrderQuantity,
      href: product.href,
    });
    setPending(false);
  }

  if (!offer || max < 1) {
    return (
      <button type="button" disabled className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-ink/40 px-6 font-semibold text-white">
        <ShoppingBag aria-hidden className="size-5" />
        {offer ? "Out of stock" : "Not available to add"}
      </button>
    );
  }

  return (
    <div className="space-y-2" aria-live="polite">
      {inCart === 0 ? (
        <button
          type="button"
          onClick={() => change(1)}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white shadow-lg shadow-ink/10 transition hover:bg-ink/85 active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <ShoppingBag aria-hidden className="size-5" />}
          Add to cart · {money(offer.price)}
        </button>
      ) : (
        <div className="flex items-center gap-2 motion-safe:animate-pop-in">
          <Stepper value={inCart} max={max} busy={busy} onChange={change} label={product.productName} />
          <Link href="/cart" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 font-semibold text-white transition hover:bg-ink/85">
            View cart
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      )}
      {inCart > 0 && inCart >= max && <p className="text-xs font-semibold text-amber-700">That&apos;s the most you can order from {offer.storeName}.</p>}
      {!offer.isOpenNow && <p className="text-xs text-amber-700">{offer.storeName} is closed now. You can add it to your cart and order when the store opens.</p>}
    </div>
  );
}

/** − n + with 48px buttons; 0 removes the item. */
export function Stepper({ value, max, busy, onChange, label, size = "lg" }: { value: number; max: number; busy: boolean; onChange: (n: number) => void; label: string; size?: "lg" | "sm" }) {
  const box = size === "lg" ? "min-h-12 rounded-full" : "min-h-10 rounded-xl";
  const btn = size === "lg" ? "size-12" : "size-10";
  return (
    <div role="group" aria-label={`Quantity of ${label}`} className={`flex shrink-0 items-center bg-fresh text-white ${box}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={busy} aria-label={value === 1 ? `Remove ${label}` : "One less"} className={`flex ${btn} items-center justify-center rounded-full transition hover:bg-white/15 disabled:opacity-60`}>
        <Minus aria-hidden className="size-4" />
      </button>
      <span className="min-w-8 text-center font-extrabold tabular-nums">{busy ? <Loader2 aria-label="Updating" className="mx-auto size-4 animate-spin" /> : value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={busy || value >= max} aria-label="One more" className={`flex ${btn} items-center justify-center rounded-full transition hover:bg-white/15 disabled:opacity-40`}>
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
