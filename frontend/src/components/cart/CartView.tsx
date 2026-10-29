"use client";

import { ArrowRight, Loader2, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FoodMark } from "@/components/catalog/FoodMark";
import { Dialog } from "@/components/Dialog";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { setDeliveryLocation } from "@/components/location/delivery-location";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { AddressChoice } from "@/lib/orders/address-choice";
import { clearCartAction, loadCartAction, setCartItemAction } from "@/lib/orders/cart-actions";
import { money } from "@/lib/orders/format";
import type { Cart, CartItem, CartStore } from "@/lib/orders/types";
import { Stepper } from "./AddToCart";
import { AddressPicker } from "./AddressPicker";
import { linesOf, StoreHeading, StoreIssues } from "./CartParts";
import { replaceCartLines } from "./cart-store";

// The signed-in shopper's cart: one card per store (each becomes its own
// order), live prices and the reasons a store or item can't be ordered yet.
// Every change re-reads the cart (the backend works out totals and issues);
// nothing is priced here. The shopper ticks the stores to order from now.
export function CartView({ initialCart, addresses, initialAddressId }: { initialCart: Cart; addresses: AddressChoice[]; initialAddressId: string | null }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [cart, setCart] = useState(initialCart);
  const [addressId, setAddressId] = useState(initialAddressId);
  // Stores the shopper unticked (everything that can be ordered is ticked by default).
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busyItems, setBusyItems] = useState<string[]>([]);
  const [moving, startMoving] = useTransition();
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const orderable = cart.stores.filter((s) => s.canCheckout);
  const chosen = orderable.filter((s) => !skipped.includes(s.storeId));
  const total = chosen.reduce((sum, s) => sum + s.grandTotal, 0);
  const savings = chosen.reduce((sum, s) => sum + Math.max(0, s.itemsMrpTotal - s.itemsTotal), 0);

  function adopt(next: Cart) {
    setCart(next);
    replaceCartLines(linesOf(next));
  }

  function failed(error: { code: string; message: string }) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    toastError(error.message);
  }

  async function changeItem(item: CartItem, quantity: number) {
    setBusyItems((b) => [...b, item.listingId]);
    const res = await setCartItemAction({ listingId: item.listingId, quantity, addressId, reload: true });
    setBusyItems((b) => b.filter((id) => id !== item.listingId));
    if (!res.ok) return failed(res.error);
    if (res.data.cart) adopt(res.data.cart);
    if (quantity === 0) toastSuccess(`${item.productName} removed`);
  }

  function chooseAddress(a: AddressChoice) {
    startMoving(async () => {
      const res = await loadCartAction(a.addressId);
      if (!res.ok) return failed(res.error);
      setAddressId(a.addressId);
      adopt(res.data);
      // The product pages' "Deliver to" follows the cart's choice.
      if (a.latitude != null && a.longitude != null) setDeliveryLocation({ latitude: a.latitude, longitude: a.longitude, label: a.summary, source: "address", addressId: a.addressId });
      router.replace(`/cart?address=${a.addressId}`, { scroll: false });
    });
  }

  async function clear() {
    setClearing(true);
    const res = await clearCartAction();
    setClearing(false);
    setConfirmClear(false);
    if (!res.ok) return failed(res.error);
    adopt({ stores: [], itemCount: 0, grandTotal: 0 });
    toastSuccess(res.data.message);
  }

  function checkout() {
    const ids = chosen.map((s) => s.storeId).join(",");
    router.push(`/checkout?address=${addressId}&stores=${ids}`);
  }

  if (cart.stores.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your cart</h1>
        <EmptyOrders icon={ShoppingBag} title="Your cart is empty" text="Add fruits, groceries and more from stores near you. Each store delivers its own items.">
          <Link href="/categories" className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
            Start shopping
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </EmptyOrders>
      </div>
    );
  }

  const canGo = !!addressId && chosen.length > 0 && !moving;
  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your cart</h1>
          <p className="mt-1 text-sm text-muted">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} from {cart.stores.length} {cart.stores.length === 1 ? "store" : "stores"}
            {cart.stores.length > 1 && " · each store delivers separately"}
          </p>
        </div>
        <button type="button" onClick={() => setConfirmClear(true)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:bg-white hover:text-red-700">
          <Trash2 aria-hidden className="size-4" />
          Clear cart
        </button>
      </div>

      <AddressPicker addresses={addresses} value={addressId} onChange={chooseAddress} busy={moving} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className={`space-y-4 transition ${moving ? "opacity-60" : ""}`} aria-busy={moving}>
          {cart.stores.map((store) => (
            <StoreCard
              key={store.storeId}
              store={store}
              ticked={store.canCheckout && !skipped.includes(store.storeId)}
              onTick={(on) => setSkipped((s) => (on ? s.filter((id) => id !== store.storeId) : [...s, store.storeId]))}
              busyItems={busyItems}
              onChange={changeItem}
              showTick={orderable.length > 1}
            />
          ))}
        </div>

        {/* Desktop: a summary beside the stores. Phones: a bar fixed to the bottom. */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <Summary chosen={chosen} total={total} savings={savings} canGo={canGo} onGo={checkout} needsAddress={!addressId} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-ink">{money(total)}</p>
            <p className="truncate text-xs text-muted">{chosen.length ? `${chosen.length} ${chosen.length === 1 ? "order" : "orders"}${savings > 0 ? ` · saving ${money(savings)}` : ""}` : "Nothing to order yet"}</p>
          </div>
          <button type="button" onClick={checkout} disabled={!canGo} className="flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:bg-ink/40">
            Checkout
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear your cart?" description="Every item from every store is removed.">
        <div className="flex flex-col-reverse gap-2 pb-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setConfirmClear(false)} className="min-h-11 rounded-full px-5 font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Keep items
          </button>
          <button type="button" onClick={clear} disabled={clearing} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:opacity-70">
            {clearing && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Clear cart
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function StoreCard({ store, ticked, onTick, busyItems, onChange, showTick }: { store: CartStore; ticked: boolean; onTick: (on: boolean) => void; busyItems: string[]; onChange: (item: CartItem, qty: number) => void; showTick: boolean }) {
  const saved = Math.max(0, store.itemsMrpTotal - store.itemsTotal);
  return (
    <section aria-label={store.storeName} className={`rounded-3xl bg-white p-4 ring-1 transition sm:p-5 ${ticked ? "ring-line" : "ring-line/60"} ${!store.canCheckout ? "bg-white/80" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <StoreHeading store={store} />
        {showTick && store.canCheckout && (
          <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line has-[:checked]:bg-fresh-soft has-[:checked]:text-fresh has-[:checked]:ring-fresh/40">
            <input type="checkbox" checked={ticked} onChange={(e) => onTick(e.target.checked)} className="size-4 accent-green-600" />
            Order now
          </label>
        )}
      </div>

      {store.issues.length > 0 && (
        <div className="mt-3">
          <StoreIssues issues={store.issues} />
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {store.items.map((item) => (
          <ItemRow key={item.listingId} item={item} busy={busyItems.includes(item.listingId)} onChange={(q) => onChange(item, q)} />
        ))}
      </ul>

      <dl className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-dashed border-line pt-3 text-sm">
        <div className="flex gap-1.5 text-muted">
          <dt>Items</dt>
          <dd className="font-semibold text-ink">{money(store.itemsTotal)}</dd>
          <span aria-hidden>·</span>
          <dt>Delivery</dt>
          <dd className={`font-semibold ${store.deliveryFee > 0 ? "text-ink" : "text-fresh"}`}>{store.deliveryFee > 0 ? money(store.deliveryFee) : "Free"}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          {saved > 0 && <span className="rounded-md bg-fresh-soft px-1.5 py-0.5 text-xs font-bold text-fresh">Saving {money(saved)}</span>}
          <dt className="sr-only">Store total</dt>
          <dd className="text-base font-extrabold text-ink">{money(store.grandTotal)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ItemRow({ item, busy, onChange }: { item: CartItem; busy: boolean; onChange: (q: number) => void }) {
  const blocked = item.maxOrderQuantity < 1;
  return (
    <li className="flex gap-3 py-3">
      <ProductThumb src={item.imageUrl} name={item.productName} className={`size-16 rounded-2xl ${blocked ? "opacity-50 grayscale" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-1.5">
          <FoodMark type={item.foodType} className="mt-0.5" />
          <span className="font-semibold leading-snug text-ink">{item.productName}</span>
        </p>
        <p className="text-sm text-muted">{item.variantLabel}</p>
        <p className="mt-0.5 text-sm">
          <span className="font-bold text-ink">{money(item.price)}</span>
          {item.mrp > item.price && <span className="ml-1.5 text-muted line-through">{money(item.mrp)}</span>}
        </p>
        {item.issue && <p className="mt-1 text-sm font-semibold text-red-700">{item.issue}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {blocked ? (
          <button type="button" onClick={() => onChange(0)} disabled={busy} className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60">
            {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
            Remove
          </button>
        ) : (
          <Stepper size="sm" value={item.quantity} max={item.maxOrderQuantity} busy={busy} onChange={onChange} label={item.productName} />
        )}
        <p className={`text-sm font-bold ${item.issue ? "text-muted line-through" : "text-ink"}`}>{money(item.lineTotal)}</p>
      </div>
    </li>
  );
}

function Summary({ chosen, total, savings, canGo, onGo, needsAddress }: { chosen: CartStore[]; total: number; savings: number; canGo: boolean; onGo: () => void; needsAddress: boolean }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
      <h2 className="font-bold text-ink">Order summary</h2>
      {chosen.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {chosen.map((s) => (
            <li key={s.storeId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-muted">{s.storeName}</span>
              <span className="font-semibold text-ink">{money(s.grandTotal)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{needsAddress ? "Choose a delivery address to continue." : "No store can take this order yet. See the notes on each store."}</p>
      )}
      <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line pt-4">
        <span className="font-bold text-ink">
          Total
          <span className="block text-xs font-normal text-muted">Includes GST and delivery</span>
        </span>
        <span className="text-2xl font-extrabold text-ink">{money(total)}</span>
      </div>
      {savings > 0 && <p className="mt-3 rounded-xl bg-fresh-soft px-3 py-2 text-center text-sm font-semibold text-fresh">You save {money(savings)}</p>}
      <button type="button" onClick={onGo} disabled={!canGo} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:bg-ink/40">
        Checkout
        <ArrowRight aria-hidden className="size-4" />
      </button>
      {chosen.length > 1 && <p className="mt-3 text-xs text-muted">You&apos;ll place {chosen.length} orders, one per store. Each store packs and delivers its own.</p>}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-3.5" />
        Pay cash when your order arrives.
      </p>
    </div>
  );
}
