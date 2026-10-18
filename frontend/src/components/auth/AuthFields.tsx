"use client";

import { Check, ChevronDown, Circle, Eye, EyeOff } from "lucide-react";
import { Fragment, useId, useState, type Ref } from "react";
import { PASSWORD_RULES } from "@/lib/auth/validation";

// Form inputs shared by login, signup, forgot password, the profile and the address forms. Each one shows its
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

type MobileProps = FieldProps & { autoComplete?: string; label?: string; name?: string; optional?: boolean; hint?: string };

export function MobileField({ value, onChange, error, autoFocus, ref, autoComplete = "tel-national", label = "Mobile number", name = "mobile", optional, hint }: MobileProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} optional={optional} />
      <div className={`${BOX} ${boxBorder(error)}`}>
        <span className="flex items-center border-r border-line bg-surface px-3 text-sm font-semibold text-muted">+91</span>
        <input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          placeholder="98765 43210"
          maxLength={16}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={INPUT}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <FieldHint id={`${id}-hint`} hint={hint} error={error} />
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
  const describedByIds = [error && `${id}-error`, showRules && `${id}-rules`].filter(Boolean).join(" ") || undefined;

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
          aria-describedby={describedByIds}
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
  type?: "text" | "email" | "date";
  inputMode?: "text" | "email" | "numeric" | "decimal";
  /** Earliest date (YYYY-MM-DD) for type="date". */
  min?: string;
  autoComplete: string;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  /** Fixed text before the input, like "+91" on the mobile field. */
  prefix?: string;
};

export function TextField({ value, onChange, error, autoFocus, ref, label, name, type = "text", inputMode, autoComplete, maxLength, placeholder, hint, optional, prefix, min }: TextProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} optional={optional} />
      <div className={`${BOX} ${boxBorder(error)}`}>
        {prefix && (
          <span className="flex min-w-0 max-w-[50%] shrink-0 items-center border-r border-line bg-surface px-3 text-sm font-semibold text-muted">
            <span className="truncate">{prefix}</span>
          </span>
        )}
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          inputMode={inputMode ?? (type === "email" ? "email" : undefined)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          min={min}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={`${INPUT} min-w-0 bg-transparent placeholder:text-muted/70`}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <FieldHint id={`${id}-hint`} hint={hint} error={error} />
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

type SelectProps = Omit<FieldProps, "ref"> & {
  label: string;
  name: string;
  autoComplete: string;
  /** Shown (and not choosable) while nothing is picked; leave out when there is always a value. */
  placeholder?: string;
  /** A group with an empty label is shown without a heading. */
  groups: { label: string; options: readonly SelectOption[] }[];
  disabled?: boolean;
  hint?: string;
};

/** A native dropdown: on phones it opens the system picker; on desktop typing "tel…" jumps to Telangana. */
export function SelectField({ value, onChange, error, label, name, autoComplete, placeholder, groups, disabled, hint }: SelectProps) {
  const id = useId();
  const options = (list: readonly SelectOption[]) =>
    list.map((option) => {
      const { value: v, label: text } = typeof option === "string" ? { value: option, label: option } : option;
      return (
        <option key={v} value={v} className="text-ink">
          {text}
        </option>
      );
    });
  return (
    <div>
      <FieldLabel id={id} label={label} />
      <div className={`${BOX} ${boxBorder(error)} relative ${disabled ? "bg-surface" : ""}`}>
        <select
          id={id}
          name={name}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={`${INPUT} appearance-none bg-transparent pr-10 disabled:cursor-not-allowed ${value || placeholder === undefined ? "" : "text-muted"}`}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {groups.map((group, i) =>
            group.label ? (
              <optgroup key={group.label} label={group.label}>
                {options(group.options)}
              </optgroup>
            ) : (
              <Fragment key={`group-${i}`}>{options(group.options)}</Fragment>
            ),
          )}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <FieldHint id={`${id}-hint`} hint={hint} error={error} />
    </div>
  );
}

type TextAreaProps = Omit<FieldProps, "ref"> & { label: string; name: string; maxLength: number; placeholder?: string; hint?: string; optional?: boolean };

export function TextAreaField({ value, onChange, error, label, name, maxLength, placeholder, hint, optional }: TextAreaProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} optional={optional} />
      <div className={`${BOX} ${boxBorder(error)}`}>
        <textarea
          id={id}
          name={name}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className="min-h-24 w-full resize-y px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70"
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <div className="mt-1.5 flex justify-between gap-3 text-sm text-muted">
        <span id={`${id}-hint`}>{!error && hint}</span>
        <span aria-hidden className="shrink-0 tabular-nums">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

function FieldLabel({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
      {label}
      {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
    </label>
  );
}

function FieldHint({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (!hint || error) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {hint}
    </p>
  );
}

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  return [error && `${id}-error`, hint && !error && `${id}-hint`].filter(Boolean).join(" ") || undefined;
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
