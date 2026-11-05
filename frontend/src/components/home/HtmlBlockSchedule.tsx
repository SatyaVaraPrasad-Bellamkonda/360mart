"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { htmlBlockState } from "@/lib/home-page/html-block";

// The home page is cached for a few minutes, so a block whose time has come or
// gone is checked again by the browser's clock (every 30 s). The server's
// clock is used while hydrating, so the HTML always matches.
const clock = {
  subscribe(onChange: () => void) {
    const t = setInterval(onChange, 30_000);
    return () => clearInterval(t);
  },
  now: () => Math.floor(Date.now() / 30_000) * 30_000,
};

export function HtmlBlockSchedule({ startsAt, endsAt, serverNow, children }: { startsAt: string | null; endsAt: string | null; serverNow: number; children: ReactNode }) {
  const now = useSyncExternalStore(clock.subscribe, clock.now, () => serverNow);
  return htmlBlockState({ startsAt, endsAt }, now) === "LIVE" ? children : null;
}
