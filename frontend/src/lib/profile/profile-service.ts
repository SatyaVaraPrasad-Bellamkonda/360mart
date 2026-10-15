import "server-only";
import type { ProfileImageResponse, UserResponse } from "@/lib/auth/api-types";
import { callApi } from "@/lib/backend/client";

// One function per profile endpoint. `userId` always comes from the server-side
// session (never from the browser), so the backend's 403 "not your profile"
// can't be triggered by a crafted request.

const base = (userId: string) => `/users/${encodeURIComponent(userId)}`;

export function updateUser(token: string, userId: string, body: { firstName: string; lastName: string | null; email: string | null }) {
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
