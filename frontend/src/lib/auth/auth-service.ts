import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { MOCK_OTP, MOCK_SELLERS } from "./mock-users";
import type { Role } from "./roles";
import { isSessionConfigured, type SessionPayload } from "./token";

// The login "backend". Today it is a local mock; later each function becomes
// a call to the Spring Boot API (e.g. POST /api/auth/otp/send), which will
// send real SMS OTPs, check them, rate-limit attempts and look up users.

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: string };

const UNAVAILABLE = "Login isn't available yet. Please check back soon.";

export function isLoginAvailable(): boolean {
  return process.env.AUTH_MOCK === "true" && isSessionConfigured();
}

export function isMockMode(): boolean {
  return process.env.AUTH_MOCK === "true";
}

export async function sendOtp(phone: string, role: Exclude<Role, "admin">): Promise<AuthResult<null>> {
  if (!isLoginAvailable()) return { ok: false, error: UNAVAILABLE };
  if (role === "seller" && !MOCK_SELLERS.some((s) => s.phone === phone)) {
    return { ok: false, error: "This number isn't registered as a 360mart store." };
  }
  // Mock: no SMS is sent; the OTP is always MOCK_OTP.
  return { ok: true, value: null };
}

export async function verifyOtp(
  phone: string,
  otp: string,
  role: Exclude<Role, "admin">,
): Promise<AuthResult<SessionPayload>> {
  if (!isLoginAvailable()) return { ok: false, error: UNAVAILABLE };
  if (otp !== MOCK_OTP) return { ok: false, error: "That OTP is incorrect. Please try again." };

  const masked = `+91 ••••••${phone.slice(-4)}`;
  if (role === "seller") {
    const seller = MOCK_SELLERS.find((s) => s.phone === phone);
    if (!seller) return { ok: false, error: "This number isn't registered as a 360mart store." };
    return { ok: true, value: { userId: `seller:${seller.storeSlug}`, role, displayName: seller.storeName } };
  }
  return { ok: true, value: { userId: `customer:${hashId(phone)}`, role, displayName: masked } };
}

export async function adminLogin(email: string, password: string): Promise<AuthResult<SessionPayload>> {
  if (!isLoginAvailable()) return { ok: false, error: UNAVAILABLE };
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const valid =
    !!adminEmail && !!adminPassword && email.toLowerCase() === adminEmail && sameText(password, adminPassword);
  if (!valid) return { ok: false, error: "Invalid email or password." };
  return { ok: true, value: { userId: `admin:${hashId(adminEmail)}`, role: "admin", displayName: "Admin" } };
}

// Stable id that doesn't expose the phone number or email inside the cookie.
function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// Constant-time comparison so response timing doesn't leak the password.
function sameText(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
