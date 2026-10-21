"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { FieldError, SubmitButton, TextField } from "@/components/auth/AuthFields";
import { toastError, toastSuccess } from "@/components/Toaster";
import { addBatchAction, adjustStockAction, loadBatchesAction } from "@/lib/inventory/actions";
import type { Batch, BatchDraft, BatchErrors, Listing, StockAction, StockDraft, StockErrors } from "@/lib/inventory/types";
import { batchErrors, daysUntil, emptyBatchDraft, REASON_MAX, signedQuantity, STOCK_MAX, stockErrors } from "@/lib/inventory/validation";
import { dateText, todayInIndia } from "@/lib/stores/validation";

type Failed = (e: { code: string; message: string }) => void;

// One tap fills the reason; it stays editable.
const REASONS: Record<StockAction, string[]> = {
  RESTOCK: ["Morning delivery", "Supplier delivery", "From godown"],
  DAMAGED: ["Crushed in transit", "Spoiled", "Packet torn", "Past its best"],
  RETURN: ["Wrong item delivered", "Customer changed mind", "Quality complaint"],
  ADJUSTMENT: ["Stock count", "Found extra stock", "Counting mistake"],
};

const HINT: Record<StockAction, string> = {
  RESTOCK: "New stock that arrived. It's added to what you have.",
  DAMAGED: "Units you can't sell. They're taken off your stock.",
  RETURN: "Units a customer gave back that you can sell again.",
  ADJUSTMENT: "Fix the count after counting the shelf.",
};

