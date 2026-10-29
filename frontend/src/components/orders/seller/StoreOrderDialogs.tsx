"use client";

import { KeyRound, Minus, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ProductThumb } from "@/components/inventory/ListingParts";
import { Dialog } from "@/components/Dialog";
import type { ActionError } from "@/lib/auth/actions";
import { UNDELIVERED_REASONS } from "@/lib/orders/format";
import { NOTE_MAX, REASON_MAX, REASON_MIN, type OrderItem, type UndeliveredReason } from "@/lib/orders/types";

// The order steps that need more than one tap: accept with fewer items,
// decline / cancel with a reason, the customer's delivery code, and "couldn't
// deliver". Each form's state lives inside the open dialog, so closing and
// opening again starts fresh.

type Common = { open: boolean; onClose: () => void; pending: boolean; error: ActionError | null };

const PRIMARY = "flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 active:scale-95 disabled:opacity-60";
const DANGER = "flex min-h-12 w-full items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-60";

function Footer({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line bg-white px-5 py-4">{children}</div>;
}

// ---- accept (with fewer of some items) ----

export function AcceptDialog({ items, onSubmit, ...c }: Common & { items: OrderItem[]; onSubmit: (items: { listingId: string; quantity: number }[]) => void }) {
  return (
    <Dialog open={c.open} onClose={c.onClose} title="Accept order" description="Lower a quantity only if you can't send all of it. Everything else is sent as ordered.">
      {c.open && <AcceptForm items={items} onSubmit={onSubmit} {...c} />}
    </Dialog>
  );
}

function AcceptForm({ items, onSubmit, pending, error }: Common & { items: OrderItem[]; onSubmit: (items: { listingId: string; quantity: number }[]) => void }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.listingId, i.quantity])));
  const changed = items.filter((i) => qty[i.listingId] < i.quantity).map((i) => ({ listingId: i.listingId, quantity: qty[i.listingId] }));
  const nothing = items.every((i) => qty[i.listingId] === 0);
  const whole = error?.fieldErrors.items;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nothing) onSubmit(changed);
      }}
    >
      <ul className="divide-y divide-line">
        {items.map((i) => {
          const q = qty[i.listingId];
          const problem = error?.fieldErrors[`items[${i.listingId}]`];
          const set = (n: number) => setQty((s) => ({ ...s, [i.listingId]: Math.max(0, Math.min(i.quantity, n)) }));
          return (
            <li key={i.listingId} className="py-3">
              <div className="flex items-center gap-3">
                <ProductThumb src={i.imageUrl} name={i.productName} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{i.productName}</p>
                  <p className="text-xs text-muted">
                    {i.variantLabel} · ordered {i.quantity}
                  </p>
                  {q < i.quantity && <p className={`mt-0.5 text-xs font-bold ${q === 0 ? "text-red-700" : "text-amber-800"}`}>{q === 0 ? "Not available" : `Sending ${q} of ${i.quantity}`}</p>}
                </div>
                <div className="flex shrink-0 items-center rounded-full ring-1 ring-line">
                  <button type="button" onClick={() => set(q - 1)} disabled={q === 0} aria-label={`One less ${i.productName}`} className="flex size-10 items-center justify-center rounded-full text-ink disabled:opacity-30">
                    <Minus aria-hidden className="size-4" />
                  </button>
                  <span className="w-7 text-center font-bold tabular-nums text-ink" aria-live="polite">
                    {q}
                  </span>
                  <button type="button" onClick={() => set(q + 1)} disabled={q === i.quantity} aria-label={`One more ${i.productName}`} className="flex size-10 items-center justify-center rounded-full text-ink disabled:opacity-30">
                    <Plus aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
              {problem && <p className="mt-1 text-sm text-red-700">{problem}</p>}
            </li>
          );
        })}
      </ul>
      {(nothing || whole) && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {whole ?? "Nothing would be sent. Decline the order instead."}
        </p>
      )}
      {error && !whole && !Object.keys(error.fieldErrors).length && <p className="mt-3 text-sm text-red-700">{error.message}</p>}
      <Footer>
        <button type="submit" disabled={pending || nothing} className={PRIMARY}>
          {pending ? "Accepting…" : changed.length ? `Accept with ${changed.length} ${changed.length === 1 ? "change" : "changes"}` : "Accept everything"}
        </button>
      </Footer>
    </form>
  );
}

// ---- decline / cancel ----

const QUICK: Record<"reject" | "cancel", string[]> = {
  reject: ["Item out of stock", "Store closing early", "Can't deliver to this area", "Too busy right now"],
  cancel: ["Item damaged", "Delivery not possible", "Item went out of stock"],
};

export function ReasonDialog({ kind, onSubmit, ...c }: Common & { kind: "reject" | "cancel"; onSubmit: (reason: string) => void }) {
  return (
    <Dialog
      open={c.open}
      onClose={c.onClose}
      title={kind === "reject" ? "Decline this order?" : "Cancel this order?"}
      description={kind === "reject" ? "The customer is told why, and the stock goes back." : "The customer is told why, and the stock goes back. This can't be undone."}
    >
      {c.open && <ReasonForm kind={kind} onSubmit={onSubmit} {...c} />}
    </Dialog>
  );
}

