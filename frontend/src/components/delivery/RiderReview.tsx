"use client";

import { BadgeCheck, Ban, Bike, CircleAlert, FileText, HandCoins, Loader2, Mail, Phone, RotateCcw, Wallet, X } from "lucide-react";
import { useId, useState } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { formatMobile } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/auth/actions";
import { approveRider, loadRiderCashPage, reactivateRider, recordDeposit, rejectRider, rejectRiderDocument, setCashLimit, suspendRider, verifyRiderDocument } from "@/lib/delivery/admin-client";
import { money } from "@/lib/delivery/format";
import { REASON_MAX, REASON_MIN, requiredDocuments, RIDER_DOCUMENT, vehicleLabel, type AdminRider, type CashEntry, type RiderCash } from "@/lib/delivery/types";
import { when } from "@/lib/orders/format";
import { CashMeter, DocPill, RiderDocumentRow, RiderStatusPill } from "./RiderParts";
import { VEHICLE_ICON } from "./vehicle-icons";

type Result = ActionResult<{ message: string; rider: AdminRider | null }> & { rider?: AdminRider | null };

const version = (r: AdminRider) => [r.status, r.cashInHand, r.cashLimit, r.documents.map((d) => `${d.documentId}${d.status}`).join()].join("|");

// One delivery partner as support sees them: contact, vehicle, documents
// (verify / reject each), the decision (approve or send back; suspend or
// reactivate), and cash (limit, deposits handed in, history). Every action
// returns the fresh rider, which replaces what's shown.
export function RiderReview({ initial }: { initial: AdminRider }) {
  const [rider, setRider] = useState(initial);
  const [pageVersion, setPageVersion] = useState(version(initial));
  if (version(initial) !== pageVersion) {
    setPageVersion(version(initial));
    setRider(initial);
  }
  const { run, busy } = useRun(setRider);
  const Icon = rider.vehicleType ? VEHICLE_ICON[rider.vehicleType] : Bike;
  const needed = requiredDocuments(rider.licenceRequired);
  const reviewing = rider.status === "PENDING_APPROVAL";

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-ink text-2xl font-bold text-white">
          {(rider.name ?? "R").slice(0, 1).toUpperCase()}
          {rider.status === "ACTIVE" && <span aria-label={rider.online ? "Online now" : "Offline"} className={`absolute -right-1 -top-1 size-4 rounded-full border-2 border-white ${rider.online ? "bg-green-500" : "bg-slate-300"}`} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-ink">{rider.name ?? "Name not added"}</p>
            <RiderStatusPill status={rider.status} />
            {rider.status === "ACTIVE" && <span className="text-xs font-semibold text-muted">{rider.online ? "Online now" : "Offline"}</span>}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <a href={`tel:${rider.mobileNumber}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-ink hover:underline">
              <Phone aria-hidden className="size-4" />
              {formatMobile(rider.mobileNumber)}
            </a>
            {rider.email && (
              <a href={`mailto:${rider.email}`} className="inline-flex min-h-8 min-w-0 items-center gap-1.5 break-all hover:underline">
                <Mail aria-hidden className="size-4 shrink-0" />
                {rider.email}
              </a>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Joined {when(rider.createdAt)}
            {rider.submittedAt && ` · submitted ${when(rider.submittedAt)}`}
            {rider.approvedAt && ` · approved ${when(rider.approvedAt)}`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Icon aria-hidden className="size-5 text-brand-deep" />
              Vehicle
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Type</dt>
                <dd className="font-semibold text-ink">{vehicleLabel(rider.vehicleType) ?? "Not chosen"}</dd>
              </div>
              <div>
                <dt className="text-muted">Number</dt>
                <dd className="font-mono font-semibold tracking-wider text-ink">{rider.vehicleNumber ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-muted">Licence needed</dt>
                <dd className="font-semibold text-ink">{rider.licenceRequired ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <FileText aria-hidden className="size-5 text-brand-deep" />
              Documents
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {needed.map((t) => {
                const docs = rider.documents.filter((d) => d.documentType === t);
                const current = docs.find((d) => d.status !== "REJECTED");
                return (
                  <li key={t} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1 text-sm ring-1 ring-line">
                    <span className="font-semibold text-ink">{RIDER_DOCUMENT[t].label}</span>
                    <DocPill status={current?.status ?? (docs.length ? "REJECTED" : "MISSING")} />
                  </li>
                );
              })}
            </ul>
            {rider.documents.length ? (
              <ul className="mt-4 space-y-3">
                {[...rider.documents]
                  .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
                  .map((doc) => (
                    <RiderDocumentRow key={doc.documentId} document={doc} actions={doc.status === "PENDING" && <DocumentDecision rider={rider} documentId={doc.documentId} label={RIDER_DOCUMENT[doc.documentType]?.label ?? "Document"} run={run} busy={busy} />} />
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No documents uploaded yet.</p>
            )}
            <p className="mt-3 text-xs text-muted">File links work for about an hour. If one doesn&apos;t open, reload the page.</p>
          </section>

          {(rider.status === "ACTIVE" || rider.status === "SUSPENDED" || rider.cashInHand > 0) && <CashSection rider={rider} run={run} busy={busy} />}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Decision rider={rider} run={run} busy={busy} reviewing={reviewing} />
        </div>
      </div>
    </div>
  );
}

type Run = (name: string, call: () => Promise<Result>, done?: () => void) => Promise<Result>;

function useRun(setRider: (r: AdminRider) => void) {
  const { sessionExpired } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const run: Run = async (name, call, done) => {
    setBusy(name);
    const res = await call();
    setBusy(null);
    if (res.ok) {
      if (res.data.rider) setRider(res.data.rider);
      toastSuccess(res.data.message);
      done?.();
    } else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    else {
      if (res.rider) setRider(res.rider);
      if (!Object.keys(res.error.fieldErrors).length) toastError(res.error.message);
    }
    return res;
  };
  return { run, busy };
}

function DocumentDecision({ rider, documentId, label, run, busy }: { rider: AdminRider; documentId: string; label: string; run: Run; busy: string | null }) {
  const [rejecting, setRejecting] = useState(false);
  if (rejecting) {
    return (
      <ReasonForm
        label="Why is this document rejected?"
        placeholder="The photo is blurred. Please upload a clear photo of the whole licence."
        submitLabel="Reject document"
        busy={busy === `reject:${documentId}`}
        onCancel={() => setRejecting(false)}
        onSubmit={(reason) => run(`reject:${documentId}`, () => rejectRiderDocument(rider.riderId, documentId, reason), () => setRejecting(false))}
      />
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void run(`verify:${documentId}`, () => verifyRiderDocument(rider.riderId, documentId))}
        className="flex min-h-10 items-center gap-1.5 rounded-full bg-fresh px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {busy === `verify:${documentId}` ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <BadgeCheck aria-hidden className="size-4" />}
        Verify<span className="sr-only"> {label}</span>
      </button>
      <button type="button" disabled={busy !== null} onClick={() => setRejecting(true)} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
        <X aria-hidden className="size-4" />
        Reject<span className="sr-only"> {label}</span>
      </button>
    </>
  );
}

function Decision({ rider, run, busy, reviewing }: { rider: AdminRider; run: Run; busy: string | null; reviewing: boolean }) {
  const [reasonFor, setReasonFor] = useState<"reject" | "suspend" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const needed = requiredDocuments(rider.licenceRequired);
  const waiting = rider.documents.filter((d) => d.status === "PENDING").length;
  const unverified = needed.filter((t) => !rider.documents.some((d) => d.documentType === t && d.status === "VERIFIED"));
  const canApprove = reviewing && waiting === 0 && unverified.length === 0;

  async function go(name: string, call: () => Promise<Result>, done?: () => void) {
    setMessage(null);
    const res = await run(name, call, done);
    if (!res.ok && res.error.code !== "UNAUTHENTICATED") setMessage(res.error.fieldErrors.reason ?? res.error.message);
  }

  const box = "rounded-3xl border border-line bg-white p-5 sm:p-6";
  if (reasonFor) {
    return (
      <section className={box}>
        <h2 className="font-bold text-ink">{reasonFor === "reject" ? "Send the application back" : "Suspend this rider"}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{reasonFor === "reject" ? "The rider sees your reason, fixes it and submits again." : "They go offline at once and can't take deliveries until you reactivate them."}</p>
        <ReasonForm
          label={reasonFor === "reject" ? "What should the rider fix?" : "Why is the rider suspended?"}
          placeholder={reasonFor === "reject" ? "The driving licence has expired. Please upload a valid one." : "Repeated complaints about late deliveries"}
          submitLabel={reasonFor === "reject" ? "Send back to rider" : "Suspend rider"}
          busy={busy === reasonFor}
          serverError={message}
          onCancel={() => setReasonFor(null)}
          onSubmit={(reason) => go(reasonFor, () => (reasonFor === "reject" ? rejectRider(rider.riderId, reason) : suspendRider(rider.riderId, reason)), () => setReasonFor(null))}
        />
      </section>
    );
  }

  if (reviewing) {
    const blocker = waiting
      ? `Verify or reject ${waiting === 1 ? "the waiting document" : `all ${waiting} waiting documents`} first.`
      : unverified.length
        ? `${unverified.map((t) => RIDER_DOCUMENT[t].label).join(" and ")} ${unverified.length === 1 ? "isn't" : "aren't"} verified. Send it back so the rider uploads a new one.`
        : null;
    return (
      <section className={box}>
        <h2 className="font-bold text-ink">Decision</h2>
        <p className="mt-1 text-sm text-muted">Approving lets the rider go online in the app straight away.</p>
        {blocker && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {blocker}
          </p>
        )}
        {message && (
          <div className="mt-3">
            <FormMessage error={message} />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canApprove || busy !== null}
            onClick={() => void go("approve", () => approveRider(rider.riderId))}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-fresh px-6 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-fresh/40"
          >
            {busy === "approve" ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <BadgeCheck aria-hidden className="size-5" />}
            Approve rider
          </button>
          <button type="button" disabled={busy !== null} onClick={() => setReasonFor("reject")} className="flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            Send back with a reason
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={box}>
      <h2 className="font-bold text-ink">Account</h2>
      {rider.status === "ACTIVE" && <p className="mt-1 text-sm text-muted">Approved{rider.approvedAt ? ` ${when(rider.approvedAt)}` : ""}. {rider.online ? "Online in the app right now." : "Offline right now."}</p>}
      {rider.status === "ONBOARDING" && (
        <>
          <p className="mt-1 text-sm text-muted">Not submitted yet. Still to do:</p>
          <ul className="mt-2 space-y-1.5">
            {rider.missingSteps.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-ink">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
                {s}
              </li>
            ))}
          </ul>
        </>
      )}
      {(rider.status === "REJECTED" || rider.status === "SUSPENDED") && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">{rider.status === "REJECTED" ? "Sent back: " : "Suspended: "}</span>
          {(rider.status === "REJECTED" ? rider.rejectionReason : rider.suspensionReason) ?? "No reason recorded."}
        </p>
      )}
      {rider.status === "REJECTED" && <p className="mt-2 text-sm text-muted">Waiting for the rider to fix it and submit again.</p>}
      {message && (
        <div className="mt-3">
          <FormMessage error={message} />
        </div>
      )}
      {rider.status === "ACTIVE" && (
        <button type="button" disabled={busy !== null} onClick={() => setReasonFor("suspend")} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
          <Ban aria-hidden className="size-4" />
          Suspend rider
        </button>
      )}
      {rider.status === "SUSPENDED" && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void go("reactivate", () => reactivateRider(rider.riderId))}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
        >
          {busy === "reactivate" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <RotateCcw aria-hidden className="size-4" />}
          Reactivate rider
        </button>
      )}
    </section>
  );
}

function CashSection({ rider, run, busy }: { rider: AdminRider; run: Run; busy: string | null }) {
  const id = useId();
  const { sessionExpired } = useAuth();
  const [limit, setLimit] = useState(rider.cashLimit == null ? "" : String(rider.cashLimit));
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<RiderCash | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadHistory(page: number) {
    setLoadingHistory(true);
    const res = await loadRiderCashPage(rider.riderId, page);
    setLoadingHistory(false);
    if (res.ok) {
      setHistory(res.data);
      setHistoryPage(page);
    } else if (res.error.code === "UNAUTHENTICATED") sessionExpired();
    else toastError(res.error.message);
  }

  async function saveLimit() {
    setErrors({});
    const value = limit.trim() === "" ? null : Number(limit);
    const res = await run("limit", () => setCashLimit(rider.riderId, value));
    if (!res.ok) setErrors(res.error.fieldErrors);
  }

  async function deposit() {
    setErrors({});
    const res = await run("deposit", () => recordDeposit(rider.riderId, Number(amount), reference, rider.cashInHand), () => {
      setAmount("");
      setReference("");
    });
    if (!res.ok) setErrors(res.error.fieldErrors);
    else if (history) void loadHistory(0);
  }

  const field = "min-h-11 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40";
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold text-ink">
        <Wallet aria-hidden className="size-5 text-brand-deep" />
        Cash
      </h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-sm text-muted">Holds for 360mart</p>
          <CashMeter cashInHand={rider.cashInHand} cashLimit={rider.effectiveCashLimit} compact />
        </div>
        <div>
          <label htmlFor={`${id}-limit`} className="text-sm font-semibold text-ink">
            Cash limit for this rider
          </label>
          <div className="mt-1.5 flex gap-2">
            <input id={`${id}-limit`} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={`Default (${money(rider.effectiveCashLimit)})`} aria-invalid={!!errors.cashLimit} className={`${field} ${errors.cashLimit ? "border-red-500" : "border-line"}`} />
            <button type="button" disabled={busy !== null} onClick={() => void saveLimit()} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
              {busy === "limit" && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Save
            </button>
          </div>
          <p className={`mt-1 text-xs ${errors.cashLimit ? "text-red-700" : "text-muted"}`}>{errors.cashLimit ?? "Leave empty to use the default from Delivery settings."}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-surface p-4">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <HandCoins aria-hidden className="size-4" />
          Record cash handed in
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start">
          <div>
            <label htmlFor={`${id}-amount`} className="sr-only">
              Amount in rupees
            </label>
            <input id={`${id}-amount`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ₹" aria-invalid={!!errors.amount} className={`${field} ${errors.amount ? "border-red-500" : "border-line"}`} />
            {errors.amount && <p className="mt-1 text-xs text-red-700">{errors.amount}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-ref`} className="sr-only">
              Reference
            </label>
            <input id={`${id}-ref`} value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} placeholder="Reference (UPI ID, receipt no.) optional" aria-invalid={!!errors.reference} className={`${field} ${errors.reference ? "border-red-500" : "border-line"}`} />
            {errors.reference && <p className="mt-1 text-xs text-red-700">{errors.reference}</p>}
          </div>
          <button type="button" disabled={busy !== null || rider.cashInHand <= 0} onClick={() => void deposit()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-50">
            {busy === "deposit" && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Record
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Only what the rider actually handed in. It lowers their cash in hand.</p>
      </div>

      <div className="mt-5">
        {history ? (
          <CashHistory cash={history} page={historyPage} loading={loadingHistory} onPage={(p) => void loadHistory(p)} />
        ) : (
          <button type="button" onClick={() => void loadHistory(0)} disabled={loadingHistory} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            {loadingHistory && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Show cash history
          </button>
        )}
      </div>
    </section>
  );
}

function CashHistory({ cash, page, loading, onPage }: { cash: RiderCash; page: number; loading: boolean; onPage: (p: number) => void }) {
  const items: CashEntry[] = cash.entries.items;
  if (!items.length) return <p className="text-sm text-muted">No cash collected or handed in yet.</p>;
  return (
    <div className={loading ? "opacity-60" : ""}>
      <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
        {items.map((e, i) => (
          <li key={`${e.createdAt}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{e.type === "COLLECTED" ? `Collected${e.orderNumber ? ` · ${e.orderNumber}` : ""}` : "Handed in"}</span>
              <span className="block truncate text-xs text-muted">{[when(e.createdAt), e.reference].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className={`block font-bold ${e.type === "COLLECTED" ? "text-ink" : "text-fresh"}`}>
                {e.type === "COLLECTED" ? "+" : "−"} {money(e.amount)}
              </span>
              <span className="block text-xs text-muted">Holds {money(e.balanceAfter)}</span>
            </span>
          </li>
        ))}
      </ul>
      {cash.entries.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <button type="button" disabled={page === 0 || loading} onClick={() => onPage(page - 1)} className="min-h-10 rounded-full px-4 font-semibold text-ink ring-1 ring-line disabled:opacity-40">
            Newer
          </button>
          <span className="text-muted">
            Page {page + 1} of {cash.entries.totalPages}
          </span>
          <button type="button" disabled={page + 1 >= cash.entries.totalPages || loading} onClick={() => onPage(page + 1)} className="min-h-10 rounded-full px-4 font-semibold text-ink ring-1 ring-line disabled:opacity-40">
            Older
          </button>
        </div>
      )}
    </div>
  );
}

function ReasonForm({ label, placeholder, submitLabel, busy, serverError, onCancel, onSubmit }: { label: string; placeholder: string; submitLabel: string; busy: boolean; serverError?: string | null; onCancel: () => void; onSubmit: (reason: string) => void }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const shown = error ?? serverError ?? undefined;
  return (
    <div className="w-full space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={REASON_MAX}
        autoFocus
        placeholder={placeholder}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value.replace(/[\r\n]+/g, " "));
          setError(undefined);
        }}
        aria-invalid={!!shown}
        className={`min-h-24 w-full rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${shown ? "border-red-500" : "border-line focus:border-ink"}`}
      />
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-red-700">{shown}</span>
        <span aria-hidden className="shrink-0 tabular-nums text-muted">
          {reason.length}/{REASON_MAX}
        </span>
      </div>
      <p className="text-xs text-muted">The rider sees this message.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const r = reason.trim();
            if (r.length < REASON_MIN) return setError(`Write ${REASON_MIN} to ${REASON_MAX} characters.`);
            onSubmit(r);
          }}
          className="flex min-h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {submitLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
