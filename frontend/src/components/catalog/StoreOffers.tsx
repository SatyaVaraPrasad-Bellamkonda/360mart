"use client";

import { ChevronDown, Info, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { setDeliveryLocation, useDeliveryLocation } from "@/components/location/delivery-location";
import { DeliverToDialog } from "@/components/location/DeliverToDialog";
import { toastError } from "@/components/Toaster";
import type { ProductUnit } from "@/lib/catalog/types";
import { money } from "@/lib/inventory/validation";
import { loadAddressChoicesAction } from "@/lib/location/actions";
import type { MapConfig } from "@/lib/maps/config";
import { loadOffersAction } from "@/lib/offers/actions";
import type { ProductStoreOffers, StoreOffer } from "@/lib/offers/types";

type Size = { variantId: number; label: string; quantity: number; unit: ProductUnit };
type Loaded = { key: string; data: ProductStoreOffers | null; error: string | null };

/** "₹240/kg" for sizes that aren't exactly 1 kg / 1 L, so different sizes compare fairly. */
function unitPrice(price: number, quantity: number, unit: ProductUnit): string | null {
  const base: Partial<Record<ProductUnit, [number, string]>> = { KG: [1, "kg"], GRAM: [1000, "kg"], LITRE: [1, "L"], MILLILITRE: [1000, "L"] };
  const b = base[unit];
  if (!b || !quantity) return null;
  const per = price / (quantity / b[0]);
  if (quantity / b[0] === 1) return null;
  return `${money(Math.round(per * 100) / 100)}/${b[1]}`;
}

// "Stores that deliver this to me": pick a size, see every store that delivers
// it to the chosen location, best offer first (the backend's order). One call
// per size + location (+1 per "Show more"), never cached: prices and stock are live.
export function StoreOffers({ productId, productName, sizes, map }: { productId: number; productName: string; sizes: Size[]; map: MapConfig }) {
  const { status } = useAuth();
  const location = useDeliveryLocation();
  const [variantId, setVariantId] = useState(sizes[0]?.variantId ?? 0);
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [more, startMore] = useTransition();
  const triedDefault = useRef(false);

  const size = sizes.find((s) => s.variantId === variantId);
  const key = location ? `${variantId}|${location.latitude},${location.longitude}` : null;
  const current = loaded && loaded.key === key ? loaded : null;
  const loading = !!key && !current;

  // Signed in, nothing chosen yet: use the default address that has a map pin (one call, once).
  useEffect(() => {
    if (location || status !== "authenticated" || triedDefault.current) return;
    triedDefault.current = true;
    loadAddressChoicesAction().then((res) => {
      if (!res.ok) return;
      const a = res.data.find((x) => x.isDefault && x.latitude != null) ?? res.data.find((x) => x.latitude != null);
      if (a && a.latitude != null && a.longitude != null) setDeliveryLocation({ latitude: a.latitude, longitude: a.longitude, label: a.line || a.title, source: "address", addressId: a.addressId });
    });
  }, [location, status]);

  // A new size or location: the first page of stores for it.
  useEffect(() => {
    if (!key || !location || !variantId) return;
    let live = true;
    loadOffersAction(productId, variantId, location.latitude, location.longitude, 0).then((res) => {
      if (live) setLoaded({ key, data: res.ok ? res.data : null, error: res.ok ? null : res.error.message });
    });
    return () => {
      live = false;
    };
  }, [key, location, productId, variantId]);

  function loadMore() {
    if (!current?.data || !location) return;
    const page = current.data.stores.page + 1;
    startMore(async () => {
      const res = await loadOffersAction(productId, variantId, location.latitude, location.longitude, page);
      if (!res.ok) return toastError(res.error.message);
      setLoaded((l) => (l && l.key === key && l.data ? { ...l, data: { ...res.data, stores: { ...res.data.stores, items: [...l.data.stores.items, ...res.data.stores.items] } } } : l));
    });
  }

  if (sizes.length === 0) return <p className="mt-6 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">Sizes are being added. Check back soon.</p>;

  const offers = current?.data?.stores;

  // Same layout as the Fruits sample pages (OfferPicker): price, size, store, button.
  const sizeChips =
    sizes.length > 1 ? (
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">Choose size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <label
              key={s.variantId}
              className="flex min-h-11 cursor-pointer items-center rounded-xl border-2 border-line px-4 text-sm font-semibold text-ink transition hover:border-ink/40 active:scale-95 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
            >
              <input type="radio" name="variant" value={s.variantId} checked={s.variantId === variantId} onChange={() => setVariantId(s.variantId)} className="sr-only" />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
    ) : null;

  const deliverTo = (
    <button type="button" onClick={() => setPicking(true)} className="group -my-1 flex min-h-10 max-w-full items-center gap-1.5 text-sm">
      <MapPin aria-hidden className="size-4 shrink-0 text-brand-deep" />
      <span className="min-w-0 truncate text-muted">
        {location ? (
          <>
            Delivering to <span className="font-semibold text-ink">{location.label}</span>
          </>
        ) : (
          "Set your delivery location"
        )}
      </span>
      <span className="shrink-0 font-semibold text-brand-deep group-hover:underline">{location ? "Change" : "Set"}</span>
    </button>
  );

  return (
    <section aria-labelledby="offers-heading" className="mt-6" aria-live="polite" aria-busy={loading}>
      <h2 id="offers-heading" className="sr-only">
        Price and stores that deliver this to you
      </h2>
      {offers && offers.totalItems > 0 ? (
        <Offers
          // A fresh choice (the best offer) for each size and location.
          key={key}
          items={offers.items}
          total={offers.totalItems}
          hasMore={offers.page + 1 < offers.totalPages}
          loadingMore={more}
          onMore={loadMore}
          size={size}
          sizeChips={sizeChips}
          deliverTo={deliverTo}
        />
      ) : (
        <div className="space-y-6">
          {!location ? (
            <Notice title="Set your location to see prices" text={`Prices come from the stores that deliver ${productName} to you.`} action="Set location" onAction={() => setPicking(true)} />
          ) : loading ? (
            <div aria-hidden className="space-y-2">
              <div className="h-10 w-48 animate-pulse rounded-xl bg-line/60" />
              <div className="h-4 w-64 animate-pulse rounded bg-line/50" />
            </div>
          ) : current?.error ? (
            <Notice title="Couldn't load prices" text={current.error} action="Change location" onAction={() => setPicking(true)} tone="error" />
          ) : (
            <Notice title={`Not available near ${location.label} right now`} text="No store delivers this size there yet. Try another size, or a different location." action="Change location" onAction={() => setPicking(true)} />
          )}
          {sizeChips}
          {location && deliverTo}
          {loading && (
            <div aria-hidden className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[4.5rem] animate-pulse rounded-2xl bg-line/50" />
              ))}
            </div>
          )}
          <CartButton />
        </div>
      )}
      <DeliverToDialog open={picking} onClose={() => setPicking(false)} map={map} />
    </section>
  );
}

