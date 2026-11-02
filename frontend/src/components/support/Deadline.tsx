"use client";

import { Clock } from "lucide-react";
import { useSyncExternalStore } from "react";
import { when } from "@/lib/orders/format";
import { timeLeft } from "@/lib/support/format";

// The browser's clock, re-read every 30 s. On the server (and while hydrating)
// it's null, so the HTML shows the plain time and never mismatches.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}
const minute = () => Math.floor(Date.now() / 30_000) * 30_000;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, minute, () => null);
}

/** A legal deadline (reply within 48 h, outcome within 30 days): "Reply · 3 h left". */
export function Deadline({ label, iso, compact }: { label: string; iso: string; compact?: boolean }) {
  const now = useNow();
  const left = now === null ? null : timeLeft(iso, now);
  const tone = left?.late ? "bg-red-100 text-red-800 ring-red-200" : left?.soon ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-surface text-ink/80 ring-line";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`} title={`${label} by ${when(iso)} (India time)`}>
      <Clock aria-hidden className="size-3.5" />
      {compact ? (
        <>
          {label} · {left ? left.text : when(iso)}
        </>
      ) : (
        <>
          {label} by {when(iso)}
          {left && <span className="font-normal opacity-80"> · {left.text}</span>}
        </>
      )}
    </span>
  );
}
