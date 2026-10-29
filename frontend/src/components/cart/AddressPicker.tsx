"use client";

import { Check, MapPin, MapPinOff, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import type { AddressChoice } from "@/lib/orders/address-choice";

// "Delivering to Home · Kukatpally… Change": the cart's and checkout's address
// choice. Only addresses with a map pin can be chosen (the backend needs it to
// check distance); the others link to their edit page to add one.
export function AddressPicker({ addresses, value, onChange, busy, invalid }: { addresses: AddressChoice[]; value: string | null; onChange: (a: AddressChoice) => void; busy?: boolean; invalid?: string }) {
  const [open, setOpen] = useState(false);
  const current = addresses.find((a) => a.addressId === value) ?? null;

  return (
    <>
      <div className={`flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 sm:p-4 ${invalid ? "ring-red-400" : "ring-line"}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          {current ? (
            <>
              <p className="text-sm font-semibold text-ink">
                Delivering to {current.title} <span className="font-normal text-muted">· {current.recipientName}</span>
              </p>
              <p className="truncate text-sm text-muted">{current.summary}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">Where should we deliver?</p>
              <p className="text-sm text-muted">{addresses.length ? "Choose an address with a map pin." : "Add your address to see which stores deliver to you."}</p>
            </>
          )}
          {invalid && <p className="mt-1 text-sm text-red-700">{invalid}</p>}
        </div>
        {addresses.length ? (
          <button type="button" onClick={() => setOpen(true)} disabled={busy} className="flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-brand-deep ring-1 ring-brand/40 transition hover:bg-brand-soft disabled:opacity-60">
            {current ? "Change" : "Choose"}
          </button>
        ) : (
          <Link href="/account/addresses/new" className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-sm font-semibold text-white">
            <Plus aria-hidden className="size-4" />
            Add
          </Link>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Deliver to" description="Stores and delivery fees depend on where you are.">
        <ul className="space-y-2 pb-5">
          {addresses.map((a) => {
            const chosen = a.addressId === value;
            return (
              <li key={a.addressId}>
                {a.hasPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (!chosen) onChange(a);
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 transition ${chosen ? "bg-brand-soft/50 ring-brand" : "ring-line hover:ring-ink/40"}`}
                  >
                    <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-deep" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {a.title}
                        {a.isDefault && <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-muted ring-1 ring-line">Default</span>}
                      </span>
                      <span className="block text-sm text-muted">
                        {a.recipientName} · {a.summary}
                      </span>
                    </span>
                    {chosen && <Check aria-label="Chosen" className="size-5 shrink-0 text-brand-deep" />}
                  </button>
                ) : (
                  <div className="flex items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
                    <MapPinOff aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-muted">{a.title}</span>
                      <span className="block text-sm text-muted">{a.summary}</span>
                      <Link href={`/account/addresses/${a.addressId}`} className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-brand-deep hover:underline">
                        Add a map pin to deliver here
                      </Link>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
          <li>
            <Link href="/account/addresses/new" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-ink hover:border-ink/40">
              <Plus aria-hidden className="size-4" />
              Add a new address
            </Link>
          </li>
        </ul>
      </Dialog>
    </>
  );
}