/** API 7: one stock change. The owner types a positive number; the sign comes from the action. */
export function StockForm({ listing, action, onCancel, onSaved, onFailed }: { listing: Listing; action: StockAction; onCancel: () => void; onSaved: (l: Listing) => void; onFailed: Failed }) {
  const id = useId();
  const [draft, setDraft] = useState<StockDraft>({ action, quantity: "", direction: "add", reason: "", batchId: "" });
  const [errors, setErrors] = useState<StockErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Batch items: which batch the change belongs to (stock-left batches, loaded when this opens).
  const [batches, setBatches] = useState<Batch[] | null>(listing.tracksBatches ? null : []);
  // The latest error handler, without reloading the batches each time the parent re-renders.
  const failedRef = useRef(onFailed);
  useEffect(() => {
    failedRef.current = onFailed;
  });
  useEffect(() => {
    if (!listing.tracksBatches) return;
    let live = true;
    loadBatchesAction(listing.listingId, action === "RETURN" || action === "ADJUSTMENT").then((res) => {
      if (!live) return;
      if (!res.ok) return failedRef.current(res.error);
      setBatches(res.data);
      // One batch: no choice to make.
      if (res.data.length === 1) setDraft((d) => ({ ...d, batchId: res.data[0].batchId }));
    });
    return () => {
      live = false;
    };
  }, [listing.listingId, listing.tracksBatches, action]);

  const set = <K extends keyof StockDraft>(key: K, value: StockDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    const field = key === "direction" ? "quantity" : key;
    if (errors[field as keyof StockErrors]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const batch = batches?.find((b) => b.batchId === draft.batchId);
  const qty = Number(draft.quantity) || 0;
  const change = qty ? signedQuantity(draft) : 0;
  const after = listing.stockQuantity + change;
  const step = (by: number) => set("quantity", String(Math.min(STOCK_MAX, Math.max(1, qty + by))));

  function save(event: FormEvent) {
    event.preventDefault();
    const found = stockErrors(draft, { tracksBatches: listing.tracksBatches, stock: listing.stockQuantity, batchRemaining: batch?.quantityRemaining });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return toastError(Object.values(found)[0] ?? "Please fix the highlighted fields.");
    startTransition(async () => {
      const res = await adjustStockAction(listing.listingId, draft, { tracksBatches: listing.tracksBatches });
      if (res.ok) {
        toastSuccess(res.data.message);
        return onSaved(res.data.listing);
      }
      setErrors(res.error.fieldErrors as StockErrors);
      setMessage(res.error.message);
      onFailed(res.error);
    });
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <p className="text-sm text-muted">{HINT[action]}</p>

      {action === "ADJUSTMENT" && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">The shelf has</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: "add", label: "More than shown" },
                { v: "remove", label: "Fewer than shown" },
              ] as const
            ).map((o) => (
              <label key={o.v} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${draft.direction === o.v ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}>
                <input type="radio" name={`${id}-dir`} checked={draft.direction === o.v} onChange={() => set("direction", o.v)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {listing.tracksBatches && (
        <div>
          <label htmlFor={`${id}-batch`} className="mb-1.5 block text-sm font-semibold text-ink">
            Batch
          </label>
          {batches === null ? (
            <div aria-hidden className="h-12 animate-pulse rounded-xl bg-line/60" />
          ) : batches.length === 0 ? (
            <p className="rounded-xl bg-surface px-3 py-3 text-sm text-muted">No batches yet. Add a batch first.</p>
          ) : (
            <select
              id={`${id}-batch`}
              value={draft.batchId}
              onChange={(e) => set("batchId", e.target.value)}
              aria-invalid={!!errors.batchId}
              className={`min-h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${errors.batchId ? "border-red-500" : "border-line focus:border-ink"}`}
            >
              <option value="" disabled>
                Choose a batch
              </option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchNo ?? "Batch"} · {b.quantityRemaining} of {b.quantityReceived} left · expires {dateText(b.expiresOn)}
                  {daysUntil(b.expiresOn) <= 2 ? " (sell soon)" : ""}
                </option>
              ))}
            </select>
          )}
          <FieldError id={`${id}-batch-error`} message={errors.batchId} />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-qty`} className="mb-1.5 block text-sm font-semibold text-ink">
          How many
        </label>
        <div className={`flex items-center overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-brand/40 ${errors.quantity ? "border-red-500" : "border-line focus-within:border-ink"}`}>
          <button type="button" onClick={() => step(-1)} aria-label="One less" className="flex size-12 shrink-0 items-center justify-center text-ink hover:bg-surface">
            <Minus aria-hidden className="size-4" />
          </button>
          <input
            id={`${id}-qty`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="0"
            value={draft.quantity}
            onChange={(e) => set("quantity", e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!errors.quantity}
            aria-describedby={errors.quantity ? `${id}-qty-error` : undefined}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-center text-xl font-extrabold text-ink outline-none"
          />
          <button type="button" onClick={() => step(1)} aria-label="One more" className="flex size-12 shrink-0 items-center justify-center text-ink hover:bg-surface">
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <FieldError id={`${id}-qty-error`} message={errors.quantity} />
      </div>

      {/* What the stock becomes. */}
      <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
        <span className="text-sm text-muted">Stock after this</span>
        <span className="flex items-baseline gap-2 font-bold tabular-nums">
          <span className="text-muted">{listing.stockQuantity.toLocaleString("en-IN")}</span>
          <span aria-hidden className="text-muted">→</span>
          <span className={`text-xl ${after < 0 ? "text-red-700" : change > 0 ? "text-green-700" : change < 0 ? "text-amber-700" : "text-ink"}`}>{(qty ? after : listing.stockQuantity).toLocaleString("en-IN")}</span>
        </span>
      </div>

      <div>
        <label htmlFor={`${id}-reason`} className="mb-1.5 block text-sm font-semibold text-ink">
          Reason {action === "DAMAGED" || action === "ADJUSTMENT" ? "" : <span className="font-normal text-muted">(optional)</span>}
        </label>
        <input
          id={`${id}-reason`}
          maxLength={REASON_MAX}
          value={draft.reason}
          onChange={(e) => set("reason", e.target.value)}
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? `${id}-reason-error` : undefined}
          className={`min-h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${errors.reason ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <FieldError id={`${id}-reason-error`} message={errors.reason} />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick reasons">
          {REASONS[action].map((r) => (
            <button key={r} type="button" onClick={() => set("reason", r)} className="min-h-10 rounded-full bg-surface px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              {r}
            </button>
          ))}
        </div>
      </div>

      {message && <FormMessage error={message} />}
      <DialogFooter pending={pending} label="Save" onCancel={onCancel} />
    </form>
  );
}

/** API 8: a delivery with an expiry date (batch-tracked items). */
export function BatchForm({ listing, onCancel, onSaved, onFailed }: { listing: Listing; onCancel: () => void; onSaved: (l: Listing) => void; onFailed: Failed }) {
  const [draft, setDraft] = useState<BatchDraft>(emptyBatchDraft());
  const [errors, setErrors] = useState<BatchErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = todayInIndia();
  const set = <K extends keyof BatchDraft>(key: K, value: BatchDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const days = draft.expiresOn ? daysUntil(draft.expiresOn) : null;

  function save(event: FormEvent) {
    event.preventDefault();
    const found = batchErrors(draft);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return toastError(Object.values(found)[0] ?? "Please fix the highlighted fields.");
    startTransition(async () => {
      const res = await addBatchAction(listing.listingId, draft);
      if (res.ok) {
        toastSuccess(res.data.message);
        return onSaved(res.data.listing);
      }
      setErrors(res.error.fieldErrors as BatchErrors);
      setMessage(res.error.message);
      onFailed(res.error);
    });
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Quantity" name="quantity" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="30" value={draft.quantity} onChange={(v) => set("quantity", v.replace(/\D/g, ""))} error={errors.quantity} />
        <TextField
          label="Expires on"
          name="expiresOn"
          type="date"
          autoComplete="off"
          maxLength={10}
          min={today}
          value={draft.expiresOn}
          onChange={(v) => set("expiresOn", v)}
          error={errors.expiresOn}
          hint={days != null && days >= 0 ? (days === 0 ? "Expires today" : `In ${days} ${days === 1 ? "day" : "days"}`) : undefined}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Made on" name="manufacturedOn" type="date" autoComplete="off" maxLength={10} optional value={draft.manufacturedOn} onChange={(v) => set("manufacturedOn", v)} error={errors.manufacturedOn} />
        <TextField label="Batch / lot no." name="batchNo" autoComplete="off" maxLength={50} placeholder="AM1017" optional value={draft.batchNo} onChange={(v) => set("batchNo", v.toUpperCase())} error={errors.batchNo} />
      </div>
      <TextField
        label="Your cost per unit"
        name="costPrice"
        inputMode="decimal"
        autoComplete="off"
        maxLength={11}
        prefix="₹"
        optional
        value={draft.costPrice}
        onChange={(v) => set("costPrice", v.replace(/[^\d.]/g, ""))}
        error={errors.costPrice}
        hint="Private: only you see this. Helps you see your margin later."
      />
      {message && <FormMessage error={message} />}
      <DialogFooter pending={pending} label="Add batch" onCancel={onCancel} />
    </form>
  );
}

function DialogFooter({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) {
  return (
    // Pinned to the bottom of the dialog, so Save is always in reach.
    <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-white px-5 py-3">
      <button type="button" onClick={onCancel} disabled={pending} className="flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
        Cancel
      </button>
      <SubmitButton pending={pending} label={label} pendingLabel="Saving…" />
    </div>
  );
}
