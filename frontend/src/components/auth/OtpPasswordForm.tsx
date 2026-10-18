"use client";

import { ArrowLeft, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  completeSignupAction,
  resetPasswordAction,
  sendCodeAction,
  startSignupAction,
  type ActionError,
} from "@/lib/auth/actions";
import type { AccountType, OtpInfo } from "@/lib/auth/api-types";
import { formatMobile, mobileError, newPasswordError, normalizeMobile, otpError } from "@/lib/auth/validation";
import { FormMessage } from "./AuthCard";
import { CodeField, MobileField, PasswordField, SubmitButton } from "./AuthFields";
import { formatSeconds, useCountdown } from "./useCountdown";

// Two-step "prove you own this number, then choose a password" form.
//   signup: mobile → POST /auth/signup        → code + password → /auth/set-password → logged in
//   reset:  mobile → POST /auth/otp/send      → code + password → /auth/password/reset → logged in
// Step 2 needs the otpId from step 1. It lives only in this component's state
// (like a controller variable in AngularJS), never in the URL or storage.

type Mode = "signup" | "reset";

type Code = { otpId: string; expiresAt: number; resendAt: number };

type Alert = { kind: "error" | "notice"; content: ReactNode };

type FieldErrors = { mobile?: string; otp?: string; password?: string };

const COPY = {
  signup: { purpose: "SIGNUP", sendLabel: "Send code", passwordLabel: "Create a password", finishLabel: "Create account", finishing: "Creating your account…" },
  reset: { purpose: "PASSWORD_RESET", sendLabel: "Send code", passwordLabel: "New password", finishLabel: "Save new password", finishing: "Saving…" },
} as const;

export function OtpPasswordForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  // Signup only: shop, or sell (a shopkeeper account, which can shop too). /signup?as=seller starts on sell.
  const [accountType, setAccountType] = useState<AccountType>(params.get("as") === "seller" ? "STORE_OWNER" : "CUSTOMER");
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<"mobile" | "verify">("mobile");
  const [mobileInput, setMobileInput] = useState("");
  const [mobile, setMobile] = useState(""); // normalized 10 digits, fixed once a code is sent
  const [code, setCode] = useState<Code | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<Alert | null>(null);

  const otpRef = useRef<HTMLInputElement>(null);
  const resendRef = useRef<HTMLButtonElement>(null);
  const expiresIn = useCountdown(code?.expiresAt ?? null);
  const resendIn = useCountdown(code?.resendAt ?? null);

  function acceptCode(info: OtpInfo) {
    const now = Date.now();
    setCode({ otpId: info.otpId, expiresAt: now + info.expiresInSeconds * 1000, resendAt: now + info.resendAfterSeconds * 1000 });
    setOtp(""); // a new code cancels the old one
  }

  function showError(error: ActionError) {
    setErrors({
      mobile: error.fieldErrors.mobileNumber,
      otp: error.fieldErrors.otp,
      password: error.fieldErrors.password ?? error.fieldErrors.newPassword,
    });
    if (error.code !== "VALIDATION_FAILED") setAlert({ kind: "error", content: <ErrorText error={error} /> });
    else setAlert(null);
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const problem = mobileError(mobileInput);
    setErrors({ mobile: problem });
    if (problem) return;

    setAlert(null);
    startTransition(async () => {
      const res = mode === "signup" ? await startSignupAction(mobileInput, accountType) : await sendCodeAction(mobileInput, copy.purpose);
      if (!res.ok) return showError(res.error);

      const info = "otp" in res.data ? res.data.otp : res.data;
      setMobile(normalizeMobile(mobileInput) ?? "");
      acceptCode(info);
      setPassword("");
      setErrors({});
      setStep("verify");
      // Signup: the number is new, so say it plainly. Reset: the backend's
      // wording never reveals whether the number has an account.
      setAlert({ kind: "notice", content: mode === "signup" ? "We sent a 6-digit code by SMS." : info.message });
    });
  }

  function handleResend() {
    setAlert(null);
    startTransition(async () => {
      const res = await sendCodeAction(mobile, copy.purpose);
      if (!res.ok) {
        // "Please wait 18 second(s)": restart the resend timer from the backend's number.
        const wait = /(\d+)\s*second/i.exec(res.error.message);
        if (res.error.code === "OTP_RESEND_TOO_SOON" && wait && code) {
          setCode({ ...code, resendAt: Date.now() + Number(wait[1]) * 1000 });
        }
        return showError(res.error);
      }
      acceptCode(res.data);
      setErrors({});
      setAlert({ kind: "notice", content: "We sent a new code. Only the newest code works." });
      otpRef.current?.focus();
    });
  }

  function handleFinish(event: FormEvent) {
    event.preventDefault();
    if (!code) return;
    const found = { otp: otpError(otp), password: newPasswordError(password) };
    setErrors(found);
    if (found.otp || found.password) {
      if (found.otp) otpRef.current?.focus();
      return;
    }

    setAlert(null);
    startTransition(async () => {
      const input = { mobileNumber: mobile, otpId: code.otpId, otp, password, next };
      // On success the action logs in and redirects, so nothing comes back.
      const res = mode === "signup" ? await completeSignupAction(input) : await resetPasswordAction(input);
      if (!res || res.ok) return;

      showError(res.error);
      if (res.error.code === "OTP_INVALID") {
        setOtp("");
        // Out of attempts or expired: the only way forward is a new code.
        if (/new one/i.test(res.error.message)) resendRef.current?.focus();
        else otpRef.current?.focus();
      }
    });
  }

  function changeNumber() {
    setStep("mobile");
    setCode(null);
    setOtp("");
    setPassword("");
    setErrors({});
    setAlert(null);
  }

  if (step === "mobile") {
    return (
      <form onSubmit={handleSend} noValidate className="space-y-4">
        {mode === "signup" && <AccountTypePicker value={accountType} onChange={setAccountType} />}
        <AlertMessage alert={alert} />
        <MobileField value={mobileInput} onChange={setMobileInput} error={errors.mobile} autoFocus />
        <SubmitButton pending={pending} label={copy.sendLabel} pendingLabel="Sending code…" />
      </form>
    );
  }

  return (
    <form onSubmit={handleFinish} noValidate className="space-y-4">
      {/* Lets password managers save the new password against this number. */}
      <input type="text" name="username" autoComplete="username" value={formatMobile(mobile)} readOnly hidden />

      <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-xl bg-surface px-4 py-2 text-sm">
        <span className="text-muted">
          Code sent to <strong className="font-semibold text-ink">{formatMobile(mobile)}</strong>
          {mode === "signup" && accountType === "STORE_OWNER" && <span className="block text-xs font-semibold text-brand-deep">Shopkeeper account</span>}
        </span>
        <button type="button" onClick={changeNumber} disabled={pending} className="flex min-h-10 items-center gap-1 font-semibold text-brand-deep hover:underline">
          <ArrowLeft aria-hidden className="size-4" />
          Change
        </button>
      </div>

      <AlertMessage alert={alert} />

      <div>
        <CodeField ref={otpRef} value={otp} onChange={setOtp} error={errors.otp} autoFocus />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm">
          <span className={expiresIn > 0 ? "text-muted" : "font-semibold text-red-700"} aria-live="polite">
            {expiresIn > 0 ? `Code expires in ${formatSeconds(expiresIn)}` : "Code expired. Request a new one."}
          </span>
          <button
            ref={resendRef}
            type="button"
            onClick={handleResend}
            disabled={pending || resendIn > 0}
            className="min-h-10 font-semibold text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      </div>

      <PasswordField
        label={copy.passwordLabel}
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        showRules
      />

      <SubmitButton pending={pending} label={copy.finishLabel} pendingLabel={copy.finishing} />
    </form>
  );
}

