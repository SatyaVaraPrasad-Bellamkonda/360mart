"use client";

import { ChevronDown, Loader2, Plus, RotateCcw, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Stepper } from "@/components/cart/AddToCart";
import { quantityIn, setItemQuantity, useCartState } from "@/components/cart/cart-store";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { useDeliveryLocation } from "@/components/location/delivery-location";
import { loadBuyAgain, productHref, stateOf, type BuyAgainItem } from "@/lib/home-page/buy-again";
import { areaName } from "@/lib/location/types";
import { money } from "@/lib/orders/format";

export const BUY_AGAIN_TEXT = { title: "Buy again", subtitle: "The things you order, a tap away" };

// Cards shown before "Show all": 4 on phones, 6 from tablets up (CSS only, no
// screen-size code, so the server and browser render the same).
const PHONE = 4;
const WIDE = 6;

// "Buy again" for signed-in shoppers, at the place the admin gave the section:
// what they last bought (that size, from that store) with today's price and a
// one-tap add, in a white panel of horizontal cards. Loaded in the browser
// (per shopper; the cached home page stays the same for everyone) with the
// "Deliver to" point, and loaded again when that point changes. Guests, or
// nothing bought yet: no section (its wrapper collapses).
export function BuyAgainRow({ id = "buy-again", title, subtitle, limit = 12, className = "" }: { id?: string; title?: string | null; subtitle?: string | null; limit?: number; className?: string }) {
  const { status, user } = useAuth();
  const location = useDeliveryLocation();
  const userId = status === "authenticated" ? user?.userId : null;
  const lat = location?.latitude ?? null;
  const lng = location?.longitude ?? null;
  // Who, how many, and where: any change loads again.
  const wanted = userId ? `${userId}:${limit}:${lat ?? "-"},${lng ?? "-"}` : null;
  const [loaded, setLoaded] = useState<{ key: string; items: BuyAgainItem[] } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    const run = () =>
      // Any problem = keep what's shown (or no section the first time).
      loadBuyAgain(limit, lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null).then((res) => {
        if (!live) return;
        if (res.ok) setLoaded({ key: wanted, items: res.data });
        else setLoaded((old) => old ?? { key: wanted, items: [] });
      });
    // No point yet: a signed-in shopper's default address usually arrives a
    // moment later (LocationHost), so wait briefly instead of calling twice.
    const timer = lat === null ? setTimeout(run, 1200) : null;
    if (!timer) void run();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [wanted, limit, lat, lng]);

  if (!wanted) return null;
  const headingId = `section-${id}`;
  const items = loaded?.items ?? null;
  const refreshing = !!loaded && loaded.key !== wanted;
  if (items && items.length === 0) return null;

  const showToggle = !!items && items.length > PHONE;
  return (
    <section aria-labelledby={headingId} aria-busy={!items || refreshing} className={`${items ? "motion-safe:animate-fade-up" : ""} ${className}`}>
      <div className="rounded-[28px] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-16px_rgb(15_23_42/0.12)] ring-1 ring-line sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink ring-1 ring-line sm:size-12">
            <RotateCcw aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {title || BUY_AGAIN_TEXT.title}
            </h2>
            <p className="text-sm text-muted">{subtitle || BUY_AGAIN_TEXT.subtitle}</p>
          </div>
        </div>

        <ul className={`mt-4 grid grid-cols-1 gap-2.5 transition-opacity sm:mt-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 ${refreshing ? "opacity-60" : ""}`}>
          {items
            ? items.map((item, i) => (
                <li key={item.productId} className={open ? "" : i >= WIDE ? "hidden" : i >= PHONE ? "hidden sm:block" : ""}>
                  <BuyAgainCard item={item} area={location ? areaName(location.label) : null} />
                </li>
              ))
            : Array.from({ length: WIDE }, (_, i) => (
                <li key={i} aria-hidden className={i >= PHONE ? "hidden sm:block" : ""}>
                  <div className="flex min-h-[88px] items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line/70">
                    <span className="size-16 shrink-0 animate-pulse rounded-xl bg-line/70 sm:size-[72px]" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3.5 w-3/4 animate-pulse rounded-full bg-line/70" />
                      <span className="block h-3 w-1/2 animate-pulse rounded-full bg-line/60" />
                    </span>
                    <span className="size-10 shrink-0 animate-pulse rounded-xl bg-line/60" />
                  </div>
                </li>
              ))}
        </ul>

        {showToggle && (
          <div className={`mt-4 flex justify-center ${!open && items.length <= WIDE ? "sm:hidden" : ""}`}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              {open ? "Show fewer" : `Show all ${items.length}`}
              <ChevronDown aria-hidden className={`size-4 transition ${open ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// One horizontal card: picture, name, "500 g · ₹45 ₹50", and what can be done
// now (add / − n +, or why not with a link to the product's other stores).
function BuyAgainCard({ item, area }: { item: BuyAgainItem; area: string | null }) {
  const href = productHref(item);
  const b = item.lastBought;
  const state = stateOf(item);
  const muted = state !== "add";

  return (
    <article className="group flex min-h-[88px] items-center gap-3 rounded-2xl bg-surface/70 p-2.5 ring-1 ring-line/70 transition hover:bg-white hover:shadow-sm hover:ring-line">
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0">
        <ProductThumb src={item.imageUrl} name={item.name} className={`size-16 rounded-xl bg-white sm:size-[72px] ${muted ? "opacity-70 grayscale-[35%]" : ""}`} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} title={item.name} className="line-clamp-2 text-[15px] font-bold leading-snug text-ink underline-offset-2 hover:underline">
          {item.name}
        </Link>
        {b ? (
          <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm text-muted">
            <span>{b.variantLabel}</span>
            <span aria-hidden>·</span>
            <span className={muted ? "" : "font-semibold text-ink"}>{money(b.price)}</span>
            {b.mrp > b.price && (
              <span className="text-xs line-through">
                <span className="sr-only">MRP </span>
                {money(b.mrp)}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted">{item.variants[0]?.label ?? "Sizes vary"}</p>
        )}
        {state === "out-of-stock" && (
          <p className="mt-0.5 truncate text-xs font-semibold text-amber-700" title={`Out of stock at ${b?.storeName}`}>
            Out of stock<span className="sr-only"> at {b?.storeName}</span>
          </p>
        )}
        {state === "not-here" && <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">Not delivered to {area ?? "your area"}</p>}
        {state === "see-stores" && <p className="mt-0.5 truncate text-xs text-muted">Not sold by that store now</p>}
      </div>
      {state === "add" && b ? <AddButton item={item} /> : <OtherStores href={href} label={state === "see-stores" ? "See stores" : "Other stores"} />}
    </article>
  );
}

function OtherStores({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-white px-2.5 text-xs font-bold text-ink ring-1 ring-line transition hover:ring-ink max-[400px]:px-0">
      <Store aria-hidden className="size-4 min-[401px]:size-3.5" />
      {/* Narrow phones: icon only, so the name and price keep their room. */}
      <span className="max-[400px]:sr-only">{label}</span>
    </Link>
  );
}

// + → − n + : the same cart call as the product page (PUT /cart/items/{listingId}),
// so the header badge and the cart page follow. Capped at maxOrderQuantity.
function AddButton({ item }: { item: BuyAgainItem }) {
  const b = item.lastBought!;
  const cart = useCartState();
  const [pending, setPending] = useState(false);
  const inCart = quantityIn(cart, b.listingId);
  const busy = pending || cart.busy.includes(b.listingId);
  const max = Math.min(b.maxOrderQuantity, 99);

  async function change(quantity: number) {
    if (busy) return;
    setPending(true);
    await setItemQuantity(b.listingId, Math.max(0, Math.min(quantity, max)), {
      listingId: b.listingId,
      storeId: b.storeId,
      storeName: b.storeName,
      productId: item.productId,
      variantId: b.variantId,
      productName: item.name,
      variantLabel: b.variantLabel,
      imageUrl: item.imageUrl,
      foodType: item.foodType,
      price: b.price,
      mrp: b.mrp,
      maxOrderQuantity: b.maxOrderQuantity,
      href: productHref(item),
    });
    setPending(false);
  }

  if (inCart > 0) {
    return (
      <div className="shrink-0 motion-safe:animate-pop-in">
        <Stepper value={inCart} max={max} busy={busy} onChange={change} label={`${item.name} ${b.variantLabel}`} size="sm" tone="ink" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => change(1)}
      disabled={busy}
      aria-label={`Add ${item.name} ${b.variantLabel} from ${b.storeName}, ${money(b.price)}`}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink ring-2 ring-ink transition hover:bg-ink hover:text-white active:scale-95 disabled:opacity-60"
    >
      {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Plus aria-hidden className="size-5" />}
    </button>
  );
}
