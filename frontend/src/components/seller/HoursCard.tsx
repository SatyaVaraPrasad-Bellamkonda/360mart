"use client";

import { CalendarOff, Clock, Pencil } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Dialog } from "@/components/Dialog";
import { DAY_LABEL, DAYS, type DayOfWeek, type StoreApplication } from "@/lib/stores/types";
import { timeText, todayInIndia as todayDate } from "@/lib/stores/validation";
import { exceptionText, SpecialHours } from "./SpecialHours";
import { StoreHoursForm } from "./StoreHoursForm";

// The clock in India, re-read every 30 s. Read through useSyncExternalStore so
// the server (which can't know the visitor's "now") renders no open/closed
// status, and the browser fills it in after hydration without a mismatch.
type IndiaNow = { day: DayOfWeek; time: string };
let cached: { key: string; value: IndiaNow } | null = null;
function readNow(): IndiaNow {
  const parts = new Intl.DateTimeFormat("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const key = `${get("weekday")} ${get("hour")}:${get("minute")}`;
  // Same minute = same object, so React doesn't re-render for nothing.
  if (cached?.key !== key) cached = { key, value: { day: get("weekday").toUpperCase() as DayOfWeek, time: `${get("hour")}:${get("minute")}` } };
  return cached.value;
}
function subscribeClock(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}

type Status = { open: boolean; text: string; detail: string };

/** Open now / closed now, from today's hours (a special date wins) and the time in India. */
function statusNow(hours: { isClosed: boolean; opensAt: string | null; closesAt: string | null } | undefined, now: IndiaNow): Status {
  if (!hours) return { open: false, text: "Hours not set", detail: "Set your weekly hours" };
  if (hours.isClosed || !hours.opensAt || !hours.closesAt) return { open: false, text: "Closed today", detail: "Shoppers can't order today" };
  const opens = hours.opensAt.slice(0, 5);
  const closes = hours.closesAt.slice(0, 5);
  if (now.time < opens) return { open: false, text: "Closed now", detail: `Opens at ${timeText(opens)}` };
  if (now.time >= closes) return { open: false, text: "Closed now", detail: `Closed at ${timeText(closes)}` };
  return { open: true, text: "Open now", detail: `Closes at ${timeText(closes)}` };
}

// The live store's hours on the dashboard, side by side on wide screens:
// today (open or closed right now, the week at a glance, "Change hours" in a
// dialog) and the holidays list. A save answers with the new application,
// which these cards keep, so the dashboard isn't loaded again.
export function HoursCard({ initial }: { initial: StoreApplication }) {
  const [app, setApp] = useState(initial);
  const [editing, setEditing] = useState(false);
  // Back on the dashboard after changing hours elsewhere: take the page's newer copy (see StoreWizard).
  const hoursOf = (a: StoreApplication) =>
    [...a.hours.map((h) => `${h.dayOfWeek}${h.isClosed}${h.opensAt}${h.closesAt}`), ...(a.hoursExceptions ?? []).map((e) => `${e.exceptionId}${e.date}${e.isClosed}${e.opensAt}${e.closesAt}${e.reason}`)].join();
  const [pageHours, setPageHours] = useState(hoursOf(initial));
  if (hoursOf(initial) !== pageHours) {
    setPageHours(hoursOf(initial));
    setApp(initial);
  }

  const now = useSyncExternalStore(subscribeClock, readNow, () => null);
  const special = now ? app.hoursExceptions?.find((e) => e.date === todayDate()) : undefined;
  const weekly = now ? app.hours.find((h) => h.dayOfWeek === now.day) : undefined;
  const status = now ? statusNow(special ?? weekly, now) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="overflow-hidden rounded-3xl border border-line bg-white motion-safe:animate-fade-up motion-safe:[animation-delay:80ms]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-bold text-ink">
              <Clock aria-hidden className="size-5 text-brand-deep" />
              Store hours
            </p>
            <button type="button" onClick={() => setEditing(true)} className="-my-1 flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-surface hover:ring-ink">
              <Pencil aria-hidden className="size-4" />
              Change hours
            </button>
          </div>

          {/* Right now: filled in by the browser (the server can't know the visitor's time). */}
          <div className="mt-4 min-h-[4.5rem]" aria-live="polite">
            {status && (
              <>
                <p className={`flex items-center gap-2 text-2xl font-extrabold tracking-tight ${status.open ? "text-fresh" : "text-ink"}`}>
                  <span className="relative flex size-3">
                    {status.open && <span aria-hidden className="absolute inline-flex size-full rounded-full bg-fresh opacity-60 motion-safe:animate-ping" />}
                    <span aria-hidden className={`relative inline-flex size-3 rounded-full ${status.open ? "bg-fresh" : "bg-slate-300"}`} />
                  </span>
                  {status.text}
                </p>
                <p className="mt-1 text-sm text-muted">{status.detail}</p>
              </>
            )}
          </div>

          {special && (
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              <CalendarOff aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 break-words">
                Special hours today{special.reason ? `: ${special.reason}` : ""}. {exceptionText(special)} instead of your weekly hours.
              </span>
            </p>
          )}
        </div>

        {/* The week at a glance; today is highlighted. */}
        <ul className="border-t border-line bg-surface/60 px-5 py-3 sm:px-6">
          {DAYS.map((day) => {
            const h = app.hours.find((x) => x.dayOfWeek === day);
            const isToday = now?.day === day;
            return (
              <li key={day} className={`-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${isToday ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-line" : "text-ink/80"}`}>
                <span className="flex items-center gap-2">
                  {DAY_LABEL[day]}
                  {isToday && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-deep">Today</span>}
                </span>
                <span className={!h || h.isClosed ? "text-muted" : ""}>{!h ? "Not set" : h.isClosed ? "Closed" : `${timeText(h.opensAt)} – ${timeText(h.closesAt)}`}</span>
              </li>
            );
          })}
        </ul>

        <Dialog open={editing} onClose={() => setEditing(false)} title="Change opening hours" description="Shoppers see the new times as soon as you save.">
          <StoreHoursForm
            application={app}
            from="/seller"
            onCancel={() => setEditing(false)}
            onSaved={(next) => {
              setApp(next);
              setEditing(false);
            }}
          />
        </Dialog>
      </section>

      <div className="motion-safe:animate-fade-up motion-safe:[animation-delay:160ms]">
        <SpecialHours app={app} onChanged={setApp} from="/seller" />
      </div>
    </div>
  );
}
