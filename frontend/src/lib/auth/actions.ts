"use server";

import { redirect } from "next/navigation";
import type { ApiFailure } from "@/lib/backend/client";
import type { AccountType, OtpInfo } from "./api-types";
import * as api from "./auth-service";
import { ROLE_FROM_API, safeNextPath, type Role } from "./roles";
import { toCurrentUser } from "./current-user";
import { clearSession, getSessionToken, readSessionCookie, saveSession, saveUser } from "./session";
import { isUuid, loginPasswordError, newPasswordError, normalizeMobile, otpError } from "./validation";

// Server actions = functions the forms call that run on our server (like an
// AngularJS $http call, but Next.js creates the endpoint and blocks calls from
// other websites). Every argument comes from the browser, so it is re-checked.

export type ActionError = Pick<ApiFailure, "code" | "message" | "fieldErrors">;
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: ActionError };

type CodeAndPassword = { mobileNumber: unknown; otpId: unknown; otp: unknown; password: unknown; next?: unknown };

// Step 1 of signup: create the account (or resume an unfinished one) and text a code.
// A shopkeeper account (STORE_OWNER) can shop too, and also register a store.
export async function startSignupAction(mobileInput: unknown, accountTypeInput?: unknown): Promise<ActionResult<{ mobileNumber: string; otp: OtpInfo }>> {
  const mobile = normalizeMobile(mobileInput);
  if (!mobile) return invalid({ mobileNumber: "Enter a valid 10-digit Indian mobile number" });
  const accountType: AccountType = accountTypeInput === "STORE_OWNER" ? "STORE_OWNER" : "CUSTOMER";

  const res = await api.signup(mobile, accountType);
  if (!res.ok) return fail(res.error);
  return { ok: true, data: { mobileNumber: res.data.mobileNumber, otp: res.data.otp } };
}

// "Resend code" on signup, and step 1 of forgot password.
export async function sendCodeAction(mobileInput: unknown, purpose: unknown): Promise<ActionResult<OtpInfo>> {
  const mobile = normalizeMobile(mobileInput);
  if (!mobile) return invalid({ mobileNumber: "Enter a valid 10-digit Indian mobile number" });
  if (purpose !== "SIGNUP" && purpose !== "PASSWORD_RESET") return invalid({});

  const res = await api.sendOtp(mobile, purpose);
  return res.ok ? { ok: true, data: res.data } : fail(res.error);
}

// Step 2 of signup: the code proves the number is theirs, then the password is saved.
export async function completeSignupAction(input: CodeAndPassword): Promise<ActionResult> {
  const checked = checkCodeAndPassword(input);
  if (!checked.ok) return checked;
  const { mobileNumber, otpId, otp, password } = checked.data;

  const res = await api.setPassword({ mobileNumber, otpId, otp, password });
  if (!res.ok) return fail(res.error);
  // Setting a password doesn't log in; do it now so the user needn't retype anything.
  return loginAndRedirect(mobileNumber, password, input.next, "password-set");
}

export async function resetPasswordAction(input: CodeAndPassword): Promise<ActionResult> {
  const checked = checkCodeAndPassword(input);
  if (!checked.ok) return checked;
  const { mobileNumber, otpId, otp, password } = checked.data;

  const res = await api.resetPassword({ mobileNumber, otpId, otp, newPassword: password });
  if (!res.ok) return fail(res.error);
  // The reset logged this account out everywhere; this cookie is dead too.
  await clearSession();
  return loginAndRedirect(mobileNumber, password, input.next, "password-reset");
}

// `area` = which login page was used. /login is the one login for customers and
// shopkeepers (the backend's answer says which role the number has) and sends
// everyone to their own home; the admin panel's login only accepts admins.
export async function loginAction(input: { mobileNumber: unknown; password: unknown; area: unknown; next?: unknown }): Promise<ActionResult> {
  const mobile = normalizeMobile(input.mobileNumber);
  const password = typeof input.password === "string" ? input.password : "";
  const fieldErrors: Record<string, string> = {};
  if (!mobile) fieldErrors.mobileNumber = "Enter a valid 10-digit Indian mobile number";
  const passwordProblem = loginPasswordError(password);
  if (passwordProblem) fieldErrors.password = passwordProblem;
  if (!mobile || passwordProblem) return invalid(fieldErrors);

  const area: Role = input.area === "admin" ? "admin" : "customer";
  const res = await api.login(mobile, password, await getSessionToken());
  if (!res.ok) return fail(res.error);

  const session = readSessionCookie(res.setCookies);
  const role = ROLE_FROM_API[res.data?.role];
  if (!session || !role) return fail({ code: "UNKNOWN", message: "Something went wrong. Please try again.", fieldErrors: {} });

  if (area !== "customer" && role !== area) {
    // Right password, wrong door: end the session that was just created.
    await api.logout(session.token);
    await clearSession();
    return fail({ code: "WRONG_AREA", message: "This account doesn't have admin access.", fieldErrors: {} });
  }

  const user = await startSession(session);
  redirect(safeNextPath(input.next, user?.role ?? role));
}

export async function logoutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token) await api.logout(token); // revokes it in the database, not just in this browser
  await clearSession();
  redirect("/");
}

async function loginAndRedirect(mobileNumber: string, password: string, next: unknown, status: string): Promise<ActionResult> {
  const res = await api.login(mobileNumber, password);
  const session = res.ok ? readSessionCookie(res.setCookies) : null;
  const role = res.ok ? ROLE_FROM_API[res.data?.role] : undefined;
  // The password is saved either way; if the automatic login fails (e.g. rate limit), ask them to log in.
  if (!session || !role) redirect(`/login?status=${status}`);

  const user = await startSession(session);
  redirect(safeNextPath(next, user?.role ?? role));
}

// Logged in: keep the session cookie, then load the user ONCE from /users/me
// (the single source of user details, e.g. future profile fields) and store
// it as userSession. Pages then read it without calling the backend; proxy.ts
// refreshes it every 15 minutes. If /users/me fails now, the login still
// stands and the next page load fetches it.
async function startSession(session: { token: string; maxAge: number }) {
  await saveSession(session);
  const me = await api.getMe(session.token);
  const user = me.ok ? toCurrentUser(me.data) : null;
  if (user) await saveUser(user, session.token);
  return user;
}

function checkCodeAndPassword(input: CodeAndPassword): ActionResult<{ mobileNumber: string; otpId: string; otp: string; password: string }> {
  const mobileNumber = normalizeMobile(input?.mobileNumber);
  const otp = typeof input?.otp === "string" ? input.otp : "";
  const password = typeof input?.password === "string" ? input.password : "";
  const fieldErrors: Record<string, string> = {};

  const otpProblem = otpError(otp);
  if (otpProblem) fieldErrors.otp = otpProblem;
  const passwordProblem = newPasswordError(password);
  if (passwordProblem) fieldErrors.password = passwordProblem;
  if (!mobileNumber || !isUuid(input?.otpId)) {
    return fail({ code: "SESSION_EXPIRED", message: "This page has expired. Please start again.", fieldErrors });
  }
  if (otpProblem || passwordProblem) return invalid(fieldErrors);
  return { ok: true, data: { mobileNumber, otpId: input.otpId as string, otp, password } };
}

function invalid(fieldErrors: Record<string, string>): { ok: false; error: ActionError } {
  return fail({ code: "VALIDATION_FAILED", message: "Some fields are invalid.", fieldErrors });
}

function fail(error: ActionError): { ok: false; error: ActionError } {
  // Only these three fields go back to the browser (no status, no raw backend body).
  return { ok: false, error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } };
}
