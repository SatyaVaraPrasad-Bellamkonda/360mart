"use client";

import { ArrowLeft, Briefcase, Check, ChevronRight, Clock, Home, Loader2, LocateFixed, MapPin, MapPinOff, Map as MapIcon, Navigation, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { searchPlacesAction, suggestFromPinAction } from "@/lib/addresses/actions";
import type { Coordinates } from "@/lib/addresses/types";
import { insideIndia, round6 } from "@/lib/addresses/validation";
import { loadAddressChoices } from "@/lib/location/client";
import { areaName, sameSpot, type AddressChoice, type DeliveryLocation } from "@/lib/location/types";
import type { MapConfig } from "@/lib/maps/config";
import type { PlaceMatch, PlaceSuggestion } from "@/lib/maps/geocoder";
import { closeLocationPicker, setDeliveryLocation, useLocationPicker } from "./delivery-location";
import { deliveryLine, serviceabilityOf, toneOf, useServiceability } from "./serviceability";

const LocationPicker = dynamic(() => import("@/components/addresses/LocationPicker"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full animate-pulse bg-line/50" />,
});

/** "Kukatpally, Hyderabad" from a place lookup, or a fallback. */
const placeLabel = (p: PlaceSuggestion | null, fallback: string) => [p?.area, p?.city].filter(Boolean).join(", ") || fallback;

type MapStart = { pin: Coordinates | null; label: string | null };

// The one "Where should we deliver?" sheet, opened from the header chip, the
// product page, or by itself on a first visit (LocationHost). Ways to choose:
// current location (fastest), place search (signed in: our lookup service
// isn't open to everyone), saved addresses with a map pin, recent places on
// this device, or a pin on the map. Rendered once in the root layout.
export function LocationSheet({ map }: { map: MapConfig }) {
  const { pickerOpen, firstTime, location, recent } = useLocationPicker();
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"list" | "map" | "checking" | "none">("list");
  const [missed, setMissed] = useState<DeliveryLocation | null>(null);
  const [mapStart, setMapStart] = useState<MapStart>({ pin: null, label: null });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pickerOpen && !dialog.open) dialog.showModal();
    if (!pickerOpen && dialog.open) dialog.close();
  }, [pickerOpen]);

  function close() {
    closeLocationPicker();
    setView("list");
  }

  // Saved at once (the shopper may still browse), then checked: stores
  // deliver → close with the count; nobody does → say so here and offer
  // another try. A failed check (429, offline) just closes as before.
  async function choose(next: DeliveryLocation) {
    setDeliveryLocation(next);
    setView("checking");
    const result = await serviceabilityOf(next);
    if (result && !result.serviceable) {
      setMissed(next);
      return setView("none");
    }
    close();
    if (!result) return toastSuccess(`Delivering to ${next.label}`);
    toastSuccess(toneOf(result) === "closed" ? `Delivering to ${next.label} · stores here are closed right now` : `Delivering to ${next.label} · ${deliveryLine(result)}`);
  }

  function openMap(start: MapStart) {
    setMapStart(start);
    setView("map");
  }

  return (
    <dialog
      ref={ref}
      aria-label="Where should we deliver?"
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
      className="m-0 mt-auto max-h-[94dvh] w-full max-w-none overflow-hidden rounded-t-[28px] bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm open:motion-safe:animate-sheet-up sm:m-auto sm:max-w-lg sm:rounded-[28px] sm:open:motion-safe:animate-fade-up"
    >
      {pickerOpen && (
        <div className="flex max-h-[94dvh] flex-col">
          {view === "list" ? (
            <ListView map={map} firstTime={firstTime} current={location} recent={recent} onChoose={choose} onMap={openMap} onClose={close} />
          ) : view === "map" ? (
            <MapView map={map} start={mapStart} onBack={() => setView("list")} onChoose={choose} />
          ) : view === "checking" ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center" role="status">
              <Loader2 aria-hidden className="size-7 animate-spin text-brand-deep" />
              <p className="font-semibold text-ink">Checking stores near you…</p>
            </div>
          ) : (
            <NotHere label={missed ? areaName(missed.label) : "your area"} onRetry={() => setView("list")} onClose={close} />
          )}
        </div>
      )}
    </dialog>
  );
}

// ---- the list: current location, search, saved, recent, map ----

