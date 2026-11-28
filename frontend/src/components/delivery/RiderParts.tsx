import { BadgeCheck, CircleAlert, Clock, FileText, History, LayoutDashboard, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { money } from "@/lib/delivery/format";
import { RIDER_DOCUMENT, RIDER_STATUS_LABEL, RIDER_STATUS_TONE, TASK_STATUS_LABEL, TASK_STATUS_TONE, type DeliveryTaskStatus, type RiderDocument, type RiderDocumentStatus, type RiderStatus } from "@/lib/delivery/types";
import { when } from "@/lib/orders/format";

// Read-only pieces shared by the rider's pages and the admin's rider screens:
// status pills, document rows, the cash meter and the rider area's tabs.

export function RiderStatusPill({ status }: { status: RiderStatus }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${RIDER_STATUS_TONE[status] ?? "bg-surface text-muted"}`}>{RIDER_STATUS_LABEL[status] ?? status}</span>;
}

export function TaskStatusPill({ status }: { status: DeliveryTaskStatus }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${TASK_STATUS_TONE[status] ?? "bg-surface text-muted"}`}>{TASK_STATUS_LABEL[status] ?? status}</span>;
}

const DOC_PILL: Record<RiderDocumentStatus | "MISSING", { label: string; tone: string; icon: LucideIcon }> = {
  MISSING: { label: "Not uploaded", tone: "bg-slate-100 text-slate-700", icon: FileText },
  PENDING: { label: "Waiting for review", tone: "bg-amber-100 text-amber-800", icon: Clock },
  VERIFIED: { label: "Verified", tone: "bg-green-100 text-green-800", icon: BadgeCheck },
  REJECTED: { label: "Rejected", tone: "bg-red-100 text-red-800", icon: CircleAlert },
};

export function DocPill({ status }: { status: RiderDocumentStatus | "MISSING" }) {
  const pill = DOC_PILL[status] ?? DOC_PILL.MISSING;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${pill.tone}`}>
      <pill.icon aria-hidden className="size-3.5" />
      {pill.label}
    </span>
  );
}

/** One uploaded file: when, its status, the reviewer's reason, a link to open it and the caller's buttons. */
export function RiderDocumentRow({ document, actions, plain }: { document: RiderDocument; actions?: ReactNode; /** Inside its own document card: no repeated title. */ plain?: boolean }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {!plain && <p className="font-semibold text-ink">{RIDER_DOCUMENT[document.documentType]?.label ?? document.documentType}</p>}
          <p className={plain ? "text-sm font-semibold text-ink" : "mt-0.5 text-sm text-muted"}>Uploaded {when(document.uploadedAt)}</p>
        </div>
        <DocPill status={document.status} />
      </div>
      {document.status === "REJECTED" && document.rejectionReason && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">Reason: </span>
          {document.rejectionReason}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {document.url ? (
          <a href={document.url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            <FileText aria-hidden className="size-4" />
            Open file
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-sm text-muted">File unavailable right now. Reload the page in a minute.</span>
        )}
        {actions}
      </div>
    </li>
  );
}

/** Cash the rider holds for 360mart against their limit (amber near it, red at it). */
export function CashMeter({ cashInHand, cashLimit, compact }: { cashInHand: number; cashLimit: number | null; compact?: boolean }) {
  const share = cashLimit && cashLimit > 0 ? Math.min(1, cashInHand / cashLimit) : 0;
  const tone = share >= 1 ? "bg-red-500" : share >= 0.8 ? "bg-amber-500" : "bg-fresh";
  return (
    <div>
      <p className={`font-extrabold tracking-tight text-ink ${compact ? "text-xl" : "text-3xl"}`}>{money(cashInHand)}</p>
      {cashLimit != null && cashLimit > 0 ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={cashLimit} aria-valuenow={cashInHand} aria-label="Cash in hand against your limit">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Limit {money(cashLimit)}
            {share >= 1 ? " · reached: please hand in cash to 360mart" : share >= 0.8 ? " · nearly reached" : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-muted">No limit set</p>
      )}
    </div>
  );
}

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/rider", label: "Overview", icon: LayoutDashboard },
  { href: "/rider/deliveries", label: "Deliveries", icon: History },
  { href: "/rider/cash", label: "Cash", icon: Wallet },
];

/** The rider area's tabs (server-rendered: the current one is passed in). */
export function RiderTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Delivery partner pages" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {TABS.map((t) => {
          const on = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
              >
                <t.icon aria-hidden className="size-4" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page frame for /rider/*: heading, one line of help and the tabs. */
export function RiderPageHeader({ title, subtitle, current, children }: { title: string; subtitle?: string; current: string; children?: ReactNode }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-deep">360mart delivery partner</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
      <RiderTabs current={current} />
    </header>
  );
}
