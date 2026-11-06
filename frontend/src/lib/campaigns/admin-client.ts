import { failed, failure, invalid, refreshPages, result, unexpected, uploadFailed } from "@/lib/admin/refresh";
import { api, type ApiResult } from "@/lib/api-client";
import type { ActionResult } from "@/lib/auth/actions";
import { categoryImageError } from "@/lib/catalog/validation";
import { isUuidLike } from "@/lib/inventory/validation";
import { AUDIENCE_ROLES, ORDER_ACTIVITIES, PLATFORMS, TIMER_STYLES, TIMER_THEMES, type AudienceCount, type Campaign, type CampaignAudience, type CampaignInput, type CampaignWrite, type TimerStyle, type TimerTheme } from "./types";
import { audienceErrors, campaignErrors, scheduleErrors } from "./validation";

// The admin campaign editor's calls, straight from the browser to
// /api/v1/admin/campaigns/... (each shows in DevTools → Network). Checked here
// with the backend's rules first; the backend checks them again, and that the
// caller is an admin. Each write answers the backend's message; the editor
// re-reads the campaign with loadCampaign afterwards (one GET). Writes that
// change the list mark our cached /admin/campaigns page stale.

type Written = ActionResult<{ message: string; id?: string }>;
type Step = "test" | "schedule" | "unschedule" | "cancel" | "duplicate";

const FORBIDDEN = "Only admins can manage campaigns.";
const path = (campaignId: string) => `/admin/campaigns/${encodeURIComponent(campaignId)}`;

export async function loadCampaign(campaignId: unknown): Promise<ActionResult<Campaign>> {
  if (!isUuidLike(campaignId)) return failure("CAMPAIGN_NOT_FOUND", "Campaign not found.");
  return result(await api<Campaign>(path(campaignId)), FORBIDDEN);
}

export async function createCampaign(raw: unknown): Promise<Written> {
  const input = readInput(raw);
  if (!input) return unexpected();
  const problems = campaignErrors(input);
  if (Object.keys(problems).length) return invalid(problems);
  return changed(await api<CampaignWrite>("/admin/campaigns", { method: "POST", body: input }));
}

export async function updateCampaign(campaignId: unknown, raw: unknown): Promise<Written> {
  const input = readInput(raw);
  if (!isUuidLike(campaignId) || !input) return unexpected();
  const problems = campaignErrors(input);
  if (Object.keys(problems).length) return invalid(problems);
  return changed(await api<CampaignWrite>(path(campaignId), { method: "PUT", body: input }));
}

/** The live count beside the audience builder (nothing saved). */
export async function previewAudience(raw: unknown, signal?: AbortSignal): Promise<ActionResult<AudienceCount>> {
  const audience = readAudience(raw);
  if (!audience) return unexpected();
  const problems = audienceErrors(audience);
  if (Object.keys(problems).length) return invalid(problems, "Fix the audience to see how many people it reaches.");
  return result(await api<AudienceCount>("/admin/campaigns/audience-preview", { method: "POST", body: audience, signal }), FORBIDDEN);
}

/** Upload the campaign picture (JPEG/PNG, ≤ 2 MB): multipart "image". Answers with its id. */
export async function uploadCampaignImage(form: FormData): Promise<ActionResult<{ imageId: string }>> {
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) return unexpected();
  const problem = categoryImageError(image);
  if (problem) return failure("INVALID_IMAGE", problem);
  const body = new FormData();
  body.append("image", image, image.name || "campaign-image");
  const res = await api<CampaignWrite>("/admin/campaigns/images", { method: "POST", body });
  if (!res.ok) return uploadFailed(res.error, FORBIDDEN);
  if (!res.data?.id) return unexpected();
  return { ok: true, data: { imageId: res.data.id } };
}

/** Send now (sendAt null) or at a time; expiresAt is the saved offer end, checked against the send time (within 24 h with a countdown). */
export async function scheduleCampaign(campaignId: unknown, sendAt: unknown, expiresAt: unknown, timer?: unknown): Promise<Written> {
  if (!isUuidLike(campaignId)) return unexpected();
  const at = typeof sendAt === "string" && !Number.isNaN(Date.parse(sendAt)) ? new Date(sendAt).toISOString() : null;
  if (sendAt !== null && !at) return invalid({ sendAt: "Pick a date and time" });
  const problems = scheduleErrors(at, typeof expiresAt === "string" ? expiresAt : null, Date.now(), timer === true);
  if (Object.keys(problems).length) return invalid(problems);
  return step(campaignId, "schedule", at ? { sendAt: at } : {});
}

/** Test to the admin's own phone, unschedule, cancel or copy. */
export async function campaignStep(campaignId: unknown, which: unknown): Promise<Written> {
  const steps = ["test", "unschedule", "cancel", "duplicate"] as const;
  const s = steps.find((x) => x === which);
  if (!isUuidLike(campaignId) || !s) return unexpected();
  return step(campaignId, s);
}

export async function deleteCampaign(campaignId: unknown): Promise<Written> {
  if (!isUuidLike(campaignId)) return unexpected();
  return changed(await api<CampaignWrite>(path(campaignId), { method: "DELETE" }));
}

// ---- helpers ----

async function step(campaignId: string, which: Step, body?: unknown): Promise<Written> {
  const res = await api<CampaignWrite>(`${path(campaignId)}/${which}`, { method: "POST", body: body ?? (which === "schedule" ? {} : undefined) });
  // A test send changes nothing in the list.
  return which === "test" ? written(res) : changed(res);
}

async function changed(res: ApiResult<CampaignWrite>): Promise<Written> {
  const out = written(res);
  if (out.ok) await refreshPages("campaigns");
  return out;
}

function written(res: ApiResult<CampaignWrite>): Written {
  return res.ok ? { ok: true, data: { message: res.data.message, id: res.data.id ?? undefined } } : failed(res.error, FORBIDDEN);
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
  const timerStyle = r.timerStyle === undefined ? "NONE" : (TIMER_STYLES as readonly unknown[]).includes(r.timerStyle) ? (r.timerStyle as TimerStyle) : null;
  if (!timerStyle) return null;
  const timerTheme = timerStyle === "NONE" ? null : (TIMER_THEMES as readonly unknown[]).includes(r.timerTheme) ? (r.timerTheme as TimerTheme) : "GOLD";
  const timerLabel = timerStyle === "NONE" ? null : str(r.timerLabel) || null;
  return { name: str(r.name), title: str(r.title), body: str(r.body), imageId, link: str(r.link) || null, expiresAt, timerStyle, timerLabel, timerTheme, audience };
}
