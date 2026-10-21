"use client";

import { ChevronRight, Home, Loader2, LocateFixed, Map as MapIcon, MapPinOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PinSection } from "@/components/addresses/PinSection";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { toastError } from "@/components/Toaster";
import { suggestFromPinAction } from "@/lib/addresses/actions";
import type { Coordinates } from "@/lib/addresses/types";
import { insideIndia, round6 } from "@/lib/addresses/validation";
import { loadAddressChoicesAction } from "@/lib/location/actions";
import type { AddressChoice, DeliveryLocation } from "@/lib/location/types";
import type { MapConfig } from "@/lib/maps/config";
import type { PlaceSuggestion } from "@/lib/maps/geocoder";
import { setDeliveryLocation } from "./delivery-location";

const PIN_COPY = { title: "Pin the delivery point", optional: false, help: "Stores that deliver to this point are shown." };

/** "Kukatpally, Hyderabad" from a place lookup, or a fallback. */
const placeLabel = (p: PlaceSuggestion | null, fallback: string) => [p?.area, p?.city].filter(Boolean).join(", ") || fallback;

// "Deliver to": a saved address (signed-in shoppers, those with a map pin), the
// device's current location, or a pin on the map. Place search and names from
// the pin need a login (our lookup service isn't open to everyone); guests can
// still use their location or the map.
export function DeliverToDialog({ open, onClose, map }: { open: boolean; onClose: () => void; map: MapConfig }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  const lookups = map.canSuggest && signedIn;
  const [addresses, setAddresses] = useState<AddressChoice[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [pin, setPin] = useState<Coordinates | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Saved addresses: one call, the first time the picker opens for this login.
  useEffect(() => {
    if (!open || !signedIn || loadedFor.current === "done") return;
    loadedFor.current = "done";
    loadAddressChoicesAction().then((res) => setAddresses(res.ok ? res.data : []));
  }, [open, signedIn]);

  function choose(location: DeliveryLocation) {
    setDeliveryLocation(location);
    onClose();
  }

  function useDevice() {
    if (!("geolocation" in navigator)) return toastError("This browser can't share your location. Pick the point on the map instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const here = { latitude: round6(coords.latitude), longitude: round6(coords.longitude) };
        if (!insideIndia(here)) {
          setLocating(false);
          return toastError("Your location seems to be outside India. Pick the point on the map instead.");
        }
        // A name for it when we're allowed to look one up; otherwise a plain label.
        let label = "Current location";
        if (lookups) {
          const res = await suggestFromPinAction(here.latitude, here.longitude);
          if (res.ok) label = placeLabel(res.data, label);
        }
        setLocating(false);
        choose({ ...here, label, source: "device" });
      },
      (failure) => {
        setLocating(false);
        toastError(failure.code === failure.PERMISSION_DENIED ? "Location access is off for this site. Pick the point on the map instead." : "We couldn't get your location. Pick the point on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Where should we deliver?" description="We'll show the stores that deliver there.">
      <div className="space-y-5 pb-5">
        <button type="button" onClick={useDevice} disabled={locating} className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-ink px-4 text-left font-semibold text-white transition hover:bg-ink/85 disabled:opacity-70">
          {locating ? <Loader2 aria-hidden className="size-5 shrink-0 animate-spin" /> : <LocateFixed aria-hidden className="size-5 shrink-0" />}
          <span className="min-w-0 flex-1">
            <span className="block">{locating ? "Finding you…" : "Use my current location"}</span>
            <span className="block text-xs font-normal text-white/70">Your browser asks for permission first</span>
          </span>
        </button>

        <section aria-labelledby="saved-heading">
          <h3 id="saved-heading" className="text-sm font-bold text-ink">
            Saved addresses
          </h3>
          {!signedIn ? (
            <p className="mt-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
              <Link href={`/login?next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                Log in
              </Link>{" "}
              to deliver to one of your saved addresses.
            </p>
          ) : addresses === null ? (
            <div aria-hidden className="mt-2 space-y-2">
              <div className="h-14 animate-pulse rounded-2xl bg-line/60" />
              <div className="h-14 animate-pulse rounded-2xl bg-line/60" />
            </div>
          ) : addresses.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
              No saved addresses yet.{" "}
              <Link href="/account/addresses/new" className="font-semibold text-ink underline-offset-2 hover:underline">
                Add one
              </Link>
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {addresses.map((a) =>
                a.latitude != null && a.longitude != null ? (
                  <li key={a.addressId}>
                    <button
                      type="button"
                      onClick={() => choose({ latitude: a.latitude!, longitude: a.longitude!, label: a.line || a.title, source: "address", addressId: a.addressId })}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 py-2 text-left ring-1 ring-line transition hover:ring-ink"
                    >
                      <Home aria-hidden className="size-5 shrink-0 text-brand-deep" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold text-ink">
                          {a.title}
                          {a.isDefault && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-deep">Default</span>}
                        </span>
                        <span className="block truncate text-sm text-muted">{a.line}</span>
                      </span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                    </button>
                  </li>
                ) : (
                  // Without a pin we can't tell which stores reach it.
                  <li key={a.addressId} className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-4 py-2 ring-1 ring-line">
                    <MapPinOff aria-hidden className="size-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink/70">{a.title}</span>
                      <span className="block truncate text-sm text-muted">{a.line}: no map pin</span>
                    </span>
                    <Link href={`/account/addresses/${a.addressId}/edit`} className="flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                      Add pin
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="map-heading" className="space-y-3">
          <h3 id="map-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
            <MapIcon aria-hidden className="size-4" />
            Or pick it on the map
          </h3>
          <PinSection
            pin={pin}
            onPin={(next) => {
              setPin(next);
              setPinLabel(null);
            }}
            map={{ ...map, canSuggest: lookups }}
            onSuggest={(place) => {
              setPinLabel(placeLabel(place, "Pinned location"));
              return [];
            }}
            onActionError={() => {}}
            copy={PIN_COPY}
          />
          {pin && (
            <button
              type="button"
              onClick={() => choose({ ...pin, label: pinLabel ?? "Pinned location", source: "map" })}
              className="flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85"
            >
              Deliver to {pinLabel ?? "this point"}
            </button>
          )}
        </section>
      </div>
    </Dialog>
  );
}
