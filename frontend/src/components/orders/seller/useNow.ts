"use client";

import { useSyncExternalStore } from "react";

// A clock that ticks once a second, shared by every countdown on the page (one
// timer, not one per row). null on the server and in the first render, so the
// server's HTML never disagrees with the browser's clock.

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => (now ||= Date.now()),
    () => null,
  );
}
