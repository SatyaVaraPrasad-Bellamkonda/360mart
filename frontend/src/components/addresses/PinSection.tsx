"use client";

import { Loader2, LocateFixed, Map as MapIcon, MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { searchPlacesAction, suggestFromPinAction } from "@/lib/addresses/actions";
import type { Coordinates } from "@/lib/addresses/types";
import { insideIndia, round6 } from "@/lib/addresses/validation";
import type { ActionError } from "@/lib/auth/actions";
import type { MapConfig } from "@/lib/maps/config";
import type { PlaceMatch, PlaceSuggestion } from "@/lib/maps/geocoder";

// The map needs the browser (WebGL), so it is never rendered on the server,
// and its code loads only when the shopper opens it.
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-72 animate-pulse rounded-2xl bg-line/60 sm:h-80" />,
});

type Notice = { kind: "error" | "notice"; text: string } | null;

type Props = {
  pin: Coordinates | null;
  onPin: (pin: Coordinates | null) => void;
  map: MapConfig;
  error?: string;
  /** Fill the form from a place; returns the names of the fields it filled. */
  onSuggest: (place: PlaceSuggestion) => string[];
  onActionError: (error: ActionError, show: (text: string) => void) => void;
};

// A dragged pin settles before we look it up (and the lookup service allows 1 request a second).
const LOOKUP_DELAY_MS = 700;

