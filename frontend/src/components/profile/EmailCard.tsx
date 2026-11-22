"use client";

import { BadgeCheck, Clock, Mail } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { CodeField, PasswordField, SubmitButton, TextField } from "@/components/auth/AuthFields";
import { formatSeconds, useCountdown } from "@/components/auth/useCountdown";
import type { ActionError } from "@/lib/auth/actions";
import type { OtpInfo } from "@/lib/auth/api-types";
import type { CurrentUser } from "@/lib/auth/current-user";
import { EMAIL_MAX_LENGTH, emailError, otpError } from "@/lib/auth/validation";
import { requestEmailCodeAction, verifyEmailAction } from "@/lib/profile/actions";

// The account's email: every code (log in with a code, forgot password, delete
// account) goes only to a VERIFIED email. Adding, verifying or changing it is
// the same two steps:
//   1. new address + current password → POST /users/me/email (a code goes to it)
//   2. the code                       → POST /users/me/email/verify
// Until step 2 the old address stays in use; the new one shows as "waiting".
// The otpId lives only in this component's state (like the signup form), so
// after a reload "Enter code" first sends a new one.

type Step = "view" | "form" | "code";
type Code = { otpId: string; email: string; expiresAt: number; resendAt: number };
type Alert = { kind: "error" | "notice"; text: string } | null;

const SPAM_HINT = "It comes from no-reply@mail.360mart.in. Not there? Check your spam or promotions folder.";

