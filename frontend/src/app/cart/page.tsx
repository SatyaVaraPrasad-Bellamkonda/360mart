import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/cart/CartView";
import { GuestCartView } from "@/components/cart/GuestCartView";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { loadAddresses } from "@/lib/addresses/data";
import { getCurrentUser } from "@/lib/auth/dal";
import { toAddressChoices, pickAddress } from "@/lib/orders/address-choice";
import { loadCart } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

// /cart: everything in the cart, grouped by store (each store becomes its own
// order). Signed in = the backend's cart, priced live for the chosen address
// (2 calls: addresses, then the cart). Guests see the cart kept in their
// browser and log in to check out.
export default function CartPage({ searchParams }: PageProps<"/cart">) {
  return (
    <div className="min-h-[70vh] bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<CartSkeleton />}>
          <Cart searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Cart({ searchParams }: Pick<PageProps<"/cart">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <GuestCartView />;
  if (user.role === "admin") return <EmptyOrders title="Admin accounts don't shop" text="Log in with a customer or shopkeeper account to use the cart." />;

  const { address } = await searchParams;
  const addresses = await loadAddresses("/cart");
  const choices = addresses.ok ? toAddressChoices(addresses.data) : [];
  const chosen = pickAddress(choices, typeof address === "string" ? address : undefined);
  const cart = await loadCart("/cart", chosen?.addressId);
  if (!cart.ok) return <EmptyOrders title="Couldn't load your cart" text={cart.error.message} />;
  return <CartView key={chosen?.addressId ?? "none"} initialCart={cart.data} addresses={choices} initialAddressId={chosen?.addressId ?? null} />;
}

function CartSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-line/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/50" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-80 animate-pulse rounded-3xl bg-line/50" />
        <div className="h-60 animate-pulse rounded-3xl bg-line/50" />
      </div>
    </div>
  );
}
