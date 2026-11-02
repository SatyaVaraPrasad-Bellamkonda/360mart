"use server";

import type { ActionResult } from "@/lib/auth/actions";
import type { OtpInfo } from "@/lib/auth/api-types";
import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth/session";
import { isUuid, otpError } from "@/lib/auth/validation";
import { failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "@/lib/orders/action-helpers";
import * as api from "./deletion";

// The last two steps of deleting an account: text a code to the account's own
// number, then delete with that code. The user is always the session's owner
// (nothing about who to delete comes from the browser).

export async function sendDeletionCodeAction(): Promise<ActionResult<OtpInfo>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.sendDeletionCode(token);
  return res.ok ? ok(res.data) : failWith(res.error);
}

export async function deleteAccountAction(input: { otpId: unknown; otp: unknown }): Promise<ActionResult<{ message: string }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuid(input?.otpId)) return invalid("This code has expired. Send a new one.", { otp: "Send a new code" });
  const otp = typeof input?.otp === "string" ? input.otp.trim() : "";
  const problem = otpError(otp);
  if (problem) return invalid(problem, { otp: problem });

  const res = await api.deleteAccount(token, input.otpId, otp);
  if (!res.ok) return failWith(res.error);
  // The backend's Set-Cookie answers our server, not the browser: end our copy of the session here.
  // Changing cookies re-renders the page, and /account needs a login, so go straight to the
  // public goodbye page (which also wipes what the browser kept). The router cache is dropped too.
  await clearSession();
  redirect("/goodbye");
}
