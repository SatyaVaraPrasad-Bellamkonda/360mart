"use client";

import { useSyncExternalStore } from "react";
import type { FoodType } from "@/lib/catalog/types";
import { cartLinesAction, mergeGuestCartAction, setCartItemAction, type CartLines } from "@/lib/orders/cart-actions";
import { CART_ITEM_LIMIT, MAX_QUANTITY } from "@/lib/orders/types";
import { toastError, toastSuccess } from "@/components/Toaster";

// The cart as every screen sees it (like an AngularJS service shared by all
// controllers): the header badge, the product page's Add / − 1 + buttons and
// the cart page.
// - Signed in: the backend's cart. Here we only keep listing → quantity (and
//   the count), loaded with ONE call and reused for 2 minutes in this tab
//   (sessionStorage), then updated from each change's result. Prices, stock
//   and totals are always live on the cart page.
// - Guest: the cart lives in this browser (localStorage) with a snapshot of
//   what was shown (name, price…) for the cart page, and is sent to the
//   backend once right after login (mergeGuestCart), then cleared.

export type GuestItem = {
  listingId: string;
  quantity: number;
  storeId: string;
  storeName: string;
  productId: number;
  variantId: number;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  foodType: FoodType | null;
  /** As shown when added; the real price is checked after login. */
  price: number;
  mrp: number;
  maxOrderQuantity: number;
  href: string;
};

type State = {
  mode: "unknown" | "guest" | "user";
  guest: GuestItem[];
  server: CartLines | null;
  /** listingIds with a change on the way (their buttons wait). */
  busy: string[];
};

const GUEST_KEY = "360mart.cart";
const LINES_KEY = "360mart.cartLines";
const LINES_TTL = 2 * 60_000;

let state: State = { mode: "unknown", guest: [], server: null, busy: [] };
const listeners = new Set<() => void>();
const SERVER_STATE: State = { mode: "unknown", guest: [], server: null, busy: [] };

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function readGuest(): GuestItem[] {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((i) => i && typeof i.listingId === "string" && Number.isInteger(i.quantity) && i.quantity > 0).slice(0, CART_ITEM_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeGuest(items: GuestItem[]) {
  try {
    if (items.length) localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // Storage blocked: the cart lasts for this visit.
  }
  set({ guest: items });
}

function saveLines(lines: CartLines | null) {
  try {
    if (lines) sessionStorage.setItem(LINES_KEY, JSON.stringify({ at: Date.now(), lines }));
    else sessionStorage.removeItem(LINES_KEY);
  } catch {
    // ignore
  }
  set({ server: lines });
}

function cachedLines(): CartLines | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LINES_KEY) ?? "null");
    return saved && Date.now() - saved.at < LINES_TTL ? saved.lines : null;
  } catch {
    return null;
  }
}

let loading: Promise<void> | null = null;

/**
 * Called by <CartSync> when the login state is known. Signed in: send a guest
 * cart left in this browser (once), then load what's in the cart (cached).
 */
export function syncCart(mode: "guest" | "user") {
  if (mode === "guest") {
    if (state.mode !== "guest") set({ mode: "guest", guest: readGuest(), server: null });
    return;
  }
  if (state.mode === "user" && (state.server || loading)) return;
  set({ mode: "user", guest: readGuest() });
  loading = (async () => {
    const guest = readGuest();
    if (guest.length) {
      const res = await mergeGuestCartAction(guest.map((g) => ({ listingId: g.listingId, quantity: g.quantity })));
      if (res.ok) {
        writeGuest([]);
        toastSuccess(res.data.message);
        if (res.data.cart) {
          saveLines(res.data.cart);
          return;
        }
      }
    }
    const cached = cachedLines();
    if (cached) return saveLines(cached);
    const res = await cartLinesAction();
    if (res.ok) saveLines(res.data);
  })().finally(() => {
    loading = null;
  });
}

/** After a checkout or a change on the cart page: the cart page already has the full cart. */
export function replaceCartLines(lines: CartLines) {
  saveLines(lines);
}

/** Forget the cached lines (next sync loads them again). */
export function invalidateCartLines() {
  saveLines(null);
  if (state.mode === "user") {
    state = { ...state, mode: "unknown" };
    syncCart("user");
  }
}

/**
 * Add, change or remove (0) one item. Signed in = the backend (PUT/DELETE);
 * guest = this browser. Returns true when it worked. `snapshot` is needed only
 * for a guest's first add of an item.
 */
export async function setItemQuantity(listingId: string, quantity: number, snapshot?: Omit<GuestItem, "quantity">): Promise<boolean> {
  const qty = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
  if (state.mode === "guest" || state.mode === "unknown") {
    const items = readGuest();
    const at = items.findIndex((i) => i.listingId === listingId);
    if (qty === 0) writeGuest(items.filter((i) => i.listingId !== listingId));
    else if (at >= 0) writeGuest(items.map((i) => (i.listingId === listingId ? { ...i, quantity: qty } : i)));
    else if (snapshot) {
      if (items.length >= CART_ITEM_LIMIT) {
        toastError(`Your cart can hold ${CART_ITEM_LIMIT} different items.`);
        return false;
      }
      writeGuest([...items, { ...snapshot, quantity: qty }]);
    } else return false;
    return true;
  }

  set({ busy: [...state.busy, listingId] });
  try {
    const res = await setCartItemAction({ listingId, quantity: qty });
    if (!res.ok) {
      toastError(res.error.message);
      return false;
    }
    const lines = { ...(state.server?.lines ?? {}) };
    if (qty === 0) delete lines[listingId];
    else lines[listingId] = qty;
    saveLines({ itemCount: Object.keys(lines).length, lines });
    return true;
  } finally {
    set({ busy: state.busy.filter((id) => id !== listingId) });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the guest cart.
  const onStorage = (e: StorageEvent) => {
    if (e.key === GUEST_KEY && state.mode !== "user") set({ guest: readGuest() });
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCartState(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/** Number of different items (the header badge); null while unknown. */
export function cartCount(s: State): number | null {
  if (s.mode === "guest") return s.guest.length;
  if (s.mode === "user") return s.server ? s.server.itemCount : null;
  return null;
}

export function quantityIn(s: State, listingId: string): number {
  if (s.mode === "user") return s.server?.lines[listingId] ?? 0;
  return s.guest.find((i) => i.listingId === listingId)?.quantity ?? 0;
}
