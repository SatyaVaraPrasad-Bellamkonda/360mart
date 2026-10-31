"use client";

import { Clock } from "lucide-react";
import { useSyncExternalStore } from "react";
import { SectionHeading } from "@/components/SectionHeading";
import type { SlotRail, TimeSlot } from "@/lib/home-page/types";
import { indiaMinutes, slotAt, timeLabel } from "@/lib/home-page/validation";
import { HomeProductRow } from "./HomeProductRow";

// The India clock, read again every minute (one timer for every row on the page).
const clock = {
  listeners: new Set<() => void>(),
  timer: 0 as ReturnType<typeof setInterval> | 0,
  subscribe(cb: () => void) {
    clock.listeners.add(cb);
    if (!clock.timer) clock.timer = setInterval(() => clock.listeners.forEach((l) => l()), 60_000);
    return () => {
      clock.listeners.delete(cb);
      if (!clock.listeners.size && clock.timer) {
        clearInterval(clock.timer);
        clock.timer = 0;
      }
    };
  },
  minute: () => indiaMinutes(new Date()),
};

/**
 * The time-of-day row: every slot's products came in the one page call, and
 * the slot showing is the one the India clock is in. The server picks it for
 * the first paint (`serverMinute`); the browser checks again, so a cached page
 * never shows the morning row in the evening. No slot now = no row.
 */
export function TimeSlotRow({ id, slots, rails, serverMinute, className }: { id: string; slots: TimeSlot[]; rails: Record<string, SlotRail>; serverMinute: number; className: string }) {
  const minute = useSyncExternalStore(clock.subscribe, clock.minute, () => serverMinute);
  const slot = slotAt(slots, minute);
  const row = slot ? rails[slot.id] : undefined;
  if (!slot || !row || row.products.length === 0) return null;
  const popular = row.basedOn === "SALES";
  const headingId = `section-${id}`;
  return (
    <section aria-labelledby={headingId} className={className}>
      <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-deep">
        <Clock aria-hidden className="size-3.5" />
        {popular ? `Popular this ${slot.label.toLowerCase()}` : slot.label}
        <span className="font-semibold text-brand-deep/75">
          · {timeLabel(slot.start)} – {timeLabel(slot.end)}
        </span>
      </p>
      <SectionHeading id={headingId} title={row.title || slot.title} subtitle={(row.subtitle ?? slot.subtitle) || undefined} />
      <HomeProductRow items={row.products} label={row.title || slot.title} />
    </section>
  );
}
