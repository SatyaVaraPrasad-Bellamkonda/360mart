"use client";

import { useId } from "react";
import { FieldError } from "@/components/auth/AuthFields";
import { VEHICLE_ICON } from "./vehicle-icons";
import { VEHICLE_LABEL, VEHICLE_NUMBER_MAX, VEHICLE_TYPES, type VehicleType } from "@/lib/delivery/types";

// What a rider delivers with: six tiles (3 per row on phones, 6 from sm) and
// the number plate. Used by signup ("Deliver"), "Deliver with 360mart" and the
// rider's application. Like an AngularJS directive with two-way bound inputs:
// the parent owns the values.


type Props = {
  vehicle: VehicleType | null;
  number: string;
  onVehicle: (v: VehicleType) => void;
  onNumber: (v: string) => void;
  vehicleError?: string;
  numberError?: string;
  /** Known once the backend has the vehicle (the application); undefined at signup. */
  licenceRequired?: boolean;
  disabled?: boolean;
};

export function VehicleFields({ vehicle, number, onVehicle, onNumber, vehicleError, numberError, licenceRequired, disabled }: Props) {
  const id = useId();
  return (
    <div className="space-y-4">
      <fieldset className="min-w-0" aria-describedby={vehicleError ? `${id}-vehicle-error` : undefined}>
        <legend className="mb-1.5 text-sm font-semibold text-ink">I deliver with</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {VEHICLE_TYPES.map((v) => {
            const Icon = VEHICLE_ICON[v];
            const selected = vehicle === v;
            return (
              <label
                key={v}
                className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-xs font-semibold leading-tight transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${
                  selected ? "border-ink bg-ink text-white" : vehicleError ? "border-red-300 bg-white text-ink" : "border-line bg-white text-ink hover:border-ink"
                } ${disabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <input type="radio" name={`${id}-vehicle`} value={v} checked={selected} disabled={disabled} onChange={() => onVehicle(v)} className="sr-only" />
                <Icon aria-hidden className="size-5" />
                {VEHICLE_LABEL[v]}
              </label>
            );
          })}
        </div>
        <FieldError id={`${id}-vehicle-error`} message={vehicleError} />
      </fieldset>

      <div>
        <label htmlFor={`${id}-number`} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
          Vehicle number
          {licenceRequired === false && <span className="text-xs font-normal text-muted">Optional</span>}
        </label>
        <input
          id={`${id}-number`}
          value={number}
          onChange={(e) => onNumber(e.target.value.toUpperCase())}
          disabled={disabled}
          maxLength={VEHICLE_NUMBER_MAX + 4}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="KA01AB1234"
          aria-invalid={!!numberError}
          aria-describedby={numberError ? `${id}-number-error` : `${id}-number-hint`}
          className={`min-h-12 w-full rounded-xl border bg-white px-3 font-mono text-base uppercase tracking-wider text-ink outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:ring-2 focus:ring-brand/40 disabled:bg-surface ${numberError ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <FieldError id={`${id}-number-error`} message={numberError} />
        {!numberError && (
          <p id={`${id}-number-hint`} className="mt-1 text-xs text-muted">
            {licenceRequired === false ? "Not needed for this vehicle, but add it if it has one." : "As on the number plate. Needed for vehicles that need a licence (scooter, motorcycle, three-wheeler)."}
          </p>
        )}
      </div>
    </div>
  );
}
