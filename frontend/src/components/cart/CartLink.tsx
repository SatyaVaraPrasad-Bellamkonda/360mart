"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cartCount, syncCart, useCartState } from "./cart-store";

// The header's cart button with the number of items. It also starts the cart
// state for the page (guest cart from this browser, or the signed-in cart,
// sending a guest cart left from before login). Admins don't shop: hidden.
export function CartLink() {
  const { user, status } = useAuth();
  const cart = useCartState();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") syncCart("guest");
    else if (status === "authenticated" && user?.role !== "admin") syncCart("user");
  }, [status, user?.role]);

  if (user?.role === "admin" || pathname.startsWith("/admin")) return null;
  const count = cartCount(cart);
  const active = pathname === "/cart" || pathname === "/checkout";
  return (
    <Link
      href="/cart"
      aria-label={count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
      aria-current={active ? "page" : undefined}
      className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ring-1 transition ${active ? "bg-brand-soft text-brand-deep ring-brand/50" : "bg-white text-ink ring-line hover:ring-ink"}`}
    >
      <ShoppingBag aria-hidden className="size-5" />
      {!!count && (
        <span key={count} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-extrabold text-ink ring-2 ring-white motion-safe:animate-pop-in">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function CartLinkFallback() {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line">
      <ShoppingBag className="size-5" />
    </span>
  );
}
