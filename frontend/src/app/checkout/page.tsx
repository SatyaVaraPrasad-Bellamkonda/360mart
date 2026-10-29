import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutView } from "@/components/cart/CheckoutView";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { loadAddresses } from "@/lib/addresses/data";
import { getCurrentUser } from "@/lib/auth/dal";
import { isUuidLike } from "@/lib/inventory/validation";
import { pickAddress, toAddressChoices } from "@/lib/orders/address-choice";
import { loadCart } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

// /checkout?address=<id>&stores=<id,id>: confirm the address, add notes for the
// stores, and place one order per store (cash on delivery). The cart is read
// again here so the shopper confirms today's prices (2 calls).
export default function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  return (
    <div className="min-h-[70vh] bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/50" />}>
          <Checkout searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Checkout({ searchParams }: Pick<PageProps<"/checkout">, "searchParams">) {
  const { address, stores } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const back = `/checkout?${new URLSearchParams({ ...(typeof address === "string" ? { address } : {}), ...(typeof stores === "string" ? { stores } : {}) })}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }
  if (user.role === "admin") return <EmptyOrders title="Admin accounts don't shop" text="Log in with a customer or shopkeeper account to place orders." />;

  const addresses = await loadAddresses("/checkout");
  const choices = addresses.ok ? toAddressChoices(addresses.data) : [];
  const chosen = pickAddress(choices, typeof address === "string" ? address : undefined);
  const cart = await loadCart("/checkout", chosen?.addressId);
  if (!cart.ok) return <EmptyOrders title="Couldn't load your cart" text={cart.error.message} />;
  if (!cart.data.stores.length) redirect("/cart");

  const wanted = (typeof stores === "string" ? stores.split(",") : []).filter(isUuidLike).slice(0, 10);
  return <CheckoutView initialCart={cart.data} addresses={choices} initialAddressId={chosen?.addressId ?? null} wantedStores={wanted} />;
}
