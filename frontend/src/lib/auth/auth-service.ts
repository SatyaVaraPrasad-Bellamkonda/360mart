import "server-only";
import { callApi } from "@/lib/backend/client";
import type { MessageResponse, OtpInfo, OtpPurpose, SignupResponse, UserResponse } from "./api-types";

// One function per Spring Boot auth endpoint. Inputs are already validated by
// the caller (actions.ts); the backend validates them again.

export function signup(mobileNumber: string) {
  return callApi<SignupResponse>("/auth/signup", { method: "POST", body: { mobileNumber } });
}

export function sendOtp(mobileNumber: string, purpose: OtpPurpose) {
  return callApi<OtpInfo>("/auth/otp/send", { method: "POST", body: { mobileNumber, purpose } });
}

export function setPassword(body: { mobileNumber: string; otpId: string; otp: string; password: string }) {
  return callApi<MessageResponse>("/auth/set-password", { method: "POST", body });
}

export function resetPassword(body: { mobileNumber: string; otpId: string; otp: string; newPassword: string }) {
  return callApi<MessageResponse>("/auth/password/reset", { method: "POST", body });
}

// Sending the current session (if any) lets the backend replace it instead of
// leaving an old one alive.
export function login(mobileNumber: string, password: string, currentToken?: string) {
  return callApi<UserResponse>("/auth/login", { method: "POST", body: { mobileNumber, password }, sessionToken: currentToken });
}

export function logout(token: string) {
  return callApi<null>("/auth/logout", { method: "POST", sessionToken: token });
}

export function getMe(token: string) {
  return callApi<UserResponse>("/users/me", { sessionToken: token });
}
