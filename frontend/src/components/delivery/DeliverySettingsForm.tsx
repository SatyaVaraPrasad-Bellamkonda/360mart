"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { useId, useState } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { saveDeliverySettings } from "@/lib/delivery/admin-client";
import { VEHICLE_LABEL, VEHICLE_TYPES, type DeliverySettings, type VehicleRule } from "@/lib/delivery/types";
import { when } from "@/lib/orders/format";
import { VEHICLE_ICON } from "./vehicle-icons";

// The numbers behind rider dispatch: how long an offer waits, how far we look,
// how fresh a rider's location must be, the default cash limit, and per
// vehicle whether it's allowed, needs a licence, and how far / how many items
// it may carry. Saved as one whole document (the backend wants all of it).

type NumberKey = "defaultCashLimit" | "offerTimeoutSeconds" | "searchRadiusKm" | "locationFreshSeconds" | "retryIntervalSeconds" | "failedWaitMinutes" | "averageSpeedKmph";
type Field = { key: NumberKey; label: string; unit: string; min: number; max: number; step: number; help: string };

// Same ranges and words as the backend (DeliverySettingsRequest).
const FIELDS: Field[] = [
  { key: "offerTimeoutSeconds", label: "Time to accept an offer", unit: "seconds", min: 15, max: 300, step: 1, help: "How long one rider has to accept before it goes to the next." },
  { key: "searchRadiusKm", label: "Search radius", unit: "km", min: 0.5, max: 50, step: 0.5, help: "How far from the store we look for free riders." },
  { key: "retryIntervalSeconds", label: "Search again every", unit: "seconds", min: 10, max: 600, step: 1, help: "When nobody accepted, how soon we try again." },
  { key: "locationFreshSeconds", label: "Location must be newer than", unit: "seconds", min: 30, max: 1800, step: 1, help: "Riders whose last location is older get no offers." },
  { key: "failedWaitMinutes", label: "Wait at the door before giving up", unit: "minutes", min: 0, max: 30, step: 1, help: "Only then can a rider mark the customer as not available." },
  { key: "averageSpeedKmph", label: "Average speed for arrival times", unit: "km/h", min: 5, max: 60, step: 1, help: "Used for the customer's rough arrival time." },
  { key: "defaultCashLimit", label: "Default cash limit", unit: "₹", min: 0, max: 10_000_000, step: 1, help: "Cash a rider may hold before handing it in. Per-rider limits override it." },
];

type Draft = Record<NumberKey, string> & { vehicles: (Omit<VehicleRule, "maxDistanceKm" | "maxItems"> & { maxDistanceKm: string; maxItems: string })[] };

function toDraft(s: DeliverySettings): Draft {
  const rules = VEHICLE_TYPES.map(
    (v) => s.vehicles.find((r) => r.vehicleType === v) ?? { vehicleType: v, enabled: false, licenceRequired: false, maxDistanceKm: 3, maxItems: 10 },
  );
  return {
    ...(Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key] ?? "")])) as Record<NumberKey, string>),
    vehicles: rules.map((r) => ({ ...r, maxDistanceKm: String(r.maxDistanceKm), maxItems: String(r.maxItems) })),
  };
}

function check(d: Draft): { errors: Record<string, string>; settings: DeliverySettings | null } {
  const errors: Record<string, string> = {};
  const nums = {} as Record<NumberKey, number>;
  for (const f of FIELDS) {
    const n = Number(d[f.key]);
    if (d[f.key].trim() === "" || !Number.isFinite(n) || n < f.min || n > f.max || (f.step === 1 && f.key !== "defaultCashLimit" && !Number.isInteger(n))) errors[f.key] = `${f.min} to ${f.max.toLocaleString("en-IN")}${f.unit === "₹" ? "" : ` ${f.unit}`}`;
    nums[f.key] = n;
  }
  const vehicles: VehicleRule[] = d.vehicles.map((r, i) => {
    const km = Number(r.maxDistanceKm);
    const items = Number(r.maxItems);
    if (!(km >= 0.5 && km <= 50)) errors[`vehicles[${i}].maxDistanceKm`] = "0.5 to 50 km";
    if (!(Number.isInteger(items) && items >= 1 && items <= 1000)) errors[`vehicles[${i}].maxItems`] = "1 to 1000";
    return { vehicleType: r.vehicleType, enabled: r.enabled, licenceRequired: r.licenceRequired, maxDistanceKm: km, maxItems: items };
  });
  if (!vehicles.some((v) => v.enabled)) errors.vehicles = "Allow at least one vehicle type.";
  return { errors, settings: Object.keys(errors).length ? null : { ...nums, vehicles } };
}