const ACCOUNT_TYPES: { value: AccountType; title: string; text: string; icon: typeof Store }[] = [
  { value: "CUSTOMER", title: "Shop", text: "Order from stores near you", icon: ShoppingBag },
  { value: "STORE_OWNER", title: "Sell", text: "Register your store, and shop too", icon: Store },
];

function AccountTypePicker({ value, onChange }: { value: AccountType; onChange: (value: AccountType) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">I want to</legend>
      <div className="grid grid-cols-2 gap-2">
        {ACCOUNT_TYPES.map((type) => {
          const selected = value === type.value;
          return (
            <label
              key={type.value}
              className={`flex min-h-12 cursor-pointer flex-col gap-1 rounded-2xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
            >
              <input type="radio" name="accountType" value={type.value} checked={selected} onChange={() => onChange(type.value)} className="sr-only" />
              <span className="flex items-center gap-2 font-bold">
                <type.icon aria-hidden className="size-4 shrink-0" />
                {type.title}
              </span>
              <span className={`text-xs leading-snug ${selected ? "text-white/80" : "text-muted"}`}>{type.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AlertMessage({ alert }: { alert: Alert | null }) {
  if (!alert) return null;
  return alert.kind === "error" ? <FormMessage error={alert.content} /> : <FormMessage notice={alert.content} />;
}

// The backend's message, plus a way forward for the errors that have one.
function ErrorText({ error }: { error: ActionError }) {
  if (error.code === "USER_ALREADY_EXISTS" || error.code === "PASSWORD_ALREADY_SET") {
    return (
      <>
        {error.message}{" "}
        <Link href="/login" className="font-semibold underline">
          Login
        </Link>{" "}
        or{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          reset your password
        </Link>
        .
      </>
    );
  }
  return error.message;
}
