"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import type { OtpFormState } from "@/lib/auth/actions";
import { FormMessage } from "./AuthCard";

const RESEND_AFTER_SECONDS = 30;

type Props = {
  action: (prev: OtpFormState, formData: FormData) => Promise<OtpFormState>;
};

// Step 1: enter mobile number → "Get OTP".
// Step 2: enter the 6-digit OTP → "Verify & continue" (or change number / resend).
export function OtpLoginForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, { step: "phone", phone: "" });
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage error={state.error} notice={state.error ? undefined : state.notice} />

      {state.step === "phone" ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Mobile number</span>
            <span className="flex overflow-hidden rounded-xl border border-line focus-within:border-ink">
              <span className="flex items-center bg-surface px-3 text-sm font-medium text-muted">+91</span>
              <input
                key={state.phone}
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                defaultValue={state.phone}
                maxLength={14}
                required
                autoFocus
                className="w-full px-3 py-3 text-ink outline-none"
              />
            </span>
          </label>
          <SubmitButton intent="send" pending={pending} label="Get OTP" pendingLabel="Sending OTP…" />
        </>
      ) : (
        <>
          <input type="hidden" name="phone" value={state.phone} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Enter OTP</span>
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="••••••"
              required
              autoFocus
              className="w-full rounded-xl border border-line px-3 py-3 text-center text-xl tracking-[0.5em] text-ink outline-none focus:border-ink"
            />
          </label>
          <SubmitButton intent="verify" pending={pending} label="Verify & continue" pendingLabel="Verifying…" />
          <div className="flex items-center justify-between text-sm">
            <button
              type="submit"
              name="intent"
              value="change"
              formNoValidate
              disabled={pending}
              className="font-semibold text-muted hover:text-ink"
            >
              ← Change number
            </button>
            <ResendButton sentAt={state.sentAt} disabled={pending} />
          </div>
        </>
      )}
    </form>
  );
}

function SubmitButton({ intent, pending, label, pendingLabel }: { intent: string; pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className="w-full rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-ink/85 disabled:cursor-wait disabled:bg-ink/60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ResendButton({ sentAt, disabled }: { sentAt?: number; disabled: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = sentAt ? Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000)) : 0;

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return (
    <button
      type="submit"
      name="intent"
      value="send"
      formNoValidate
      disabled={disabled || secondsLeft > 0}
      className="font-semibold text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
    >
      {secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : "Resend OTP"}
    </button>
  );
}
