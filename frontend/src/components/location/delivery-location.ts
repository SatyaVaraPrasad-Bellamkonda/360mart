"use client";

import { useSyncExternalStore } from "react";
import { readLocation, sameSpot, type DeliveryLocation } from "@/lib/location/types";

// The shopper's "Deliver to" point, shared by every screen that needs it (like
// an AngularJS service): the header chip, the product page's store offers, the
// cart. Remembered in this browser only (localStorage), never sent anywhere
// except as coordinates with the requests that need them. Storage can be
// unavailable (private mode): then it lasts for this visit.
//
// Also kept here: the last few places used (to pick again in one tap), and
// whether the one shared location sheet is open, so any screen can open it.

const KEY = "360mart.deliverTo";
const RECENT_KEY = "360mart.recentPlaces";
const RECENT_MAX = 3;

type State = { location: DeliveryLocation | null; recent: DeliveryLocation[]; pickerOpen: boolean; firstTime: boolean };

const listeners = new Set<() => void>();
let state: State | undefined; // undefined = not read from storage yet
const SERVER: State = { location: null, recent: [], pickerOpen: false, firstTime: false };

function load(): State {
  if (state) return state;
  let location: DeliveryLocation | null = null;
  let recent: DeliveryLocation[] = [];
  try {
    location = readLocation(JSON.parse(localStorage.getItem(KEY) ?? "null"));
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (Array.isArray(list)) recent = list.map(readLocation).filter((l): l is DeliveryLocation => !!l).slice(0, RECENT_MAX);
  } catch {
    // Unreadable or blocked: start empty.
  }
  state = { location, recent, pickerOpen: false, firstTime: false };
  return state;
}

function set(patch: Partial<State>) {
  state = { ...load(), ...patch };
  for (const listener of listeners) listener();
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: keep it in memory for this visit.
  }
}

/** Use this point from now on (and remember it among the recent places). null = forget it. */
export function setDeliveryLocation(location: DeliveryLocation | null) {
  if (!location) {
    save(KEY, null);
    return set({ location: null });
  }
  // Newest first, one entry per spot. Not kept: saved addresses (listed on their
  // own) and an unnamed current location ("Use my current location" is one tap anyway).
  const keep = location.source !== "address" && !(location.source === "device" && location.label === "Your location");
  const recent = keep ? [location, ...load().recent.filter((r) => !sameSpot(r, location))].slice(0, RECENT_MAX) : load().recent;
  save(KEY, location);
  save(RECENT_KEY, recent);
  set({ location, recent });
}

/** Forget everything this browser kept (after logout-everywhere or account deletion). */
export function forgetDeliveryLocations() {
  save(KEY, null);
  save(RECENT_KEY, null);
  set({ location: null, recent: [] });
}

/** Open the location sheet. firstTime = the welcome version shown before anything is chosen. */
export function openLocationPicker(firstTime = false) {
  set({ pickerOpen: true, firstTime });
}

export function closeLocationPicker() {
  set({ pickerOpen: false, firstTime: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab chose a place: read storage again.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== RECENT_KEY) return;
    const open = state ? { pickerOpen: state.pickerOpen, firstTime: state.firstTime } : {};
    state = undefined;
    state = { ...load(), ...open };
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function useStore(): State {
  return useSyncExternalStore(subscribe, load, () => SERVER);
}

/** The chosen location; null on the server and until one is chosen. */
export function useDeliveryLocation(): DeliveryLocation | null {
  return useStore().location;
}

/** Everything the location sheet needs. */
export function useLocationPicker() {
  return useStore();
}

/** True once this browser's storage has been read (so "no location" really means none, not "not read yet"). */
export function useLocationReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