export function DeliverySettingsForm({ initial }: { initial: DeliverySettings }) {
  const id = useId();
  const { sessionExpired } = useAuth();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(saved));

  const setRule = (i: number, patch: Partial<Draft["vehicles"][number]>) => setDraft((d) => ({ ...d, vehicles: d.vehicles.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  async function save() {
    const { errors: found, settings } = check(draft);
    setErrors(found);
    setMessage(null);
    if (!settings) return toastError("Please fix the highlighted fields.");
    setBusy(true);
    const res = await saveDeliverySettings(settings);
    setBusy(false);
    if (res.ok) {
      toastSuccess(res.data.message);
      const fresh = res.data.settings ?? { ...settings, updatedAt: new Date().toISOString() };
      setSaved(fresh);
      setDraft(toDraft(fresh));
      return;
    }
    if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
    setErrors(res.error.fieldErrors);
    setMessage(res.error.message);
    toastError(res.error.message);
  }

  const input = (bad: boolean) => `min-h-11 w-full rounded-xl border bg-white px-3 text-base tabular-nums text-ink outline-none focus:ring-2 focus:ring-brand/40 ${bad ? "border-red-500" : "border-line focus:border-ink"}`;

  return (
    <div className="space-y-5 pb-24 sm:pb-0">
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold text-ink">Finding a rider</h2>
        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`${id}-${f.key}`} className="text-sm font-semibold text-ink">
                {f.label}
              </label>
              <div className="relative mt-1.5">
                {f.unit === "₹" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>}
                <input
                  id={`${id}-${f.key}`}
                  inputMode="decimal"
                  value={draft[f.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  aria-invalid={!!errors[f.key]}
                  aria-describedby={`${id}-${f.key}-help`}
                  className={`${input(!!errors[f.key])} ${f.unit === "₹" ? "pl-7" : "pr-20"}`}
                />
                {f.unit !== "₹" && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{f.unit}</span>}
              </div>
              <p id={`${id}-${f.key}-help`} className={`mt-1 text-xs ${errors[f.key] ? "text-red-700" : "text-muted"}`}>
                {errors[f.key] ?? f.help}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold text-ink">Vehicles</h2>
        <p className="mt-1 text-sm text-muted">Which vehicles can deliver, whether they need a driving licence and RC, and the largest orders they take.</p>
        {errors.vehicles && <p className="mt-2 text-sm text-red-700">{errors.vehicles}</p>}
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {draft.vehicles.map((r, i) => {
            const Icon = VEHICLE_ICON[r.vehicleType];
            return (
              <li key={r.vehicleType} className={`rounded-2xl p-4 ring-1 transition ${r.enabled ? "bg-white ring-line" : "bg-surface ring-line/60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`flex items-center gap-2 font-semibold ${r.enabled ? "text-ink" : "text-muted"}`}>
                    <Icon aria-hidden className="size-5" />
                    {VEHICLE_LABEL[r.vehicleType]}
                  </p>
                  <Toggle label={`Allow ${VEHICLE_LABEL[r.vehicleType]}`} on={r.enabled} onChange={(on) => setRule(i, { enabled: on })} />
                </div>
                <div className={`mt-3 grid grid-cols-2 gap-3 ${r.enabled ? "" : "opacity-60"}`}>
                  <div>
                    <label htmlFor={`${id}-km-${i}`} className="text-xs font-semibold text-muted">
                      Up to (km)
                    </label>
                    <input id={`${id}-km-${i}`} inputMode="decimal" value={r.maxDistanceKm} onChange={(e) => setRule(i, { maxDistanceKm: e.target.value })} aria-invalid={!!errors[`vehicles[${i}].maxDistanceKm`]} className={input(!!errors[`vehicles[${i}].maxDistanceKm`])} />
                    {errors[`vehicles[${i}].maxDistanceKm`] && <p className="mt-1 text-xs text-red-700">{errors[`vehicles[${i}].maxDistanceKm`]}</p>}
                  </div>
                  <div>
                    <label htmlFor={`${id}-items-${i}`} className="text-xs font-semibold text-muted">
                      Up to (items)
                    </label>
                    <input id={`${id}-items-${i}`} inputMode="numeric" value={r.maxItems} onChange={(e) => setRule(i, { maxItems: e.target.value })} aria-invalid={!!errors[`vehicles[${i}].maxItems`]} className={input(!!errors[`vehicles[${i}].maxItems`])} />
                    {errors[`vehicles[${i}].maxItems`] && <p className="mt-1 text-xs text-red-700">{errors[`vehicles[${i}].maxItems`]}</p>}
                  </div>
                </div>
                <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={r.licenceRequired} onChange={(e) => setRule(i, { licenceRequired: e.target.checked })} className="size-4 accent-ink" />
                  Needs a driving licence and RC
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {message && <FormMessage error={message} />}

      {/* Phones: stuck to the bottom so Save is always one tap away. */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:rounded-3xl sm:border sm:p-4 sm:backdrop-blur-none">
        <p className="mr-auto hidden text-xs text-muted sm:block">{saved.updatedAt ? `Last saved ${when(saved.updatedAt)}` : ""}</p>
        {dirty && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(toDraft(saved));
              setErrors({});
              setMessage(null);
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink"
          >
            <RotateCcw aria-hidden className="size-4" />
            Undo changes
          </button>
        )}
        <button type="button" disabled={!dirty || busy} onClick={() => void save()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/85 disabled:bg-ink/30 sm:flex-none">
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
          Save settings
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="flex min-h-10 shrink-0 items-center">
      <span className={`relative h-6 w-11 rounded-full transition ${on ? "bg-fresh" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