function Notice({ title, text, action, onAction, tone }: { title: string; text: string; action: string; onAction: () => void; tone?: "error" }) {
  return (
    <div className={`rounded-2xl px-4 py-4 ring-1 motion-safe:animate-fade-up ${tone === "error" ? "bg-red-50 ring-red-200" : "bg-surface ring-line"}`}>
      <p className={`font-semibold ${tone === "error" ? "text-red-800" : "text-ink"}`}>{title}</p>
      <p className="mt-0.5 text-sm text-muted">{text}</p>
      <button type="button" onClick={onAction} className="mt-3 flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 active:scale-95">
        <MapPin aria-hidden className="size-4" />
        {action}
      </button>
    </div>
  );
}

const STORES_SHOWN = 4;

/** Price of the chosen store, the size chips, then the stores to choose from (best price first, as the backend sorts them). */
function Offers({
  items,
  total,
  hasMore,
  loadingMore,
  onMore,
  size,
  sizeChips,
  deliverTo,
}: {
  items: StoreOffer[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  size: Size | undefined;
  sizeChips: ReactNode;
  deliverTo: ReactNode;
}) {
  const inStock = items.filter((o) => o.isInStock);
  const best = inStock[0] ?? null;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // The shopper's chosen store if it's in stock, otherwise the best price.
  const selected = inStock.find((o) => o.listingId === chosenId) ?? best;
  const shown = showAll ? items : items.slice(0, STORES_SHOWN);
  const per = selected && size ? unitPrice(selected.price, size.quantity, size.unit) : null;

  return (
    <div className="space-y-6">
      <div>
        {selected ? (
          <div key={selected.listingId} className="motion-safe:animate-pop-in">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold text-ink sm:text-4xl">{money(selected.price)}</span>
              {selected.discountAmount > 0 && (
                <>
                  <span className="text-base text-muted line-through">{money(selected.mrp)}</span>
                  <span className="rounded-md bg-green-50 px-2 py-0.5 text-sm font-bold text-fresh">{pct(selected.discountPercent)}% OFF</span>
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-muted">
              for {size?.label} · sold by <span className="font-semibold text-ink">{selected.storeName}</span>
              {per && ` · ${per}`}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-muted">Not available at nearby stores right now</p>
        )}
      </div>

      {sizeChips}

      <fieldset>
        <legend className="mb-2 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-ink">
            {inStock.length === 0 ? "Stores" : `Choose a store · ${inStock.length} nearby ${inStock.length === 1 ? "store has" : "stores have"} it`}
          </span>
        </legend>
        <div className="mb-2">{deliverTo}</div>
        <div className="space-y-2">
          {shown.map((o, i) => {
            const isBest = best?.listingId === o.listingId && inStock.length > 1;
            const meta = [`${o.distanceKm.toFixed(1)} km`, o.deliveryFee > 0 ? `${money(o.deliveryFee)} delivery` : "Free delivery", o.minOrderAmount > 0 ? `Min ${money(o.minOrderAmount)}` : null, o.isOpenNow ? null : "Closed now"].filter(Boolean).join(" · ");
            return (
              <label
                key={o.listingId}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 transition motion-safe:animate-fade-up sm:p-4 ${
                  o.isInStock
                    ? "cursor-pointer border-line hover:border-ink/40 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                    : "cursor-not-allowed border-line bg-surface opacity-70"
                }`}
              >
                <input type="radio" name="store" value={o.listingId} disabled={!o.isInStock} checked={selected?.listingId === o.listingId} onChange={() => setChosenId(o.listingId)} className="sr-only" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{o.storeName}</span>
                    {isBest && <span className="rounded-md bg-fresh px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Best price</span>}
                  </span>
                  {(o.area || o.city) && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin aria-hidden className="size-3.5 shrink-0" />
                      {[o.area, o.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className={`mt-0.5 block text-xs ${o.isOpenNow ? "text-muted" : "text-amber-700"}`}>{meta}</span>
                </span>
                <span className="shrink-0 text-right">
                  {o.isInStock ? (
                    <>
                      <span className="block font-extrabold text-ink">{money(o.price)}</span>
                      {o.discountAmount > 0 && <span className="block text-xs text-muted line-through">{money(o.mrp)}</span>}
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-muted">Out of stock</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        {(items.length > STORES_SHOWN && !showAll) || hasMore ? (
          <button
            type="button"
            onClick={() => (items.length > STORES_SHOWN && !showAll ? setShowAll(true) : onMore())}
            disabled={loadingMore}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-ink transition hover:border-ink/40 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : items.length > STORES_SHOWN && !showAll ? `Show all ${total} stores` : "Show more stores"}
            <ChevronDown aria-hidden className="size-4" />
          </button>
        ) : null}
      </fieldset>

      <CartButton />
    </div>
  );
}

/** "Add to cart" waits for the cart API; until then it says so (like the Fruits sample pages). */
function CartButton() {
  return (
    <div className="space-y-3">
      <button type="button" disabled className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-ink/40 px-6 font-semibold text-white">
        <ShoppingBag aria-hidden className="size-5" />
        Add to cart · coming soon
      </button>
      <p className="flex items-start gap-2 text-xs text-muted">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Each store sets its own price and stock. Pick the store you&apos;d like to buy from. Prices include GST.
      </p>
    </div>
  );
}

/** "17.5" or "25" (no trailing .0). */
const pct = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1));
