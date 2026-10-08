"use server";

import { redirect } from "next/navigation";
import { adminLogin, sendOtp, verifyOtp } from "./auth-service";
import { safeNextPath } from "./roles";
import { createSession, deleteSession } from "./session";

export type OtpFormState = {
  step: "phone" | "otp";
  phone: string;
  error?: string;
  notice?: string;
  sentAt?: number; // when the last OTP was sent, for the resend timer
};

export type AdminFormState = { error?: string; email?: string };

// Accepts "98765 43210", "+91 9876543210", "09876543210" → "9876543210".
function normalizePhone(raw: FormDataEntryValue | null): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// Two-step phone + OTP login, shared by customers and shopkeepers.
// The form sends intent=send (request OTP), verify (check OTP) or change (edit number).
export async function otpLoginAction(
  role: "customer" | "seller",
  prev: OtpFormState,
  formData: FormData,
): Promise<OtpFormState> {
  const intent = formData.get("intent");

  if (intent === "change") return { step: "phone", phone: prev.phone };

  const phone = normalizePhone(formData.get("phone"));
  if (!phone) return { step: "phone", phone: String(formData.get("phone") ?? ""), error: "Enter a valid 10-digit mobile number." };

  if (intent === "send") {
    const result = await sendOtp(phone, role);
    if (!result.ok) return { step: "phone", phone, error: result.error };
    return { step: "otp", phone, notice: `We sent a 6-digit OTP to +91 ${phone}.`, sentAt: Date.now() };
  }

  const otp = String(formData.get("otp") ?? "").trim();
  if (!/^\d{6}$/.test(otp)) return { step: "otp", phone, sentAt: prev.sentAt, error: "Enter the 6-digit OTP." };

  const result = await verifyOtp(phone, otp, role);
  if (!result.ok) return { step: "otp", phone, sentAt: prev.sentAt, error: result.error };

  await createSession(result.value);
  redirect(safeNextPath(String(formData.get("next") ?? ""), role));
}

export async function adminLoginAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { email, error: "Enter your email and password." };

  const result = await adminLogin(email, password);
  if (!result.ok) return { email, error: result.error };

  await createSession(result.value);
  redirect(safeNextPath(String(formData.get("next") ?? ""), "admin"));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/");
}
