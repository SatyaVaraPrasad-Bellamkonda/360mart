"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibre from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { loadMapLibre } from "@/components/maps/load-maplibre";
import type { TrackingPoint } from "@/lib/delivery/types";

// The shopper's live map: the store, their door and the rider in between.
// Read-only (no pin to move); the rider's dot glides to each new position and
// the view keeps all three in sight. Same MapLibre + OpenFreeMap tiles as the
// address form.

type Props = { styleUrl: string; libraryUrl: string; rider: TrackingPoint | null; store: TrackingPoint | null; destination: TrackingPoint | null };

const LOAD_TIMEOUT_MS = 20_000;

function dot(kind: "rider" | "store" | "home"): HTMLElement {
  const el = document.createElement("div");
  // Plain DOM (MapLibre markers): inline styles, since these never pass through Tailwind.
  const base = "display:flex;align-items:center;justify-content:center;border-radius:9999px;border:3px solid #fff;box-shadow:0 4px 14px rgba(15,23,42,.25);";
  if (kind === "rider") {
    el.style.cssText = `${base}width:22px;height:22px;background:#ea6a0a;`;
    el.setAttribute("aria-label", "Rider");
  } else {
    el.style.cssText = `${base}width:16px;height:16px;background:${kind === "store" ? "#0f172a" : "#16a34a"};`;
    el.setAttribute("aria-label", kind === "store" ? "Store" : "Your address");
  }
  return el;
}

export default function TrackingMap({ styleUrl, libraryUrl, rider, store, destination }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre.Map | null>(null);
  const lib = useRef<typeof MapLibre | null>(null);
  const markers = useRef<Partial<Record<"rider" | "store" | "home", MapLibre.Marker>>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: MapLibre.Map | null = null;
    const giveUp = setTimeout(() => !cancelled && setFailed(true), LOAD_TIMEOUT_MS);
    loadMapLibre(libraryUrl)
      .then((maplibre) => {
        if (cancelled || !container.current) return;
        lib.current = maplibre;
        created = new maplibre.Map({
          container: container.current,
          style: styleUrl,
          // All of India until the points arrive (then the view fits them).
          center: [79.0, 22.5],
          zoom: 3.6,
          cooperativeGestures: true,
          attributionControl: { compact: false }, // "© OpenStreetMap contributors" must stay visible
        });
        map.current = created;
        created.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        created.setMissingStyleImageResolver((id) => {
          if (!created?.hasImage(id)) created?.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        // The style is enough to place the markers; tiles keep arriving (slow phones see the dots sooner).
        created.once("style.load", () => {
          clearTimeout(giveUp);
          if (!cancelled) setReady(true);
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      markers.current = {};
      created?.remove();
      map.current = null;
    };
  }, [libraryUrl, styleUrl]);

  // Place / move the three markers and keep them all in view.
  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!m || !maplibre || !ready) return;
    const points: [string, TrackingPoint | null][] = [
      ["store", store],
      ["home", destination],
      ["rider", rider],
    ];
    const bounds = new maplibre.LngLatBounds();
    let count = 0;
    for (const [kind, p] of points) {
      const key = kind as "rider" | "store" | "home";
      if (!p) {
        markers.current[key]?.remove();
        delete markers.current[key];
        continue;
      }
      const at: [number, number] = [p.longitude, p.latitude];
      bounds.extend(at);
      count++;
      const existing = markers.current[key];
      if (existing) existing.setLngLat(at);
      else markers.current[key] = new maplibre.Marker({ element: dot(key) }).setLngLat(at).addTo(m);
    }
    if (count === 1) m.easeTo({ center: bounds.getCenter(), zoom: 15, duration: 800 });
    else if (count > 1) m.fitBounds(bounds, { padding: { top: 56, right: 56, bottom: 64, left: 40 }, maxZoom: 16, duration: 800 });
  }, [ready, rider, store, destination]);

  if (failed) return null;
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl bg-surface ring-1 ring-line sm:h-80">
      <div ref={container} className="h-full w-full" role="region" aria-label="Map of the rider, the store and your address" />
      {!ready && (
        <div aria-hidden className="absolute inset-0 flex animate-pulse items-center justify-center bg-line/50 text-sm font-semibold text-muted">
          Loading map…
        </div>
      )}
      <ul className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <li className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-ink shadow-sm">
          <span aria-hidden className="size-2.5 rounded-full bg-[#ea6a0a]" />
          Rider
        </li>
        <li className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-ink shadow-sm">
          <span aria-hidden className="size-2.5 rounded-full bg-ink" />
          Store
        </li>
        <li className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-ink shadow-sm">
          <span aria-hidden className="size-2.5 rounded-full bg-green-600" />
          You
        </li>
      </ul>
    </div>
  );
}
