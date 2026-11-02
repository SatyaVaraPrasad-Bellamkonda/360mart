"use client";

import { Gavel, Loader2, Phone, PlayCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Dialog } from "@/components/Dialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import { money } from "@/lib/orders/format";
import { adminMessageAction, loadAdminTicketAction, resolveTicketAction, startTicketAction } from "@/lib/support/admin-actions";
import { ticketVersion } from "@/lib/support/format";
import { CATEGORIES, isOpenTicket, RESOLUTIONS, type Ticket, type TicketResolution } from "@/lib/support/types";
import { noteError, refundError, SUPPORT_LIMITS } from "@/lib/support/validation";
import { Deadline } from "./Deadline";
import { TicketFacts, TicketOutcome, TicketStatusPill } from "./SupportParts";
import { TicketChat } from "./TicketChat";
import { TicketReply } from "./TicketReply";

type OrderInfo = { total: number; status: string } | null;

// One request in the admin's queue: who and what, the legal deadlines, the
// conversation with a public reply or an internal note, "Take it" and the
// outcome. Buttons only from allowedActions.
export function AdminTicketView({ initial, order }: { initial: Ticket; order: OrderInfo }) {
  const { sessionExpired } = useAuth();
  const [ticket, setTicket] = useState(initial);
  const [seen, setSeen] = useState(ticketVersion(initial));
  if (ticketVersion(initial) !== seen) {
    setSeen(ticketVersion(initial));
    setTicket(initial);
  }
  const [starting, setStarting] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const can = (a: Ticket["allowedActions"][number]) => ticket.allowedActions.includes(a);
  const open = isOpenTicket(ticket.status);

  async function failed(error: { code: string; message: string }) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    toastError(error.message);
    // Someone else changed it meanwhile: show it as it is now.
    if (error.code === "TICKET_CLOSED" || error.code.endsWith("CONFLICT")) {
      const fresh = await loadAdminTicketAction(ticket.ticketId);
      if (fresh.ok) setTicket(fresh.data);
    }
  }

  async function send(body: string, internal: boolean) {
    const res = await adminMessageAction(ticket.ticketId, body, internal);
    if (!res.ok) {
      await failed(res.error);
      return false;
    }
    if (res.data.ticket) setTicket(res.data.ticket);
    toastSuccess(internal ? "Note saved." : "Reply sent.");
    return true;
  }

  async function start() {
    setStarting(true);
    const res = await startTicketAction(ticket.ticketId);
    setStarting(false);
    if (!res.ok) return failed(res.error);
    toastSuccess(res.data.message);
    if (res.data.ticket) setTicket(res.data.ticket);
  }

  const c = ticket.customer;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <header className={`rounded-3xl bg-white p-5 ring-1 sm:p-6 ${ticket.overdue && open ? "ring-red-300" : "ring-line"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusPill status={ticket.status} />
            {ticket.overdue && open && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Overdue</span>}
            <span className="text-sm font-semibold text-muted">{ticket.ticketNumber}</span>
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{CATEGORIES[ticket.category].label}</h2>
          {open && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!ticket.acknowledgedAt && <Deadline label="Reply" iso={ticket.acknowledgeBy} />}
              <Deadline label="Resolve" iso={ticket.resolveBy} />
            </div>
          )}
          {open && !ticket.acknowledgedAt && <p className="mt-2 text-xs text-muted">The first reply to the customer marks it answered and moves it to &quot;We&apos;re on it&quot;.</p>}
          {(can("START") || can("RESOLVE") || can("REJECT")) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {can("START") && (
                <button type="button" onClick={start} disabled={starting} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink disabled:opacity-60">
                  {starting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <PlayCircle aria-hidden className="size-4" />}
                  Take it
                </button>
              )}
              {(can("RESOLVE") || can("REJECT")) && (
                <button type="button" onClick={() => setResolveOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
                  <Gavel aria-hidden className="size-4" />
                  Record the outcome
                </button>
              )}
            </div>
          )}
        </header>

        <TicketOutcome t={ticket} />
        <section aria-label="Conversation" className="rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-5">
          <TicketChat t={ticket} viewer="ADMIN" />
        </section>
        {can("REPLY") && <TicketReply onSend={send} allowInternal placeholder="Reply to the customer (the store sees it too)…" />}
      </div>

      <aside className="space-y-4">
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Customer</p>
          <p className="mt-2 flex items-center gap-2 font-semibold text-ink">
            <UserRound aria-hidden className="size-4 text-muted" />
            {c?.name ?? "No name given"}
          </p>
          {c?.mobileNumber && (
            <a href={`tel:${c.mobileNumber}`} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
              <Phone aria-hidden className="size-4" />
              Call {c.mobileNumber}
            </a>
          )}
          {order && (
            <p className="mt-3 text-sm text-muted">
              Order total <b className="text-ink">{money(order.total)}</b> · {order.status.replace(/_/g, " ").toLowerCase()}
            </p>
          )}
          {ticket.orderId && (
            <Link href={`/admin/orders/${ticket.orderId}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand-deep hover:underline">
              Open the order
            </Link>
          )}
        </section>
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line">
          <TicketFacts t={ticket} />
        </section>
      </aside>

      <ResolveDialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        ticket={ticket}
        orderTotal={order?.total ?? null}
        onDone={(t) => {
          setResolveOpen(false);
          if (t) setTicket(t);
        }}
        onFailed={failed}
      />
    </div>
  );
}

