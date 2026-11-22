import "server-only";
import type { OtpInfo, ProfileImageResponse, UserResponse } from "@/lib/auth/api-types";
import { callApi } from "@/lib/backend/client";

// One function per profile endpoint. `userId` always comes from the server-side
// session (never from the browser), so the backend's 403 "not your profile"
// can't be triggered by a crafted request.

const base = (userId: string) => `/users/${encodeURIComponent(userId)}`;

// The email can't change here any more (it needs a code): it is left out, which keeps it.
export function updateUser(token: string, userId: string, body: { firstName: string; lastName: string | null }) {
  return callApi<UserResponse>(`${base(userId)}/updateUser`, { method: "PUT", body, sessionToken: token });
}

export function uploadProfileImage(token: string, userId: string, file: File) {
  const form = new FormData();
  form.append("file", file, file.name || "profile-image");
  return callApi<ProfileImageResponse>(`${base(userId)}/profile-image`, { method: "PUT", body: form, sessionToken: token });
}

export function deleteProfileImage(token: string, userId: string) {
  return callApi<null>(`${base(userId)}/profile-image`, { method: "DELETE", sessionToken: token });
}

// Add or change the email (any signed-in user): a code goes to the new address
// (the current password proves it's the owner), and only once that code is
// entered does it become the account's email. Until then the old one stays.
export function requestEmailCode(token: string, email: string, currentPassword: string) {
  return callApi<OtpInfo>("/users/me/email", { method: "POST", body: { email, currentPassword }, sessionToken: token });
}

export function verifyEmail(token: string, otpId: string, otp: string) {
  return callApi<{ success: boolean; message: string }>("/users/me/email/verify", { method: "POST", body: { otpId, otp }, sessionToken: token });
}
