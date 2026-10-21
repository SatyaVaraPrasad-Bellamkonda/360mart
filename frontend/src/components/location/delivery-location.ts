"use client";

import { useSyncExternalStore } from "react";
import { readLocation, type DeliveryLocation } from "@/lib/location/types";

// The shopper's "Deliver to" point, shared by every screen that needs it (like
// an AngularJS service). Remembered in this browser only (localStorage), so the
// product page doesn't ask again; never sent anywhere except with the offers
// request. Storage can be unavailable (private mode): then it lasts for this visit.

const KEY = "360mart.deliverTo";
const listeners = new Set<() => void>();
let current: DeliveryLocation | null | undefined; // undefined = not read from storage yet

function read(): DeliveryLocation | null {
  if (current !== undefined) return current;
  try {
    current = readLocation(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = null;
  }
  return current;
}

export function setDeliveryLocation(location: DeliveryLocation | null) {
  current = location;
  try {
    if (location) localStorage.setItem(KEY, JSON.stringify(location));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: keep it in memory for this visit.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The chosen location; null on the server and until one is chosen. */
export function useDeliveryLocation(): DeliveryLocation | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
