import "server-only";
import { callApi } from "@/lib/backend/client";
import type { NewTicket, SupportCategory, Ticket, TicketPage, TicketStatus } from "./types";

// One function per support endpoint. Customer: /support/tickets. Shop:
// /seller/store/support-tickets. Admin: /admin/support-tickets. Writes answer
// { success, message, id? }; screens re-read the ticket afterwards.

type Write = { success: boolean; message: string; id?: string };

function query(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else if (v !== undefined && v !== "" && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
const id = encodeURIComponent;

// ---- customer ----
export const createTicket = (token: string, body: NewTicket) => callApi<Write>("/support/tickets", { method: "POST", body, sessionToken: token });
export const listMyTickets = (token: string, p: { orderId?: string; page: number; size: number }) => callApi<TicketPage>(`/support/tickets${query(p)}`, { sessionToken: token });
export const getMyTicket = (token: string, ticketId: string) => callApi<Ticket>(`/support/tickets/${id(ticketId)}`, { sessionToken: token });
export const replyMyTicket = (token: string, ticketId: string, body: string) => callApi<Write>(`/support/tickets/${id(ticketId)}/messages`, { method: "POST", body: { body }, sessionToken: token });
export const withdrawMyTicket = (token: string, ticketId: string) => callApi<Write>(`/support/tickets/${id(ticketId)}/withdraw`, { method: "POST", sessionToken: token });
export function addTicketPhoto(token: string, ticketId: string, image: File) {
  const form = new FormData();
  form.append("image", image, image.name);
  return callApi<Write>(`/support/tickets/${id(ticketId)}/images`, { method: "POST", body: form, sessionToken: token });
}

// ---- shop ----
export const listStoreTickets = (token: string, p: { status: TicketStatus[]; page: number; size: number }) => callApi<TicketPage>(`/seller/store/support-tickets${query(p)}`, { sessionToken: token });
export const getStoreTicket = (token: string, ticketId: string) => callApi<Ticket>(`/seller/store/support-tickets/${id(ticketId)}`, { sessionToken: token });
export const replyStoreTicket = (token: string, ticketId: string, body: string) => callApi<Write>(`/seller/store/support-tickets/${id(ticketId)}/messages`, { method: "POST", body: { body }, sessionToken: token });

// ---- admin ----
export const listAdminTickets = (token: string, p: { status: TicketStatus[]; category?: SupportCategory; overdue?: boolean; page: number; size: number }) =>
  callApi<TicketPage>(`/admin/support-tickets${query(p)}`, { sessionToken: token });
export const getAdminTicket = (token: string, ticketId: string) => callApi<Ticket>(`/admin/support-tickets/${id(ticketId)}`, { sessionToken: token });
