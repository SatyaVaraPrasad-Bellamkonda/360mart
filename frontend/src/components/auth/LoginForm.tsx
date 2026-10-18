"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { loginAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/auth/roles";
import { loginPasswordError, mobileError } from "@/lib/auth/validation";
import { FormMessage } from "./AuthCard";
import { MobileField, PasswordField, SubmitButton } from "./AuthFields";

// Shown after signup / reset when the automatic login didn't go through.
const STATUS_NOTICE: Record<string, string> = {
  "password-set": "Your account is ready. Please log in with your new password.",
  "password-reset": "Your password was changed. Please log in with the new one.",
};

// Mobile number + password. `area` is the login page it sits on: "customer" =
// the shared login for customers and shopkeepers, "admin" = the panel's login,
// where the server refuses other roles.
export function LoginForm({ area }: { area: Role }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const notice = STATUS_NOTICE[params.get("status") ?? ""];
  const [pending, startTransition] = useTransition();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [error, setError] = useState<ReactNode>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = { mobile: mobileError(mobile), password: loginPasswordError(password) };
    setErrors(found);
    if (found.mobile || found.password) return;

    setError(null);
    startTransition(async () => {
      // On success the action sets the session cookie and redirects.
      const res = await loginAction({ mobileNumber: mobile, password, area, next });
      if (!res || res.ok) return;

      const { code, message, fieldErrors } = res.error;
      setErrors({ mobile: fieldErrors.mobileNumber, password: fieldErrors.password });
      if (code === "VALIDATION_FAILED") return;

      setError(
        code === "ACCOUNT_LOCKED" ? (
          <>
            {message}{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              Reset your password
            </Link>
          </>
        ) : (
          message
        ),
      );
      if (code === "INVALID_CREDENTIALS") {
        setPassword("");
        passwordRef.current?.focus();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormMessage error={error ?? undefined} notice={notice} />
      <MobileField value={mobile} onChange={setMobile} error={errors.mobile} autoComplete="username" autoFocus />
      <div>
        <PasswordField
          ref={passwordRef}
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <div className="mt-1 text-right">
          <Link href="/forgot-password" className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-deep hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
      <SubmitButton pending={pending} label="Log in" pendingLabel="Logging in…" />
    </form>
  );
}
