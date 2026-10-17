"use client";

import { EyeOff, Pencil, Plus, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { SelectField, TextField } from "@/components/auth/AuthFields";
import { saveVariantAction } from "@/lib/catalog/product-actions";
import { SIZE_PRESETS, UNITS, VARIANT_LIMITS, emptyVariantDraft, sizeText, sortVariants, toVariantDraft, variantErrors } from "@/lib/catalog/product-validation";
import type { ProductUnit, ProductVariant, VariantDraft, VariantErrors } from "@/lib/catalog/types";
import { Toggle } from "./FormParts";

const NOTICE_MS = 5000;

// The sizes a product is sold in ("500 g", "1 kg"). Each size is saved on its
// own (plain JSON, no picture), then the list reloads from the server.
export function VariantManager({ productId, productName, variants, startAdding }: { productId: number; productName: string; variants: ProductVariant[]; startAdding: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | "new" | null>(startAdding && variants.length === 0 ? "new" : null);
  const [notice, setNotice] = useState<string | null>(null);
  const sorted = sortVariants(variants);
  const full = variants.length >= VARIANT_LIMITS.perProduct;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function saved(text: string) {
    setEditing(null);
    setNotice(text);
    router.refresh();
  }

  const nextOrder = sorted.length ? Math.min(sorted.at(-1)!.displayOrder + 1, VARIANT_LIMITS.displayOrder) : 0;

  return (
    <section id="sizes" aria-labelledby="sizes-heading" className="scroll-mt-24 space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sizes-heading" className="font-bold text-ink">
            Sizes
          </h2>
          <p className="text-sm text-muted">
            What shoppers can pick, like 500 g or 1 kg. {variants.length}/{VARIANT_LIMITS.perProduct} used.
          </p>
        </div>
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            disabled={full}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50"
          >
            <Plus aria-hidden className="size-4" />
            Add size
          </button>
        )}
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice && <FormMessage notice={notice} />}
      </div>

      {sorted.length === 0 && editing !== "new" && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
          <Ruler aria-hidden className="size-7 text-brand-deep" />
          <p className="mt-2 font-semibold text-ink">No sizes yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Add at least one so shoppers know how {productName} is sold.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {sorted.map((v) =>
            editing === v.variantId ? (
              <li key={v.variantId} className="p-3 sm:p-4">
                <VariantForm productId={productId} variant={v} initial={toVariantDraft(v)} onCancel={() => setEditing(null)} onSaved={() => saved(`${v.label} saved.`)} />
              </li>
            ) : (
              <li key={v.variantId} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${v.isActive ? "" : "bg-surface"}`}>
                <span className={`flex h-11 min-w-16 shrink-0 items-center justify-center rounded-xl px-2 text-sm font-extrabold ${v.isActive ? "bg-green-50 text-green-800 ring-1 ring-green-200" : "bg-white text-muted ring-1 ring-line"}`}>
                  {sizeText(v.quantity, v.unit)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 break-words font-semibold text-ink">
                    {v.label}
                    {!v.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-deep ring-1 ring-line">
                        <EyeOff aria-hidden className="size-3" />
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {v.sku ? `SKU ${v.sku}` : "No SKU"} · Order {v.displayOrder}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(v.variantId)}
                  className="flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink md:px-3.5"
                >
                  <Pencil aria-hidden className="size-4" />
                  <span className="hidden md:inline">Edit</span>
                  <span className="sr-only md:hidden">Edit {v.label}</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" && (
        <div className="rounded-2xl bg-surface p-3 ring-1 ring-line sm:p-4">
          <VariantForm
            productId={productId}
            variant={null}
            initial={emptyVariantDraft(nextOrder)}
            taken={variants}
            onCancel={() => setEditing(null)}
            onSaved={(label) => saved(`${label} added.`)}
          />
        </div>
      )}
      {full && <p className="text-sm text-muted">A product can have up to {VARIANT_LIMITS.perProduct} sizes. Hide one you no longer sell instead of adding more.</p>}
    </section>
  );
}

function VariantForm({ productId, variant, initial, taken = [], onCancel, onSaved }: { productId: number; variant: ProductVariant | null; initial: VariantDraft; taken?: ProductVariant[]; onCancel: () => void; onSaved: (label: string) => void }) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initial);
  // The label follows the amount ("1 kg") until the admin types their own.
  const [labelTouched, setLabelTouched] = useState(variant !== null);
  const [errors, setErrors] = useState<VariantErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setAmount(quantity: string, unit: ProductUnit) {
    setDraft((d) => {
      const auto = Number(quantity) > 0 ? sizeText(Number(quantity), unit) : "";
      return { ...d, quantity, unit, label: labelTouched ? d.label : auto };
    });
    setErrors((e) => ({ ...e, quantity: undefined, unit: undefined, ...(labelTouched ? {} : { label: undefined }) }));
  }

  const set = <K extends keyof VariantDraft>(key: K) => (value: VariantDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function save(event: FormEvent) {
    event.preventDefault();
    const found = variantErrors(draft);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    startTransition(async () => {
      const res = await saveVariantAction(productId, variant?.variantId ?? null, draft);
      if (res.ok) return onSaved(res.data.label);
      const { code, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      const known = Object.fromEntries(Object.entries(fieldErrors).filter(([field]) => field in draft));
      if (Object.keys(known).length) {
        setErrors(known);
        setMessage(code === "VALIDATION_FAILED" ? "Please fix the highlighted fields." : null);
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
        return;
      }
      setMessage(res.error.message);
    });
  }

  // Shortcuts for the usual sizes, minus the ones the product already has.
  const presets = variant ? [] : SIZE_PRESETS.filter((p) => !taken.some((t) => t.unit === p.unit && t.quantity === p.quantity));

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-4">
      <p className="font-semibold text-ink">{variant ? `Edit ${variant.label}` : "New size"}</p>
      {presets.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-muted">Quick pick</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const text = sizeText(p.quantity, p.unit);
              const on = draft.unit === p.unit && Number(draft.quantity) === p.quantity;
              return (
                <button
                  key={text}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAmount(String(p.quantity), p.unit)}
                  className="min-h-10 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink transition hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <TextField
          label="Quantity"
          name="quantity"
          inputMode="decimal"
          autoComplete="off"
          maxLength={11}
          placeholder="1"
          value={draft.quantity}
          onChange={(v) => setAmount(v.replace(/[^\d.]/g, ""), draft.unit)}
          error={errors.quantity}
        />
        <SelectField
          label="Unit"
          name="unit"
          autoComplete="off"
          groups={[{ label: "", options: UNITS.map((u) => ({ value: u.value, label: u.label })) }]}
          value={draft.unit}
          onChange={(v) => setAmount(draft.quantity, v as ProductUnit)}
          error={errors.unit}
        />
        <div className="col-span-2 sm:col-span-1">
          <TextField
            label="Label shoppers see"
            name="label"
            autoComplete="off"
            maxLength={VARIANT_LIMITS.label}
            placeholder="1 kg"
            value={draft.label}
            onChange={(v) => {
              setLabelTouched(v.trim() !== "");
              set("label")(v);
            }}
            error={errors.label}
            hint={labelTouched ? undefined : "Filled in from the amount. Type to change it."}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="SKU"
          name="sku"
          autoComplete="off"
          optional
          maxLength={VARIANT_LIMITS.sku}
          placeholder="ALP-1KG"
          value={draft.sku}
          onChange={(v) => set("sku")(v.toUpperCase().replace(/\s+/g, "-"))}
          error={errors.sku}
          hint="Unique across the catalog."
        />
        <TextField
          label="Display order"
          name="displayOrder"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={draft.displayOrder}
          onChange={(v) => set("displayOrder")(v.replace(/\D/g, ""))}
          error={errors.displayOrder}
          hint="Lower comes first."
        />
      </div>
      <Toggle label="Show in the shop" hint={draft.isActive ? "Shoppers can pick this size." : "Hidden from shoppers (kept here so you can show it again)."} warn={!draft.isActive} checked={draft.isActive} onChange={set("isActive")} />

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
          {pending ? "Saving…" : variant ? "Save size" : "Add size"}
        </button>
      </div>
    </form>
  );
}
