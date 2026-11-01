"use server";

import type { ActionResult } from "@/lib/auth/actions";
import { getSessionToken } from "@/lib/auth/session";
import { isUuidLike } from "@/lib/inventory/validation";
import { failWith, invalid, LOGIN_NEEDED } from "@/lib/orders/action-helpers";
import * as api from "./service";

// The shopper's offers inbox: the header bell's count, "opened" when an offer
// is tapped, and the "Offers & promotions" switch.

/** The bell's number; 0 when signed out or when it can't be read (a badge is never worth an error). */
export async function unreadCountAction(): Promise<number> {
  const token = await getSessionToken();
  if (!token) return 0;
  const res = await api.unreadCount(token);
  return res.ok ? Math.max(0, res.data.unread) : 0;
}

/** Safe to repeat. Not revalidated: the inbox marks the item read itself (a refresh would re-read the list). */
export async function markOpenedAction(campaignId: unknown): Promise<ActionResult> {
  if (!isUuidLike(campaignId)) return invalid("Notification not found.");
  const token = await getSessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.markOpened(token, campaignId);
  if (!res.ok) return failWith(res.error);
  return { ok: true, data: null };
}

export async function setOffersAction(offers: unknown): Promise<ActionResult<{ message: string }>> {
  if (typeof offers !== "boolean") return invalid("Something went wrong. Please try again.");
  const token = await getSessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.putPreferences(token, { offers });
  if (!res.ok) return failWith(res.error);
  return { ok: true, data: { message: res.data.message } };
}
