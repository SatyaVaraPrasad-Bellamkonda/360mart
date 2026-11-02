import "server-only";
import { callApi } from "@/lib/backend/client";
import type { OtpInfo } from "@/lib/auth/api-types";

// Account deletion (Profile → Delete account): what would be deleted and kept,
// an SMS code to confirm it's really the owner, then the deletion itself.

export type DeletionBlockerCode = "OPEN_ORDERS" | "STORE_REGISTERED" | "ADMIN_ACCOUNT";

/** GET /users/me/account-deletion. */
export type DeletionStatus = {
  canDelete: boolean;
  blockers: { code: DeletionBlockerCode | string; message: string }[];
  /** Plain sentences, worded by the backend. */
  deleted: string[];
  kept: string[];
};

export const getDeletionStatus = (token: string) => callApi<DeletionStatus>("/users/me/account-deletion", { sessionToken: token });
export const sendDeletionCode = (token: string) => callApi<OtpInfo>("/users/me/account-deletion/otp", { method: "POST", sessionToken: token });
export const deleteAccount = (token: string, otpId: string, otp: string) =>
  callApi<{ success: boolean; message: string }>("/users/me/account-deletion", { method: "POST", body: { otpId, otp }, sessionToken: token });
