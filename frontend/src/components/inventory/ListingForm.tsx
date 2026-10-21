"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Toggle } from "@/components/admin/FormParts";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { SubmitButton, TextField } from "@/components/auth/AuthFields";
import { toastError, toastSuccess } from "@/components/Toaster";
import { createListingAction, updateListingAction } from "@/lib/inventory/actions";
import type { Listing, ListingDraft, ListingErrors } from "@/lib/inventory/types";
import { discountPercent, listingErrors, MAX_PER_ORDER, money } from "@/lib/inventory/validation";

type Props =
  | { mode: "create"; variantId: number; initial: ListingDraft; onCancel: () => void; onCreated: (listingId: string) => void }
  | { mode: "edit"; listingId: string; stock: number; initial: ListingDraft; onCancel: () => void; onSaved: (listing: Listing) => void };

// Price, MRP and the selling settings of one size. Create = API 2 (with opening
// stock); edit = API 5, which replaces every field, so the whole form is sent.
export function ListingForm(props: Props) {
  const { sessionExpired } = useAuth();
  const creating = props.mode === "create";
  const [draft, setDraft] = useState(props.initial);
  const [errors, setErrors] = useState<ListingErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(!creating && (props.initial.storeSku !== "" || props.initial.maxPerOrder !== ""));
  const [pending, startTransition] = useTransition();
  // Switching batch tracking is only allowed while the stock is 0 (backend rule).
  const batchSwitchLocked = props.mode === "edit" && props.stock > 0;

  const set = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const amount = (v: string) => v.replace(/[^\d.]/g, "");
  const whole = (v: string) => v.replace(/\D/g, "");

  const price = Number(draft.price);
  const mrp = Number(draft.mrp);
  const previewOk = price > 0 && mrp > 0 && price <= mrp;
  const off = previewOk ? discountPercent(price, mrp) : 0;

  function save(event: FormEvent) {
    event.preventDefault();
    const found = listingErrors(draft, creating);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) {
      if (found.lowStockThreshold || found.maxPerOrder || found.storeSku) setAdvanced(true);
      return toastError(Object.values(found)[0] ?? "Please fix the highlighted fields.");
    }
    startTransition(async () => {
      if (props.mode === "create") {
        const res = await createListingAction(props.variantId, draft);
        if (res.ok) {
          toastSuccess(res.data.message);
          return props.onCreated(res.data.listingId);
        }
        return handle(res.error);
      }
      const res = await updateListingAction(props.listingId, draft);
      if (res.ok) {
        toastSuccess(res.data.message);
        return props.onSaved(res.data.listing);
      }
      handle(res.error);
    });
  }

  function handle(error: { code: string; message: string; fieldErrors: Record<string, string> }) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    setErrors(error.fieldErrors as ListingErrors);
    if (error.fieldErrors.storeSku || error.fieldErrors.maxPerOrder || error.fieldErrors.lowStockThreshold) setAdvanced(true);
    setMessage(error.message);
    toastError(error.message);
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Your price" name="price" inputMode="decimal" autoComplete="off" maxLength={11} prefix="₹" placeholder="329" value={draft.price} onChange={(v) => set("price", amount(v))} error={errors.price} />
        <TextField label="MRP" name="mrp" inputMode="decimal" autoComplete="off" maxLength={11} prefix="₹" placeholder="399" value={draft.mrp} onChange={(v) => set("mrp", amount(v))} error={errors.mrp} />
      </div>
      {/* What shoppers will see, as they type. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
        <span className="text-sm text-muted">Shoppers see</span>
        {previewOk ? (
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-extrabold text-ink">{money(price)}</span>
            {off > 0 && <span className="text-sm text-muted line-through">{money(mrp)}</span>}
            {off > 0 ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-200">{off}% off</span> : <span className="text-xs text-muted">at MRP</span>}
          </span>
        ) : (
          <span className="text-sm text-muted">Enter your price and the MRP</span>
        )}
      </div>
      <p className="-mt-3 text-xs text-muted">Prices include GST. Your price can be the MRP or lower.</p>

      <Toggle
        label="Track expiry batches"
        hint={batchSwitchLocked ? "Can be changed only when the stock is 0." : "For items with expiry dates, such as milk and bread. Stock is then added as batches with their expiry date."}
        checked={draft.tracksBatches}
        onChange={(v) => !batchSwitchLocked && set("tracksBatches", v)}
      />

      {creating && !draft.tracksBatches && (
        <TextField
          label="Opening stock"
          name="openingStock"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="0"
          optional
          value={draft.openingStock}
          onChange={(v) => set("openingStock", whole(v))}
          error={errors.openingStock}
          hint="How many you have on the shelf right now. You can add more later."
        />
      )}

      <Toggle label="Show to customers" hint={draft.isAvailable ? "Customers can buy this once your store is live." : "Hidden: customers won't see it. Turn on when you're ready."} checked={draft.isAvailable} onChange={(v) => set("isAvailable", v)} warn={!draft.isAvailable} />

      <div className="rounded-2xl ring-1 ring-line">
        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-sm font-semibold text-ink">
          More settings
          <span className="flex items-center gap-2 text-xs font-normal text-muted">
            Low-stock alert, limit per order, SKU
            <ChevronDown aria-hidden className={`size-4 transition-transform ${advanced ? "rotate-180" : ""}`} />
          </span>
        </button>
        {advanced && (
          <div className="space-y-4 border-t border-line p-4">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Low-stock alert at" name="lowStockThreshold" inputMode="numeric" autoComplete="off" maxLength={6} value={draft.lowStockThreshold} onChange={(v) => set("lowStockThreshold", whole(v))} error={errors.lowStockThreshold} hint="Flag it as low at this count." />
              <TextField label="Max per order" name="maxPerOrder" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="No limit" optional value={draft.maxPerOrder} onChange={(v) => set("maxPerOrder", whole(v))} error={errors.maxPerOrder} hint={`1 to ${MAX_PER_ORDER}.`} />
            </div>
            <TextField label="Your SKU / code" name="storeSku" autoComplete="off" maxLength={50} placeholder="ALP-1KG" optional value={draft.storeSku} onChange={(v) => set("storeSku", v.toUpperCase())} error={errors.storeSku} hint="Your own code for this item, if you use one." />
          </div>
        )}
      </div>

      {message && <FormMessage error={message} />}

      {/* Pinned to the bottom of the dialog, so Save is always in reach. */}
      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-white px-5 py-3">
        <button type="button" onClick={props.onCancel} disabled={pending} className="flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
          Cancel
        </button>
        <SubmitButton pending={pending} label={creating ? "Start selling" : "Save changes"} pendingLabel="Saving…" />
      </div>
    </form>
  );
}