// "Pin your exact location" (optional): search for a place, use the phone's
// location or tap the map. Each time the pin moves, the address fields are
// filled from it (when a lookup service is configured); the shopper checks them.
export function PinSection({ pin, onPin, map, error, onSuggest, onActionError }: Props) {
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [mapBroken, setMapBroken] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceMatch[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [lookingUp, setLookingUp] = useState(false);
  const lookup = useRef<{ timer?: ReturnType<typeof setTimeout>; id: number }>({ id: 0 });

  useEffect(() => () => clearTimeout(lookup.current.timer), []);

  function filledNotice(filled: string[], extra = ""): Notice {
    if (!filled.length) return extra ? { kind: "notice", text: extra } : null;
    const check = `Please check ${filled.length > 1 ? "them" : "it"}.`;
    return { kind: "notice", text: `Filled ${listOf(filled)} from the pin. ${check}${extra ? ` ${extra}` : ""}` };
  }

  function cancelLookup() {
    clearTimeout(lookup.current.timer);
    lookup.current.id++; // a lookup still running for an older pin is ignored
    setLookingUp(false);
  }

  // Look up the address at the pin's new spot (the newest pin wins).
  function lookUp(at: Coordinates) {
    if (!map.canSuggest) return;
    cancelLookup();
    const id = lookup.current.id;
    setLookingUp(true);
    lookup.current.timer = setTimeout(async () => {
      const res = await suggestFromPinAction(at.latitude, at.longitude);
      if (id !== lookup.current.id) return; // the pin moved again meanwhile
      setLookingUp(false);
      if (!res.ok) return onActionError(res.error, (text) => setNotice({ kind: "error", text }));
      setNotice(filledNotice(onSuggest(res.data)) ?? { kind: "notice", text: "The address fields already match this pin." });
    }, LOOKUP_DELAY_MS);
  }

  function movePin(next: Coordinates, metres: number | null = null) {
    setAccuracy(metres);
    setNotice(null);
    onPin(next);
    lookUp(next);
  }

  // Asked only when the shopper taps the button, never on page load.
  function locateMe() {
    setNotice(null);
    if (!("geolocation" in navigator)) {
      return setNotice({ kind: "error", text: "This browser can't share your location. Search for your area or drop the pin on the map." });
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const here = { latitude: round6(coords.latitude), longitude: round6(coords.longitude) };
        if (!insideIndia(here)) return setNotice({ kind: "error", text: "Your location seems to be outside India. Search for your area instead." });
        movePin(here, Math.round(coords.accuracy));
        setOpen(true); // show where it landed so they can fine-tune it
      },
      (failure) => {
        setLocating(false);
        const text =
          failure.code === failure.PERMISSION_DENIED
            ? "Location access is off for this site. Allow it in your browser settings, or search for your area."
            : "We couldn't get your location. Check that location is on, or search for your area.";
        setNotice({ kind: "error", text });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  // On Enter or the button only: the lookup service doesn't allow search-as-you-type.
  function search() {
    const q = query.trim();
    if (q.length < 3) return setNotice({ kind: "error", text: "Type at least 3 letters of an area, street or landmark." });
    setNotice(null);
    startSearch(async () => {
      const res = await searchPlacesAction(q);
      if (!res.ok) return onActionError(res.error, (text) => setNotice({ kind: "error", text }));
      setResults(res.data);
      if (!res.data.length) setNotice({ kind: "error", text: `No places found for "${q}". Try an area name, street or pincode.` });
    });
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    // Enter searches here instead of submitting the whole address form.
    if (event.key === "Enter") {
      event.preventDefault();
      search();
    }
    if (event.key === "Escape") setResults(null);
  }

  function choose(match: PlaceMatch) {
    cancelLookup();
    setResults(null);
    setAccuracy(null);
    onPin({ latitude: match.latitude, longitude: match.longitude });
    setOpen(true);
    // The search result already carries its address: no second lookup needed.
    setNotice(filledNotice(onSuggest(match.place), "Now move the pin to your exact door."));
  }

  function removePin() {
    cancelLookup();
    onPin(null);
    setAccuracy(null);
    setNotice(null);
  }

  return (
    <div className={`rounded-2xl border p-4 ${error ? "border-red-500" : "border-line"} bg-surface/60`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">
            Pin your exact location <span className="font-normal text-muted">(optional)</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {map.canSuggest ? "We fill in the address from the pin, and it helps the delivery partner find your door." : "Helps the delivery partner find your door."}
          </p>
        </div>
      </div>

      {map.canSuggest && (
        <div className="mt-3">
          <label htmlFor={searchId} className="sr-only">
            Search area, street or landmark
          </label>
          <div className="flex overflow-hidden rounded-xl border border-line bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-brand/40">
            <Search aria-hidden className="ml-3 size-5 shrink-0 self-center text-muted" />
            <input
              id={searchId}
              name="placeSearch"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={200}
              placeholder="Search area, street or landmark"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              className="min-h-12 w-full min-w-0 px-3 text-base text-ink outline-none placeholder:text-muted/70"
            />
            <button
              type="button"
              onClick={search}
              disabled={searching}
              className="flex min-w-20 shrink-0 items-center justify-center gap-1.5 bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-wait disabled:bg-ink/60"
            >
              {searching ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Search"}
              {searching && <span className="sr-only">Searching</span>}
            </button>
          </div>
          {results && results.length > 0 && (
            <ul aria-label="Search results" className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {results.map((match) => (
                <li key={`${match.latitude},${match.longitude},${match.label}`}>
                  <button type="button" onClick={() => choose(match)} className="flex min-h-12 w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-ink transition hover:bg-surface">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-deep" />
                    <span className="min-w-0 break-words">{match.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pin && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="rounded-full bg-fresh-soft px-2.5 py-1 font-semibold text-fresh">Pinned</span>
          <span className="tabular-nums text-muted">
            {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
          </span>
          {accuracy !== null && <span className="basis-full text-muted">Accurate to about {accuracy} m</span>}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={locateMe} disabled={locating} className={BUTTON}>
          {locating ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <LocateFixed aria-hidden className="size-4" />}
          {locating ? "Finding you…" : "Use my current location"}
        </button>
        {!mapBroken && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={BUTTON}>
            <MapIcon aria-hidden className="size-4" />
            {open ? "Hide map" : pin ? "Adjust on map" : "Choose on map"}
          </button>
        )}
      </div>

      {open && !mapBroken && (
        <div className="mt-3">
          <LocationPicker
            value={pin}
            onChange={(next) => movePin(next)}
            styleUrl={map.styleUrl}
            libraryUrl={map.libraryUrl}
            onFailed={() => {
              setMapBroken(true);
              setNotice({ kind: "error", text: "The map couldn't load. You can still save the address without a pin." });
            }}
          />
          <p className="mt-2 text-sm text-muted">Tap the map to drop the pin, then drag it to your door. Use two fingers to move the map.</p>
        </div>
      )}

      {pin && (
        <div className="mt-3">
          <button type="button" onClick={removePin} className={`${BUTTON} border-transparent bg-transparent text-red-700 hover:border-red-200 hover:bg-red-50`}>
            <X aria-hidden className="size-4" />
            Remove pin
          </button>
        </div>
      )}

      <div aria-live="polite" className="mt-3 empty:hidden">
        {error ? (
          <FormMessage error={error} />
        ) : lookingUp ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Finding the address for this pin…
          </p>
        ) : (
          notice && (notice.kind === "error" ? <FormMessage error={notice.text} /> : <FormMessage notice={notice.text} />)
        )}
      </div>
    </div>
  );
}

const BUTTON =
  "flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink disabled:cursor-wait disabled:opacity-60";

function listOf(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