function ResolveDialog({ open, onClose, ticket, orderTotal, onDone, onFailed }: { open: boolean; onClose: () => void; ticket: Ticket; orderTotal: number | null; onDone: (t: Ticket | null) => void; onFailed: (e: { code: string; message: string }) => Promise<void> }) {
  const options = (Object.keys(RESOLUTIONS) as TicketResolution[]).filter((r) => (r === "NO_ISSUE_FOUND" ? ticket.allowedActions.includes("REJECT") : ticket.allowedActions.includes("RESOLVE")));
  const [resolution, setResolution] = useState<TicketResolution | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const found: Record<string, string> = {};
    if (!resolution) found.resolution = "Choose how it was resolved";
    const n = noteError(note);
    if (n) found.note = n;
    if (resolution === "REFUND" && amount.trim()) {
      const a = refundError(amount, orderTotal);
      if (a) found.refundAmount = a;
    }
    setErrors(found);
    if (Object.keys(found).length || !resolution) return;
    setBusy(true);
    const res = await resolveTicketAction(ticket.ticketId, { resolution, note, refundAmount: resolution === "REFUND" ? amount : undefined, orderTotal: orderTotal ?? undefined });
    setBusy(false);
    if (!res.ok) {
      if (res.error.code === "VALIDATION_FAILED" && Object.keys(res.error.fieldErrors).length) return setErrors(res.error.fieldErrors);
      onDone(null);
      return onFailed(res.error);
    }
    toastSuccess(res.data.message);
    onDone(res.data.ticket);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Record the outcome" description="The customer sees the outcome and your note. This closes the request.">
      <div className="space-y-4 pb-5">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-ink">Outcome</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((r) => (
              <label
                key={r}
                className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl px-4 py-2 ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${resolution === r ? (r === "NO_ISSUE_FOUND" ? "bg-slate-800 text-white ring-slate-800" : "bg-ink text-white ring-ink") : "bg-white text-ink ring-line hover:ring-ink/40"} ${r === "NO_ISSUE_FOUND" ? "sm:col-span-2" : ""}`}
              >
                <input type="radio" name="resolution" value={r} checked={resolution === r} onChange={() => setResolution(r)} className="sr-only" />
                <span className="font-semibold">{RESOLUTIONS[r].label}</span>
                <span className={`text-xs ${resolution === r ? "text-white/75" : "text-muted"}`}>{RESOLUTIONS[r].hint}</span>
              </label>
            ))}
          </div>
          {errors.resolution && <p className="mt-1.5 text-sm text-red-700">{errors.resolution}</p>}
        </fieldset>

        {resolution === "REFUND" && (
          <div>
            <label htmlFor="refund-amount" className="mb-1.5 block text-sm font-semibold text-ink">
              Refund amount <span className="font-normal text-muted">(optional{orderTotal !== null ? `, up to ${money(orderTotal)}` : ""})</span>
            </label>
            <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-brand/40">
              <span className="pl-3 text-muted">₹</span>
              <input id="refund-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120.50" aria-invalid={!!errors.refundAmount} className="min-h-12 min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none" />
            </div>
            {errors.refundAmount ? (
              <p className="mt-1.5 text-sm text-red-700">{errors.refundAmount}</p>
            ) : (
              <p className="mt-1.5 text-sm text-amber-900">This only records the refund. Pay it yourselves by UPI or cash.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="resolve-note" className="mb-1.5 flex justify-between text-sm font-semibold text-ink">
            Note to the customer
            <span className="text-xs font-normal text-muted">
              {note.trim().length}/{SUPPORT_LIMITS.noteMax}
            </span>
          </label>
          <textarea id="resolve-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={SUPPORT_LIMITS.noteMax} aria-invalid={!!errors.note} placeholder="What we did and what happens next." className="w-full rounded-xl border border-line px-3 py-2 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-brand/40" />
          {errors.note && <p className="mt-1.5 text-sm text-red-700">{errors.note}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface">
            Not now
          </button>
          <button type="button" onClick={save} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {resolution === "NO_ISSUE_FOUND" ? "Close as no issue found" : "Save outcome"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
