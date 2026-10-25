"use client";

import { Eye, EyeOff, Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { SelectField, TextField } from "@/components/auth/AuthFields";
import { toastError, toastSuccess } from "@/components/Toaster";
import { addVariantsAction, saveVariantAction } from "@/lib/catalog/product-actions";
import { SIZE_PRESETS, UNITS, VARIANT_LIMITS, emptyVariantDraft, sizeText, sortVariants, toVariantDraft, variantClashes, variantErrors } from "@/lib/catalog/product-validation";
import type { ProductUnit, ProductVariant, VariantDraft, VariantErrors } from "@/lib/catalog/types";
import { Toggle } from "./FormParts";

const LIMIT = VARIANT_LIMITS.perProduct;

// The sizes a product is sold in ("500 g", "1 kg"). New sizes are typed as rows
// and saved together in one request (all or nothing); an existing size is edited
// on its own. After every save the page re-reads the list from the server.
export function VariantManager({ productId, productName, variants, startAdding }: { productId: number; productName: string; variants: ProductVariant[]; startAdding: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(startAdding && variants.length === 0);
  const sorted = sortVariants(variants);
  const used = variants.length;
  const full = used >= LIMIT;

  function saved(text: string) {
    setEditing(null);
    setAdding(false);
    toastSuccess(text);
    router.refresh();
  }

  return (
    <section id="sizes" aria-labelledby="sizes-heading" className="scroll-mt-24 space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sizes-heading" className="font-bold text-ink">
            Sizes
          </h2>
          <p className="text-sm text-muted">What shoppers can pick, like 500 g or 1 kg. Stores set their own price and stock.</p>
          <UsageMeter used={used} />
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={full}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50"
          >
            <Plus aria-hidden className="size-4" />
            Add sizes
          </button>
        )}
      </div>

      {sorted.length === 0 && !adding && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
          <Ruler aria-hidden className="size-7 text-brand-deep" />
          <p className="mt-2 font-semibold text-ink">No sizes yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Add at least one so shoppers know how {productName} is sold. You can add several at once.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {sorted.map((v) =>
            editing === v.variantId ? (
              <li key={v.variantId} className="p-3 sm:p-4">
                <VariantForm
                  productId={productId}
                  variant={v}
                  others={variants.filter((o) => o.variantId !== v.variantId)}
                  onCancel={() => setEditing(null)}
                  onSaved={(label) => saved(`${label} saved.`)}
                  onGone={() => router.refresh()}
                />
              </li>
            ) : (
              <VariantRow key={v.variantId} productId={productId} variant={v} onEdit={() => setEditing(v.variantId)} onChanged={(text) => saved(text)} />
            ),
          )}
        </ul>
      )}

      {adding && <NewSizes productId={productId} existing={variants} onCancel={() => setAdding(false)} onSaved={(text) => saved(text)} />}
      {full && <p className="text-sm text-muted">A product can have up to {LIMIT} sizes. Hide one you no longer sell instead of adding more.</p>}
    </section>
  );
}

function UsageMeter({ used }: { used: number }) {
  const pct = Math.min(100, Math.round((used / LIMIT) * 100));
  return (
    <div className="mt-2 flex items-center gap-2">
      <div aria-hidden className="h-1.5 w-24 overflow-hidden rounded-full bg-surface ring-1 ring-line">
        <div className={`h-full rounded-full ${used >= LIMIT ? "bg-red-500" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-muted">
        {used} of {LIMIT} sizes used
      </span>
    </div>
  );
}

// ---- one saved size: Edit, and a quick Hide / Show (PUT with the whole size) ----

function VariantRow({ productId, variant: v, onEdit, onChanged }: { productId: number; variant: ProductVariant; onEdit: () => void; onChanged: (text: string) => void }) {
  const { sessionExpired } = useAuth();
  const [pending, startTransition] = useTransition();

  function flip() {
    startTransition(async () => {
      const res = await saveVariantAction(productId, v.variantId, { ...toVariantDraft(v), isActive: !v.isActive });
      if (res.ok) return onChanged(res.data.isActive ? `${v.label} is back in the shop.` : `${v.label} is hidden from shoppers.`);
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      toastError(res.error.message);
    });
  }

  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${v.isActive ? "" : "bg-surface"}`}>
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
        onClick={flip}
        disabled={pending}
        aria-label={`${v.isActive ? "Hide" : "Show"} ${v.label}`}
        className="flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink disabled:opacity-50 md:px-3.5"
      >
        {v.isActive ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        <span aria-hidden className="hidden md:inline">{pending ? "Saving…" : v.isActive ? "Hide" : "Show"}</span>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-2.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink md:px-3.5"
      >
        <Pencil aria-hidden className="size-4" />
        <span className="hidden md:inline">Edit</span>
        <span className="sr-only md:hidden">Edit {v.label}</span>
      </button>
    </li>
  );
}

// ---- add: rows saved together ----

type Row = { key: number; draft: VariantDraft; labelTouched: boolean };

/** "variants[2].label" → row 2's label (the backend's and our action's field names). */
function rowErrorsFrom(fieldErrors: Record<string, string>): Record<number, VariantErrors> {
  const out: Record<number, VariantErrors> = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    const m = /^variants\[(\d+)\]\.(\w+)$/.exec(field);
    if (!m || !(m[2] in emptyVariantDraft())) continue;
    (out[Number(m[1])] ??= {})[m[2] as keyof VariantDraft] = message;
  }
  return out;
}

