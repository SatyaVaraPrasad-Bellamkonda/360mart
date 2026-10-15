"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useId, useState, type Ref } from "react";
import { PASSWORD_RULES } from "@/lib/auth/validation";

// Form inputs shared by login, signup, forgot password and the profile form. Each one shows its
// own error underneath and links it with aria-describedby for screen readers.

const INPUT = "w-full min-h-12 px-3 text-base text-ink outline-none";
const BOX = "flex overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-brand/40";

function boxBorder(error?: string) {
  return error ? "border-red-500" : "border-line focus-within:border-ink";
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  );
}

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function MobileField({ value, onChange, error, autoFocus, ref, autoComplete = "tel-national" }: FieldProps & { autoComplete?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Mobile number
      </label>
      <div className={`${BOX} ${boxBorder(error)}`}>
        <span className="flex items-center border-r border-line bg-surface px-3 text-sm font-semibold text-muted">+91</span>
        <input
          ref={ref}
          id={id}
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          placeholder="98765 43210"
          maxLength={16}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={INPUT}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function CodeField({ value, onChange, error, autoFocus, ref }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        6-digit code
      </label>
      <div className={`${BOX} ${boxBorder(error)}`}>
        <input
          ref={ref}
          id={id}
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="------"
          value={value}
          // Keep digits only, so a pasted "482 913" still works.
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${INPUT} text-center text-xl font-semibold tracking-[0.5em]`}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

type PasswordProps = FieldProps & {
  label: string;
  autoComplete: "current-password" | "new-password";
  showRules?: boolean;
};

export function PasswordField({ value, onChange, error, autoFocus, ref, label, autoComplete, showRules }: PasswordProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [error && `${id}-error`, showRules && `${id}-rules`].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className={`${BOX} ${boxBorder(error)}`}>
        <input
          ref={ref}
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          maxLength={64}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={INPUT}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex w-12 shrink-0 items-center justify-center text-muted hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {showRules && (
        <ul id={`${id}-rules`} aria-label="Password rules" className="mt-2 space-y-1 text-sm">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <li key={rule.label} className={`flex items-center gap-2 ${met ? "text-fresh" : "text-muted"}`}>
                {met ? <Check aria-hidden className="size-4" /> : <Circle aria-hidden className="size-4" />}
                {rule.label}
                <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type TextProps = FieldProps & {
  label: string;
  name: string;
  type?: "text" | "email";
  autoComplete: string;
  maxLength: number;
  hint?: string;
  optional?: boolean;
};

export function TextField({ value, onChange, error, autoFocus, ref, label, name, type = "text", autoComplete, maxLength, hint, optional }: TextProps) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      <div className={`${BOX} ${boxBorder(error)}`}>
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          inputMode={type === "email" ? "email" : undefined}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={INPUT}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:cursor-wait disabled:bg-ink/60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
