"use client";

import { useEffect, useState } from "react";

// Seconds left until `deadline` (a Date.now() timestamp), ticking once a second.
// Returns 0 when there is no deadline or it has passed.
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() >= deadline) clearInterval(timer);
    };
    const first = setTimeout(tick, 0); // refresh straight away when a new deadline arrives
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [deadline]);

  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

/** 272 → "4:32" */
export function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
