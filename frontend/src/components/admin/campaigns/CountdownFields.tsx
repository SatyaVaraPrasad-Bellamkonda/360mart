"use client";

import { Check, Timer } from "lucide-react";
import { useId } from "react";
import { TextField } from "@/components/auth/AuthFields";
import { DEFAULT_TIMER_LABEL, TIMER_COLOURS, TIMER_THEMES, type TimerStyle } from "@/lib/campaigns/types";
import { istInput, LIMITS, type CampaignDraft } from "@/lib/campaigns/validation";

const STYLES: { value: TimerStyle; title: string; text: string }[] = [
  { value: "NONE", title: "None", text: "A normal notification" },
  { value: "SIMPLE", title: "Simple", text: "A ticking clock in the header" },
  { value: "BANNER", title: "Banner", text: "A coloured strip with a big clock" },
];

// The countdown on Android pushes: none, a small clock in the notification's
// header, or a coloured banner with a big clock. It counts down to the offer
// end (no separate date). Label and colour only matter while a timer is on.
export function CountdownFields({ draft, set, errors }: { draft: CampaignDraft; set: (patch: Partial<CampaignDraft>) => void; errors: Record<string, string> }) {
  const name = useId();
  // A countdown needs an end: with none yet, start from 3 hours ahead (rounded to the quarter hour) rather than an error.
  function choose(timerStyle: TimerStyle) {
    if (timerStyle === "NONE" || draft.expiresAt) return set({ timerStyle });
    set({ timerStyle, expiresAt: istInput(threeHoursAhead()) });
  }
  const on = draft.timerStyle !== "NONE";
  return (
    <fieldset className="min-w-0 space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <legend className="sr-only">Countdown</legend>
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Timer aria-hidden className="size-4 text-brand-deep" />
          Countdown on the notification
        </p>
        <p className="mt-0.5 text-xs text-muted">A live clock counting down to the offer end, on Android phones. iPhones get &ldquo;Ends 11:00 am&rdquo; added to the message instead.</p>
      </div>

      <div role="radiogroup" aria-label="Countdown style" className="grid grid-cols-3 gap-2">
        {STYLES.map((s) => {
          const picked = draft.timerStyle === s.value;
          return (
            <label
              key={s.value}
              className={`flex min-h-24 cursor-pointer flex-col gap-2 rounded-2xl bg-white p-2.5 ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50 ${picked ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"}`}
            >
              <input type="radio" name={name} value={s.value} checked={picked} onChange={() => choose(s.value)} className="sr-only" />
              <Drawing style={s.value} />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{s.title}</span>
                <span className="block text-[11px] leading-snug text-muted">{s.text}</span>
              </span>
            </label>
          );
        })}
      </div>

      {on && (
        <>
          <TextField
            label="Text beside the clock"
            name="timerLabel"
            autoComplete="off"
            optional
            maxLength={LIMITS.timerLabel}
            value={draft.timerLabel}
            onChange={(timerLabel) => set({ timerLabel })}
            error={errors.timerLabel}
            placeholder={DEFAULT_TIMER_LABEL}
            hint={`${draft.timerLabel.length}/${LIMITS.timerLabel} · empty = "${DEFAULT_TIMER_LABEL}"`}
          />
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {TIMER_THEMES.map((t) => {
                const c = TIMER_COLOURS[t];
                const picked = draft.timerTheme === t;
                return (
                  <label
                    key={t}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50 ${picked ? "ring-2 ring-ink" : "ring-line hover:ring-ink/40"}`}
                  >
                    <input type="radio" name={`${name}-theme`} value={t} checked={picked} onChange={() => set({ timerTheme: t })} className="sr-only" />
                    <span aria-hidden className="flex size-8 items-center justify-center rounded-full text-[10px] font-extrabold tabular-nums" style={{ background: c.background, color: c.text }}>
                      {picked ? <Check className="size-4" /> : "12"}
                    </span>
                    {c.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
    </fieldset>
  );
}

/** 3 hours from now, rounded up to the quarter hour (only ever called on a click). */
function threeHoursAhead(): number {
  const quarter = 15 * 60_000;
  return Math.ceil((Date.now() + 3 * 3_600_000) / quarter) * quarter;
}

// Small sketches of the three choices.
function Drawing({ style }: { style: TimerStyle }) {
  return (
    <span aria-hidden className="block rounded-lg bg-surface p-1.5 ring-1 ring-line">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-brand" />
        <span className="h-1 w-6 rounded-full bg-line" />
        {style === "SIMPLE" && <span className="ml-auto h-1.5 w-5 rounded-full bg-ink/70" />}
      </span>
      <span className="mt-1 block h-1 w-10 rounded-full bg-ink/40" />
      <span className="mt-0.5 block h-1 w-14 rounded-full bg-line" />
      {style === "BANNER" && (
        <span className="mt-1.5 flex items-center justify-between rounded px-1 py-0.5" style={{ background: TIMER_COLOURS.GOLD.background }}>
          <span className="h-1 w-5 rounded-full bg-black/40" />
          <span className="h-1.5 w-6 rounded-full bg-black/70" />
        </span>
      )}
    </span>
  );
}
