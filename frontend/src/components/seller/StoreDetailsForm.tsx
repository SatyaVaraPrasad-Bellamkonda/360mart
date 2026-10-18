"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { PinSection } from "@/components/addresses/PinSection";
import { ImagePicker, Section } from "@/components/admin/FormParts";
import { FormMessage } from "@/components/auth/AuthCard";
import { MobileField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/auth/AuthFields";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActionBar } from "./ActionBar";
import { STATES, UNION_TERRITORIES } from "@/lib/addresses/types";
import type { ActionError } from "@/lib/auth/actions";
import type { MapConfig } from "@/lib/maps/config";
import type { PlaceSuggestion } from "@/lib/maps/geocoder";
import { saveStoreAction } from "@/lib/stores/actions";
import type { StoreApplication, StoreDraft, StoreErrors } from "@/lib/stores/types";
import { missingFields, STORE_LIMITS, storeErrors, storeFieldErrors, storeSlug, todayInIndia } from "@/lib/stores/validation";

type Props = {
  /** null = the first save starts the application. */
  application: StoreApplication | null;
  initial: StoreDraft;
  map: MapConfig;
  onSaved: (application: StoreApplication) => void;
  /** Every change, for the live preview beside the form. */
  onDraft?: (draft: StoreDraft, logoPreview: string | null) => void;
};

type FillKey = "area" | "city" | "state" | "pincode";
const FILL_KEYS: FillKey[] = ["area", "city", "state", "pincode"];

const STATE_GROUPS = [
  { label: "States", options: STATES },
  { label: "Union Territories", options: UNION_TERRITORIES },
];

const RADIUS_PICKS = ["2", "3", "5", "8"];

const PIN_COPY = { title: "Pin your store on the map", optional: false, help: "Delivery partners find you by it, and your delivery radius is measured from it." };

// Step 1: the store's details. Only the name is needed to save, so a shopkeeper
// can come back later; fields the backend still needs before submitting are
// marked from its checklist. Checked here, again in the action, then by the backend.
export function StoreDetailsForm({ application, initial, map, onSaved, onDraft }: Props) {
  const { sessionExpired } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<StoreDraft>(initial);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<StoreErrors>({});
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();
  const needed = missingFields(application?.checklist.missingDetails ?? []);
  const autoSlug = storeSlug({ name: draft.name, slug: "" });

  const set = <K extends keyof StoreDraft>(key: K) => (value: StoreDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function focusFirstError() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  }

  function handleActionError(error: ActionError, show: (text: string) => void) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    show(error.message);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found = storeErrors(draft);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return focusFirstError();

    startTransition(async () => {
      const form = new FormData();
      form.append("draft", JSON.stringify(draft));
      if (logo) form.append("logo", logo);
      const res = await saveStoreAction(application === null, form);
      if (res.ok) {
        setLogo(null);
        return onSaved(res.data);
      }
      const fieldErrors = storeFieldErrors(res.error.fieldErrors);
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        setMessage(res.error.code === "VALIDATION_FAILED" ? "Please fix the highlighted fields." : res.error.message);
        return focusFirstError();
      }
      handleActionError(res.error, setMessage);
    });
  }

  // Fill area, city, state and pincode from the map pin, but only fields that are
  // empty or still hold what the last pin filled in (never what was typed).
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });
  useEffect(() => {
    onDraft?.(draft, logoPreview);
  }, [draft, logoPreview, onDraft]);
  const autoFilled = useRef<Partial<Record<FillKey, string>>>({});

  function applySuggestion(place: PlaceSuggestion): string[] {
    const values: Record<FillKey, string | null> = { area: place.area, city: place.city, state: place.state, pincode: place.pincode };
    const next: Partial<Pick<StoreDraft, FillKey>> = {};
    const filled: string[] = [];
    for (const key of FILL_KEYS) {
      const value = values[key];
      const current = latest.current[key].trim();
      if (!value || (current && current !== autoFilled.current[key])) continue;
      autoFilled.current[key] = value;
      if (value !== current) {
        next[key] = value;
        filled.push(key);
      }
    }
    if (filled.length) {
      setDraft((d) => ({ ...d, ...next }));
      setErrors((e) => ({ ...e, area: undefined, city: undefined, state: undefined, pincode: undefined }));
    }
    return filled;
  }

  // From the last saved checklist, so hide it once the field is filled in here.
  const stillNeeded = (key: keyof StoreDraft) => needed[key] && (key === "pin" ? !draft.pin : !String(draft[key]).trim());
  const neededHint = (key: keyof StoreDraft, hint?: string) => (stillNeeded(key) ? "Needed before you submit." : hint);

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-5">
      <Section title="Your store">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">
            Logo <span className="font-normal text-muted">(optional)</span>
          </p>
          <ImagePicker currentUrl={application?.store.logoUrl ?? null} file={logo} onFile={setLogo} error={errors.logo} onPreview={setLogoPreview} />
        </div>
        <TextField label="Store name" name="name" autoComplete="organization" maxLength={STORE_LIMITS.name} placeholder="Sri Balaji Fresh Mart" value={draft.name} onChange={set("name")} error={errors.name} />
        <TextField
          label="Web address"
          name="slug"
          autoComplete="off"
          maxLength={STORE_LIMITS.slug}
          prefix="360mart.in/"
          placeholder={autoSlug ?? "sri-balaji-fresh-mart"}
          optional
          value={draft.slug}
          // Lowercase and hyphens as they type, so the address is always valid-looking.
          onChange={(v) => set("slug")(v.toLowerCase().replace(/\s+/g, "-"))}
          error={errors.slug}
          hint={draft.slug ? "If another store already has it, we'll ask you to choose another." : "Made from your store name. Type here to choose a different one."}
        />
        <TextAreaField label="About your store" name="description" maxLength={STORE_LIMITS.description} placeholder="Fresh fruits and vegetables every morning, since 1998." optional value={draft.description} onChange={set("description")} error={errors.description} />
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <MobileField label="Store phone" name="contactPhone" autoComplete="tel-national" value={draft.contactPhone} onChange={set("contactPhone")} error={errors.contactPhone} hint={neededHint("contactPhone", "Customers and delivery partners call this number.")} />
          <TextField label="Store email" name="contactEmail" type="email" autoComplete="email" maxLength={STORE_LIMITS.contactEmail} optional value={draft.contactEmail} onChange={set("contactEmail")} error={errors.contactEmail} />
        </div>
      </Section>

      <Section title="Where is your store?">
        <PinSection pin={draft.pin} onPin={set("pin")} map={map} error={errors.pin ?? (stillNeeded("pin") ? "Needed before you submit: pin your store on the map." : undefined)} onSuggest={applySuggestion} onActionError={handleActionError} copy={PIN_COPY} />
        <TextField label="Shop no., building, street" name="addressLine1" autoComplete="address-line1" maxLength={STORE_LIMITS.addressLine1} placeholder="Shop 4, Plot 12, KPHB Phase 3" value={draft.addressLine1} onChange={set("addressLine1")} error={errors.addressLine1} hint={neededHint("addressLine1")} />
        <TextField label="Address line 2" name="addressLine2" autoComplete="address-line2" maxLength={STORE_LIMITS.addressLine2} optional value={draft.addressLine2} onChange={set("addressLine2")} error={errors.addressLine2} />
        <TextField label="Landmark" name="landmark" autoComplete="off" maxLength={STORE_LIMITS.landmark} placeholder="Opposite Metro station" optional value={draft.landmark} onChange={set("landmark")} error={errors.landmark} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Area" name="area" autoComplete="address-level3" maxLength={STORE_LIMITS.area} placeholder="Kukatpally" value={draft.area} onChange={set("area")} error={errors.area} hint={neededHint("area", "Shoppers search by area.")} />
          <TextField label="City" name="city" autoComplete="address-level2" maxLength={STORE_LIMITS.city} placeholder="Hyderabad" value={draft.city} onChange={set("city")} error={errors.city} hint={neededHint("city")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="500072" value={draft.pincode} onChange={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))} error={errors.pincode} hint={neededHint("pincode")} />
          <SelectField label="State" name="state" autoComplete="address-level1" placeholder="Choose the state" groups={STATE_GROUPS} value={draft.state} onChange={set("state")} error={errors.state} hint={neededHint("state")} />
        </div>
      </Section>

      <Section title="Delivery">
        <div>
          <TextField
            label="Delivery radius"
            name="deliveryRadiusKm"
            inputMode="decimal"
            autoComplete="off"
            maxLength={4}
            prefix="km"
            value={draft.deliveryRadiusKm}
            onChange={(v) => set("deliveryRadiusKm")(v.replace(/[^\d.]/g, ""))}
            error={errors.deliveryRadiusKm}
            hint={neededHint("deliveryRadiusKm", "How far from your store you deliver: 0.5 to 15 km.")}
          />
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick picks">
            {RADIUS_PICKS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => set("deliveryRadiusKm")(km)}
                aria-pressed={draft.deliveryRadiusKm === km}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold ring-1 transition ${draft.deliveryRadiusKm === km ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink"}`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Minimum order" name="minOrderAmount" inputMode="decimal" autoComplete="off" maxLength={11} prefix="₹" value={draft.minOrderAmount} onChange={(v) => set("minOrderAmount")(v.replace(/[^\d.]/g, ""))} error={errors.minOrderAmount} hint="0 = no minimum." />
          <TextField label="Delivery fee" name="deliveryFee" inputMode="decimal" autoComplete="off" maxLength={11} prefix="₹" value={draft.deliveryFee} onChange={(v) => set("deliveryFee")(v.replace(/[^\d.]/g, ""))} error={errors.deliveryFee} hint="0 = free delivery." />
        </div>
      </Section>

      <Section title="Licences">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="FSSAI licence number" name="fssaiLicenseNo" inputMode="numeric" autoComplete="off" maxLength={14} placeholder="14 digits" value={draft.fssaiLicenseNo} onChange={(v) => set("fssaiLicenseNo")(v.replace(/\D/g, "").slice(0, 14))} error={errors.fssaiLicenseNo} hint={neededHint("fssaiLicenseNo", "Every store selling food needs one.")} />
          <TextField label="FSSAI valid until" name="fssaiValidUntil" type="date" autoComplete="off" maxLength={10} min={todayInIndia()} value={draft.fssaiValidUntil} onChange={set("fssaiValidUntil")} error={errors.fssaiValidUntil} hint={neededHint("fssaiValidUntil")} />
        </div>
        <TextField
          label="GSTIN"
          name="gstin"
          autoComplete="off"
          maxLength={15}
          placeholder="36ABCDE1234F1Z5"
          optional
          value={draft.gstin}
          onChange={(v) => set("gstin")(v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))}
          error={errors.gstin}
          hint="If you enter one, you'll also upload your GST certificate."
        />
      </Section>

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>

      <ActionBar note={application ? "Your draft stays private until you submit." : "Only the store name is needed to start. Finish the rest any time."}>
        <SubmitButton pending={pending} label={application ? "Save and continue" : "Start my application"} pendingLabel="Saving…" />
      </ActionBar>
    </form>
  );
}
