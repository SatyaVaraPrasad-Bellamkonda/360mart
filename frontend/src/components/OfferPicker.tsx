"use client";

import { useState } from "react";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";

// Lets the shopper pick a size (1 kg, 500 g…) and see which nearby stores
// sell it, cheapest in-stock first.
export function OfferPicker({ variants }: { variants: ProductDetail["variants"] }) {
  const [variantId, setVariantId] = useState(variants[0].id);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const inStockCount = variant.offers.filter((o) => o.inStock).length;

  return (
    <div className="space-y-5">
      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Choose size</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className="flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-medium text-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white"
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

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">
          {inStockCount === 0
            ? "Not available at nearby stores right now"
            : `Available from ${inStockCount} nearby ${inStockCount === 1 ? "store" : "stores"}`}
        </h2>
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {variant.offers.map((offer) => {
            const off = discountPercent(offer.price, offer.mrp);
            return (
              <li key={offer.storeSlug} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-ink">{offer.store.name}</p>
                  <p className="text-xs text-muted">
                    {offer.store.area}, {offer.store.city}
                  </p>
                </div>
                <div className="text-right">
                  {offer.inStock ? (
                    <>
                      <p className="font-extrabold text-ink">
                        {formatPrice(offer.price)} <span className="text-xs font-medium text-muted">/ {variant.label}</span>
                      </p>
                      {off > 0 && (
                        <p className="text-xs">
                          <s className="text-muted">{formatPrice(offer.mrp)}</s>{" "}
                          <span className="font-semibold text-fresh">{off}% off</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-muted">Out of stock</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-full bg-ink/40 px-6 py-3 font-semibold text-white"
      >
        Add to cart · coming soon
      </button>
    </div>
  );
}
