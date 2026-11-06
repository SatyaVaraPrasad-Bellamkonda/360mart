import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Page } from "@/lib/inventory/types";
import type { Campaign, CampaignStatus, CampaignSummary, CampaignWrite, InboxItem, NotificationPreferences } from "./types";

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

// ---- the signed-in user's inbox ----

export const inbox = (token: string, page: number, size: number) => callApi<Page<InboxItem>>(`/users/me/notifications?page=${page}&size=${size}`, { sessionToken: token });
export const unreadCount = (token: string) => callApi<{ unread: number }>("/users/me/notifications/unread-count", { sessionToken: token });
export const getPreferences = (token: string) => callApi<NotificationPreferences>("/users/me/notification-preferences", { sessionToken: token });
export const putPreferences = (token: string, prefs: NotificationPreferences) => callApi<CampaignWrite>("/users/me/notification-preferences", { method: "PUT", body: prefs, sessionToken: token });
