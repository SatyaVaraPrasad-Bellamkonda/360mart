"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { getMe } from "@/lib/auth/auth-service";
import { toCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken, saveUser } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./profile-service";
import { profileErrors, profileImageError } from "./validation";

// Profile server actions. Each one works on the logged-in user only (the
// userId comes from the session cookie, not from the browser) and, on
// success, replaces the stored userSession, so the header and useAuth()
// update at once without another /users/me call.

type Result = ActionResult<CurrentUser>;

export async function updateProfileAction(input: { firstName: unknown; lastName: unknown; email: unknown }): Promise<Result> {
  const values = {
    firstName: typeof input?.firstName === "string" ? input.firstName : "",
    lastName: typeof input?.lastName === "string" ? input.lastName : "",
    email: typeof input?.email === "string" ? input.email : "",
  };
  const fieldErrors = profileErrors(values);
  if (Object.keys(fieldErrors).length) return invalid(fieldErrors as Record<string, string>);

  return withSession(async (token, user) => {
    // Always the whole form: an omitted lastName or email would clear it.
    const res = await api.updateUser(token, user.userId, {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim() || null,
      email: values.email.trim() || null,
    });
    if (!res.ok) return fail(res.error);
    const updated = toCurrentUser(res.data);
    return updated ? done(updated, token) : fail(unexpected());
  });
}

export async function uploadProfileImageAction(form: FormData): Promise<Result> {
  const file = form instanceof FormData ? form.get("file") : null;
  if (!(file instanceof File)) return fail({ code: "INVALID_IMAGE", message: "Choose a photo to upload.", fieldErrors: {} });
  const problem = profileImageError(file);
  if (problem) return fail({ code: "INVALID_IMAGE", message: problem, fieldErrors: {} });

  return withSession(async (token, user) => {
    const res = await api.uploadProfileImage(token, user.userId, file);
    if (!res.ok) return fail(res.error);
    return done({ ...user, profileImageUrl: res.data.url }, token);
  });
}

export async function removeProfileImageAction(): Promise<Result> {
  return withSession(async (token, user) => {
    const res = await api.deleteProfileImage(token, user.userId);
    if (!res.ok) return fail(res.error);
    return done({ ...user, profileImageUrl: null }, token);
  });
}

// Picture links expire after ~1 hour. When an <img> fails to load, the avatar
// calls this once to get the user (and a fresh link) from /users/me.
export async function refreshUserAction(): Promise<Result> {
  return withSession(async (token) => {
    const res = await getMe(token);
    if (!res.ok) return fail(res.error);
    const fresh = toCurrentUser(res.data);
    // Only a fresh picture link: nothing changed, so no page needs re-rendering.
    return fresh ? done(fresh, token, { changed: false }) : fail(unexpected());
  });
}

async function withSession(run: (token: string, user: CurrentUser) => Promise<Result>): Promise<Result> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail({ code: "UNAUTHENTICATED", message: "Please login to continue.", fieldErrors: {} });

  const result = await run(token, user);
  // The backend ended this session: forget it here too, the page will send them to login.
  if (!result.ok && result.error.code === "UNAUTHENTICATED") await clearSession();
  return result;
}

async function done(user: CurrentUser, token: string, { changed = true } = {}): Promise<Result> {
  await saveUser(user, token);
  // /account and the admin panel show the name and photo too; don't let the browser reuse an older copy.
  if (changed) {
    revalidatePath("/account", "layout");
    revalidatePath("/admin", "layout");
  }
  return { ok: true, data: user };
}

function invalid(fieldErrors: Record<string, string>): Result {
  return fail({ code: "VALIDATION_FAILED", message: "Some fields are invalid.", fieldErrors });
}

function fail(error: Pick<ApiFailure, "code" | "message" | "fieldErrors">): Result {
  return { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
}

function unexpected() {
  return { code: "UNKNOWN", message: "Something went wrong. Please try again.", fieldErrors: {} };
}
