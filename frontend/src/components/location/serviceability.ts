"use client";

import { useEffect, useSyncExternalStore } from "react";
import { checkServiceability } from "@/lib/location/client";
import type { DeliveryLocation, Serviceability } from "@/lib/location/types";
import { useDeliveryLocation } from "./delivery-location";

// "Do stores deliver to the chosen point?", shared by the header dot, the area
// strip and the location sheet (like an AngularJS service with a cache). One
// GET /serviceability per point per page load: the answer lives only in
// memory, never in storage, because stores open, close and change their radius.
// A failed call (429, offline) keeps whatever was known; nothing is retried in a loop.

type Entry = { state: "loading" } | { state: "done"; data: Serviceability } | { state: "unknown" };

const keyOf = (p: { latitude: number; longitude: number }) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function put(key: string, entry: Entry) {
  entries.set(key, entry);
  version++;
  for (const l of listeners) l();
}

/** Checks a point (or returns the answer already known for it this page load). */
export async function serviceabilityOf(point: { latitude: number; longitude: number }): Promise<Serviceability | null> {
  const key = keyOf(point);
  const known = entries.get(key);
  if (known?.state === "done") return known.data;
  if (known?.state === "loading") return waitFor(key);
  put(key, { state: "loading" });
  const res = await checkServiceability(point.latitude, point.longitude);
  put(key, res.ok ? { state: "done", data: res.data } : { state: "unknown" });
  return res.ok ? res.data : null;
}

function waitFor(key: string): Promise<Serviceability | null> {
  return new Promise((resolve) => {
    const check = () => {
      const e = entries.get(key);
      if (e?.state === "loading") return;
      listeners.delete(check);
      resolve(e?.state === "done" ? e.data : null);
    };
    listeners.add(check);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The answer for the chosen location: undefined while it's being checked (or
 * nothing is chosen), null when it couldn't be checked, else the counts.
 */
export function useServiceability(): { location: DeliveryLocation | null; result: Serviceability | null | undefined } {
  const location = useDeliveryLocation();
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  const entry = location ? entries.get(keyOf(location)) : undefined;

  useEffect(() => {
    if (location && !entries.has(keyOf(location))) void serviceabilityOf(location);
  }, [location]);

  if (!location || !entry || entry.state === "loading") return { location, result: undefined };
  return { location, result: entry.state === "done" ? entry.data : null };
}

/** "3 stores deliver here · nearest 1.2 km" (only for a serviceable answer). */
export function deliveryLine(s: Serviceability): string {
  const stores = `${s.storeCount} ${s.storeCount === 1 ? "store delivers" : "stores deliver"} here`;
  return s.nearestStoreKm != null ? `${stores} · nearest ${formatKm(s.nearestStoreKm)}` : stores;
}

// The backend rounds to 0.1 km, so a store next door is "0.0": say metres under 1 km.
function formatKm(km: number): string {
  if (km < 0.1) return "under 100 m";
  if (km < 1) return `${Math.round(km * 10) * 100} m`;
  return `${km < 10 ? Number(km.toFixed(1)) : Math.round(km)} km`;
}

/** The three looks: delivering (some open), all closed right now, not here yet. */
export type ServiceTone = "open" | "closed" | "none";
export const toneOf = (s: Serviceability): ServiceTone => (!s.serviceable ? "none" : s.openNowCount > 0 ? "open" : "closed");
