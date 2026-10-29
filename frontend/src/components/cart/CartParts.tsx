import { AlertTriangle, Store } from "lucide-react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import type { CartLines } from "@/lib/orders/cart-actions";
import { money } from "@/lib/orders/format";
import type { Cart, CartStore } from "@/lib/orders/types";

// Pieces shared by the cart and checkout: a store's heading with its delivery
// facts, and the reasons it can't be ordered from yet.

export function StoreHeading({ store }: { store: CartStore }) {
  const facts = [
    store.distanceKm != null ? `${store.distanceKm.toFixed(1)} km away` : null,
    store.deliveryFee > 0 ? `${money(store.deliveryFee)} delivery` : "Free delivery",
    store.minOrderAmount > 0 ? `Min order ${money(store.minOrderAmount)}` : null,
  ].filter(Boolean);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CategoryImage src={store.logoUrl} alt="" className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface object-cover ring-1 ring-line" iconClassName="size-1/2" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-bold text-ink">{store.storeName}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${store.isOpenNow ? "bg-fresh-soft text-fresh" : "bg-amber-50 text-amber-800"}`}>
            <Store aria-hidden className="size-3" />
            {store.isOpenNow ? "Open" : "Closed now"}
          </span>
        </p>
        <p className="text-xs text-muted">{facts.join(" · ")}</p>
      </div>
    </div>
  );
}

export function StoreIssues({ issues, extra }: { issues: string[]; extra?: string[] }) {
  const all = [...issues, ...(extra ?? [])];
  if (!all.length) return null;
  return (
    <div role="status" className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <ul className="space-y-0.5">
        {all.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

/** listing → quantity, for the shared cart state (badge, product page). */
export function linesOf(cart: Cart): CartLines {
  return { itemCount: cart.itemCount, lines: Object.fromEntries(cart.stores.flatMap((s) => s.items.map((i) => [i.listingId, i.quantity]))) };
}
