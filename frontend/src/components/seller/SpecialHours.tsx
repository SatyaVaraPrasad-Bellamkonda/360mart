"use client";

import { CalendarDays, CalendarOff, CalendarPlus, Clock, Pencil, Trash2 } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { FieldError, SubmitButton } from "@/components/auth/AuthFields";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { deleteHoursExceptionAction, saveHoursExceptionAction } from "@/lib/stores/actions";
import type { HoursException, HoursExceptionDraft, HoursExceptionErrors, StoreApplication } from "@/lib/stores/types";
import { addDays, EXCEPTION_DAYS_AHEAD, exceptionErrors, shortDateText, timeText, todayInIndia } from "@/lib/stores/validation";
import { TimeInput } from "./StoreHoursForm";

type Props = {
  app: StoreApplication;
  onChanged: (app: StoreApplication) => void;
  /** The page this sits on: the dashboard ("/seller") or the store page. */
  from?: "/seller";
};

const REASONS = ["Festival holiday", "Half day", "Stock taking", "Family function", "Shop maintenance"];

/** "Today", "Tomorrow", "In 5 days", or nothing for later dates. */
function whenText(date: string, today: string): string | null {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  for (let n = 2; n <= 6; n++) if (date === addDays(today, n)) return `In ${n} days`;
  return null;
}

/** What shoppers will read for this date. */
export function exceptionText(e: Pick<HoursException, "isClosed" | "opensAt" | "closesAt">): string {
  return e.isClosed ? "Closed all day" : `Open ${timeText(e.opensAt)} to ${timeText(e.closesAt)}`;
}

