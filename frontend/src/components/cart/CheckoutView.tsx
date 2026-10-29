"use client";

import { AlertCircle, ArrowLeft, Banknote, Loader2, Lock, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FoodMark } from "@/components/catalog/FoodMark";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { toastSuccess } from "@/components/Toaster";
import type { AddressChoice } from "@/lib/orders/address-choice";
import { placeOrderAction } from "@/lib/orders/actions";
import { loadCartAction } from "@/lib/orders/cart-actions";
import { money } from "@/lib/orders/format";
import { NOTE_MAX, type Cart, type CartStore } from "@/lib/orders/types";
import { AddressPicker } from "./AddressPicker";
import { linesOf, StoreHeading, StoreIssues } from "./CartParts";
import { invalidateCartLines, replaceCartLines } from "./cart-store";

type Banner = { tone: "error" | "warn"; title: string; text: string; link?: { href: string; label: string } };

const KEY_STORE = "360mart.checkoutKey";

/**
 * One idempotency key per checkout of this exact cart: kept across reloads,
 * retries and double taps (sessionStorage), so a lost connection can never
 * order twice. A different cart (or a success) gets a new one.
 */
function useIdempotencyKey(signature: string): [string | null, () => void] {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    let saved: { sig: string; key: string } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(KEY_STORE) ?? "null");
    } catch {
      saved = null;
    }
    const next = saved?.sig === signature ? saved.key : crypto.randomUUID();
    try {
      sessionStorage.setItem(KEY_STORE, JSON.stringify({ sig: signature, key: next }));
    } catch {
      // Storage blocked: the key lasts for this page.
    }
    // Reading sessionStorage can only happen in the browser, after the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKey(next);
  }, [signature]);
  const forget = () => {
    try {
      sessionStorage.removeItem(KEY_STORE);
    } catch {
      // ignore
    }
  };
  return [key, forget];
}

