"use client";

import { ShoppingCart } from "lucide-react";
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
      className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl transition md:size-11 md:rounded-[14px] ${active ? "bg-brand-soft text-brand-deep" : "text-ink hover:bg-[#f4f1ec]"}`}
    >
      <ShoppingCart aria-hidden strokeWidth={1.9} className="size-5" />
      {!!count && (
        <span key={count} className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ea6a0a] px-1 text-[10px] font-extrabold text-white ring-2 ring-white motion-safe:animate-pop-in">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function CartLinkFallback() {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink md:size-11 md:rounded-[14px]">
      <ShoppingCart strokeWidth={1.9} className="size-5" />
    </span>
  );
}
