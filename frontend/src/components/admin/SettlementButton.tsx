"use client";

import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { FieldError } from "@/components/auth/AuthFields";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { recordSettlementAction } from "@/lib/orders/admin-actions";
import { SETTLEMENT_REFERENCE, type SettlementDirection } from "@/lib/orders/types";

type Errors = Partial<Record<"direction" | "amount" | "reference" | "note", string>>;

const DIRECTIONS: { value: SettlementDirection; label: string; hint: string }[] = [
  { value: "STORE_PAID_PLATFORM", label: "Store paid 360mart", hint: "Lowers what the store owes" },
  { value: "PLATFORM_PAID_STORE", label: "360mart paid the store", hint: "Lowers what 360mart owes" },
];

const input = (bad: boolean) =>
  `min-h-11 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${bad ? "border-red-500" : "border-line focus:border-ink"}`;

// "Record settlement": money that actually moved between a store and 360mart
// (bank transfer / UPI), with its reference. The statement reloads afterwards.
export function SettlementButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<SettlementDirection>("STORE_PAID_PLATFORM");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setErrors({});
  }

  function submit() {
    const e: Errors = {};
    const value = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || !(value > 0)) e.amount = "Enter the amount that was paid, like 250 or 11.80.";
    if (!SETTLEMENT_REFERENCE.test(reference.trim())) e.reference = "3 to 60 letters, digits, / _ or -, like the bank's UTR number.";
    if (note.trim().length > 200) e.note = "Keep the note under 200 characters.";
    setErrors(e);
    if (Object.keys(e).length) return;
    start(async () => {
      const res = await recordSettlementAction({ storeId, direction, amount: value, reference: reference.trim(), note: note.trim() || undefined });
      if (!res.ok) {
        const f = res.error.fieldErrors;
        setErrors({
          direction: f.direction,
          amount: f.amount,
          note: f.note,
          reference: res.error.code === "SETTLEMENT_ALREADY_RECORDED" ? res.error.message : f.reference,
        });
        toastError(res.error.message);
        return;
      }
      toastSuccess(res.data.message);
      setAmount("");
      setReference("");
      setNote("");
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
        <Banknote aria-hidden className="size-4" />
        Record settlement
      </button>
      <Dialog open={open} onClose={close} title="Record settlement" description={`Money that has actually been paid, for ${storeName}.`}>
        <div className="space-y-4 pb-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Who paid?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DIRECTIONS.map((d) => (
                <label
                  key={d.value}
                  className="flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border-2 border-line px-4 py-2 transition hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:bg-surface has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
                >
                  <input type="radio" name={`${id}-direction`} value={d.value} checked={direction === d.value} onChange={() => setDirection(d.value)} className="sr-only" />
                  <span className="text-sm font-semibold text-ink">{d.label}</span>
                  <span className="text-xs text-muted">{d.hint}</span>
                </label>
              ))}
            </div>
            <FieldError id={`${id}-direction-error`} message={errors.direction} />
          </fieldset>

          <div>
            <label htmlFor={`${id}-amount`} className="mb-1.5 block text-sm font-semibold text-ink">
              Amount (₹)
            </label>
            <input
              id={`${id}-amount`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="11.80"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
              className={input(!!errors.amount)}
            />
            <FieldError id={`${id}-amount-error`} message={errors.amount} />
          </div>

          <div>
            <label htmlFor={`${id}-reference`} className="mb-1.5 block text-sm font-semibold text-ink">
              Payment reference
            </label>
            <input
              id={`${id}-reference`}
              autoComplete="off"
              maxLength={60}
              placeholder="UTR or UPI reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-invalid={!!errors.reference}
              aria-describedby={`${id}-reference-hint${errors.reference ? ` ${id}-reference-error` : ""}`}
              className={input(!!errors.reference)}
            />
            <p id={`${id}-reference-hint`} className="mt-1 text-xs text-muted">
              Each reference can be used once per store.
            </p>
            <FieldError id={`${id}-reference-error`} message={errors.reference} />
          </div>

          <div>
            <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm font-semibold text-ink">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${id}-note`}
              maxLength={200}
              placeholder="For example: October commission"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-invalid={!!errors.note}
              aria-describedby={errors.note ? `${id}-note-error` : undefined}
              className={input(!!errors.note)}
            />
            <FieldError id={`${id}-note-error`} message={errors.note} />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
              {pending ? "Saving…" : "Record settlement"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
