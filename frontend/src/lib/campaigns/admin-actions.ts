"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import { categoryImageError } from "@/lib/catalog/validation";
import { isUuidLike } from "@/lib/inventory/validation";
import * as api from "./service";
import { AUDIENCE_ROLES, ORDER_ACTIVITIES, PLATFORMS, type AudienceCount, type Campaign, type CampaignAudience, type CampaignInput } from "./types";
import { audienceErrors, campaignErrors, scheduleErrors } from "./validation";

// Admin campaign actions: checked here (same rules as the backend), then sent.
// Each write answers the backend's message; the editor re-reads the campaign
// with loadCampaignAction afterwards (one GET), like every other admin screen.

type Written = ActionResult<{ message: string; id?: string }>;

export async function loadCampaignAction(campaignId: unknown): Promise<ActionResult<Campaign>> {
  if (!isUuidLike(campaignId)) return fail(error("CAMPAIGN_NOT_FOUND", "Campaign not found."));
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.getCampaign(token, campaignId);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

export async function createCampaignAction(raw: unknown): Promise<Written> {
  const input = readInput(raw);
  if (!input) return fail(unexpected());
  const problems = campaignErrors(input);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await written(await api.createCampaign(token, input));
  if (res.ok) revalidatePath("/admin/campaigns");
  return res;
}

export async function updateCampaignAction(campaignId: unknown, raw: unknown): Promise<Written> {
  const input = readInput(raw);
  if (!isUuidLike(campaignId) || !input) return fail(unexpected());
  const problems = campaignErrors(input);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await written(await api.updateCampaign(token, campaignId, input));
  if (res.ok) revalidatePath("/admin/campaigns");
  return res;
}

/** The live count beside the audience builder (nothing saved). */
export async function previewAudienceAction(raw: unknown): Promise<ActionResult<AudienceCount>> {
  const audience = readAudience(raw);
  if (!audience) return fail(unexpected());
  const problems = audienceErrors(audience);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Fix the audience to see how many people it reaches.", fieldErrors: problems });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.previewAudience(token, audience);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

/** Upload the campaign picture (JPEG/PNG, ≤ 2 MB); answers with its id. */
export async function uploadCampaignImageAction(form: FormData): Promise<ActionResult<{ imageId: string }>> {
  if (!(form instanceof FormData)) return fail(unexpected());
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) return fail(unexpected());
  const problem = categoryImageError(image);
  if (problem) return fail(error("INVALID_IMAGE", problem));
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.uploadCampaignImage(token, image);
  if (!res.ok) {
    if (res.error.status === 413) return fail(error("IMAGE_TOO_LARGE", "The image must be at most 2 MB."));
    if (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE") return fail(error(res.error.code, "Picture storage is busy right now. Please try again in a minute."));
    return fail(await toError(res.error));
  }
  if (!res.data.id) return fail(unexpected());
  return { ok: true, data: { imageId: res.data.id } };
}

/** Send now (sendAt null) or at a time; expiresAt is the saved offer end, checked against the send time. */
export async function scheduleCampaignAction(campaignId: unknown, sendAt: unknown, expiresAt: unknown): Promise<Written> {
  if (!isUuidLike(campaignId)) return fail(unexpected());
  const at = typeof sendAt === "string" && !Number.isNaN(Date.parse(sendAt)) ? new Date(sendAt).toISOString() : null;
  if (sendAt !== null && !at) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: { sendAt: "Pick a date and time" } });
  const problems = scheduleErrors(at, typeof expiresAt === "string" ? expiresAt : null);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return step(token, campaignId, "schedule", at ? { sendAt: at } : {});
}

export async function campaignStepAction(campaignId: unknown, which: unknown): Promise<Written> {
  const steps = ["test", "unschedule", "cancel", "duplicate"] as const;
  const s = steps.find((x) => x === which);
  if (!isUuidLike(campaignId) || !s) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return step(token, campaignId, s);
}

export async function deleteCampaignAction(campaignId: unknown): Promise<Written> {
  if (!isUuidLike(campaignId)) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await written(await api.deleteCampaign(token, campaignId));
  if (res.ok) revalidatePath("/admin/campaigns");
  return res;
}

// ---- helpers ----

async function step(token: string, campaignId: string, which: api.CampaignStep, body?: unknown): Promise<Written> {
  const res = await written(await api.campaignStep(token, campaignId, which, body));
  if (res.ok && which !== "test") revalidatePath("/admin/campaigns");
  return res;
}

async function adminToken(): Promise<string | ActionError> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return error("FORBIDDEN", "Only admins can manage campaigns.");
  return token;
}

async function written(res: { ok: true; data: { message: string; id?: string } } | { ok: false; error: ApiFailure }): Promise<Written> {
  return res.ok ? { ok: true, data: { message: res.data.message, id: res.data.id } } : fail(await toError(res.error));
}

async function toError(failure: ApiFailure): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
  if (failure.code === "FORBIDDEN") return error("FORBIDDEN", "Only admins can manage campaigns.");
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
}

function fail(e: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error: e };
}

function error(code: string, message: string): ActionError {
  return { code, message, fieldErrors: {} };
}

function unexpected() {
  return error("UNKNOWN", "Something went wrong. Please try again.");
}

// The browser's input is only trusted after these readers rebuild it.

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()) : []);
const days = (v: unknown) => (typeof v === "number" ? v : v === null ? NaN : undefined);

function readAudience(raw: unknown): CampaignAudience | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const out: CampaignAudience = {
    roles: strings(a.roles).filter((r): r is (typeof AUDIENCE_ROLES)[number] => (AUDIENCE_ROLES as readonly string[]).includes(r)),
    orderActivity: ORDER_ACTIVITIES.find((x) => x === a.orderActivity) ?? "ANY",
  };
  const platforms = strings(a.platforms).filter((p): p is (typeof PLATFORMS)[number] => (PLATFORMS as readonly string[]).includes(p));
  if (platforms.length) out.platforms = platforms;
  const cities = strings(a.cities);
  if (cities.length) out.cities = cities;
  const pincodes = strings(a.pincodes);
  if (pincodes.length) out.pincodes = pincodes;
  if (a.activityDays !== undefined) out.activityDays = days(a.activityDays);
  const ids = Array.isArray(a.boughtCategoryIds) ? a.boughtCategoryIds.filter((x): x is number => Number.isInteger(x) && (x as number) > 0) : [];
  if (ids.length) out.boughtCategoryIds = ids;
  if (a.joinedWithinDays !== undefined) out.joinedWithinDays = days(a.joinedWithinDays);
  return out;
}

function readInput(raw: unknown): CampaignInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const audience = readAudience(r.audience);
  if (!audience) return null;
  const imageId = r.imageId === null || r.imageId === undefined ? null : isUuidLike(r.imageId) ? r.imageId : undefined;
  if (imageId === undefined) return null;
  const expiresAt = r.expiresAt === null || r.expiresAt === undefined ? null : typeof r.expiresAt === "string" && !Number.isNaN(Date.parse(r.expiresAt)) ? new Date(r.expiresAt).toISOString() : undefined;
  if (expiresAt === undefined) return null;
  return { name: str(r.name), title: str(r.title), body: str(r.body), imageId, link: str(r.link) || null, expiresAt, audience };
}
