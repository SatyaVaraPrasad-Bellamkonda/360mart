"use client";

import { useEffect } from "react";
import { forgetCart } from "@/components/cart/cart-store";
import { setDeliveryLocation } from "@/components/location/delivery-location";
import { resetUnread } from "@/components/notifications/unread-store";
import { clearRecent } from "@/lib/search/recent";

// After an account is deleted: nothing of it stays in this browser (cart copy,
// Deliver-to point, recent searches, the bell's count). The header learns the
// user is gone from the server's render after the redirect.
export function ForgetThisBrowser() {
  useEffect(() => {
    forgetCart();
    setDeliveryLocation(null);
    clearRecent();
    resetUnread();
    try {
      sessionStorage.clear();
    } catch {
      // storage blocked: nothing was kept there either
    }
  }, []);
  return null;
}