export function CheckoutView({ initialCart, addresses, initialAddressId, wantedStores }: { initialCart: Cart; addresses: AddressChoice[]; initialAddressId: string | null; wantedStores: string[] }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [cart, setCart] = useState(initialCart);
  const [addressId, setAddressId] = useState(initialAddressId);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<Banner | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [moving, startMoving] = useTransition();

  // The stores ticked in the cart (all orderable ones when none were passed).
  const picked = cart.stores.filter((s) => (wantedStores.length ? wantedStores.includes(s.storeId) : s.canCheckout));
  const chosen = picked.filter((s) => s.canCheckout);
  const blocked = picked.filter((s) => !s.canCheckout);
  const total = chosen.reduce((sum, s) => sum + s.grandTotal, 0);
  const fees = chosen.reduce((sum, s) => sum + s.deliveryFee, 0);
  const savings = chosen.reduce((sum, s) => sum + Math.max(0, s.itemsMrpTotal - s.itemsTotal), 0);
  const itemCount = chosen.reduce((n, s) => n + s.items.filter((i) => !i.issue).length, 0);

  // A string, so the key only changes when the stores or items really change.
  const signature = chosen.map((s) => `${s.storeId}:${s.items.map((i) => `${i.listingId}x${i.quantity}`).join("+")}`).join("|");
  const [idempotencyKey, forgetKey] = useIdempotencyKey(signature);

  async function reloadCart(id = addressId) {
    const res = await loadCartAction(id ?? undefined);
    if (res.ok) {
      setCart(res.data);
      replaceCartLines(linesOf(res.data));
    }
    return res;
  }

  function chooseAddress(a: AddressChoice) {
    startMoving(async () => {
      const res = await reloadCart(a.addressId);
      if (!res.ok) return res.error.code === "UNAUTHENTICATED" ? sessionExpired() : setBanner({ tone: "error", title: "Couldn't change the address", text: res.error.message });
      setAddressId(a.addressId);
      setBanner(null);
      setFieldErrors({});
      router.replace(`/checkout?address=${a.addressId}&stores=${wantedStores.join(",")}`, { scroll: false });
    });
  }

  async function place() {
    if (!idempotencyKey || !addressId || !chosen.length || placing) return;
    setPlacing(true);
    setBanner(null);
    setFieldErrors({});
    const res = await placeOrderAction({
      idempotencyKey,
      addressId,
      stores: chosen.map((s) => ({ storeId: s.storeId, note: notes[s.storeId] ?? "" })),
      expectedTotal: total,
    });
    if (res.ok) {
      forgetKey();
      invalidateCartLines();
      toastSuccess(res.data.message);
      const ids = res.data.ids;
      router.push(ids.length === 1 ? `/account/orders/${ids[0]}?placed=1` : `/account/orders?placed=${ids.length}`);
      return;
    }
    setPlacing(false);
    const { code, message } = res.error;
    setFieldErrors(res.error.fieldErrors);
    switch (code) {
      case "UNAUTHENTICATED":
        return sessionExpired();
      case "PRICE_CHANGED":
        // Same key: confirming again with the new total places the same checkout once.
        await reloadCart();
        return setBanner({ tone: "warn", title: "Prices changed", text: message });
      case "CHECKOUT_UNAVAILABLE":
        await reloadCart();
        return setBanner({ tone: "error", title: "Some items can't be ordered right now", text: message });
      case "ADDRESS_LOCATION_REQUIRED":
        return setBanner({ tone: "error", title: "Pin this address on the map", text: message, link: { href: `/account/addresses/${addressId}`, label: "Set the map pin" } });
      case "ADDRESS_NOT_FOUND":
        return setBanner({ tone: "error", title: "Address not found", text: message, link: { href: "/account/addresses", label: "Your addresses" } });
      case "CART_EMPTY":
        return setBanner({ tone: "error", title: "Nothing to order", text: message, link: { href: "/cart", label: "Back to cart" } });
      case "COD_LIMIT_REACHED":
        return setBanner({ tone: "error", title: "Too many cash orders in progress", text: `${message} You can order again once some of them are delivered.` });
      case "COD_NOT_AVAILABLE":
        return setBanner({ tone: "error", title: "Cash on delivery isn't available", text: `${message} Please contact 360mart support for help.` });
      default:
        return setBanner({ tone: "error", title: "Couldn't place the order", text: message });
    }
  }

  const ready = !!idempotencyKey && !!addressId && chosen.length > 0 && !moving;
  const placeLabel = chosen.length > 1 ? `Place ${chosen.length} orders · ${money(total)}` : `Place order · ${money(total)}`;

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <div>
        <Link href="/cart" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          Back to cart
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Checkout</h1>
      </div>

      {banner && (
        <div role="alert" className={`flex gap-3 rounded-2xl p-4 ring-1 motion-safe:animate-pop-in ${banner.tone === "warn" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-red-50 text-red-900 ring-red-200"}`}>
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold">{banner.title}</p>
            <p className="text-sm">{banner.text}</p>
            {banner.link && (
              <Link href={banner.link.href} className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold underline">
                {banner.link.label}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Step n={1} title="Delivery address">
            <AddressPicker addresses={addresses} value={addressId} onChange={chooseAddress} busy={moving || placing} invalid={fieldErrors.addressId} />
          </Step>

          <Step n={2} title={chosen.length > 1 ? `Your ${chosen.length} orders` : "Your order"} hint={chosen.length > 1 ? "One order per store. Each store packs and delivers its own." : undefined}>
            <div className={`space-y-4 transition ${moving ? "opacity-60" : ""}`}>
              {chosen.map((store) => (
                <OrderCard key={store.storeId} store={store} note={notes[store.storeId] ?? ""} onNote={(v) => setNotes((n) => ({ ...n, [store.storeId]: v }))} error={fieldErrors[`stores[${store.storeId}]`]} itemErrors={fieldErrors} disabled={placing} />
              ))}
              {blocked.map((store) => (
                <div key={store.storeId} className="rounded-3xl bg-white p-4 opacity-90 ring-1 ring-line sm:p-5">
                  <StoreHeading store={store} />
                  <div className="mt-3">
                    <StoreIssues issues={store.issues} extra={[...store.items.filter((i) => i.issue).map((i) => `${i.productName}: ${i.issue}`), "Not included in this checkout. Fix it in your cart to order from this store."]} />
                  </div>
                </div>
              ))}
              {!chosen.length && !blocked.length && <p className="rounded-2xl bg-white p-4 text-sm text-muted ring-1 ring-line">None of the chosen stores has items to order. <Link href="/cart" className="font-semibold text-ink underline">Back to cart</Link></p>}
            </div>
          </Step>

          <Step n={3} title="Payment">
            <label className="flex cursor-default items-center gap-3 rounded-2xl bg-white p-4 ring-2 ring-fresh">
              <input type="radio" name="payment" checked readOnly className="size-4 accent-green-600" />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fresh-soft text-fresh">
                <Banknote aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">Cash on delivery</span>
                <span className="block text-sm text-muted">Pay when your order arrives.</span>
              </span>
            </label>
          </Step>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
            <h2 className="font-bold text-ink">Bill summary</h2>
            <Totals chosen={chosen} itemCount={itemCount} fees={fees} total={total} savings={savings} />
            <PlaceButton label={placeLabel} placing={placing} disabled={!ready} onClick={place} className="mt-4" />
            <SafeNote />
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-6xl space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"} · cash on delivery
            </span>
            {savings > 0 && <span className="font-semibold text-fresh">Saving {money(savings)}</span>}
          </div>
          <PlaceButton label={placeLabel} placing={placing} disabled={!ready} onClick={place} />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{n}</span>
        <div className="min-w-0">
          <h2 id={`step-${n}`} className="font-bold text-ink">
            {title}
          </h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OrderCard({ store, note, onNote, error, itemErrors, disabled }: { store: CartStore; note: string; onNote: (v: string) => void; error?: string; itemErrors: Record<string, string>; disabled: boolean }) {
  const [noteOpen, setNoteOpen] = useState(!!note);
  const items = store.items.filter((i) => !i.issue);
  const left = store.items.filter((i) => i.issue);
  return (
    <div className={`rounded-3xl bg-white p-4 ring-1 sm:p-5 ${error ? "ring-red-300" : "ring-line"}`}>
      <StoreHeading store={store} />
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
      <ul className="mt-3 space-y-3">
        {items.map((i) => (
          <li key={i.listingId} className="flex items-center gap-3">
            <ProductThumb src={i.imageUrl} name={i.productName} className="size-12 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1.5 text-sm">
                <FoodMark type={i.foodType} className="mt-0.5" />
                <span className="font-semibold text-ink">{i.productName}</span>
              </p>
              <p className="text-xs text-muted">
                {i.variantLabel} · {i.quantity} × {money(i.price)}
              </p>
              {itemErrors[`items[${i.listingId}]`] && <p className="text-xs font-semibold text-red-700">{itemErrors[`items[${i.listingId}]`]}</p>}
            </div>
            <p className="shrink-0 text-sm font-bold text-ink">{money(i.lineTotal)}</p>
          </li>
        ))}
      </ul>
      {left.length > 0 && <p className="mt-3 text-xs text-muted">Not included: {left.map((i) => `${i.productName} (${i.issue})`).join(", ")}</p>}

      <div className="mt-4 border-t border-dashed border-line pt-3">
        {noteOpen ? (
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
              Note for {store.storeName}
              <span className={`text-xs font-normal ${note.length > NOTE_MAX ? "text-red-700" : "text-muted"}`}>
                {note.length}/{NOTE_MAX}
              </span>
            </span>
            <textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              disabled={disabled}
              rows={2}
              maxLength={NOTE_MAX}
              placeholder="e.g. Please ring the bell, ripe mangoes only"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40"
            />
          </label>
        ) : (
          <button type="button" onClick={() => setNoteOpen(true)} className="flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-deep hover:underline">
            <MessageSquareText aria-hidden className="size-4" />
            Add a note for the store
          </button>
        )}
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="text-muted">
            Items {money(store.itemsTotal)} · Delivery {store.deliveryFee > 0 ? money(store.deliveryFee) : "free"}
          </span>
          <span className="font-extrabold text-ink">{money(store.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

function Totals({ chosen, itemCount, fees, total, savings }: { chosen: CartStore[]; itemCount: number; fees: number; total: number; savings: number }) {
  const mrp = chosen.reduce((sum, s) => sum + s.itemsMrpTotal, 0);
  const items = chosen.reduce((sum, s) => sum + s.itemsTotal, 0);
  return (
    <dl className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">
          Items ({itemCount}) at MRP
        </dt>
        <dd className="text-muted">{money(mrp)}</dd>
      </div>
      {mrp > items && (
        <div className="flex justify-between">
          <dt className="text-ink">Store discounts</dt>
          <dd className="font-semibold text-fresh">− {money(mrp - items)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-ink">Delivery {chosen.length > 1 ? `(${chosen.length} stores)` : ""}</dt>
        <dd className={`font-semibold ${fees > 0 ? "text-ink" : "text-fresh"}`}>{fees > 0 ? money(fees) : "Free"}</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3">
        <dt className="font-bold text-ink">
          To pay
          <span className="block text-xs font-normal text-muted">Cash on delivery · includes GST</span>
        </dt>
        <dd className="text-2xl font-extrabold text-ink">{money(total)}</dd>
      </div>
      {savings > 0 && <p className="rounded-xl bg-fresh-soft px-3 py-2 text-center text-sm font-semibold text-fresh">You save {money(savings)}</p>}
    </dl>
  );
}

function PlaceButton({ label, placing, disabled, onClick, className = "" }: { label: string; placing: boolean; disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || placing} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fresh px-6 font-bold text-white shadow-lg shadow-fresh/20 transition hover:bg-green-700 active:scale-[0.98] disabled:bg-ink/30 disabled:shadow-none ${className}`}>
      {placing ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Lock aria-hidden className="size-4" />}
      {placing ? "Placing your order…" : label}
    </button>
  );
}

function SafeNote() {
  return <p className="mt-3 text-center text-xs text-muted">By placing the order you agree to pay the amount above when it&apos;s delivered.</p>;
}
