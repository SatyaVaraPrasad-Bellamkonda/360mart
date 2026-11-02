import { ChevronRight, ClipboardList, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { when } from "@/lib/orders/format";
import { CATEGORIES, isOpenTicket, RESOLUTIONS, TICKET_STATUS, type Ticket, type TicketStatus, type TicketSummary } from "@/lib/support/types";
import { Deadline } from "./Deadline";

// Read-only pieces shared by the customer, shop and admin support screens.

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  const s = TICKET_STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.tone}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${s.dot} ${status === "IN_PROGRESS" ? "motion-safe:animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

/** One request in a list. `deadlines` = show the countdowns (admin queue). */
export function TicketRow({ t, href, deadlines, who = "store" }: { t: TicketSummary; href: string; deadlines?: boolean; who?: "store" | "none" }) {
  const open = isOpenTicket(t.status);
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border bg-white p-4 transition hover:border-ink ${deadlines && t.overdue && open ? "border-red-300 bg-red-50/40" : "border-line"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">{CATEGORIES[t.category].label}</span>
          <TicketStatusPill status={t.status} />
          {deadlines && t.overdue && open && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">Overdue</span>}
        </div>
        <p className="mt-1 text-sm text-muted">
          <span className="font-semibold text-ink/80">{t.ticketNumber}</span>
          {t.orderNumber && <> · Order {t.orderNumber}</>}
          {who === "store" && t.storeName && <> · {t.storeName}</>}
        </p>
        <p className="mt-1 text-xs text-muted">
          Opened {when(t.createdAt)} · Last update {when(t.lastActivityAt)}
        </p>
        {deadlines && open && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Deadline label="Reply" iso={t.acknowledgeBy} compact />
            <Deadline label="Resolve" iso={t.resolveBy} compact />
          </div>
        )}
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

export function TicketEmpty({ icon: Icon = ClipboardList, title, text, children }: { icon?: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-surface text-muted">
        <Icon aria-hidden className="size-7" />
      </span>
      <p className="mt-4 font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

/** What the request is about: order, items, photos, outcome. */
export function TicketFacts({ t, orderHref }: { t: Ticket; orderHref?: string }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Fact label="Request">{t.ticketNumber}</Fact>
        <Fact label="About">{CATEGORIES[t.category].label}</Fact>
        {t.orderNumber && (
          <Fact label="Order">
            {orderHref ? (
              <Link href={orderHref} className="font-semibold text-brand-deep underline-offset-2 hover:underline">
                {t.orderNumber}
              </Link>
            ) : (
              t.orderNumber
            )}
          </Fact>
        )}
        {t.storeName && <Fact label="Store">{t.storeName}</Fact>}
        <Fact label="Opened">{when(t.createdAt)}</Fact>
        {t.resolvedAt && <Fact label="Closed">{when(t.resolvedAt)}</Fact>}
      </dl>
      {t.items.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Items</p>
          <ul className="mt-2 divide-y divide-line rounded-2xl ring-1 ring-line">
            {t.items.map((i) => (
              <li key={i.listingId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 text-ink">
                  {i.productName}
                  {i.variantLabel && <span className="text-muted"> · {i.variantLabel}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">× {i.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {t.images.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Photos</p>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {t.images.map((img, n) => (
              <li key={img.imageId}>
                <a href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-line hover:ring-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed link that expires: never cached by next/image */}
                  <img src={img.url} alt={`Photo ${n + 1}`} className="size-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** The outcome once support has decided. */
export function TicketOutcome({ t }: { t: Ticket }) {
  if (!t.resolution) return null;
  const rejected = t.status === "REJECTED";
  return (
    <section className={`rounded-3xl p-5 ring-1 ${rejected ? "bg-slate-50 ring-slate-200" : "bg-green-50 ring-green-200"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${rejected ? "text-slate-600" : "text-green-800"}`}>Outcome</p>
      <p className="mt-1 text-lg font-bold text-ink">{rejected ? "Closed: no issue found" : RESOLUTIONS[t.resolution].label}</p>
      {t.refundAmount !== null && t.refundAmount > 0 && <p className="mt-1 font-semibold text-green-800">Refund of ₹{t.refundAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>}
      {t.resolutionNote && <p className="mt-2 whitespace-pre-line text-sm text-ink/85">{t.resolutionNote}</p>}
    </section>
  );
}
