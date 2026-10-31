"use client";

import { ChevronDown, Clock, Plus, Trash2, Wand2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { TextField } from "@/components/auth/AuthFields";
import type { Category } from "@/lib/catalog/types";
import type { TimeSlot } from "@/lib/home-page/types";
import { HOME_LIMITS, indiaMinutes, newHomeId, slotAt, slotCovers, suggestedSlots, timeLabel, TIME_OF_DAY, toMinutes } from "@/lib/home-page/validation";
import { CategoryPicker, ProductPicker } from "./pickers";

// One colour per slot (complete classes, for the timeline and the cards).
const COLOURS = [
  { bar: "bg-amber-400", dot: "bg-amber-400", soft: "bg-amber-50 ring-amber-200" },
  { bar: "bg-sky-400", dot: "bg-sky-400", soft: "bg-sky-50 ring-sky-200" },
  { bar: "bg-rose-400", dot: "bg-rose-400", soft: "bg-rose-50 ring-rose-200" },
  { bar: "bg-indigo-400", dot: "bg-indigo-400", soft: "bg-indigo-50 ring-indigo-200" },
  { bar: "bg-emerald-400", dot: "bg-emerald-400", soft: "bg-emerald-50 ring-emerald-200" },
  { bar: "bg-fuchsia-400", dot: "bg-fuchsia-400", soft: "bg-fuchsia-50 ring-fuchsia-200" },
];

// The India clock in the browser only (the server renders no "now" marker).
const clock = {
  subscribe: (cb: () => void) => {
    const t = setInterval(cb, 60_000);
    return () => clearInterval(t);
  },
  get: () => indiaMinutes(new Date()),
};

// The parts of the day: each has its own product row on the home page, and
// the row of the slot the India clock is in shows. Slots may leave gaps (no
// row then) but never overlap.
export function TimeSlotsEditor({ slots, onChange, errors, categories }: { slots: TimeSlot[]; onChange: (slots: TimeSlot[], structural?: boolean) => void; errors: Record<string, string>; categories: Category[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const now = useSyncExternalStore(clock.subscribe, clock.get, () => null);
  const current = now === null ? undefined : slotAt(slots, now);
  const update = (i: number, patch: Partial<TimeSlot>) => onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function add() {
    const taken = slots.map((s) => s.id);
    const last = slots.at(-1);
    const start = last && TIME_OF_DAY.test(last.end) ? last.end : "06:00";
    const end = `${String((Number(start.slice(0, 2)) + 4) % 24).padStart(2, "0")}:${start.slice(3)}`;
    const slot: TimeSlot = { id: newHomeId("slot", taken), label: "", start, end, title: "", subtitle: "", categoryIds: [], productIds: [] };
    onChange([...slots, slot], true);
    setOpen(slot.id);
  }

  const gaps = uncovered(slots);

  return (
    <div className="space-y-4">
      <Timeline slots={slots} now={now} />
      {gaps && slots.length > 0 && <p className="text-xs text-muted">No time-of-day row shows {gaps}.</p>}
      {errors.timeSlots && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">{errors.timeSlots}</p>}

      {slots.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
          <Clock aria-hidden className="mx-auto size-7 text-brand-deep" />
          <p className="mt-2 font-semibold text-ink">No time slots yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Split the day (morning, afternoon, evening…) and choose what each part shows, like milk and fruit in the morning and snacks in the evening.</p>
          <button
            type="button"
            onClick={() => {
              const fresh = suggestedSlots(categories);
              onChange(fresh, true);
              setOpen(fresh[0].id);
            }}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85"
          >
            <Wand2 aria-hidden className="size-4" />
            Use suggested times
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {slots.map((s, i) => {
          const colour = COLOURS[i % COLOURS.length];
          const expanded = open === s.id;
          const at = `timeSlots[${i}]`;
          const problem = Object.entries(errors).find(([k]) => k.startsWith(`${at}.`))?.[1];
          return (
            <li key={s.id} className={`rounded-2xl bg-white ring-1 ${problem ? "ring-red-300" : expanded ? "ring-ink/40" : "ring-line"}`}>
              <button type="button" onClick={() => setOpen(expanded ? null : s.id)} aria-expanded={expanded} className="flex min-h-14 w-full items-center gap-3 p-3 text-left">
                <span aria-hidden className={`size-3 shrink-0 rounded-full ${colour.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="truncate font-semibold text-ink">{s.label.trim() || "New slot"}</span>
                    <span className="text-xs font-semibold tabular-nums text-muted">
                      {timeLabel(s.start)} – {timeLabel(s.end)}
                    </span>
                    {current?.id === s.id && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-800 ring-1 ring-green-200">Showing now</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {s.title.trim() || "No row title yet"} · {s.categoryIds.length} {s.categoryIds.length === 1 ? "category" : "categories"} · {s.productIds.length} {s.productIds.length === 1 ? "product" : "products"}
                  </span>
                </span>
                <ChevronDown aria-hidden className={`size-4 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`} />
              </button>
              {problem && !expanded && <p className="px-4 pb-3 text-sm text-red-700">{problem}</p>}
              {expanded && (
                <div className="min-w-0 space-y-4 border-t border-line p-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                    <TextField label="Name" name={`label-${s.id}`} autoComplete="off" maxLength={HOME_LIMITS.slotLabel} placeholder="Morning" value={s.label} onChange={(v) => update(i, { label: v })} error={errors[`${at}.label`]} />
                    <TimeInput label="Starts" value={s.start} onChange={(v) => update(i, { start: v })} error={errors[`${at}.start`]} />
                    <TimeInput label="Ends" value={s.end} onChange={(v) => update(i, { end: v })} error={errors[`${at}.end`]} />
                  </div>
                  {TIME_OF_DAY.test(s.start) && TIME_OF_DAY.test(s.end) && toMinutes(s.end) < toMinutes(s.start) && <p className="-mt-2 text-xs text-muted">Runs past midnight.</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Row title" name={`title-${s.id}`} autoComplete="off" maxLength={HOME_LIMITS.slotTitle} placeholder="Good morning: milk & fresh fruit" value={s.title} onChange={(v) => update(i, { title: v })} error={errors[`${at}.title`]} />
                    <TextField label="Subtitle" name={`subtitle-${s.id}`} optional autoComplete="off" maxLength={HOME_LIMITS.slotSubtitle} value={s.subtitle ?? ""} onChange={(v) => update(i, { subtitle: v })} error={errors[`${at}.subtitle`]} />
                  </div>
                  <CategoryPicker
                    label="Categories"
                    hint="Their products fill the row, featured first. Subcategories work too."
                    ids={s.categoryIds}
                    onChange={(categoryIds) => update(i, { categoryIds })}
                    max={HOME_LIMITS.slotCategories}
                    error={errors[`${at}.categoryIds`]}
                    categories={categories}
                  />
                  <ProductPicker
                    label="Products to show first (optional)"
                    hint="In your order, before the categories' products."
                    ids={s.productIds}
                    onChange={(productIds) => update(i, { productIds })}
                    max={HOME_LIMITS.slotProducts}
                    error={errors[`${at}.productIds`]}
                  />
                  {s.categoryIds.length === 0 && s.productIds.length === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">Pick categories or products, or the row stays empty (and hidden) in this slot.</p>}
                  <div className="flex border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(slots.filter((_, j) => j !== i), true);
                        setOpen(null);
                      }}
                      className="ml-auto flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-red-700"
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Remove slot
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {slots.length > 0 && slots.length < HOME_LIMITS.slots && (
        <button type="button" onClick={add} className="flex min-h-11 items-center gap-2 rounded-full border border-dashed border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink">
          <Plus aria-hidden className="size-4" />
          Add a time slot
        </button>
      )}
      {slots.length >= HOME_LIMITS.slots && <p className="text-sm text-muted">The day can have {HOME_LIMITS.slots} slots.</p>}
    </div>
  );
}

function TimeInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <input
        type="time"
        step={900}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 5))}
        aria-invalid={!!error}
        className={`mt-1.5 block min-h-12 w-full rounded-xl border bg-white px-3 text-base font-normal tabular-nums text-ink outline-none focus:ring-2 focus:ring-brand/40 sm:w-36 ${error ? "border-red-500" : "border-line focus:border-ink"}`}
      />
      {error && <span className="mt-1 block text-sm font-normal text-red-700">{error}</span>}
    </label>
  );
}

/** The day as a bar: each slot in its colour, gaps empty, a line at the current time. */
function Timeline({ slots, now }: { slots: TimeSlot[]; now: number | null }) {
  const segments = slots.flatMap((s, i) => {
    if (!TIME_OF_DAY.test(s.start) || !TIME_OF_DAY.test(s.end) || s.start === s.end) return [];
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    const parts: [number, number][] = a < b ? [[a, b]] : [[a, 1440], [0, b]];
    return parts.map(([x, y]) => ({ key: `${s.id}-${x}`, left: (x / 1440) * 100, width: ((y - x) / 1440) * 100, colour: COLOURS[i % COLOURS.length].bar, label: s.label.trim() }));
  });
  return (
    <div aria-hidden>
      <div className="relative h-9 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
        {segments.map((g) => (
          <span key={g.key} className={`absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-md text-[11px] font-bold text-white ${g.colour}`} style={{ left: `${g.left}%`, width: `calc(${g.width}% - 2px)` }}>
            <span className="truncate px-1">{g.width > 9 ? g.label : ""}</span>
          </span>
        ))}
        {now !== null && <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(now / 1440) * 100}%` }} />}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>12 am</span>
        <span>6 am</span>
        <span>12 pm</span>
        <span>6 pm</span>
        <span>12 am</span>
      </div>
    </div>
  );
}

/** "from 3 am to 5 am" for the parts of the day no slot covers, or null. */
function uncovered(slots: TimeSlot[]): string | null {
  const free: [number, number][] = [];
  let startFree: number | null = null;
  for (let m = 0; m <= 1440; m += 15) {
    const covered = m < 1440 && slots.some((s) => slotCovers(s, m));
    if (!covered && m < 1440 && startFree === null) startFree = m;
    if ((covered || m === 1440) && startFree !== null) {
      free.push([startFree, m]);
      startFree = null;
    }
  }
  if (!free.length) return null;
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return free.map(([a, b]) => `from ${timeLabel(hhmm(a))} to ${timeLabel(hhmm(b))}`).join(" and ");
}