// A 409's detail names the size ("\"1 KG\" is in the list twice.", "SKU \"ALP-1KG\" is…"):
// find that row so its field turns red too.
const CLASH_FIELD: Record<string, keyof VariantDraft> = { VARIANT_LABEL_TAKEN: "label", VARIANT_AMOUNT_TAKEN: "quantity", VARIANT_SKU_TAKEN: "sku" };
function clashRow(code: string, message: string, rows: Row[]): number {
  const named = /"([^"]+)"/.exec(message)?.[1]?.trim().toLowerCase();
  if (!named) return -1;
  const keys = rows.map((r) => (code === "VARIANT_SKU_TAKEN" ? r.draft.sku : r.draft.label).trim().toLowerCase());
  // "In the list twice": the later copy is the one to fix.
  return keys.lastIndexOf(named);
}

function NewSizes({ productId, existing, onCancel, onSaved }: { productId: number; existing: ProductVariant[]; onCancel: () => void; onSaved: (text: string) => void }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const boxRef = useRef<HTMLDivElement>(null);
  const nextKey = useRef(1);
  const room = Math.max(0, LIMIT - existing.length);
  const [rows, setRows] = useState<Row[]>(() => [{ key: 0, draft: emptyVariantDraft(nextOrder([])), labelTouched: false }]);
  const [errors, setErrors] = useState<Record<number, VariantErrors>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canAdd = rows.length < room;

  function nextOrder(list: Row[]) {
    const orders = [...existing.map((v) => v.displayOrder), ...list.map((r) => Number(r.draft.displayOrder) || 0)];
    return orders.length ? Math.min(Math.max(...orders) + 1, VARIANT_LIMITS.displayOrder) : 0;
  }
  function blankRow(order: number, quantity = "", unit: ProductUnit = "KG"): Row {
    const draft = { ...emptyVariantDraft(order), quantity, unit, label: Number(quantity) > 0 ? sizeText(Number(quantity), unit) : "" };
    return { key: nextKey.current++, draft, labelTouched: false };
  }
  // Errors are by row position, so they're dropped whenever rows move.
  function update(next: Row[]) {
    setRows(next);
    setErrors({});
    setMessage(null);
  }

  function addRow(quantity?: number, unit?: ProductUnit) {
    if (!canAdd) return;
    // A quick pick fills the last row while it's still empty.
    const last = rows.at(-1);
    if (quantity && unit && last && !last.draft.quantity && !last.draft.label.trim()) {
      return update([...rows.slice(0, -1), { ...last, draft: { ...last.draft, quantity: String(quantity), unit, label: sizeText(quantity, unit) }, labelTouched: false }]);
    }
    update([...rows, blankRow(nextOrder(rows), quantity ? String(quantity) : "", unit)]);
    if (!quantity) requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>("[data-row]:last-of-type input")?.focus());
  }

  function changeRow(index: number, row: Row) {
    setRows((list) => list.map((r, i) => (i === index ? row : r)));
    setErrors((all) => (all[index] ? { ...all, [index]: {} } : all));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const drafts = rows.map((r) => r.draft);
    const clashes = variantClashes(drafts, existing);
    const found: Record<number, VariantErrors> = {};
    drafts.forEach((d, i) => {
      const e = { ...clashes[i], ...variantErrors(d) };
      if (Object.keys(e).length) found[i] = e;
    });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) {
      toastError(rowSummary(found));
      return focusError();
    }
    startTransition(async () => {
      const res = await addVariantsAction(productId, drafts);
      if (res.ok) return onSaved(res.data.message);
      const { code, message: text, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      const byRow = rowErrorsFrom(fieldErrors);
      const field = CLASH_FIELD[code];
      const at = field ? clashRow(code, text, rows) : -1;
      if (field && at >= 0) byRow[at] = { ...byRow[at], [field]: text };
      // Someone else saved sizes meanwhile: show the fresh list (and limit).
      if (code === "VARIANT_ALREADY_EXISTS" || code === "VARIANT_LIMIT_REACHED") router.refresh();
      setErrors(byRow);
      const shown = Object.keys(byRow).length ? (code === "VALIDATION_FAILED" ? rowSummary(byRow) : text) : text;
      setMessage(shown);
      toastError(shown);
      focusError();
    });
  }

  function focusError() {
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  }

  const taken = (q: number, u: ProductUnit) => existing.some((v) => v.unit === u && v.quantity === q) || rows.some((r) => r.draft.unit === u && Number(r.draft.quantity) === q);
  const presets = SIZE_PRESETS.filter((p) => !taken(p.quantity, p.unit));

  return (
    <form onSubmit={save} noValidate className="space-y-4 rounded-2xl bg-surface p-3 ring-1 ring-line sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">New sizes</p>
        <p className="text-xs text-muted">
          {rows.length} of {room} you can add · saved together
        </p>
      </div>

      {presets.length > 0 && canAdd && (
        <div>
          <p className="mb-1.5 text-sm text-muted">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const text = sizeText(p.quantity, p.unit);
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => addRow(p.quantity, p.unit)}
                  className="flex min-h-10 items-center gap-1 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink transition hover:border-ink"
                >
                  <Plus aria-hidden className="size-3.5" />
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Column titles for the table layout (md+); phones show a label on every field. */}
      <div aria-hidden className="hidden gap-2 px-3 text-xs font-semibold text-muted md:grid md:grid-cols-[6rem_8rem_minmax(0,1fr)_8rem_5rem_4.5rem_2.5rem]">
        <span>Quantity</span>
        <span>Unit</span>
        <span>Label shoppers see</span>
        <span>SKU</span>
        <span>Order</span>
        <span>Show</span>
        <span />
      </div>
      <div ref={boxRef} className="space-y-2">
        {rows.map((row, i) => (
          <SizeRow key={row.key} index={i} row={row} errors={errors[i] ?? {}} canRemove={rows.length > 1} onChange={(r) => changeRow(i, r)} onRemove={() => update(rows.filter((_, j) => j !== i))} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => addRow()}
        disabled={!canAdd}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white text-sm font-semibold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus aria-hidden className="size-4" />
        {canAdd ? "Add row" : `Limit reached (${LIMIT} sizes per product)`}
      </button>

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
          {pending ? "Saving…" : rows.length === 1 ? "Save size" : `Save all ${rows.length} sizes`}
        </button>
      </div>
    </form>
  );
}

function rowSummary(byRow: Record<number, VariantErrors>): string {
  const nums = Object.keys(byRow).map((i) => Number(i) + 1);
  return nums.length === 1 ? `Please fix row ${nums[0]}. Nothing was saved.` : `Please fix rows ${nums.join(", ")}. Nothing was saved.`;
}

const CELL = "min-h-11 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 md:text-sm";
const cellBorder = (error?: string) => (error ? "border-red-500" : "border-line focus:border-ink");

function SizeRow({ index, row, errors, canRemove, onChange, onRemove }: { index: number; row: Row; errors: VariantErrors; canRemove: boolean; onChange: (row: Row) => void; onRemove: () => void }) {
  const id = useId();
  const { draft } = row;
  const n = index + 1;
  const set = <K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) => onChange({ ...row, draft: { ...draft, [key]: value } });
  // The label follows the amount ("1 kg") until the admin types their own.
  const setAmount = (quantity: string, unit: ProductUnit) =>
    onChange({ ...row, draft: { ...draft, quantity, unit, label: row.labelTouched ? draft.label : Number(quantity) > 0 ? sizeText(Number(quantity), unit) : "" } });
  const err = (key: keyof VariantDraft) => (errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${id}-${key}` } : {});
  const problems = (Object.keys(errors) as (keyof VariantDraft)[]).filter((k) => errors[k]);

  return (
    <div data-row role="group" aria-label={`Size ${n}`} className={`rounded-2xl bg-white p-3 ring-1 motion-safe:animate-pop-in ${problems.length ? "ring-red-300" : "ring-line"}`}>
      <div className="mb-2 flex items-center justify-between md:hidden">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Size {n}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[6rem_8rem_minmax(0,1fr)_8rem_5rem_4.5rem_2.5rem] md:items-center">
        <Cell id={`${id}-q`} label="Quantity" n={n}>
          <input id={`${id}-q`} inputMode="decimal" autoComplete="off" maxLength={11} placeholder="1" value={draft.quantity} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""), draft.unit)} className={`${CELL} ${cellBorder(errors.quantity)}`} {...err("quantity")} />
        </Cell>
        <Cell id={`${id}-u`} label="Unit" n={n}>
          <select id={`${id}-u`} value={draft.unit} onChange={(e) => setAmount(draft.quantity, e.target.value as ProductUnit)} className={`${CELL} ${cellBorder(errors.unit)}`} {...err("unit")}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.short}
              </option>
            ))}
          </select>
        </Cell>
        <Cell id={`${id}-l`} label="Label shoppers see" n={n} wide>
          <input
            id={`${id}-l`}
            autoComplete="off"
            maxLength={VARIANT_LIMITS.label}
            placeholder="1 kg"
            value={draft.label}
            onChange={(e) => onChange({ ...row, labelTouched: e.target.value.trim() !== "", draft: { ...draft, label: e.target.value } })}
            className={`${CELL} ${cellBorder(errors.label)}`}
            {...err("label")}
          />
        </Cell>
        <Cell id={`${id}-s`} label="SKU (optional)" n={n}>
          <input id={`${id}-s`} autoComplete="off" maxLength={VARIANT_LIMITS.sku} placeholder="ALP-1KG" value={draft.sku} onChange={(e) => set("sku", e.target.value.toUpperCase().replace(/\s+/g, "-"))} className={`${CELL} ${cellBorder(errors.sku)}`} {...err("sku")} />
        </Cell>
        <Cell id={`${id}-o`} label="Order" n={n}>
          <input id={`${id}-o`} inputMode="numeric" autoComplete="off" maxLength={6} value={draft.displayOrder} onChange={(e) => set("displayOrder", e.target.value.replace(/\D/g, ""))} className={`${CELL} ${cellBorder(errors.displayOrder)}`} {...err("displayOrder")} />
        </Cell>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink md:justify-center">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-5 accent-ink" />
          <span className="md:sr-only">Show in shop</span>
          <span className="sr-only"> (size {n})</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove size ${n}`}
          className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted ring-1 ring-line transition hover:text-red-700 hover:ring-red-300 disabled:invisible md:col-span-1 md:ring-0"
        >
          <Trash2 aria-hidden className="size-4" />
          <span className="md:hidden">Remove</span>
        </button>
      </div>
      {problems.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-red-700">
          {problems.map((k) => (
            <li key={k} id={`${id}-${k}`}>
              {errors[k]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Cell({ id, label, n, wide, children }: { id: string; label: string; n: number; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "col-span-2 md:col-span-1" : ""}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted md:sr-only">
        {label}
        <span className="sr-only"> (size {n})</span>
      </label>
      {children}
    </div>
  );
}

// ---- edit one saved size ----

function VariantForm({ productId, variant, others, onCancel, onSaved, onGone }: { productId: number; variant: ProductVariant; others: ProductVariant[]; onCancel: () => void; onSaved: (label: string) => void; onGone: () => void }) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => toVariantDraft(variant));
  const [errors, setErrors] = useState<VariantErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof VariantDraft>(key: K) => (value: VariantDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function save(event: FormEvent) {
    event.preventDefault();
    const found = { ...variantClashes([draft], others)[0], ...variantErrors(draft) };
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    startTransition(async () => {
      const res = await saveVariantAction(productId, variant.variantId, draft);
      if (res.ok) return onSaved(res.data.label);
      const { code, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      toastError(res.error.message);
      if (code === "VARIANT_NOT_FOUND") return onGone();
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

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-4">
      <p className="font-semibold text-ink">Edit {variant.label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <TextField label="Quantity" name="quantity" inputMode="decimal" autoComplete="off" maxLength={11} placeholder="1" value={draft.quantity} onChange={(v) => set("quantity")(v.replace(/[^\d.]/g, ""))} error={errors.quantity} />
        <SelectField
          label="Unit"
          name="unit"
          autoComplete="off"
          groups={[{ label: "", options: UNITS.map((u) => ({ value: u.value, label: u.label })) }]}
          value={draft.unit}
          onChange={(v) => set("unit")(v as ProductUnit)}
          error={errors.unit}
        />
        <div className="col-span-2 sm:col-span-1">
          <TextField label="Label shoppers see" name="label" autoComplete="off" maxLength={VARIANT_LIMITS.label} placeholder="1 kg" value={draft.label} onChange={set("label")} error={errors.label} />
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
        <TextField label="Display order" name="displayOrder" inputMode="numeric" autoComplete="off" maxLength={6} value={draft.displayOrder} onChange={(v) => set("displayOrder")(v.replace(/\D/g, ""))} error={errors.displayOrder} hint="Lower comes first." />
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
          {pending ? "Saving…" : "Save size"}
        </button>
      </div>
    </form>
  );
}
