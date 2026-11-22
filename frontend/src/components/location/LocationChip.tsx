"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { shortLabel } from "@/lib/location/types";
import { openLocationPicker, useDeliveryLocation, useLocationReady } from "./delivery-location";
import { deliveryLine, toneOf, useServiceability, type ServiceTone } from "./serviceability";

// The header's "Deliver to" button: always visible, opens the location sheet.
// "bar" = tablets and up (two lines beside the logo); "line" = phones (one line
// under the logo: area in bold, the rest of the address in grey). Until this
// browser's choice is read it shows a neutral placeholder, so the server HTML
// never flashes "Choose".
export function LocationChip({ variant }: { variant: "bar" | "line" }) {
  const location = useDeliveryLocation();
  const ready = useLocationReady();
  const { result } = useServiceability();
  const tone = result ? toneOf(result) : null;
  const label = location?.label ?? null;
  const status = !result ? "" : tone === "open" ? `, ${deliveryLine(result)}` : tone === "closed" ? ", stores here are closed right now" : ", we don't deliver here yet";
  const a11y = location ? `Delivering to ${location.label}${status}. Change location` : "Choose your delivery location";

  if (variant === "line") {
    const area = label ? shortLabel(label) : null;
    const rest = label && area ? label.slice(label.indexOf(",") + 1).trim() : "";
    return (
      <button type="button" onClick={() => openLocationPicker()} aria-label={a11y} className="group -ml-0.5 flex min-h-10 w-full min-w-0 items-center gap-1 text-left text-[13px] leading-tight">
        <span className="relative flex size-5 shrink-0 items-center justify-center text-[#ea6a0a]">
          {ready && !location && <span aria-hidden className="absolute inset-0 rounded-full bg-brand/40 motion-safe:animate-ping" />}
          <MapPin aria-hidden strokeWidth={2.2} className="relative size-4" />
          {tone && <span aria-hidden className={`absolute -right-px -top-px size-2 rounded-full ring-2 ring-white ${DOT[tone]}`} />}
        </span>
        {!ready ? (
          <span aria-hidden className="h-3 w-40 animate-pulse rounded-full bg-line" />
        ) : area ? (
          <span className="min-w-0 truncate">
            <b className="font-bold text-ink">{area}</b>
            {rest && label !== area && <span className="text-[#7a8294]"> - {rest}</span>}
          </span>
        ) : (
          <span className="min-w-0 truncate font-bold text-[#ea6a0a]">Set your delivery location</span>
        )}
        <ChevronDown aria-hidden strokeWidth={2.4} className="size-3.5 shrink-0 text-ink transition group-active:translate-y-0.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openLocationPicker()}
      aria-label={a11y}
      className="group flex min-h-12 min-w-0 shrink items-center gap-2.5 rounded-[14px] px-2.5 py-1.5 text-left transition hover:bg-[#f4f1ec]"
    >
      <Pin attention={ready && !location} tone={tone} />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#7a8294]">Deliver to</span>
        <span className="flex min-w-0 items-center gap-1 text-sm font-bold leading-tight text-ink">
          {ready ? <span className="max-w-[9rem] truncate lg:max-w-[180px]">{label ?? "Choose location"}</span> : <span aria-hidden className="my-0.5 h-3 w-24 animate-pulse rounded-full bg-line" />}
          <ChevronDown aria-hidden strokeWidth={2.4} className="size-3.5 shrink-0 text-ink transition group-hover:translate-y-0.5" />
        </span>
      </span>
    </button>
  );
}

const DOT: Record<ServiceTone, string> = { open: "bg-emerald-500", closed: "bg-amber-500", none: "bg-slate-400" };

// The pin icon; a soft pulse while nothing is chosen, to draw the eye, and a
// dot once the point is checked: green = stores deliver, amber = all closed
// right now, grey = nobody delivers here yet.
function Pin({ attention, tone }: { attention: boolean; tone: ServiceTone | null }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fff1e3] text-[#ea6a0a]">
      {attention && <span aria-hidden className="absolute inset-0 rounded-xl bg-brand/40 motion-safe:animate-ping" />}
      <MapPin aria-hidden className="relative size-[18px]" />
      {tone && <span aria-hidden className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white ${DOT[tone]}`} />}
    </span>
  );
}
