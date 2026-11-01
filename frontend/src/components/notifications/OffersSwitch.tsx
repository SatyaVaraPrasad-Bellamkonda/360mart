"use client";

import { BellOff, BellRing } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { setOffersAction } from "@/lib/campaigns/inbox-actions";

// "Offers & promotions" on / off. Order updates can't be turned off (they're
// part of the service), which the card says. Changes at once, undone on failure.
export function OffersSwitch({ initial }: { initial: boolean | null }) {
  const { sessionExpired } = useAuth();
  const [on, setOn] = useState(initial ?? true);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setOn(next);
    setBusy(true);
    const res = await setOffersAction(next);
    setBusy(false);
    if (res.ok) return toastSuccess(res.data.message || (next ? "Offers turned on." : "Offers turned off."));
    setOn(!next);
    if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    else toastError(res.error.message);
  }

  return (
    <section aria-labelledby="offers-switch" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition ${on ? "bg-brand-soft text-brand-deep" : "bg-surface text-muted"}`}>
          {on ? <BellRing aria-hidden className="size-5" /> : <BellOff aria-hidden className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="offers-switch" className="font-bold text-ink">
            Offers & promotions
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {on ? "Deals from 360mart and stores near you, here and on your phone." : "You won't get new offers. Ones you already got stay below."} Order updates are always on.
          </p>
          {initial === null && <p className="mt-1 text-sm text-muted">We couldn&apos;t load your setting; it shows as on.</p>}
        </div>
        <label className="flex min-h-10 shrink-0 cursor-pointer items-center">
          <input type="checkbox" role="switch" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} aria-labelledby="offers-switch" className="peer sr-only" />
          <span
            aria-hidden
            className="relative h-7 w-12 rounded-full bg-line transition peer-checked:bg-fresh peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-disabled:opacity-60 after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
          />
        </label>
      </div>
    </section>
  );
}
