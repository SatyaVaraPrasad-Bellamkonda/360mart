"use client";

import { ArrowRight, Info, LogIn, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { FoodMark } from "@/components/catalog/FoodMark";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { money } from "@/lib/orders/format";
import { Stepper } from "./AddToCart";
import { setItemQuantity, useCartState, type GuestItem } from "./cart-store";

// A guest's cart, kept in this browser. Prices are what the product page showed
// when the item was added; after login the cart moves to the account and every
// price, stock level and delivery check is confirmed live.
export function GuestCartView() {
  const cart = useCartState();
  const items = cart.mode === "guest" ? cart.guest : [];

  if (cart.mode !== "guest") return <div aria-hidden className="h-80 animate-pulse rounded-3xl bg-line/50" />;
  if (!items.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your cart</h1>
        <EmptyOrders icon={ShoppingBag} title="Your cart is empty" text="Add fruits, groceries and more from stores near you.">
          <Link href="/categories" className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
            Start shopping
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </EmptyOrders>
      </div>
    );
  }

  const stores = [...new Map(items.map((i) => [i.storeId, i.storeName])).entries()];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your cart</h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"} from {stores.length} {stores.length === 1 ? "store" : "stores"}
        </p>
      </div>

      <p className="flex gap-2 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Log in to check out. Your cart moves to your account, and prices, stock and delivery are confirmed for your address.
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {stores.map(([storeId, storeName]) => (
            <section key={storeId} aria-label={storeName} className="rounded-3xl bg-white p-4 ring-1 ring-line sm:p-5">
              <p className="font-bold text-ink">{storeName}</p>
              <ul className="mt-2 divide-y divide-line">
                {items
                  .filter((i) => i.storeId === storeId)
                  .map((item) => (
                    <GuestRow key={item.listingId} item={item} />
                  ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="hidden rounded-3xl bg-white p-5 ring-1 ring-line lg:sticky lg:top-24 lg:block">
          <p className="flex items-baseline justify-between">
            <span className="font-bold text-ink">
              Items total
              <span className="block text-xs font-normal text-muted">Delivery fees are added at checkout</span>
            </span>
            <span className="text-2xl font-extrabold text-ink">{money(total)}</span>
          </p>
          <LoginButtons />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-ink">{money(total)}</p>
            <p className="truncate text-xs text-muted">+ delivery, at checkout</p>
          </div>
          <Link href="/login?next=/cart" className="flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white">
            <LogIn aria-hidden className="size-4" />
            Log in to order
          </Link>
        </div>
      </div>
    </div>
  );
}

function GuestRow({ item }: { item: GuestItem }) {
  const cart = useCartState();
  const busy = cart.busy.includes(item.listingId);
  return (
    <li className="flex gap-3 py-3">
      <Link href={item.href} className="shrink-0">
        <ProductThumb src={item.imageUrl} name={item.productName} className="size-16 rounded-2xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={item.href} className="flex items-start gap-1.5 hover:underline">
          <FoodMark type={item.foodType} className="mt-0.5" />
          <span className="font-semibold leading-snug text-ink">{item.productName}</span>
        </Link>
        <p className="text-sm text-muted">{item.variantLabel}</p>
        <p className="mt-0.5 text-sm">
          <span className="font-bold text-ink">{money(item.price)}</span>
          {item.mrp > item.price && <span className="ml-1.5 text-muted line-through">{money(item.mrp)}</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <Stepper size="sm" value={item.quantity} max={Math.max(1, item.maxOrderQuantity)} busy={busy} onChange={(q) => setItemQuantity(item.listingId, q)} label={item.productName} />
        <button type="button" onClick={() => setItemQuantity(item.listingId, 0)} className="flex min-h-10 items-center gap-1 text-xs font-semibold text-muted hover:text-red-700">
          <Trash2 aria-hidden className="size-3.5" />
          Remove
        </button>
      </div>
    </li>
  );
}

function LoginButtons() {
  return (
    <div className="mt-4 space-y-2">
      <Link href="/login?next=/cart" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85">
        <LogIn aria-hidden className="size-4" />
        Log in to order
      </Link>
      <Link href="/signup?next=/cart" className="flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
        New here? Create an account
      </Link>
    </div>
  );
}
