"use client";

import { Copy } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { SubmitButton } from "@/components/auth/AuthFields";
import { saveHoursAction } from "@/lib/stores/actions";
import { ActionBar } from "./ActionBar";
import { DAY_LABEL, type DayHoursDraft, type DayOfWeek, type StoreApplication } from "@/lib/stores/types";
import { hoursErrors, toHoursDraft } from "@/lib/stores/validation";

type Props = {
  application: StoreApplication;
  onSaved: (application: StoreApplication) => void;
  /** Live store (shown in a dialog): plain rows and "Save hours" + Cancel, instead of the registration step's card and "Save and continue". */
  onCancel?: () => void;
  /** The page this form is on, when it isn't the store page (the dashboard's dialog). */
  from?: "/seller";
};

// Opening hours, all 7 days saved together (the backend needs every day once):
// step 2 of registration, and later the live store's "Change hours".
// Times are shop-local 24-hour; closing after midnight isn't supported yet.
export function StoreHoursForm({ application, onSaved, onCancel, from }: Props) {
  const { sessionExpired } = useAuth();
  const [days, setDays] = useState<DayHoursDraft[]>(() => toHoursDraft(application.hours));
  const [errors, setErrors] = useState<Partial<Record<DayOfWeek, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saved = application.checklist.hoursSet;
  const inDialog = !!onCancel;

  function change(day: DayOfWeek, patch: Partial<DayHoursDraft>) {
    setDays((list) => list.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)));
    if (errors[day]) setErrors((e) => ({ ...e, [day]: undefined }));
  }

  function copyMonday() {
    const monday = days[0];
    setDays((list) => list.map((d) => ({ ...d, open: monday.open, opensAt: monday.opensAt, closesAt: monday.closesAt })));
    setErrors({});
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found = hoursErrors(days);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return toastError("Please fix the highlighted days.");
    startTransition(async () => {
      const res = await saveHoursAction(days, from);
      if (res.ok) {
        toastSuccess(inDialog ? "Opening hours saved. Shoppers see the new times." : "Opening hours saved");
        return onSaved(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setErrors(res.error.fieldErrors as Partial<Record<DayOfWeek, string>>);
      setMessage(res.error.message);
      toastError(`Couldn't save the hours. ${res.error.message}`);
    });
  }

  return (
    <form onSubmit={save} noValidate className={inDialog ? "space-y-4" : "space-y-5"}>
      <section className={inDialog ? "" : "rounded-3xl border border-line bg-white p-5 sm:p-6"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-muted">{onCancel ? "Change any day, then save." : saved ? "Saved. Change any day and save again." : "Check each day, then save. Shoppers see these times."}</p>
          <button type="button" onClick={copyMonday} className="flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <Copy aria-hidden className="size-4" />
            Copy Monday to all days
          </button>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {days.map((day) => (
            <DayRow key={day.dayOfWeek} day={day} error={errors[day.dayOfWeek]} onChange={(patch) => change(day.dayOfWeek, patch)} />
          ))}
        </ul>
      </section>

      <div aria-live="polite" className="empty:hidden">
        {message && <FormMessage error={message} />}
      </div>

      {inDialog ? (
        // Pinned to the bottom of the dialog, so Save is always in reach.
        <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-white px-5 py-3">
          <button type="button" onClick={onCancel} disabled={pending} className="flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
            Cancel
          </button>
          <SubmitButton pending={pending} label="Save hours" pendingLabel="Saving…" />
        </div>
      ) : (
        <ActionBar note="Times are in your shop's local time.">
          <SubmitButton pending={pending} label="Save and continue" pendingLabel="Saving…" />
        </ActionBar>
      )}
    </form>
  );
}

function DayRow({ day, error, onChange }: { day: DayHoursDraft; error?: string; onChange: (patch: Partial<DayHoursDraft>) => void }) {
  const label = DAY_LABEL[day.dayOfWeek];
  const errorId = `${day.dayOfWeek}-error`;
  return (
    <li className="py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-between gap-3 sm:w-56">
          <span className="font-semibold text-ink">{label}</span>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={day.open} onChange={(e) => onChange({ open: e.target.checked })} className="peer sr-only" />
            <span aria-hidden className={`relative h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${day.open ? "bg-fresh" : "bg-line"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${day.open ? "left-[1.375rem]" : "left-0.5"}`} />
            </span>
            <span className="w-14">{day.open ? "Open" : "Closed"}</span>
            <span className="sr-only">on {label}</span>
          </label>
        </div>
        {day.open ? (
          <div className="grid flex-1 grid-cols-2 gap-2">
            <TimeInput label={`${label} opens at`} short="Opens" value={day.opensAt} onChange={(v) => onChange({ opensAt: v })} invalid={!!error} errorId={errorId} />
            <TimeInput label={`${label} closes at`} short="Closes" value={day.closesAt} onChange={(v) => onChange({ closesAt: v })} invalid={!!error} errorId={errorId} />
          </div>
        ) : (
          <p className="flex-1 text-sm text-muted">Closed all day</p>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}

export function TimeInput({ label, short, value, onChange, invalid, errorId }: { label: string; short: string; value: string; onChange: (value: string) => void; invalid: boolean; errorId: string }) {
  return (
    // Label above the time, so the time gets the full width on a 360px phone.
    <label className={`flex min-h-12 flex-col justify-center rounded-xl border bg-white px-3 py-1 focus-within:ring-2 focus-within:ring-brand/40 ${invalid ? "border-red-500" : "border-line focus-within:border-ink"}`}>
      <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted">{short}</span>
      <input
        type="time"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        className="w-full min-w-0 bg-transparent text-base font-semibold text-ink outline-none"
      />
    </label>
  );
}
