"use client";

import { AlertTriangle, ArrowRight, Loader2, Scale, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { CodeField } from "@/components/auth/AuthFields";
import { formatSeconds, useCountdown } from "@/components/auth/useCountdown";
import type { DeletionStatus } from "@/lib/account/deletion";
import { deleteAccountAction, sendDeletionCodeAction } from "@/lib/account/deletion-actions";
import { formatMobile, otpError } from "@/lib/auth/validation";

type Code = { otpId: string; expiresAt: number; resendAt: number };

// Where each blocker can be dealt with.
const BLOCKER_LINK: Record<string, { href: string; label: string }> = {
  OPEN_ORDERS: { href: "/account/orders", label: "See your orders" },
  STORE_REGISTERED: { href: "/seller", label: "Go to your store" },
};

// Delete my account: read what goes and what stays, tick "I understand", get
// a code by SMS, type it in. The backend refuses while orders are open, a store
// is registered or it's an admin; those reasons are shown and the button is off.
export function DeleteAccountFlow({ status, mobileNumber }: { status: DeletionStatus; mobileNumber: string }) {
  const { sessionExpired } = useAuth();
  const [blockers, setBlockers] = useState(status.blockers);
  const [understood, setUnderstood] = useState(false);
  const [code, setCode] = useState<Code | null>(null);
  const [otp, setOtp] = useState("");
  const [otpProblem, setOtpProblem] = useState<string | undefined>();
  const [alert, setAlert] = useState<{ kind: "error" | "notice"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const otpRef = useRef<HTMLInputElement>(null);
  const expiresIn = useCountdown(code?.expiresAt ?? null);
  const resendIn = useCountdown(code?.resendAt ?? null);

  const blocked = blockers.length > 0;

  function sendCode() {
    setAlert(null);
    startTransition(async () => {
      const res = await sendDeletionCodeAction();
      if (!res.ok) {
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        if (res.error.code === "ACCOUNT_DELETION_BLOCKED") {
          // One field per reason (OPEN_ORDERS, …): show them like the page's own list.
          const found = Object.entries(res.error.fieldErrors).map(([c, message]) => ({ code: c, message }));
          setBlockers(found.length ? found : [{ code: "UNKNOWN", message: res.error.message }]);
          return;
        }
        // "Please wait 18 second(s)": restart the resend timer from the backend's number.
        const wait = /(\d+)\s*second/i.exec(res.error.message);
        if (res.error.code === "OTP_RESEND_TOO_SOON" && wait && code) setCode({ ...code, resendAt: Date.now() + Number(wait[1]) * 1000 });
        return setAlert({ kind: "error", text: res.error.message });
      }
      const now = Date.now();
      setCode({ otpId: res.data.otpId, expiresAt: now + res.data.expiresInSeconds * 1000, resendAt: now + res.data.resendAfterSeconds * 1000 });
      setOtp("");
      setOtpProblem(undefined);
      setAlert({ kind: "notice", text: code ? "We sent a new code. Only the newest code works." : `We sent a 6-digit code to ${formatMobile(mobileNumber)}.` });
      requestAnimationFrame(() => otpRef.current?.focus());
    });
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!code) return;
    const problem = otpError(otp);
    setOtpProblem(problem);
    if (problem) return otpRef.current?.focus();
    setAlert(null);
    startTransition(async () => {
      const res = await deleteAccountAction({ otpId: code.otpId, otp });
      if (res && !res.ok) {
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        if (res.error.code === "OTP_INVALID" || res.error.fieldErrors.otp) {
          setOtp("");
          setOtpProblem(res.error.fieldErrors.otp ?? res.error.message);
          return otpRef.current?.focus();
        }
        if (res.error.code === "ACCOUNT_DELETION_BLOCKED") {
          const found = Object.entries(res.error.fieldErrors).map(([c, message]) => ({ code: c, message }));
          setCode(null);
          return setBlockers(found.length ? found : [{ code: "UNKNOWN", message: res.error.message }]);
        }
        return setAlert({ kind: "error", text: res.error.message });
      }
      // Success never gets here: the action ends the session and goes to /goodbye.
    });
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <section role="alert" className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="font-bold text-amber-950">You can&apos;t delete your account yet</h2>
              <ul className="mt-3 space-y-3">
                {blockers.map((b) => (
                  <li key={b.code} className="text-sm text-amber-950">
                    <p>{b.message}</p>
                    {BLOCKER_LINK[b.code] && (
                      <Link href={BLOCKER_LINK[b.code].href} className="mt-1 inline-flex min-h-10 items-center gap-1 font-semibold text-amber-900 underline underline-offset-2">
                        {BLOCKER_LINK[b.code].label}
                        <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard tone="delete" title="What we delete" items={status.deleted} />
        <ListCard tone="keep" title="What we keep (required by law)" items={status.kept} />
      </div>

      <section aria-labelledby="confirm-title" className="rounded-3xl bg-white p-5 ring-1 ring-red-200 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldAlert aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-bold text-ink">
              Confirm with a code
            </h2>
            <p className="text-sm text-muted">So only you can delete this account, we&apos;ll text a 6-digit code to {formatMobile(mobileNumber)}.</p>
          </div>
        </div>

        <label className={`mt-5 flex min-h-12 items-start gap-3 rounded-2xl bg-surface p-3 text-sm text-ink ${blocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
          <input type="checkbox" checked={understood} disabled={blocked || pending} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-red-700" />
          <span>
            <span className="font-semibold">I understand this can&apos;t be undone.</span> My account and the details above are deleted for good, and I&apos;ll be logged out on every device.
          </span>
        </label>

        {alert && (
          <div className="mt-4">
            <FormMessage {...(alert.kind === "error" ? { error: alert.text } : { notice: alert.text })} />
          </div>
        )}

        {!code ? (
          <button
            type="button"
            onClick={sendCode}
            disabled={blocked || !understood || pending}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/30 sm:w-auto"
          >
            {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {pending ? "Sending code…" : "Send code"}
          </button>
        ) : (
          <form onSubmit={confirm} noValidate className="mt-5 space-y-3">
            <CodeField ref={otpRef} value={otp} onChange={setOtp} error={otpProblem} />
            <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
              <span className={expiresIn > 0 ? "text-muted" : "font-semibold text-red-700"} aria-live="polite">
                {expiresIn > 0 ? `Code expires in ${formatSeconds(expiresIn)}` : "Code expired. Send a new one."}
              </span>
              <button type="button" onClick={sendCode} disabled={pending || resendIn > 0} className="min-h-10 font-semibold text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline">
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </div>
            <button
              type="submit"
              disabled={blocked || !understood || pending || otp.length !== 6}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-red-700 px-6 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-700/40 sm:w-auto"
            >
              {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
              {pending ? "Deleting…" : "Delete my account"}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-muted">
          Changed your mind?{" "}
          <Link href="/account" className="font-semibold text-ink underline underline-offset-2">
            Keep my account
          </Link>
        </p>
      </section>
    </div>
  );
}

function ListCard({ tone, title, items }: { tone: "delete" | "keep"; title: string; items: string[] }) {
  const Icon = tone === "delete" ? Trash2 : Scale;
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
      <h2 className="flex items-center gap-2 font-bold text-ink">
        <span className={`flex size-9 items-center justify-center rounded-xl ${tone === "delete" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
          <Icon aria-hidden className="size-4" />
        </span>
        {title}
      </h2>
      {items.length ? (
        <ul className="mt-4 space-y-2.5 text-sm text-ink/85">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className={`mt-2 size-1.5 shrink-0 rounded-full ${tone === "delete" ? "bg-red-500" : "bg-slate-400"}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Nothing.</p>
      )}
    </section>
  );
}
