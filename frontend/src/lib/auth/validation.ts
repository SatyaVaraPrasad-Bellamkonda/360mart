// Input rules used twice: by the forms for instant feedback, and by the server
// actions because anything from the browser can be forged. They mirror the
// Spring Boot validators (same messages), which check everything a third time.

// Optional +91 / 91 / 0, then 10 digits starting with 6–9 (same as MobileNumberUtil).
const INDIAN_MOBILE = /^(?:\+91|91|0)?([6-9]\d{9})$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "98765 43210", "+91-98765-43210", "09876543210" → "9876543210", else null. */
export function normalizeMobile(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const match = INDIAN_MOBILE.exec(input.trim().replace(/[\s-]/g, ""));
  return match ? match[1] : null;
}

export function mobileError(input: string): string | undefined {
  if (!input.trim()) return "Mobile number is required";
  return normalizeMobile(input) ? undefined : "Enter a valid 10-digit Indian mobile number";
}

/** "+919876543210" or "9876543210" → "+91 98765 43210" */
export function formatMobile(number: string): string {
  const digits = number.replace(/\D/g, "").slice(-10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: "8 to 64 characters", test: (p) => p.length >= 8 && p.length <= 64 },
  { label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

export function newPasswordError(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 8 || password.length > 64) return "Password must be 8 to 64 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain a letter and a number";
  return undefined;
}

export function loginPasswordError(password: string): string | undefined {
  if (!password) return "Password is required";
  return password.length > 64 ? "Password must be at most 64 characters" : undefined;
}

export function otpError(code: string): string | undefined {
  if (!code) return "Enter the code we sent you";
  return /^\d{6}$/.test(code) ? undefined : "Enter the 6-digit code";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
