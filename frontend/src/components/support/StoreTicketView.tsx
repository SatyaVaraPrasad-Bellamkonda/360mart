"use client";

import { Scale } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError } from "@/components/Toaster";
import { loadStoreTicketAction, replyStoreTicketAction } from "@/lib/support/seller-actions";
import { ticketVersion } from "@/lib/support/format";
import { CATEGORIES, isOpenTicket, type Ticket } from "@/lib/support/types";
import { TicketFacts, TicketOutcome, TicketStatusPill } from "./SupportParts";
import { TicketChat } from "./TicketChat";
import { TicketReply } from "./TicketReply";

// A complaint about one of the shop's orders. The shop can read it and reply;
// 360mart support decides the outcome.
export function StoreTicketView({ initial }: { initial: Ticket }) {
  const { sessionExpired } = useAuth();
  const [ticket, setTicket] = useState(initial);
  const [seen, setSeen] = useState(ticketVersion(initial));
  if (ticketVersion(initial) !== seen) {
    setSeen(ticketVersion(initial));
    setTicket(initial);
  }

  async function send(body: string) {
    const res = await replyStoreTicketAction(ticket.ticketId, body);
    if (!res.ok) {
      if (res.error.code === "UNAUTHENTICATED") sessionExpired();
      else {
        toastError(res.error.message);
        if (res.error.code === "TICKET_CLOSED") {
          const fresh = await loadStoreTicketAction(ticket.ticketId);
          if (fresh.ok) setTicket(fresh.data);
        }
      }
      return false;
    }
    if (res.data.ticket) setTicket(res.data.ticket);
    return true;
  }

  const open = isOpenTicket(ticket.status);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <header className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusPill status={ticket.status} />
            <span className="text-sm font-semibold text-muted">{ticket.ticketNumber}</span>
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{CATEGORIES[ticket.category].label}</h2>
          <p className="mt-1 text-sm text-muted">From {ticket.customer?.name ?? "the customer"}</p>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-ink/85 ring-1 ring-line">
            <Scale aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-deep" />
            360mart support will decide the outcome. Reply here with what happened on your side; the customer and support both see it.
          </p>
        </header>
        <TicketOutcome t={ticket} />
        <section aria-label="Conversation" className="rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <TicketChat t={ticket} viewer="STORE" />
        </section>
        {ticket.allowedActions.includes("REPLY") ? (
          <TicketReply onSend={send} placeholder="Explain what happened, e.g. what you packed…" />
        ) : (
          !open && <p className="rounded-3xl bg-white p-5 text-sm text-muted ring-1 ring-line">This complaint is closed.</p>
        )}
      </div>
      <aside className="rounded-3xl bg-white p-5 ring-1 ring-line">
        <TicketFacts t={{ ...ticket, storeName: null }} orderHref={ticket.orderId ? `/seller/orders/${ticket.orderId}` : undefined} />
      </aside>
    </div>
  );
}
