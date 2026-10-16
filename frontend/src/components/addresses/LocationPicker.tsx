"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibre from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { INDIA_BOUNDS, type Coordinates } from "@/lib/addresses/types";
import { round6 } from "@/lib/addresses/validation";

// The interactive map inside the address form: tap to drop the pin, drag it to
// adjust. MapLibre (open source) with OpenFreeMap tiles, no API key.
//
// The library (~600 KB) isn't part of our JavaScript bundle: it is loaded from
// /vendor/ (copied there by scripts/vendor-maplibre.mjs) the first time a map
// opens, so the form itself stays light on phones.

type Props = {
  value: Coordinates | null;
  onChange: (pin: Coordinates) => void;
  styleUrl: string;
  libraryUrl: string;
  onFailed: () => void;
};

const INDIA_VIEW = { center: [79.0, 22.5] as [number, number], zoom: 3.6 };
const PIN_ZOOM = 16.5;
const PIN_COLOR = "#b45309"; // brand-deep
const LOAD_TIMEOUT_MS = 20_000; // slow 3G still makes it; a dead connection doesn't spin forever

let library: Promise<typeof MapLibre> | null = null;
function loadMapLibre(url: string): Promise<typeof MapLibre> {
  // Loaded as-is from our own site, not bundled (see the note above).
  library ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url).catch((error) => {
    library = null; // let a later attempt retry
    throw error;
  });
  return library;
}

export default function LocationPicker({ value, onChange, styleUrl, libraryUrl, onFailed }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre.Map | null>(null);
  const marker = useRef<MapLibre.Marker | null>(null);
  const lib = useRef<typeof MapLibre | null>(null);
  const [ready, setReady] = useState(false);

  // Latest values for the map's event handlers, which are attached only once.
  const latest = useRef({ value, onChange, onFailed });
  useEffect(() => {
    latest.current = { value, onChange, onFailed };
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let created: MapLibre.Map | null = null;
    let giveUp: ReturnType<typeof setTimeout> | undefined;

    loadMapLibre(libraryUrl)
      .then((maplibre) => {
        if (cancelled || !container.current) return;
        lib.current = maplibre;
        const start = latest.current.value;
        created = new maplibre.Map({
          container: container.current,
          style: styleUrl,
          center: start ? [start.longitude, start.latitude] : INDIA_VIEW.center,
          zoom: start ? PIN_ZOOM : INDIA_VIEW.zoom,
          maxBounds: [[INDIA_BOUNDS.minLng, INDIA_BOUNDS.minLat], [INDIA_BOUNDS.maxLng, INDIA_BOUNDS.maxLat]],
          // Inside a scrolling form one finger scrolls the page; two fingers (or Ctrl + scroll) move the map.
          cooperativeGestures: true,
          attributionControl: { compact: false }, // "© OpenStreetMap contributors" must stay visible
        });
        map.current = created;
        created.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        created.on("click", (e) => latest.current.onChange({ latitude: round6(e.lngLat.lat), longitude: round6(e.lngLat.lng) }));
        // The free style names a few icons it doesn't ship (atm, gate…): draw them as
        // nothing instead of filling the console with warnings.
        created.setMissingStyleImageResolver((id) => {
          if (!created?.hasImage(id)) created?.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        let styleLoaded = false;
        created.on("style.load", () => (styleLoaded = true));
        created.on("load", () => {
          clearTimeout(giveUp);
          if (!cancelled) setReady(true);
        });
        // A missing tile is retried by MapLibre; only a style that can't load means no map.
        created.on("error", () => {
          if (!styleLoaded && !cancelled) latest.current.onFailed();
        });
        giveUp = setTimeout(() => !cancelled && latest.current.onFailed(), LOAD_TIMEOUT_MS);
      })
      .catch(() => !cancelled && latest.current.onFailed());

    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      marker.current = null;
      created?.remove();
      map.current = null;
    };
  }, [libraryUrl, styleUrl]);

  // Keep the marker where the pin is (it can also move from "Use my location").
  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!m || !maplibre) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const at: [number, number] = [value.longitude, value.latitude];
    if (!marker.current) {
      marker.current = new maplibre.Marker({ color: PIN_COLOR, draggable: true }).setLngLat(at).addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current?.getLngLat();
        if (p) latest.current.onChange({ latitude: round6(p.lat), longitude: round6(p.lng) });
      });
    } else {
      marker.current.setLngLat(at);
    }
    // Bring a pin that is off screen (or seen from too far away) into view.
    if (!m.getBounds().contains(at) || m.getZoom() < 12) m.easeTo({ center: at, zoom: Math.max(m.getZoom(), PIN_ZOOM), duration: 800 });
  }, [value, ready]);

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl border border-line bg-surface sm:h-80">
      {/* Sized with h-full, not absolute: MapLibre's CSS sets position: relative on it. */}
      <div ref={container} className="h-full w-full" role="region" aria-label="Map. Tap to drop the pin, drag the pin to adjust." />
      {!ready && (
        <div aria-hidden className="absolute inset-0 flex animate-pulse items-center justify-center bg-line/50 text-sm font-semibold text-muted">
          Loading map…
        </div>
      )}
    </div>
  );
}
