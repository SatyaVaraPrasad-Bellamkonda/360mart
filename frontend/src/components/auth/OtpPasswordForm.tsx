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
import type { Acceptance } from "@/lib/legal/types";
import { EMAIL_MAX_LENGTH, emailError, formatMobile, mobileError, newPasswordError, normalizeMobile, otpError } from "@/lib/auth/validation";
import { FormMessage } from "./AuthCard";
import { CodeField, MobileField, PasswordField, SubmitButton, TextField } from "./AuthFields";
import { formatSeconds, useCountdown } from "./useCountdown";

// Two-step "prove it's you with a code, then choose a password" form. Codes go by
// email (never SMS): signup sends it to the email typed in, which becomes the
// account's verified email; reset sends it to the account's verified email
// without ever saying which address that is.
//   signup: mobile + email → POST /auth/signup   → code + password → /auth/set-password → logged in
//   reset:  mobile         → POST /auth/otp/send → code + password → /auth/password/reset → logged in
// Step 2 needs the otpId from step 1. It lives only in this component's state
// (like a controller variable in AngularJS), never in the URL or storage.

type Mode = "signup" | "reset";

type Code = { otpId: string; expiresAt: number; resendAt: number };

type Alert = { kind: "error" | "notice"; content: ReactNode };

type FieldErrors = { mobile?: string; email?: string; otp?: string; password?: string; agree?: string };

// Shown with every "we emailed you" message: the sender, and where it may have landed.
const SPAM_HINT = "It comes from no-reply@mail.360mart.in. Not there? Check your spam or promotions folder.";

const COPY = {
  signup: { purpose: "SIGNUP", sendLabel: "Send code", passwordLabel: "Create a password", finishLabel: "Create account", finishing: "Creating your account…" },
  reset: { purpose: "PASSWORD_RESET", sendLabel: "Send code", passwordLabel: "New password", finishLabel: "Save new password", finishing: "Saving…" },
} as const;

/**
 * signupPolicies: the Terms and Privacy versions shown next to the signup
 * checkbox; accepted right after the account is created and logged in.
 */