function ListView({ map, firstTime, current, recent, onChoose, onMap, onClose }: { map: MapConfig; firstTime: boolean; current: DeliveryLocation | null; recent: DeliveryLocation[]; onChoose: (l: DeliveryLocation) => void; onMap: (start: MapStart) => void; onClose: () => void }) {
  const { status } = useAuth();
  const signedIn = status === "authenticated";
  const lookups = map.canSuggest && signedIn;
  const [addresses, setAddresses] = useState<AddressChoice[] | null>(null);
  const [locating, setLocating] = useState(false);

  // Saved addresses: one call each time the sheet opens (they may have changed on the addresses page).
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    loadAddressChoices().then((res) => live && setAddresses(res.ok ? res.data : []));
    return () => {
      live = false;
    };
  }, [signedIn]);

  function useDevice() {
    if (!("geolocation" in navigator)) return toastError("This browser can't share your location. Search or pick the point on the map instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const here = { latitude: round6(coords.latitude), longitude: round6(coords.longitude) };
        if (!insideIndia(here)) {
          setLocating(false);
          return toastError("Your location seems to be outside India. Pick the point on the map instead.");
        }
        // A name for it when we're allowed to look one up; otherwise a plain label.
        let label = "Your location";
        if (lookups) {
          const res = await suggestFromPinAction(here.latitude, here.longitude);
          if (res.ok) label = placeLabel(res.data, label);
        }
        setLocating(false);
        onChoose({ ...here, label, source: "device" });
      },
      (failure) => {
        setLocating(false);
        toastError(failure.code === failure.PERMISSION_DENIED ? "Location access is off for this site. Search or pick the point on the map instead." : "We couldn't get your location. Search or pick the point on the map instead.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  const next = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
  const pinned = addresses?.filter((a) => a.latitude != null && a.longitude != null) ?? [];
  const unpinned = addresses?.filter((a) => a.latitude == null || a.longitude == null) ?? [];

  return (
    <>
      {firstTime ? (
        <Welcome onClose={onClose} />
      ) : (
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Change delivery location</h2>
            {current && (
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted">
                <MapPin aria-hidden className="size-3.5 shrink-0 text-brand-deep" />
                <span className="truncate">Now: {current.label}</span>
              </p>
            )}
            {current && <CurrentStatus />}
          </div>
          <CloseButton onClose={onClose} />
        </div>
      )}

      <div className="space-y-5 overflow-y-auto px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={useDevice}
          disabled={locating}
          className="group flex min-h-16 w-full items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-white shadow-lg shadow-ink/15 transition hover:bg-ink/90 active:scale-[0.99] disabled:opacity-80"
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            {!locating && <span aria-hidden className="absolute inset-0 rounded-full bg-brand/40 motion-safe:animate-ping" />}
            {locating ? <Loader2 aria-hidden className="relative size-5 animate-spin" /> : <LocateFixed aria-hidden className="relative size-5 text-brand" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{locating ? "Finding you…" : "Use my current location"}</span>
            <span className="block text-xs text-white/70">Fastest. Your browser asks for permission first</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-white/60 transition group-hover:translate-x-0.5" />
        </button>

        {map.canSuggest &&
          (signedIn ? (
            <PlaceSearch onPick={(m) => onMap({ pin: { latitude: m.latitude, longitude: m.longitude }, label: placeLabel(m.place, m.label) })} />
          ) : (
            <Link href={`/login?next=${encodeURIComponent(next)}`} onClick={onClose} className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface px-4 py-2 text-sm text-muted ring-1 ring-line transition hover:ring-ink">
              <Search aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-ink">Log in</span> to search by area or street name
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0" />
            </Link>
          ))}

        <button
          type="button"
          onClick={() => onMap({ pin: current ? { latitude: current.latitude, longitude: current.longitude } : null, label: current?.label ?? null })}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 py-2 text-left ring-1 ring-line transition hover:ring-ink"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
            <MapIcon aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">Choose on the map</span>
            <span className="block text-sm text-muted">Drop a pin right at your door</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
        </button>

        {signedIn ? (
          <Group title="Saved addresses">
            {addresses === null ? (
              <div aria-hidden className="space-y-2">
                <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
                <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
              </div>
            ) : addresses.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
                No saved addresses yet.{" "}
                <Link href="/account/addresses/new" onClick={onClose} className="font-semibold text-ink underline-offset-2 hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {pinned.map((a) => {
                  const here = { latitude: a.latitude!, longitude: a.longitude! };
                  // Only the place actually picked is marked (a map pin near Home is not "Home").
                  const picked = current?.addressId === a.addressId;
                  return (
                    <li key={a.addressId}>
                      <Choice
                        icon={a.title === "Work" ? Briefcase : a.title === "Home" ? Home : MapPin}
                        title={a.title}
                        line={a.line}
                        tag={a.isDefault ? "Default" : null}
                        picked={picked}
                        onClick={() => onChoose({ ...here, label: a.line || a.title, source: "address", addressId: a.addressId })}
                      />
                    </li>
                  );
                })}
                {/* Without a pin we can't tell which stores reach it. */}
                {unpinned.map((a) => (
                  <li key={a.addressId} className="flex min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 py-2 ring-1 ring-line">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-muted ring-1 ring-line">
                      <MapPinOff aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink/70">{a.title}</span>
                      <span className="block truncate text-sm text-muted">{a.line}: no map pin</span>
                    </span>
                    <Link href={`/account/addresses/${a.addressId}/edit`} onClick={onClose} className="flex min-h-10 shrink-0 items-center rounded-full bg-white px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                      Add pin
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Group>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(next)}`} onClick={onClose} className="mx-auto flex min-h-10 w-fit items-center rounded-full px-3 text-center text-sm text-muted hover:text-ink">
            <span>
              <span className="font-semibold text-ink">Log in</span> to deliver to a saved address
            </span>
          </Link>
        )}

        {recent.length > 0 && (
          <Group title="Recently used">
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <Choice icon={Clock} title={r.label} line={r.label === "Pinned location" ? `Pin at ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : r.source === "device" ? "Your location then" : "Pinned on the map"} picked={!!current && !current.addressId && sameSpot(current, r)} onClick={() => onChoose(r)} />
                </li>
              ))}
            </ul>
          </Group>
        )}

        {firstTime && (
          <button type="button" onClick={onClose} className="mx-auto flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
            Not now, I&apos;m just looking around
          </button>
        )}
      </div>
    </>
  );
}

