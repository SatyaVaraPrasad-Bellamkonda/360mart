"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import type { UserResponse } from "@/lib/auth/api-types";
import { toCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { saveUser } from "@/lib/auth/session";
import { callApi } from "@/lib/backend/client";
import { failWith, invalid, LOGIN_NEEDED, sessionToken } from "@/lib/orders/action-helpers";
import { isVehicleType, normalizeVehicleNumber, vehicleNumberError } from "./types";

// "Deliver with 360mart": a customer becomes a delivery partner (same account,
// they keep shopping). A server action because the role changes, so the stored
// userSession is replaced right away (the header and /rider see the new role).
export async function becomeRiderAction(input: { vehicleType: unknown; vehicleNumber: unknown }): Promise<ActionResult<CurrentUser>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const errors: Record<string, string> = {};
  if (!isVehicleType(input?.vehicleType)) errors.vehicleType = "Choose the vehicle you deliver with";
  const numberProblem = vehicleNumberError(input?.vehicleNumber);
  if (numberProblem) errors.vehicleNumber = numberProblem;
  if (Object.keys(errors).length) return invalid("Please fix the highlighted fields.", errors);

  const res = await callApi<UserResponse>("/users/me/delivery-partner", {
    method: "POST",
    body: { vehicleType: input.vehicleType, vehicleNumber: normalizeVehicleNumber(input.vehicleNumber) },
    sessionToken: token,
  });
  if (!res.ok) return failWith(res.error);
  const user = toCurrentUser(res.data);
  if (!user) return failWith({ code: "UNKNOWN", message: "Something went wrong. Please try again.", fieldErrors: {} });
  await saveUser(user, token);
  revalidatePath("/account", "layout");
  revalidatePath("/rider", "layout");
  return { ok: true, data: user };
}

/** After a rider change made from the browser: the /rider pages re-render on their next visit. No backend call. */
export async function refreshRiderPagesAction(): Promise<void> {
  revalidatePath("/rider", "layout");
}
