import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Page } from "@/lib/inventory/types";
import type { AudienceCount, Campaign, CampaignAudience, CampaignInput, CampaignStatus, CampaignSummary, CampaignWrite, InboxItem, NotificationPreferences } from "./types";

// One function per campaign / notification endpoint. Admin ones need the ADMIN
// role; the inbox ones any signed-in user. Writes answer { success, message, id? }.

const id = encodeURIComponent;

// ---- admin ----

export function listCampaigns(token: string, statuses: CampaignStatus[], page: number, size: number) {
  const q = new URLSearchParams();
  statuses.forEach((s) => q.append("status", s));
  q.set("page", String(page));
  q.set("size", String(size));
  return callApi<Page<CampaignSummary>>(`/admin/campaigns?${q}`, { sessionToken: token });
}

export const getCampaign = (token: string, campaignId: string) => callApi<Campaign>(`/admin/campaigns/${id(campaignId)}`, { sessionToken: token });
export const createCampaign = (token: string, input: CampaignInput) => callApi<CampaignWrite>("/admin/campaigns", { method: "POST", body: input, sessionToken: token });
export const updateCampaign = (token: string, campaignId: string, input: CampaignInput) => callApi<CampaignWrite>(`/admin/campaigns/${id(campaignId)}`, { method: "PUT", body: input, sessionToken: token });
export const deleteCampaign = (token: string, campaignId: string) => callApi<CampaignWrite>(`/admin/campaigns/${id(campaignId)}`, { method: "DELETE", sessionToken: token });
export const previewAudience = (token: string, audience: CampaignAudience) => callApi<AudienceCount>("/admin/campaigns/audience-preview", { method: "POST", body: audience, sessionToken: token });

export function uploadCampaignImage(token: string, image: File) {
  const form = new FormData();
  form.append("image", image);
  return callApi<CampaignWrite>("/admin/campaigns/images", { method: "POST", body: form, sessionToken: token });
}

export type CampaignStep = "test" | "schedule" | "unschedule" | "cancel" | "duplicate";

export const campaignStep = (token: string, campaignId: string, step: CampaignStep, body?: unknown) =>
  callApi<CampaignWrite>(`/admin/campaigns/${id(campaignId)}/${step}`, { method: "POST", body: body ?? (step === "schedule" ? {} : undefined), sessionToken: token });

// ---- the signed-in user's inbox ----

export const inbox = (token: string, page: number, size: number) => callApi<Page<InboxItem>>(`/users/me/notifications?page=${page}&size=${size}`, { sessionToken: token });
export const unreadCount = (token: string) => callApi<{ unread: number }>("/users/me/notifications/unread-count", { sessionToken: token });
export const markOpened = (token: string, campaignId: string) => callApi<CampaignWrite>(`/users/me/notifications/${id(campaignId)}/opened`, { method: "POST", sessionToken: token });
export const getPreferences = (token: string) => callApi<NotificationPreferences>("/users/me/notification-preferences", { sessionToken: token });
export const putPreferences = (token: string, prefs: NotificationPreferences) => callApi<CampaignWrite>("/users/me/notification-preferences", { method: "PUT", body: prefs, sessionToken: token });
