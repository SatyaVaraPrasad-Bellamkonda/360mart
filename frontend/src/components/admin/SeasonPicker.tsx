"use client";

import { CalendarRange, X } from "lucide-react";
import { useId } from "react";
import { crossesNewYear, daysInMonth, MONTHS, parseMonthDay, seasonLabel, toMonthDay } from "@/lib/catalog/season";
import { Toggle } from "./FormParts";

type Value = { seasonStart: string; seasonEnd: string; alwaysInSeason: boolean };

// The product's yearly season: a start and an end day (month + day, no year),
// or "Available all year". The shop's In season tag follows these, worked out
// by the server for each day, so nothing has to be switched on and off by hand.
export function SeasonPicker({ value, onChange, errors }: { value: Value; onChange: (patch: Partial<Value>) => void; errors: Partial<Record<"seasonStart" | "seasonEnd" | "seasonComplete", string>> }) {
  const label = seasonLabel({ seasonStart: value.seasonStart || null, seasonEnd: value.seasonEnd || null });
  const overNewYear = crossesNewYear(value.seasonStart, value.seasonEnd);
  const hasDates = !!(value.seasonStart || value.seasonEnd);
  const problem = errors.seasonComplete ?? errors.seasonStart ?? errors.seasonEnd;

  return (
    <div className="space-y-3">
      <Toggle
        label="Available all year"
        hint={value.alwaysInSeason ? "Always shows the In season tag, whatever the dates." : "Off: the In season tag shows only on the days of the season below."}
        checked={value.alwaysInSeason}
        onChange={(v) => onChange({ alwaysInSeason: v })}
      />

      <fieldset className={`rounded-2xl border p-4 transition ${problem ? "border-red-400" : "border-line"} ${value.alwaysInSeason ? "bg-surface" : "bg-white"}`}>
        <legend className="px-1 text-sm font-semibold text-ink">
          Season <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="text-sm text-muted">Repeats every year. A season can run over the new year, like November to February.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DayPicker label="Starts" value={value.seasonStart} edge="start" invalid={!!(errors.seasonStart || (errors.seasonComplete && !value.seasonStart))} onChange={(v) => onChange({ seasonStart: v })} />
          <DayPicker label="Ends" value={value.seasonEnd} edge="end" invalid={!!(errors.seasonEnd || (errors.seasonComplete && !value.seasonEnd))} onChange={(v) => onChange({ seasonEnd: v })} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          {label ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-fresh-soft px-3 py-1.5 text-sm font-semibold text-fresh">
              <CalendarRange aria-hidden className="size-4" />
              Season: {label}
              {overNewYear && <span className="font-normal">, over the new year</span>}
            </p>
          ) : (
            <p className="text-sm text-muted">{hasDates ? "Choose both days." : "No season set."}</p>
          )}
          {hasDates && (
            <button type="button" onClick={() => onChange({ seasonStart: "", seasonEnd: "" })} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition hover:text-ink">
              <X aria-hidden className="size-4" />
              Clear season
            </button>
          )}
        </div>
        {value.alwaysInSeason && label && <p className="mt-2 text-xs text-muted">Kept for the product page, but the product counts as in season all year while &ldquo;Available all year&rdquo; is on.</p>}
        {problem && <p className="mt-2 text-sm text-red-700">{problem}</p>}
      </fieldset>
    </div>
  );
}

// Month, then day (the day list follows the month; February goes to 29).
function DayPicker({ label, value, edge, invalid, onChange }: { label: string; value: string; edge: "start" | "end"; invalid: boolean; onChange: (value: string) => void }) {
  const id = useId();
  const parsed = parseMonthDay(value);
  const month = parsed?.month ?? 0;
  const day = parsed?.day ?? 0;
  const box = `min-h-11 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${invalid ? "border-red-500" : "border-line focus:border-ink"}`;

  function pickMonth(m: number) {
    if (!m) return onChange("");
    // A sensible day for a new month: the 1st for a start, the last day for an end.
    const keep = day && day <= daysInMonth(m) ? day : edge === "start" ? 1 : m === 2 ? 28 : daysInMonth(m);
    onChange(toMonthDay(m, keep));
  }

  return (
    <div>
      <p id={id} className="mb-1.5 text-sm font-semibold text-ink">
        {label}
      </p>
      <div role="group" aria-labelledby={id} className="grid grid-cols-[1fr_5.5rem] gap-2">
        <select aria-label={`${label}: month`} value={month} onChange={(e) => pickMonth(Number(e.target.value))} aria-invalid={invalid} className={box}>
          <option value={0}>Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label={`${label}: day`} value={day} disabled={!month} onChange={(e) => onChange(toMonthDay(month, Number(e.target.value)))} aria-invalid={invalid} className={`${box} disabled:opacity-50`}>
          <option value={0}>Day</option>
          {Array.from({ length: month ? daysInMonth(month) : 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
