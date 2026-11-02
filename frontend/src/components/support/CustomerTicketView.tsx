"use client";

import { CircleCheckBig, ImagePlus, Loader2, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { when } from "@/lib/orders/format";
import { addTicketPhotoAction, loadMyTicketAction, replyTicketAction, withdrawTicketAction } from "@/lib/support/actions";
import { ticketVersion } from "@/lib/support/format";
import { CATEGORIES, isOpenTicket, type Ticket } from "@/lib/support/types";
import { photoError, PHOTO_TYPES, SUPPORT_LIMITS } from "@/lib/support/validation";
import { TicketFacts, TicketOutcome, TicketStatusPill } from "./SupportParts";
import { TicketChat } from "./TicketChat";
import { TicketReply } from "./TicketReply";

// One of the shopper's requests: the conversation, a reply box, photos and
// "Withdraw", each only when the backend lists it in allowedActions.
export function CustomerTicketView({ initial, created }: { initial: Ticket; created: boolean }) {
  const { sessionExpired } = useAuth();
  const [ticket, setTicket] = useState(initial);
  // Take the page's copy only when the page itself brings a newer version.
  const [seen, setSeen] = useState(ticketVersion(initial));
  if (ticketVersion(initial) !== seen) {
    setSeen(ticketVersion(initial));
    setTicket(initial);
  }
  const [closedNotice, setClosedNotice] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const can = (a: Ticket["allowedActions"][number]) => ticket.allowedActions.includes(a);
  const open = isOpenTicket(ticket.status);
  const newHref = ticket.orderId ? `/account/support/new?orderId=${ticket.orderId}` : "/account/support/new";

  async function reload() {
    const res = await loadMyTicketAction(ticket.ticketId);
    if (res.ok) setTicket(res.data);
    else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
  }

  // A closed request can't take messages: show it as it is now, and offer a new one.
  async function failed(error: { code: string; message: string }) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    if (error.code === "TICKET_CLOSED") {
      setClosedNotice(true);
      await reload();
    }
    toastError(error.message);
  }

  async function send(body: string) {
    const res = await replyTicketAction(ticket.ticketId, body);
    if (!res.ok) {
      await failed(res.error);
      return false;
    }
    if (res.data.ticket) setTicket(res.data.ticket);
    return true;
  }

  async function addPhoto(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const problem = photoError(file);
    if (problem) return toastError(problem);
    setUploading(true);
    const form = new FormData();
    form.append("image", file);
    const res = await addTicketPhotoAction(ticket.ticketId, form);
    if (res.ok) {
      toastSuccess("Photo added.");
      await reload();
    } else await failed(res.error);
    setUploading(false);
  }

  async function withdraw() {
    const res = await withdrawTicketAction(ticket.ticketId);
    setWithdrawOpen(false);
    if (!res.ok) return failed(res.error);
    toastSuccess(res.data.message);
    if (res.data.ticket) setTicket(res.data.ticket);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <header className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusPill status={ticket.status} />
            <span className="text-sm font-semibold text-muted">{ticket.ticketNumber}</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{CATEGORIES[ticket.category].label}</h1>
          {created && open && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 ring-1 ring-green-200">
              <CircleCheckBig aria-hidden className="mt-0.5 size-4 shrink-0" />
              We got your request. You&apos;ll see our reply here, and on your phone if you use the app.
            </p>
          )}
          {open && (
            <ul className="mt-3 space-y-1 text-sm text-ink/80">
              {!ticket.acknowledgedAt && <li>We&apos;ll reply by <b className="text-ink">{when(ticket.acknowledgeBy)}</b></li>}
              <li>Resolved by <b className="text-ink">{when(ticket.resolveBy)}</b> at the latest</li>
            </ul>
          )}
        </header>

        <TicketOutcome t={ticket} />

        <section aria-label="Conversation" className="rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <TicketChat t={ticket} viewer="CUSTOMER" />
        </section>

        {can("REPLY") ? (
          <TicketReply onSend={send} placeholder="Add more details or answer our question…" />
        ) : (
          !open && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 ring-1 ring-line">
              <p className="text-sm text-muted">{closedNotice ? "This request was closed in the meantime." : "This request is closed."} Still need help?</p>
              <Link href={newHref} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
                <Plus aria-hidden className="size-4" />
                Open a new request
              </Link>
            </div>
          )
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line">
          <TicketFacts t={ticket} orderHref={ticket.orderId ? `/account/orders/${ticket.orderId}` : undefined} />
          {can("ADD_PHOTO") && ticket.images.length < SUPPORT_LIMITS.photos && (
            <>
              <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} className="sr-only" onChange={(e) => addPhoto(e.target.files?.[0])} aria-label="Add a photo" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60"
              >
                {uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                {uploading ? "Uploading…" : `Add a photo (${ticket.images.length}/${SUPPORT_LIMITS.photos})`}
              </button>
            </>
          )}
        </section>
        {can("WITHDRAW") && (
          <button type="button" onClick={() => setWithdrawOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            <XCircle aria-hidden className="size-4" />
            Withdraw request
          </button>
        )}
      </aside>

      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw this request?" description="Do this if the problem is sorted. You can open a new request later if you need to.">
        <div className="flex flex-col-reverse gap-2 pb-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setWithdrawOpen(false)} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            Keep it open
          </button>
          <button type="button" onClick={withdraw} className="min-h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700">
            Withdraw
          </button>
        </div>
      </Dialog>
    </div>
  );
}
