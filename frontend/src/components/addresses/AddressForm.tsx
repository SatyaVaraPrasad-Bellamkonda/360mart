"use client";

import { Briefcase, Check, Home, Lock, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { MobileField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/auth/AuthFields";
import { saveAddressAction } from "@/lib/addresses/actions";
import { ADDRESS_TYPE_LABEL, ADDRESS_TYPES, STATES, UNION_TERRITORIES, type AddressDraft, type AddressErrors, type AddressType } from "@/lib/addresses/types";
import { ADDRESS_LIMITS, addressErrors, draftFieldErrors } from "@/lib/addresses/validation";
import type { ActionError } from "@/lib/auth/actions";
import type { MapConfig } from "@/lib/maps/config";
import type { PlaceSuggestion } from "@/lib/maps/geocoder";
import { PinSection } from "./PinSection";

type Props = {
  /** null = adding a new address. */
  addressId: string | null;
  initial: AddressDraft;
  /** Default can't be changed here: the first address always is one, and the current default
   *  can only stop being one by choosing another. */
  defaultLocked: "first" | "current" | null;
  map: MapConfig;
};

const TYPE_ICON: Record<AddressType, LucideIcon> = { HOME: Home, WORK: Briefcase, OTHER: MapPin };

type FillKey = "addressLine2" | "city" | "state" | "pincode";
const FILL_KEYS: FillKey[] = ["addressLine2", "city", "state", "pincode"];
const FILL_LABEL: Record<FillKey, string> = { addressLine2: "the area", city: "city", state: "state", pincode: "pincode" };

const STATE_GROUPS = [
  { label: "States", options: STATES },
  { label: "Union Territories", options: UNION_TERRITORIES },
];

// Add / edit address. Checked here for instant feedback, then again by the
// server action and the backend, whose messages are shown under each field.
export function AddressForm({ addressId, initial, defaultLocked, map }: Props) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<AddressDraft>(() => ({ ...initial, isDefault: defaultLocked ? true : initial.isDefault }));
  const [errors, setErrors] = useState<AddressErrors>({});
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof AddressDraft>(key: K) => (value: AddressDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Fixing a field clears its error straight away.
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function handleActionError(error: ActionError, show: (text: string) => void) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    show(error.message);
  }

  function focusFirstError() {
    // After React has rendered the messages.
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found = addressErrors(draft);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) {
      if (found.pin && Object.keys(found).length === 1) setMessage("Move the pin inside India, or remove it.");
      return focusFirstError();
    }

    startTransition(async () => {
      // On success the action redirects to the address list.
      const res = await saveAddressAction(addressId, draft);
      if (!res || res.ok) return;
      const { code } = res.error;
      if (code === "VALIDATION_FAILED") {
        setErrors(draftFieldErrors(res.error.fieldErrors));
        setMessage(Object.keys(res.error.fieldErrors).length ? "Please fix the highlighted fields." : res.error.message);
        return focusFirstError();
      }
      if (code === "ADDRESS_NOT_FOUND") {
        return setMessage(
          <>
            This address no longer exists.{" "}
            <Link href="/account/addresses" className="font-semibold underline">
              Back to your addresses
            </Link>
          </>,
        );
      }
      handleActionError(res.error, setMessage);
    });
  }

  // Fill from the map pin (or a search result). A field is only replaced while it is
  // empty or still holds what the last pin filled in, so anything the shopper typed
  // themselves stays. Everything remains editable.
  // The pin lookup finishes later than the render that started it, so read the newest draft.
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });
  const autoFilled = useRef<Partial<Record<FillKey, string>>>({});

  function applySuggestion(place: PlaceSuggestion): string[] {
    const values: Record<FillKey, string | null> = { addressLine2: place.area, city: place.city, state: place.state, pincode: place.pincode };
    const next: Partial<Pick<AddressDraft, FillKey>> = {};
    const filled: string[] = [];
    for (const key of FILL_KEYS) {
      const value = values[key];
      const current = latest.current[key].trim();
      const untouched = !current || current === autoFilled.current[key];
      if (!value || !untouched) continue;
      autoFilled.current[key] = value;
      if (value !== current) {
        next[key] = value;
        filled.push(FILL_LABEL[key]);
      }
    }
    if (filled.length) {
      setDraft((d) => ({ ...d, ...next }));
      setErrors((e) => ({ ...e, addressLine2: undefined, city: undefined, state: undefined, pincode: undefined }));
    }
    return filled;
  }

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-5">
      <Section title="Who receives the order">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Recipient name" name="recipientName" autoComplete="name" maxLength={ADDRESS_LIMITS.recipientName} value={draft.recipientName} onChange={set("recipientName")} error={errors.recipientName} />
          <MobileField label="Alternate phone" name="alternatePhone" autoComplete="tel-national" optional value={draft.alternatePhone} onChange={set("alternatePhone")} error={errors.alternatePhone} hint="If we can't reach your login number." />
        </div>
      </Section>

      <Section title="Address">
        <PinSection pin={draft.pin} onPin={set("pin")} map={map} error={errors.pin} onSuggest={applySuggestion} onActionError={handleActionError} />
        <TextField label="Flat, house no., building" name="addressLine1" autoComplete="address-line1" maxLength={ADDRESS_LIMITS.addressLine1} placeholder="Flat 302, Green Residency" value={draft.addressLine1} onChange={set("addressLine1")} error={errors.addressLine1} />
        <TextField label="Area, street, sector" name="addressLine2" autoComplete="address-line2" maxLength={ADDRESS_LIMITS.addressLine2} placeholder="MG Road" optional value={draft.addressLine2} onChange={set("addressLine2")} error={errors.addressLine2} />
        <TextField label="Landmark" name="landmark" autoComplete="off" maxLength={ADDRESS_LIMITS.landmark} placeholder="Near City Mall" optional value={draft.landmark} onChange={set("landmark")} error={errors.landmark} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="City" name="city" autoComplete="address-level2" maxLength={ADDRESS_LIMITS.city} value={draft.city} onChange={set("city")} error={errors.city} />
          <TextField
            label="Pincode"
            name="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="500001"
            value={draft.pincode}
            // Digits only, so a pasted "500 001" still works.
            onChange={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))}
            error={errors.pincode}
          />
        </div>
        <SelectField label="State" name="state" autoComplete="address-level1" placeholder="Choose your state" groups={STATE_GROUPS} value={draft.state} onChange={set("state")} error={errors.state} />
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Country</p>
          <p className="flex min-h-12 items-center rounded-xl bg-surface px-3 text-ink">India</p>
          <p className="mt-1.5 text-sm text-muted">We deliver only within India for now.</p>
        </div>
      </Section>

      <Section title="Delivery details">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Save as</legend>
          <div className="grid grid-cols-3 gap-2">
            {ADDRESS_TYPES.map((type) => {
              const Icon = TYPE_ICON[type];
              const selected = draft.addressType === type;
              return (
                <label
                  key={type}
                  className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
                >
                  <input type="radio" name="addressType" value={type} checked={selected} onChange={() => set("addressType")(type)} className="sr-only" />
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {ADDRESS_TYPE_LABEL[type]}
                </label>
              );
            })}
          </div>
        </fieldset>

        <TextAreaField
          label="Delivery instructions"
          name="deliveryInstruction"
          maxLength={ADDRESS_LIMITS.deliveryInstruction}
          placeholder="Ring the bell twice"
          optional
          value={draft.deliveryInstruction}
          onChange={set("deliveryInstruction")}
          error={errors.deliveryInstruction}
          hint="For the delivery partner, e.g. gate code or floor."
        />

        <DefaultToggle checked={draft.isDefault} locked={defaultLocked} onChange={set("isDefault")} />
      </Section>

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link href="/account/addresses" className="flex min-h-12 items-center justify-center rounded-full px-6 font-semibold text-muted hover:text-ink">
          Cancel
        </Link>
        <div className="sm:ml-auto sm:w-56">
          <SubmitButton pending={pending} label={addressId ? "Save changes" : "Save address"} pendingLabel="Saving…" />
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function DefaultToggle({ checked, locked, onChange }: { checked: boolean; locked: Props["defaultLocked"]; onChange: (value: boolean) => void }) {
  const hint =
    locked === "first"
      ? "Your first address is always your default."
      : locked === "current"
        ? "This is your default. To change it, make another address the default."
        : "Used first at checkout.";
  return (
    <label className={`flex min-h-12 items-start gap-3 rounded-2xl border border-line p-4 ${locked ? "cursor-not-allowed bg-surface" : "cursor-pointer hover:border-ink"}`}>
      <input type="checkbox" checked={checked} disabled={!!locked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-describedby="default-hint" />
      <span
        aria-hidden
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${checked ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          Make this my default address
          {locked && <Lock aria-hidden className="size-3.5 text-muted" />}
        </span>
        <span id="default-hint" className="mt-0.5 block text-sm text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}
