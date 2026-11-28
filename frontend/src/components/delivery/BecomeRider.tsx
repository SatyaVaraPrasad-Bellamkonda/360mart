"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastSuccess } from "@/components/Toaster";
import { becomeRiderAction } from "@/lib/delivery/actions";
import { isVehicleType, vehicleNumberError, type VehicleType } from "@/lib/delivery/types";
import { VehicleFields } from "./VehicleFields";

// "Deliver with 360mart" for a signed-in customer: pick the vehicle, then the
// account becomes a delivery partner (same login, still shops) and goes on to
// the application at /rider.
export function BecomeRider() {
  const router = useRouter();
  const { sessionExpired, replaceUser } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [number, setNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    const found = { vehicleType: isVehicleType(vehicle) ? undefined : "Choose the vehicle you deliver with", vehicleNumber: vehicleNumberError(number) };
    setErrors(found);
    setMessage(null);
    if (found.vehicleType || found.vehicleNumber) return;
    setBusy(true);
    const res = await becomeRiderAction({ vehicleType: vehicle, vehicleNumber: number });
    if (!res.ok) {
      setBusy(false);
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setErrors(res.error.fieldErrors);
      // ROLE_CHANGE_NOT_ALLOWED and the like: the backend's own words.
      if (!Object.keys(res.error.fieldErrors).length) setMessage(res.error.message);
      return;
    }
    replaceUser(res.data);
    toastSuccess("You're a 360mart delivery partner. Now add your documents.");
    router.push("/rider");
  }

  return (
    <div className="space-y-5">
      <VehicleFields
        vehicle={vehicle}
        number={number}
        onVehicle={(v) => {
          setVehicle(v);
          setErrors((e) => ({ ...e, vehicleType: undefined }));
        }}
        onNumber={setNumber}
        vehicleError={errors.vehicleType}
        numberError={errors.vehicleNumber}
        disabled={busy}
      />
      {message && <FormMessage error={message} />}
      <button type="button" onClick={() => void start()} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60 sm:w-auto">
        {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {busy ? "Setting up…" : "Become a delivery partner"}
      </button>
    </div>
  );
}