export function EmailCard({ user, onSaved, onError }: { user: CurrentUser; onSaved: (user: CurrentUser) => void; onError: (error: ActionError, show: (text: string) => void) => void }) {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("view");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState<Code | null>(null);
  const [errors, setErrors] = useState<{ email?: string; currentPassword?: string; otp?: string }>({});
  const [alert, setAlert] = useState<Alert>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const expiresIn = useCountdown(code?.expiresAt ?? null);
  const resendIn = useCountdown(code?.resendAt ?? null);
  // The backend's wait between codes (e.g. after a reload, when this page didn't send the last one).
  const [sendLockedUntil, setSendLockedUntil] = useState<number | null>(null);
  const sendLockedIn = useCountdown(sendLockedUntil);

  const pendingEmail = user.pendingEmail;
  const status = !user.email ? "none" : user.emailVerified ? "verified" : "unverified";

  function openForm(prefill: string, notice?: string) {
    setEmailInput(prefill);
    setPassword("");
    setErrors({});
    setAlert(notice ? { kind: "notice", text: notice } : null);
    setStep("form");
  }

  function close() {
    setStep("view");
    setPassword("");
    setOtp("");
    setErrors({});
  }

  function accept(info: OtpInfo, email: string) {
    const now = Date.now();
    setCode({ otpId: info.otpId, email, expiresAt: now + info.expiresInSeconds * 1000, resendAt: now + info.resendAfterSeconds * 1000 });
    setSendLockedUntil(now + info.resendAfterSeconds * 1000);
    setOtp("");
  }

  function showError(error: ActionError) {
    const emailTaken = error.code === "EMAIL_ALREADY_IN_USE" ? `${error.message} Use a different email.` : undefined;
    // 401 here means a wrong current password (the session is fine): show it under the field.
    const wrongPassword = error.code === "INVALID_CREDENTIALS" ? error.message : undefined;
    setErrors({ email: error.fieldErrors.email ?? emailTaken, currentPassword: error.fieldErrors.currentPassword ?? wrongPassword, otp: error.fieldErrors.otp });
    if (error.code === "VALIDATION_FAILED" || emailTaken || wrongPassword) return setAlert(null);
    onError(error, (text) => setAlert({ kind: "error", text }));
  }

  // "Enter code" on the waiting address: straight to the code while this page still
  // holds a live one for it; otherwise (e.g. after a reload) get a new code first.
  function enterCode(waiting: string) {
    if (code && code.email === waiting && code.expiresAt > Date.now()) {
      setAlert(null);
      return setStep("code");
    }
    openForm(waiting, "Enter your password to get a new code for this email.");
  }

  // Step 1 (also "Resend", with the password typed for this change).
  function send(event?: FormEvent) {
    event?.preventDefault();
    const found = { email: emailError(emailInput), currentPassword: password ? undefined : "Enter your current password" };
    setErrors(found);
    if (found.email || found.currentPassword) return setStep("form");

    setAlert(null);
    startTransition(async () => {
      const res = await requestEmailCodeAction({ email: emailInput, currentPassword: password });
      if (!res.ok) {
        const wait = /(\d+)\s*second/i.exec(res.error.message);
        if (res.error.code === "OTP_RESEND_TOO_SOON" && wait) {
          const until = Date.now() + Number(wait[1]) * 1000;
          setSendLockedUntil(until);
          if (code) setCode({ ...code, resendAt: until });
        }
        if (step === "code" && res.error.code !== "OTP_RESEND_TOO_SOON") setStep("form");
        return showError(res.error);
      }
      onSaved(res.data.user);
      accept(res.data.otp, res.data.user.pendingEmail ?? emailInput.trim().toLowerCase());
      setErrors({});
      setStep("code");
      setAlert({ kind: "notice", text: `We emailed a 6-digit code to ${res.data.user.pendingEmail ?? emailInput.trim().toLowerCase()}. ${SPAM_HINT}` });
      requestAnimationFrame(() => otpRef.current?.focus());
    });
  }

  // Step 2.
  function verify(event: FormEvent) {
    event.preventDefault();
    if (!code) return;
    const problem = otpError(otp);
    setErrors({ otp: problem });
    if (problem) return otpRef.current?.focus();

    setAlert(null);
    startTransition(async () => {
      const res = await verifyEmailAction({ otpId: code.otpId, otp });
      if (!res.ok) {
        if (res.error.code === "OTP_INVALID" || res.error.fieldErrors.otp) {
          setOtp("");
          setErrors({ otp: res.error.fieldErrors.otp ?? res.error.message });
          return otpRef.current?.focus();
        }
        // Nothing waiting any more, or someone else verified it first: start again from step 1.
        if (res.error.code === "NO_PENDING_EMAIL" || res.error.code === "EMAIL_ALREADY_IN_USE") {
          setCode(null);
          setStep("form");
          setPassword("");
        }
        return showError(res.error);
      }
      onSaved(res.data);
      setCode(null);
      close();
      setAlert({ kind: "notice", text: "Your email is verified. We'll send your codes there." });
    });
  }

  return (
    <section id="email" aria-labelledby="email-title" className="scroll-mt-24 rounded-3xl border border-line bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
          <Mail aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="email-title" className="font-bold text-ink">
            Email
          </h2>
          <p className="text-sm text-muted">We send your login, password reset and account codes here, and nowhere else.</p>
        </div>
      </div>

      {/* Current address and its state. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
        <div className="min-w-0">
          {user.email ? <p className="break-all font-semibold text-ink">{user.email}</p> : <p className="font-semibold text-muted">No email added</p>}
          {status === "verified" && (
            <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-fresh">
              <BadgeCheck aria-hidden className="size-4" />
              Verified
            </p>
          )}
          {status === "unverified" && <p className="mt-0.5 text-sm font-semibold text-amber-800">Not verified: codes can&apos;t be sent here yet</p>}
          {status === "none" && <p className="mt-0.5 text-sm text-muted">Add one to log in with a code or reset your password.</p>}
        </div>
        {step === "view" && (
          <button
            type="button"
            onClick={() => openForm(status === "unverified" ? (user.email ?? "") : "")}
            className={`flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${status === "verified" ? "text-ink ring-1 ring-line hover:ring-ink" : "bg-ink text-white hover:bg-ink/85"}`}
          >
            {status === "verified" ? "Change email" : status === "unverified" ? "Verify" : "Add email"}
          </button>
        )}
      </div>

      {/* A new address waiting for its code (e.g. after a reload). */}
      {pendingEmail && step === "view" && (
        <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="flex items-start gap-2 text-sm text-amber-950">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              Waiting for confirmation: <strong className="break-all">{pendingEmail}</strong>
              {user.email && user.emailVerified && <span className="block text-amber-900/80">Until you enter the code, codes still go to {user.email}.</span>}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => enterCode(pendingEmail)}
              className="flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85"
            >
              Enter code
            </button>
            <button type="button" onClick={() => openForm(pendingEmail)} className="flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-amber-300 transition hover:bg-white">
              Resend
            </button>
          </div>
        </div>
      )}

      {alert && (
        <div className="mt-4" aria-live="polite">
          <FormMessage {...(alert.kind === "error" ? { error: alert.text } : { notice: alert.text })} />
        </div>
      )}

      {step === "form" && (
        <form onSubmit={send} noValidate className="mt-4 space-y-4">
          <TextField
            label={status === "verified" ? "New email" : "Email"}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={emailInput}
            onChange={setEmailInput}
            error={errors.email}
            autoFocus={!emailInput}
          />
          <PasswordField label="Current password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.currentPassword} autoFocus={!!emailInput} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-52">
              <SubmitButton
                pending={pending}
                disabled={sendLockedIn > 0}
                label={sendLockedIn > 0 ? `Send code in ${sendLockedIn}s` : "Send code"}
                pendingLabel="Sending code…"
              />
            </div>
            <button type="button" onClick={close} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "code" && code && (
        <form onSubmit={verify} noValidate className="mt-4 space-y-4">
          <div>
            <CodeField ref={otpRef} value={otp} onChange={setOtp} error={errors.otp} />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm">
              <span className={expiresIn > 0 ? "text-muted" : "font-semibold text-red-700"} aria-live="polite">
                {expiresIn > 0 ? `Code expires in ${formatSeconds(expiresIn)}` : "Code expired. Request a new one."}
              </span>
              <button
                type="button"
                onClick={() => send()}
                disabled={pending || resendIn > 0}
                className="min-h-10 font-semibold text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-52">
              <SubmitButton pending={pending} label="Verify email" pendingLabel="Checking…" />
            </div>
            <button type="button" onClick={() => openForm(code.email)} disabled={pending} className="flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Use a different email
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
