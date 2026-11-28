"use client";

import { Bike, Clock3, DoorOpen } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNow } from "@/components/orders/seller/useNow";
import { loadTracking } from "@/lib/delivery/client";
import { ago } from "@/lib/delivery/format";
import { vehicleLabel, type DeliveryTracking } from "@/lib/delivery/types";
import type { MapConfig } from "@/lib/maps/config";
import type { OrderStatus } from "@/lib/orders/types";
import { VEHICLE_ICON } from "./vehicle-icons";

const TrackingMap = dynamic(() => import("./TrackingMap"), { ssr: false, loading: () => <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-line/60 sm:h-80" /> });

const POLL_MS = 12_000;

// "Ravi is delivering your order": the rider's first name, vehicle, a rough
// arrival time and a live map, while the order is out for delivery with a
// 360mart rider. Read every 12 s while the tab is visible (never cached). An
// order the store delivers itself has no rider: nothing is shown.
export function RiderTracking({ orderId, orderStatus, map }: { orderId: string; orderStatus: OrderStatus; map: MapConfig }) {
  const { sessionExpired } = useAuth();
  const now = useNow();
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const onTheWay = orderStatus === "OUT_FOR_DELIVERY";

  useEffect(() => {
    if (!onTheWay) return;
    let ctrl = new AbortController();
    const read = async () => {
      ctrl.abort();
      ctrl = new AbortController();
      const res = await loadTracking(orderId, ctrl.signal);
      if (res.ok) setTracking(res.data);
      else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    };
    void read();
    const tick = () => document.visibilityState === "visible" && void read();
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      ctrl.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [onTheWay, orderId, sessionExpired]);

  if (!onTheWay || !tracking?.riderFirstName) return null;
  const t = tracking;
  const atDoor = t.deliveryStatus === "AT_CUSTOMER";
  const Icon = t.vehicleType ? VEHICLE_ICON[t.vehicleType] : Bike;
  const hasMap = !!(t.riderLocation || t.destination);

  return (
    <section aria-live="polite" className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <span className={`relative flex size-14 shrink-0 items-center justify-center rounded-2xl ${atDoor ? "bg-fresh text-white" : "bg-brand-soft text-brand-deep"}`}>
          {atDoor ? <DoorOpen aria-hidden className="size-7" /> : <Icon aria-hidden className="size-7" />}
          {!atDoor && <span aria-hidden className="absolute -right-1 -top-1 size-3.5 rounded-full border-2 border-white bg-fresh motion-safe:animate-pulse" />}
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="text-lg font-bold leading-snug text-ink">{atDoor ? `${t.riderFirstName} is at your door` : `${t.riderFirstName} is delivering your order`}</h2>
          <p className="text-sm text-muted">
            {[vehicleLabel(t.vehicleType), atDoor ? "Share your delivery code to receive it" : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!atDoor && t.etaMinutes != null && (
          <p className="flex w-full items-center gap-2 rounded-2xl bg-surface px-4 py-2 text-ink sm:w-auto">
            <Clock3 aria-hidden className="size-5 text-brand-deep" />
            <span>
              <span className="block text-xs text-muted">Arriving in</span>
              <span className="font-extrabold">{t.etaMinutes <= 1 ? "about a minute" : `about ${t.etaMinutes} min`}</span>
            </span>
          </p>
        )}
      </div>
      {hasMap && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <TrackingMap styleUrl={map.styleUrl} libraryUrl={map.libraryUrl} rider={t.riderLocation} store={t.store} destination={t.destination} />
          <p className="mt-2 px-1 text-xs text-muted">
            {t.riderLocation?.recordedAt && now !== null ? `Rider's location updated ${ago(t.riderLocation.recordedAt, now)}. ` : "The rider's location shows here while they're on the way. "}
            The time is a rough estimate.
          </p>
        </div>
      )}
    </section>
  );
}