// The first visit: a friendly header with a pulsing pin.
function Welcome({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-brand-soft via-brand-soft/40 to-white px-5 pb-3 pt-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="absolute right-3 top-3">
        <CloseButton onClose={onClose} />
      </div>
      <div className="relative mx-auto flex size-16 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-brand/25 motion-safe:animate-ping" />
        <span aria-hidden className="absolute inset-2 rounded-full bg-brand/30" />
        <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-deep text-white shadow-lg shadow-brand/30">
          <MapPin aria-hidden className="size-6" />
        </span>
      </div>
      <h2 className="relative mt-3 text-xl font-extrabold tracking-tight text-ink">Where should we deliver?</h2>
      <p className="relative mx-auto mt-1 max-w-xs text-sm text-muted">We&apos;ll show the neighbourhood stores that deliver to you, with their live prices.</p>
    </div>
  );
}

function PlaceSearch({ onPick }: { onPick: (m: PlaceMatch) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, start] = useTransition();

  // On Enter / the button only: the lookup service doesn't allow search-as-you-type.
  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) return setError("Type at least 3 letters of an area, street or landmark.");
    setError(null);
    start(async () => {
      const res = await searchPlacesAction(q);
      if (res.ok) setResults(res.data);
      else {
        setResults(null);
        setError(res.error.message);
      }
    });
  }

  return (
    <div>
      <form onSubmit={submit} role="search" className="flex items-center gap-2 rounded-2xl bg-surface p-1.5 pl-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
        <Search aria-hidden className="size-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Area, street or landmark"
          aria-label="Search area, street or landmark"
          enterKeyHint="search"
          maxLength={200}
          className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/80"
        />
        <button type="submit" disabled={searching} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink disabled:opacity-60">
          {searching ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Search
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {results && (
        <ul className="mt-2 overflow-hidden rounded-2xl ring-1 ring-line" aria-label="Places found">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">Nothing found. Try a nearby landmark, or choose on the map.</li>
          ) : (
            results.map((m) => (
              <li key={`${m.latitude},${m.longitude}`} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => onPick(m)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-surface">
                  <MapPin aria-hidden className="size-4 shrink-0 text-brand-deep" />
                  <span className="min-w-0 flex-1 text-sm text-ink">{m.label}</span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ---- the map: tap or drag the pin, then confirm ----

function MapView({ map, start, onBack, onChoose }: { map: MapConfig; start: MapStart; onBack: () => void; onChoose: (l: DeliveryLocation) => void }) {
  const { status } = useAuth();
  const lookups = map.canSuggest && status === "authenticated";
  const [pin, setPin] = useState<Coordinates | null>(start.pin);
  const [label, setLabel] = useState<string | null>(start.label);
  const [lookingUp, setLookingUp] = useState(false);
  const [broken, setBroken] = useState(false);
  const lookup = useRef<{ timer?: ReturnType<typeof setTimeout>; id: number }>({ id: 0 });

  useEffect(() => () => clearTimeout(lookup.current.timer), []);

  // Each move looks up the place name (700 ms after the last move; the newest pin wins).
  function move(next: Coordinates) {
    setPin(next);
    setLabel(null);
    if (!lookups) return;
    clearTimeout(lookup.current.timer);
    const id = ++lookup.current.id;
    setLookingUp(true);
    lookup.current.timer = setTimeout(async () => {
      const res = await suggestFromPinAction(next.latitude, next.longitude);
      if (id !== lookup.current.id) return;
      setLookingUp(false);
      setLabel(res.ok ? placeLabel(res.data, "Pinned location") : "Pinned location");
    }, 700);
  }

  const name = label ?? "Pinned location";
  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-3 pt-4">
        <button type="button" onClick={onBack} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface">
          <ArrowLeft aria-hidden className="size-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Pin your delivery point</h2>
          <p className="text-sm text-muted">Tap the map or drag the pin to your door.</p>
        </div>
      </div>
      <div className="relative h-[46dvh] min-h-64 w-full overflow-hidden border-y border-line bg-surface">
        {broken ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted">
            <MapPinOff aria-hidden className="size-6" />
            The map couldn&apos;t load. Use your current location or search instead.
          </div>
        ) : (
          <LocationPicker value={pin} onChange={move} styleUrl={map.styleUrl} libraryUrl={map.libraryUrl} onFailed={() => setBroken(true)} className="h-full" />
        )}
      </div>
      <div className="space-y-3 px-5 pb-6 pt-4">
        <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-4 py-2 ring-1 ring-line" aria-live="polite">
          <Navigation aria-hidden className="size-4 shrink-0 text-brand-deep" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{!pin ? "No pin yet" : lookingUp ? "Finding the area…" : name}</span>
          {lookingUp && <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted" />}
        </div>
        <button
          type="button"
          disabled={!pin || lookingUp}
          onClick={() => pin && onChoose({ ...pin, label: name, source: "map" })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-ink/90 disabled:bg-ink/40 disabled:shadow-none"
        >
          <Check aria-hidden className="size-4" />
          Confirm location
        </button>
      </div>
    </>
  );
}

// ---- what we know about the current place ----

// "3 stores deliver here · nearest 1.2 km", "Free delivery available" when
// some store charges nothing (the lowest fee, not a promise for every store).
function CurrentStatus() {
  const { result } = useServiceability();
  if (result === undefined) return <p aria-hidden className="mt-1.5 h-4 w-48 animate-pulse rounded-full bg-line/70" />;
  if (result === null) return null;
  const tone = toneOf(result);
  const dot = tone === "open" ? "bg-emerald-500" : tone === "closed" ? "bg-amber-500" : "bg-slate-400";
  const text = tone === "none" ? "No store delivers here yet" : deliveryLine(result);
  const chip = "rounded-full px-2 py-0.5 text-xs font-bold ring-1";
  return (
    <div className="mt-1.5 space-y-1.5">
      <p className="flex min-w-0 items-start gap-1.5 text-sm font-semibold text-ink">
        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} />
        <span className="min-w-0">{text}</span>
      </p>
      {result.serviceable && (
        <p className="flex flex-wrap gap-1.5 pl-3.5">
          {tone === "open" ? <span className={`${chip} bg-emerald-50 text-emerald-800 ring-emerald-200`}>{result.openNowCount} open now</span> : <span className={`${chip} bg-amber-50 text-amber-900 ring-amber-200`}>All closed right now</span>}
          {result.lowestDeliveryFee === 0 && <span className={`${chip} bg-emerald-50 text-emerald-800 ring-emerald-200`}>Free delivery available</span>}
        </p>
      )}
    </div>
  );
}

// Nobody delivers to the point just chosen. It stays chosen (browsing works);
// the shopper can try another spot or look around anyway.
function NotHere({ label, onRetry, onClose }: { label: string; onRetry: () => void; onClose: () => void }) {
  return (
    <div className="px-6 pb-7 pt-8 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-8 ring-slate-50">
        <MapPinOff aria-hidden className="size-7" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">We&apos;re not in {label} yet</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">No store delivers to this point right now. Try a nearby spot or another address.</p>
      <div className="mt-6 space-y-2">
        <button type="button" onClick={onRetry} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-ink/90">
          <MapPin aria-hidden className="size-4" />
          Try another location
        </button>
        <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-muted hover:text-ink">
          Look around anyway
        </button>
      </div>
    </div>
  );
}

// ---- small parts ----

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Choice({ icon: Icon, title, line, tag, picked, onClick }: { icon: typeof Home; title: string; line: string; tag?: string | null; picked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={picked ? "location" : undefined}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left transition ${picked ? "bg-brand-soft/60 ring-2 ring-brand" : "bg-white ring-1 ring-line hover:ring-ink"}`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${picked ? "bg-brand text-white" : "bg-surface text-brand-deep"}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
          <span className="truncate">{title}</span>
          {tag && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-deep">{tag}</span>}
        </span>
        <span className="block truncate text-sm text-muted">{line}</span>
      </span>
      {picked ? <Check aria-label="Chosen" className="size-5 shrink-0 text-brand-deep" /> : <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />}
    </button>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-muted backdrop-blur hover:bg-surface hover:text-ink">
      <X aria-hidden className="size-5" />
    </button>
  );
}