function ReasonForm({ kind, onSubmit, pending, error }: Common & { kind: "reject" | "cancel"; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;
  const problem = error?.fieldErrors.reason ?? (error && !Object.keys(error.fieldErrors).length ? error.message : null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(trimmed);
      }}
    >
      <p className="text-sm font-semibold text-ink">Quick reasons</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK[kind].map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className={`min-h-10 rounded-full px-3 text-sm font-semibold ring-1 transition ${reason === q ? "bg-ink text-white ring-ink" : "text-ink ring-line hover:ring-ink"}`}>
            {q}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="order-reason">
        Reason
      </label>
      <textarea
        id="order-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={REASON_MAX}
        rows={3}
        aria-invalid={!!problem}
        className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${problem ? "border-red-500" : "border-line focus:border-ink"}`}
        placeholder="Tell the customer why"
      />
      <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
        <span className="text-red-700">{problem}</span>
        <span className="tabular-nums">
          {reason.length}/{REASON_MAX}
        </span>
      </div>
      <Footer>
        <button type="submit" disabled={pending || !valid} className={DANGER}>
          {pending ? "Saving…" : kind === "reject" ? "Decline order" : "Cancel order"}
        </button>
      </Footer>
    </form>
  );
}

// ---- delivery code ----

export function DeliverDialog({ attemptsLeft, onSubmit, ...c }: Common & { attemptsLeft: number; onSubmit: (code: string) => void }) {
  return (
    <Dialog open={c.open} onClose={c.onClose} title="Mark delivered" description="Ask the customer for the 4-digit code on their order page.">
      {c.open && <DeliverForm attemptsLeft={attemptsLeft} onSubmit={onSubmit} {...c} />}
    </Dialog>
  );
}

function DeliverForm({ attemptsLeft, onSubmit, pending, error }: Common & { attemptsLeft: number; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  const locked = error?.code === "DELIVERY_CODE_LOCKED" || attemptsLeft <= 0;
  const problem = locked ? "Too many wrong codes. Contact 360mart support." : (error?.fieldErrors.deliveryCode ?? error?.message ?? null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d{4}$/.test(code) && !locked) onSubmit(code);
      }}
    >
      <label htmlFor="delivery-code" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound aria-hidden className="size-4" />
        Delivery code
      </label>
      <input
        id="delivery-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{4}"
        maxLength={4}
        disabled={locked}
        aria-invalid={!!problem}
        aria-describedby="delivery-code-help"
        className={`mt-2 w-full rounded-2xl border-2 bg-white px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.6em] text-ink outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 ${problem ? "border-red-500" : "border-line focus:border-ink"}`}
        placeholder="••••"
      />
      <p id="delivery-code-help" className={`mt-2 text-sm ${problem ? "text-red-700" : "text-muted"}`}>
        {problem ?? `${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left. The invoice is issued once it's delivered.`}
      </p>
      <Footer>
        <button type="submit" disabled={pending || locked || code.length !== 4} className={PRIMARY}>
          {pending ? "Checking…" : "Confirm delivery"}
        </button>
      </Footer>
    </form>
  );
}

// ---- couldn't deliver ----

export function UndeliveredDialog({ onSubmit, ...c }: Common & { onSubmit: (reason: UndeliveredReason, note?: string) => void }) {
  return (
    <Dialog open={c.open} onClose={c.onClose} title="Couldn't deliver" description="The goods go back into your stock.">
      {c.open && <UndeliveredForm onSubmit={onSubmit} {...c} />}
    </Dialog>
  );
}

function UndeliveredForm({ onSubmit, pending, error }: Common & { onSubmit: (reason: UndeliveredReason, note?: string) => void }) {
  const [reason, setReason] = useState<UndeliveredReason | null>(null);
  const [note, setNote] = useState("");
  const problem = error?.fieldErrors.reason ?? error?.fieldErrors.note ?? (error && !Object.keys(error.fieldErrors).length ? error.message : null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (reason) onSubmit(reason, note.trim() || undefined);
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-ink">What happened?</legend>
        <div className="mt-2 space-y-2">
          {UNDELIVERED_REASONS.map((r) => (
            <label key={r.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 border-line px-4 text-sm font-semibold text-ink transition has-[:checked]:border-ink has-[:checked]:bg-surface">
              <input type="radio" name="undelivered" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4 accent-ink" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="undelivered-note" className="mt-4 block text-sm font-semibold text-ink">
        Note <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea
        id="undelivered-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={NOTE_MAX}
        rows={2}
        className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40"
      />
      {problem && <p className="mt-1 text-sm text-red-700">{problem}</p>}
      <Footer>
        <button type="submit" disabled={pending || !reason} className={DANGER}>
          {pending ? "Saving…" : "Mark as not delivered"}
        </button>
      </Footer>
    </form>
  );
}