export function OtpPasswordForm({ mode, signupPolicies = [] }: { mode: Mode; signupPolicies?: Acceptance[] }) {
  const copy = COPY[mode];
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  // Signup only: shop, or sell (a shopkeeper account, which can shop too). /signup?as=seller starts on sell.
  const [accountType, setAccountType] = useState<AccountType>(params.get("as") === "seller" ? "STORE_OWNER" : "CUSTOMER");
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<"mobile" | "verify">("mobile");
  const [mobileInput, setMobileInput] = useState("");
  const [mobile, setMobile] = useState(""); // normalized 10 digits, fixed once a code is sent
  const [emailInput, setEmailInput] = useState(""); // signup only
  const [email, setEmail] = useState(""); // where the signup code went (as the backend keeps it)
  // Going back to fix the email can't send again before the backend's wait is over.
  const [sendLockedUntil, setSendLockedUntil] = useState<number | null>(null);
  const [code, setCode] = useState<Code | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<Alert | null>(null);

  const otpRef = useRef<HTMLInputElement>(null);
  const resendRef = useRef<HTMLButtonElement>(null);
  const expiresIn = useCountdown(code?.expiresAt ?? null);
  const resendIn = useCountdown(code?.resendAt ?? null);
  const sendLockedIn = useCountdown(sendLockedUntil);

  function acceptCode(info: OtpInfo) {
    const now = Date.now();
    setCode({ otpId: info.otpId, expiresAt: now + info.expiresInSeconds * 1000, resendAt: now + info.resendAfterSeconds * 1000 });
    setSendLockedUntil(now + info.resendAfterSeconds * 1000);
    setOtp(""); // a new code cancels the old one
  }

  function showError(error: ActionError) {
    // 409 EMAIL_ALREADY_IN_USE belongs under the email field.
    const emailTaken = error.code === "EMAIL_ALREADY_IN_USE" ? `${error.message} Use a different email.` : undefined;
    setErrors({
      mobile: error.fieldErrors.mobileNumber,
      email: error.fieldErrors.email ?? emailTaken,
      otp: error.fieldErrors.otp,
      password: error.fieldErrors.password ?? error.fieldErrors.newPassword,
    });
    if (error.code !== "VALIDATION_FAILED" && !emailTaken) setAlert({ kind: "error", content: <ErrorText error={error} /> });
    else setAlert(null);
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const problem = mobileError(mobileInput);
    const emailProblem = mode === "signup" ? emailError(emailInput) : undefined;
    const agree = mode === "signup" && !agreed ? "Tick the box to agree to the Terms and Privacy Policy." : undefined;
    setErrors({ mobile: problem, email: emailProblem, agree });
    if (problem || emailProblem || agree) return;

    setAlert(null);
    startTransition(async () => {
      const res =
        mode === "signup"
          ? await startSignupAction({ mobileNumber: mobileInput, email: emailInput, accountType })
          : await sendCodeAction(mobileInput, copy.purpose);
      if (!res.ok) {
        const wait = /(\d+)\s*second/i.exec(res.error.message);
        if (res.error.code === "OTP_RESEND_TOO_SOON" && wait) setSendLockedUntil(Date.now() + Number(wait[1]) * 1000);
        return showError(res.error);
      }

      const info = "otp" in res.data ? res.data.otp : res.data;
      setMobile(normalizeMobile(mobileInput) ?? "");
      if ("email" in res.data) setEmail(res.data.email);
      acceptCode(info);
      setPassword("");
      setErrors({});
      setStep("verify");
      // Signup: the address was just typed in, so name it. Reset: never say which
      // email belongs to a number (or whether the number has an account at all).
      setAlert({
        kind: "notice",
        content:
          mode === "signup" && "email" in res.data
            ? `We emailed a 6-digit code to ${res.data.email}. ${SPAM_HINT}`
            : `We've emailed a code to the email on this account. ${SPAM_HINT}`,
      });
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
      setAlert({ kind: "notice", content: `We emailed a new code. Only the newest code works. ${SPAM_HINT}` });
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
      const input = { mobileNumber: mobile, otpId: code.otpId, otp, password, next, consents: mode === "signup" ? signupPolicies : [] };
      // On success the action logs in and redirects, so nothing comes back.
      const res = mode === "signup" ? await completeSignupAction(input) : await resetPasswordAction(input);
      if (!res || res.ok) return;

      // Another account verified this email first: back to step 1 to use a different one.
      if (res.error.code === "EMAIL_ALREADY_IN_USE") {
        changeNumber();
        return showError(res.error);
      }
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
        <MobileField value={mobileInput} onChange={setMobileInput} error={errors.mobile} autoFocus={!email} />
        {mode === "signup" && (
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={emailInput}
            onChange={setEmailInput}
            error={errors.email}
            autoFocus={!!email}
            hint="We email your 6-digit code here, now and whenever you log in with a code or reset your password."
          />
        )}
        {mode === "signup" && <AgreeBox checked={agreed} onChange={setAgreed} error={errors.agree} />}
        <SubmitButton
          pending={pending}
          disabled={sendLockedIn > 0}
          label={sendLockedIn > 0 ? `Send code in ${sendLockedIn}s` : copy.sendLabel}
          pendingLabel="Sending code…"
        />
      </form>
    );
  }

  return (
    <form onSubmit={handleFinish} noValidate className="space-y-4">
      {/* Lets password managers save the new password against this number. */}
      <input type="text" name="username" autoComplete="username" value={formatMobile(mobile)} readOnly hidden />

      <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-xl bg-surface px-4 py-2 text-sm">
        {mode === "signup" ? (
          <span className="min-w-0 text-muted">
            Check your email <strong className="break-all font-semibold text-ink">{email}</strong>
            <span className="block text-xs">
              for {formatMobile(mobile)}
              {accountType === "STORE_OWNER" && <span className="font-semibold text-brand-deep"> · Shopkeeper account</span>}
            </span>
          </span>
        ) : (
          <span className="text-muted">
            Code for <strong className="font-semibold text-ink">{formatMobile(mobile)}</strong>
            <span className="block text-xs">Sent to the email on this account</span>
          </span>
        )}
        <button type="button" onClick={changeNumber} disabled={pending} className="flex min-h-10 items-center gap-1 font-semibold text-brand-deep hover:underline">
          <ArrowLeft aria-hidden className="size-4" />
          {mode === "signup" ? "Wrong email? Go back" : "Change"}
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
        {mode === "reset" && (
          <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
            Didn&apos;t get it? Codes only go to an email you have verified on your account. If you never added one, you can still{" "}
            <Link href="/login" className="font-semibold text-brand-deep underline underline-offset-2">
              log in with your password
            </Link>{" "}
            and add it in your profile, or{" "}
            <Link href="/contact" className="font-semibold text-brand-deep underline underline-offset-2">
              contact us
            </Link>
            .
          </p>
        )}
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

// Signup: Terms + Privacy must be agreed to before a code is sent (the links open in a new tab).
function AgreeBox({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div>
      <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 text-sm ring-1 transition ${error ? "bg-red-50/60 ring-red-300" : checked ? "bg-fresh-soft/50 ring-fresh/30" : "bg-surface ring-line"}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? "agree-error" : undefined}
          className="mt-0.5 size-5 shrink-0 accent-ink"
        />
        <span className="text-ink/85">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener" className="font-semibold text-brand-deep underline underline-offset-2">
            Terms of Use
          </a>{" "}
          and the{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-brand-deep underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {error && (
        <p id="agree-error" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
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
