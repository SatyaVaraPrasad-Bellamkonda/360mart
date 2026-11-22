"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { defaultChoice, loadAddressChoices } from "@/lib/location/client";
import type { MapConfig } from "@/lib/maps/config";
import { LocationSheet } from "./LocationSheet";
import { isShoppingPage } from "./pages";
import { openLocationPicker, setDeliveryLocation, useLocationPicker, useLocationReady } from "./delivery-location";

const ASKED_KEY = "360mart.locationAsked";

// Location first: the root layout's one location sheet, plus the first-visit
// rule. With nothing chosen yet on a shopping page:
// - signed in with a pinned address: use the default one quietly (one GET /addresses);
// - otherwise: open the welcome sheet, once per tab session (closing it means
//   "not now"; the header chip stays there to choose later).
// Search engines and admins never get the sheet. Rendered inside <Suspense>
// (usePathname would otherwise hold up prerendering).
export function LocationHost({ map }: { map: MapConfig }) {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const { location, pickerOpen } = useLocationPicker();
  const ready = useLocationReady();
  const triedDefault = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || status === "loading" || location || pickerOpen || !isShoppingPage(pathname)) return;
    if (user?.role === "admin" || /bot|crawl|spider|slurp|lighthouse|preview/i.test(navigator.userAgent)) return;
    let cancelled = false;

    (async () => {
      // Once per login per page load: their saved default address.
      if (status === "authenticated" && user && triedDefault.current !== user.userId) {
        triedDefault.current = user.userId;
        const res = await loadAddressChoices();
        if (cancelled) return;
        const a = res.ok ? defaultChoice(res.data) : null;
        if (a) return setDeliveryLocation({ latitude: a.latitude!, longitude: a.longitude!, label: a.line || a.title, source: "address", addressId: a.addressId });
      }
      if (asked()) return;
      // Let the page settle, and never stack on another dialog (e.g. "We've updated our terms").
      await sleep(900);
      for (let i = 0; i < 40 && !cancelled && document.querySelector("dialog[open]"); i++) await sleep(1000);
      if (cancelled || document.querySelector("dialog[open]")) return;
      markAsked();
      openLocationPicker(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, status, user, location, pickerOpen, pathname]);

  return <LocationSheet map={map} />;
}

// Also kept in memory, so blocked storage still means once per page load.
let askedHere = false;

function asked(): boolean {
  if (askedHere) return true;
  try {
    return sessionStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markAsked() {
  askedHere = true;
  try {
    sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Storage blocked: the memory flag covers this visit.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
