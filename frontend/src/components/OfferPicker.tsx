"use client";

import { Info, MapPin, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";

type Variants = ProductDetail["variants"];

// Price summary + size choice + which nearby store to buy from.
// Offers arrive sorted: in-stock first, cheapest first.
export function OfferPicker({ variants }: { variants: Variants }) {
  const [variantId, setVariantId] = useState(variants[0].id);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const inStock = variant.offers.filter((o) => o.inStock);
  const best = inStock[0] ?? null;
  // The shopper's chosen store, if it sells this size; otherwise the best price.
  const selected = inStock.find((o) => o.storeSlug === storeSlug) ?? best;
  const off = selected ? discountPercent(selected.price, selected.mrp) : 0;

  return (
    <div className="space-y-6">
      <div>
        {selected ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold text-ink sm:text-4xl">{formatPrice(selected.price)}</span>
              {off > 0 && (
                <>
                  <span className="text-base text-muted line-through">{formatPrice(selected.mrp)}</span>
                  <span className="rounded-md bg-green-50 px-2 py-0.5 text-sm font-bold text-fresh">{off}% OFF</span>
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-muted">
              for {variant.label} · sold by <span className="font-semibold text-ink">{selected.store.name}</span>
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-muted">
            Not available at nearby stores right now
          </p>
        )}
      </div>

      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">Choose size</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className="flex min-h-11 cursor-pointer items-center rounded-xl border-2 border-line px-4 text-sm font-semibold text-ink transition hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => setVariantId(v.id)}
                  className="sr-only"
                />
                {v.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">
          {inStock.length === 0
            ? "Stores"
            : `Choose a store · ${inStock.length} nearby ${inStock.length === 1 ? "store has" : "stores have"} it`}
        </legend>
        <div className="space-y-2">
          {variant.offers.map((offer) => {
            const offerOff = discountPercent(offer.price, offer.mrp);
            const isBest = best?.storeSlug === offer.storeSlug && inStock.length > 1;
            return (
              <label
                key={offer.storeSlug}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 transition sm:p-4 ${
                  offer.inStock
                    ? "cursor-pointer border-line hover:border-ink/40 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                    : "cursor-not-allowed border-line bg-surface opacity-70"
                }`}
              >
                <input
                  type="radio"
                  name="store"
                  value={offer.storeSlug}
                  disabled={!offer.inStock}
                  checked={selected?.storeSlug === offer.storeSlug}
                  onChange={() => setStoreSlug(offer.storeSlug)}
                  className="sr-only"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{offer.store.name}</span>
                    {isBest && (
                      <span className="rounded-md bg-fresh px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                        Best price
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin aria-hidden className="size-3.5 shrink-0" />
                    {offer.store.area}, {offer.store.city}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {offer.inStock ? (
                    <>
                      <span className="block font-extrabold text-ink">{formatPrice(offer.price)}</span>
                      {offerOff > 0 && <span className="block text-xs text-muted line-through">{formatPrice(offer.mrp)}</span>}
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-muted">Out of stock</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-3">
        <button
          type="button"
          disabled
          className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-ink/40 px-6 font-semibold text-white"
        >
          <ShoppingBag aria-hidden className="size-5" />
          Add to cart · coming soon
        </button>
        <p className="flex items-start gap-2 text-xs text-muted">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Each store sets its own price and stock. Pick the store you&apos;d like to buy from.
        </p>
      </div>
    </div>
  );
}
