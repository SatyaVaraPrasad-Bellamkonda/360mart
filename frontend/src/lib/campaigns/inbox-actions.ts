"use server";

import type { ActionResult } from "@/lib/auth/actions";
import { getSessionToken } from "@/lib/auth/session";
import { failWith, invalid, LOGIN_NEEDED } from "@/lib/orders/action-helpers";
import * as api from "./service";

// The shopper's "Offers & promotions" switch. (The bell's count and "opened"
// call the API straight from the browser: unread-store.ts, InboxList.tsx.)

export async function setOffersAction(offers: unknown): Promise<ActionResult<{ message: string }>> {
  if (typeof offers !== "boolean") return invalid("Something went wrong. Please try again.");
  const token = await getSessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.putPreferences(token, { offers });
  if (!res.ok) return failWith(res.error);
  return { ok: true, data: { message: res.data.message } };
}
