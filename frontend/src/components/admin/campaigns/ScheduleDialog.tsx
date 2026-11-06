"use client";

import { CalendarClock, LoaderCircle, Moon, Send, Timer } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import { count } from "@/lib/campaigns/format";
import type { AudienceCount } from "@/lib/campaigns/types";
import { isoFromIstInput, istInput, isQuietTime, nextSendWindow, scheduleErrors } from "@/lib/campaigns/validation";
import { when } from "@/lib/orders/format";

type Result = { fieldErrors: Record<string, string>; message: string } | null;

// "Send now" or "Schedule" (date and time in India time, sent as UTC).
// Promotions can't go out 21:00–09:00 India time: during those hours "Send
// now" is off and the time picker starts at the next 09:00. The backend
// checks the same rules; its words land under the time.
export function ScheduleDialog({
  open,
  onClose,
  audience,
  expiresAt,
  timer = false,
  currentSendAt,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  audience: AudienceCount | null;
  expiresAt: string | null;
  /** The campaign has a countdown: the offer must end within 24 hours of sending. */
  timer?: boolean;
  currentSendAt: string | null;
  /** Resolves with the problem to show, or null when it worked (the dialog is then closed by the parent). */
  onConfirm: (sendAt: string | null) => Promise<Result>;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={currentSendAt ? "Change when it goes out" : "Send this campaign"} description="Promotions go out between 09:00 and 21:00 India time.">
      {/* Mounted per opening so it starts from the current time. */}
      {open && <Body onClose={onClose} audience={audience} expiresAt={expiresAt} timer={timer} currentSendAt={currentSendAt} onConfirm={onConfirm} />}
    </Dialog>
  );
}

function Body({ onClose, audience, expiresAt, timer = false, currentSendAt, onConfirm }: Omit<Parameters<typeof ScheduleDialog>[0], "open">) {
  const id = useId();
  const [now] = useState(() => Date.now());
  const quiet = isQuietTime(now);
  const [mode, setMode] = useState<"now" | "later">(quiet || currentSendAt ? "later" : "now");
  const [at, setAt] = useState(() => istInput(currentSendAt ?? (quiet ? nextSendWindow(now) : now + 60 * 60_000)));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function confirm() {
    const sendAt = mode === "now" ? null : isoFromIstInput(at);
    if (mode === "later" && !sendAt) return setResult({ fieldErrors: { sendAt: "Pick a date and time" }, message: "" });
    const local = scheduleErrors(sendAt, expiresAt, Date.now(), timer);
    if (Object.keys(local).length) return setResult({ fieldErrors: local, message: "" });
    setBusy(true);
    setResult(null);
    const problem = await onConfirm(sendAt);
    setBusy(false);
    if (problem) setResult(problem);
  }

  const picked = isoFromIstInput(at);
  const people = audience ? count(audience.users) : null;
  return (
    <div className="space-y-4 pb-5">
      <div role="radiogroup" aria-label="When" className="grid gap-2 sm:grid-cols-2">
        <Choice checked={mode === "now"} disabled={quiet} onChange={() => setMode("now")} icon={<Send aria-hidden className="size-5" />} title="Send now" text={quiet ? "Not between 21:00 and 09:00" : "Starts within about 10 seconds"} />
        <Choice checked={mode === "later"} onChange={() => setMode("later")} icon={<CalendarClock aria-hidden className="size-5" />} title="Schedule" text="Pick a day and time, up to 60 days ahead" />
      </div>

      {quiet && (
        <p className="flex items-start gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <Moon aria-hidden className="mt-0.5 size-4 shrink-0" />
          It&apos;s quiet hours in India now, so people aren&apos;t disturbed at night. The earliest is {when(new Date(nextSendWindow(now)).toISOString())}.
        </p>
      )}

      {mode === "later" && (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
            Goes out at (India time)
          </label>
          <input
            id={id}
            type="datetime-local"
            value={at}
            onChange={(e) => {
              setAt(e.target.value);
              setResult(null);
            }}
            aria-invalid={!!result?.fieldErrors.sendAt}
            className={`min-h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${result?.fieldErrors.sendAt ? "border-red-500" : "border-line focus:border-ink"}`}
          />
          {picked && !result?.fieldErrors.sendAt && isQuietTime(Date.parse(picked)) && <p className="mt-1.5 text-sm text-amber-800">That&apos;s within quiet hours (21:00–09:00). Pick a daytime slot.</p>}
          {result?.fieldErrors.sendAt && <p className="mt-1.5 text-sm text-red-700">{result.fieldErrors.sendAt}</p>}
        </div>
      )}

      {timer && expiresAt && !result?.fieldErrors.expiresAt && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Timer aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Countdown to {when(expiresAt)} (India time). Android phones show a ticking clock; iPhones show &ldquo;Ends&nbsp;…&rdquo; in the text. The offer must end within 24 hours of sending.
          </span>
        </p>
      )}
      {result?.fieldErrors.expiresAt && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          Offer end: {result.fieldErrors.expiresAt}
          {/* The countdown message already says what to do. */}
          {/Send it later/.test(result.fieldErrors.expiresAt) ? "." : ". Change the offer end in the editor, or send earlier."}
        </p>
      )}
      {result?.message && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{result.message}</p>}

      <p className="text-sm text-muted">
        {people !== null && audience ? (
          <>
            Goes to <span className="font-semibold text-ink">{people} {audience.users === 1 ? "person" : "people"}</span> as the audience stands
            {mode === "later" ? " now; the list is made again when it goes out" : ""}. {count(audience.reachableByPush)} get a push, the rest see it in their inbox. Anyone past the daily limit of offer pushes gets it in the inbox only.
          </>
        ) : (
          "The audience is worked out when it goes out."
        )}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
          Not yet
        </button>
        <button type="button" onClick={confirm} disabled={busy || (mode === "now" && quiet)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60">
          {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : mode === "now" ? <Send aria-hidden className="size-4" /> : <CalendarClock aria-hidden className="size-4" />}
          {mode === "now" ? (people ? `Send now to ${people}` : "Send now") : currentSendAt ? "Change time" : "Schedule"}
        </button>
      </div>
    </div>
  );
}

function Choice({ checked, disabled, onChange, icon, title, text }: { checked: boolean; disabled?: boolean; onChange: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <label
      className={`flex min-h-16 items-start gap-3 rounded-2xl p-4 ring-1 ring-line transition has-[:checked]:bg-brand-soft/50 has-[:checked]:ring-2 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:ring-ink"}`}
    >
      <input type="radio" name="send-when" checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      <span className="mt-0.5 text-ink">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}