// Holidays and one-day timings: a date set here wins over that weekday's normal
// hours (closed for Diwali, or a half day). One entry per date; the backend
// keeps only upcoming ones (today onwards, soonest first).
export function SpecialHours({ app, onChanged, from }: Props) {
  const list = app.hoursExceptions ?? [];
  const today = todayInIndia();
  const [editing, setEditing] = useState<HoursExceptionDraft | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const { sessionExpired } = useAuth();

  function add() {
    setEditing({ exceptionId: null, date: "", isClosed: true, opensAt: "09:00", closesAt: "13:00", reason: "" });
  }

  function edit(e: HoursException) {
    setEditing({ exceptionId: e.exceptionId, date: e.date, isClosed: e.isClosed, opensAt: e.opensAt?.slice(0, 5) ?? "09:00", closesAt: e.closesAt?.slice(0, 5) ?? "13:00", reason: e.reason ?? "" });
  }

  function remove(e: HoursException) {
    startTransition(async () => {
      const res = await deleteHoursExceptionAction(e.exceptionId, e.date, from);
      setRemoving(null);
      if (res.ok) {
        toastSuccess(`Removed ${shortDateText(e.date, today)}. Your weekly hours apply again.`);
        return onChanged(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      toastError(`Couldn't remove it. ${res.error.message}`);
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <CalendarDays aria-hidden className="size-5 text-brand-deep" />
            Holidays & special hours
          </h2>
          <p className="mt-0.5 text-sm text-muted">Closed for a festival, or different timings for a day. These win over your weekly hours.</p>
        </div>
        {list.length > 0 && (
          <button type="button" onClick={add} aria-label="Add a date" className="-my-1 flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85">
            <CalendarPlus aria-hidden className="size-4" />
            Add
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-4 py-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
            <CalendarOff aria-hidden className="size-5" />
          </span>
          <p className="mt-3 font-semibold text-ink">No upcoming holidays</p>
          <p className="mt-0.5 max-w-xs text-sm text-muted">Add festival days or half days ahead of time, so shoppers know before they order.</p>
          <button type="button" onClick={add} className="mt-4 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
            <CalendarPlus aria-hidden className="size-4" />
            Add a date
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((e) => {
            const day = Number(e.date.slice(8, 10));
            const when = whenText(e.date, today);
            const monthName = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(new Date(`${e.date}T00:00:00Z`));
            return (
              <li key={e.exceptionId} className="rounded-2xl border border-line p-3">
                <div className="flex items-start gap-3">
                  {/* A small calendar leaf: month over day. */}
                  <span aria-hidden className={`flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl ring-1 ${e.isClosed ? "ring-red-200" : "ring-amber-200"}`}>
                    <span className={`w-full py-0.5 text-center text-[11px] font-bold uppercase text-white ${e.isClosed ? "bg-red-600" : "bg-amber-500"}`}>{monthName}</span>
                    <span className="py-1 text-lg font-extrabold leading-none text-ink">{day}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-ink">
                      {shortDateText(e.date, today)}
                      {when && <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">{when}</span>}
                    </p>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${e.isClosed ? "text-red-700" : "text-amber-800"}`}>
                      {e.isClosed ? <CalendarOff aria-hidden className="size-3.5 shrink-0" /> : <Clock aria-hidden className="size-3.5 shrink-0" />}
                      {exceptionText(e)}
                    </p>
                    {e.reason && <p className="mt-0.5 break-words text-sm text-muted">{e.reason}</p>}
                  </div>
                  {removing !== e.exceptionId && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => edit(e)} aria-label={`Edit ${shortDateText(e.date, today)}`} className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface">
                        <Pencil aria-hidden className="size-4" />
                      </button>
                      <button type="button" onClick={() => setRemoving(e.exceptionId)} aria-label={`Remove ${shortDateText(e.date, today)}`} className="flex size-10 items-center justify-center rounded-full text-red-700 hover:bg-red-50">
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
                {removing === e.exceptionId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
                    <span className="mr-auto font-semibold text-ink">Remove this date? Your weekly hours will apply.</span>
                    <button type="button" disabled={pending} onClick={() => setRemoving(null)} className="min-h-10 rounded-full px-4 font-semibold text-muted hover:text-ink">
                      Keep
                    </button>
                    <button type="button" disabled={pending} onClick={() => remove(e)} className="min-h-10 rounded-full bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                      {pending ? "Removing…" : "Remove"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.exceptionId ? "Edit special hours" : "Add a holiday or special hours"}
        description="For one date only. Your weekly hours stay as they are."
      >
        {editing && (
          <ExceptionForm
            // A fresh form for each date opened.
            key={editing.exceptionId ?? "new"}
            initial={editing}
            existing={list}
            from={from}
            onCancel={() => setEditing(null)}
            onSaved={(next) => {
              setEditing(null);
              onChanged(next);
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function ExceptionForm({ initial, existing, from, onCancel, onSaved }: { initial: HoursExceptionDraft; existing: HoursException[]; from?: "/seller"; onCancel: () => void; onSaved: (app: StoreApplication) => void }) {
  const { sessionExpired } = useAuth();
  const id = useId();
  const today = todayInIndia();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<HoursExceptionErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Adding a date that's already in the list updates that entry (one entry per date).
  const sameDate = !initial.exceptionId ? existing.find((e) => e.date === draft.date) : undefined;

  const set = <K extends keyof HoursExceptionDraft>(key: K, value: HoursExceptionDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    const field = key === "opensAt" || key === "closesAt" || key === "isClosed" ? "times" : key;
    if (errors[field as keyof HoursExceptionErrors]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function save(event: FormEvent) {
    event.preventDefault();
    const body = { ...draft, exceptionId: draft.exceptionId ?? sameDate?.exceptionId ?? null };
    const found = exceptionErrors(body);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return toastError(Object.values(found)[0] ?? "Please fix the highlighted fields.");
    startTransition(async () => {
      const res = await saveHoursExceptionAction(body, from);
      if (res.ok) {
        toastSuccess(`${shortDateText(body.date, today)}: ${body.isClosed ? "closed all day" : `open ${timeText(body.opensAt)} to ${timeText(body.closesAt)}`}. Shoppers will see it.`);
        return onSaved(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setErrors(res.error.fieldErrors as HoursExceptionErrors);
      setMessage(res.error.message);
      toastError(`Couldn't save. ${res.error.message}`);
    });
  }

  const reasonText = draft.reason.trim();
  const preview = draft.isClosed
    ? `Closed${draft.date === today ? " today" : ""}${reasonText ? ` for ${reasonText}` : ""}`
    : `Open ${timeText(draft.opensAt)} to ${timeText(draft.closesAt)}${reasonText ? ` (${reasonText})` : ""}`;

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${id}-date`} className="mb-1.5 block text-sm font-semibold text-ink">
          Date
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-date`}
            type="date"
            min={today}
            max={addDays(today, EXCEPTION_DAYS_AHEAD)}
            value={draft.date}
            // An existing entry keeps its date: to move it, remove it and add the new date.
            disabled={!!initial.exceptionId}
            onChange={(e) => set("date", e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? `${id}-date-error` : `${id}-date-hint`}
            className={`min-h-12 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-surface disabled:text-muted ${errors.date ? "border-red-500" : "border-line focus:border-ink"}`}
          />
          {!initial.exceptionId && (
            <div className="flex gap-2" role="group" aria-label="Quick dates">
              {[
                { label: "Today", date: today },
                { label: "Tomorrow", date: addDays(today, 1) },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => set("date", q.date)}
                  aria-pressed={draft.date === q.date}
                  className={`min-h-12 rounded-xl px-4 text-sm font-semibold ring-1 transition ${draft.date === q.date ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink"}`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <FieldError id={`${id}-date-error`} message={errors.date} />
        {!errors.date && (
          <p id={`${id}-date-hint`} className="mt-1.5 text-sm text-muted">
            {initial.exceptionId ? "To use another date, remove this one and add the new date." : sameDate ? `${shortDateText(sameDate.date, today)} already has special hours. Saving replaces them.` : "Any day from today up to 12 months ahead."}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink">That day the store is</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { closed: true, title: "Closed all day", icon: CalendarOff },
            { closed: false, title: "Open, special timings", icon: Clock },
          ].map((o) => {
            const selected = draft.isClosed === o.closed;
            return (
              <label
                key={o.title}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
              >
                <input type="radio" name={`${id}-closed`} checked={selected} onChange={() => set("isClosed", o.closed)} className="sr-only" />
                <o.icon aria-hidden className="size-4 shrink-0" />
                {o.title}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!draft.isClosed && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <TimeInput label="Opens at" short="Opens" value={draft.opensAt} onChange={(v) => set("opensAt", v)} invalid={!!errors.times} errorId={`${id}-times-error`} />
            <TimeInput label="Closes at" short="Closes" value={draft.closesAt} onChange={(v) => set("closesAt", v)} invalid={!!errors.times} errorId={`${id}-times-error`} />
          </div>
          <FieldError id={`${id}-times-error`} message={errors.times} />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-reason`} className="mb-1.5 block text-sm font-semibold text-ink">
          Reason <span className="font-normal text-muted">(optional, shown to shoppers)</span>
        </label>
        <input
          id={`${id}-reason`}
          type="text"
          maxLength={150}
          placeholder="Diwali"
          value={draft.reason}
          onChange={(e) => set("reason", e.target.value)}
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? `${id}-reason-error` : undefined}
          className={`min-h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${errors.reason ? "border-red-500" : "border-line focus:border-ink"}`}
        />
        <FieldError id={`${id}-reason-error`} message={errors.reason} />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggested reasons">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => set("reason", r)} className="min-h-10 rounded-full bg-surface px-3 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* What shoppers will see on that day. */}
      <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-line">
        <span className="shrink-0 text-muted">Shoppers see:</span>
        <span className="min-w-0 break-words font-semibold text-ink">{preview}</span>
      </p>

      {message && <FormMessage error={message} />}

      {/* Pinned to the bottom of the dialog, so Save is always in reach. */}
      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-white px-5 py-3">
        <button type="button" onClick={onCancel} disabled={pending} className="flex min-h-12 shrink-0 items-center justify-center rounded-full px-5 font-semibold text-muted ring-1 ring-line hover:text-ink hover:ring-ink">
          Cancel
        </button>
        <SubmitButton pending={pending} label={initial.exceptionId || sameDate ? "Save changes" : "Add date"} pendingLabel="Saving…" />
      </div>
    </form>
  );
}
