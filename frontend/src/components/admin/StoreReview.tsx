"use client";

import { BadgeCheck, CircleAlert, Clock, FileText, Store as StoreIcon, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Card, DocumentPill, DocumentRow, placeText, StatusPill, StoreDetailsList, StoreHoursList, StoreLogo } from "@/components/stores/StoreParts";
import { formatMobile } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/auth/actions";
import { reviewDocumentAction, reviewStoreAction } from "@/lib/stores/actions";
import { DOCUMENT_LABEL, type ReviewDecision, type StoreApplication, type StoreDocument } from "@/lib/stores/types";
import { dateTimeText, reasonError, STORE_LIMITS } from "@/lib/stores/validation";

/** Changes whenever the store or any document's review changes. */
function version(app: StoreApplication): string {
  return [Date.parse(app.store.updatedAt), app.store.status, app.documents.map((d) => `${d.documentId}${d.status}`).join()].join("|");
}

// The admin's review of one application: verify or reject each document, then
// approve the store (only once every document is verified, as the backend
// requires) or send it back with a reason. Each decision returns the whole
// application, which replaces what's shown.
export function StoreReview({ initial }: { initial: StoreApplication }) {
  const [app, setApp] = useState(initial);
  // Take the page's copy only when the page's data changes (see StoreWizard).
  const [pageVersion, setPageVersion] = useState(version(initial));
  if (version(initial) !== pageVersion) {
    setPageVersion(version(initial));
    setApp(initial);
  }
  const update = (next: StoreApplication) => setApp(next);

  const { store, documents, checklist } = app;
  const reviewing = store.status === "PENDING_APPROVAL";

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <StoreLogo store={store} className="size-20 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-ink">{store.name}</p>
            <StatusPill status={store.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted">{[placeText(store), store.contactPhone && formatMobile(store.contactPhone)].filter(Boolean).join(" · ") || "Details not added yet"}</p>
          <p className="mt-0.5 text-xs text-muted">
            {store.submittedAt ? `Submitted ${dateTimeText(store.submittedAt)}` : `Started ${dateTimeText(store.createdAt)}`}
            {store.reviewedAt && ` · Last reviewed ${dateTimeText(store.reviewedAt)}`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card title="Documents" icon={FileText}>
          {checklist.requiredDocuments.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {checklist.requiredDocuments.map((doc) => (
                <li key={doc.documentType} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1 text-sm ring-1 ring-line">
                  <span className="font-semibold text-ink">{doc.label}</span>
                  <DocumentPill status={doc.status} />
                </li>
              ))}
            </ul>
          )}
          {documents.length ? (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <DocumentRow key={doc.documentId} document={doc} actions={reviewing && doc.status === "PENDING" && <DocumentDecision storeId={store.storeId} document={doc} onDone={update} />} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No documents uploaded yet.</p>
          )}
          <p className="mt-3 text-xs text-muted">File links work for about an hour. If one doesn&apos;t open, reload the page.</p>
        </Card>

        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <Decision app={app} onDone={update} />
        </div>

        <Card title="Store details" icon={StoreIcon}>
          <StoreDetailsList store={store} />
        </Card>

        <Card title="Opening hours" icon={Clock}>
          <StoreHoursList hours={app.hours} />
        </Card>
      </div>
    </div>
  );
}

/** Shared by both decisions: run the action, report expired sessions, keep the message. */
function useDecision(onDone: (app: StoreApplication) => void) {
  const { sessionExpired } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function decide(call: () => Promise<ActionResult<StoreApplication>>, done: string, after?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const res = await call();
      if (res.ok) {
        after?.();
        toastSuccess(done);
        return onDone(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setMessage(res.error.message);
      toastError(res.error.message);
    });
  }
  return { message, pending, decide };
}

function DocumentDecision({ storeId, document, onDone }: { storeId: string; document: StoreDocument; onDone: (app: StoreApplication) => void }) {
  const { message, pending, decide } = useDecision(onDone);
  const [rejecting, setRejecting] = useState(false);
  const review = (decision: ReviewDecision) =>
    decide(() => reviewDocumentAction(storeId, document.documentId, decision), `${DOCUMENT_LABEL[document.documentType]} ${decision.approved ? "verified" : "rejected"}`);

  if (rejecting) {
    return (
      <ReasonForm
        label="Why is this document rejected?"
        placeholder="The scan is unreadable. Please upload a clear photo of the full licence."
        submitLabel="Reject document"
        pending={pending}
        serverError={message}
        onCancel={() => setRejecting(false)}
        onSubmit={(reason) => review({ approved: false, reason })}
      />
    );
  }
  return (
    <>
      <button type="button" disabled={pending} onClick={() => review({ approved: true })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-fresh px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
        <BadgeCheck aria-hidden className="size-4" />
        {pending ? "Saving…" : "Verify"}
      </button>
      <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
        <X aria-hidden className="size-4" />
        Reject
      </button>
      {message && <p className="w-full text-sm text-red-700">{message}</p>}
    </>
  );
}

function Decision({ app, onDone }: { app: StoreApplication; onDone: (app: StoreApplication) => void }) {
  const { store, documents, checklist } = app;
  const { message, pending, decide } = useDecision(onDone);
  const [rejecting, setRejecting] = useState(false);

  if (store.status !== "PENDING_APPROVAL") {
    const text =
      store.status === "ACTIVE"
        ? `Approved ${dateTimeText(store.approvedAt)}. The store is live.`
        : store.status === "REJECTED"
          ? `Sent back ${dateTimeText(store.reviewedAt)}. The shopkeeper can fix it and submit again.`
          : store.status === "DRAFT"
            ? "Not submitted yet. The shopkeeper is still filling it in."
            : `This store is ${store.status === "SUSPENDED" ? "suspended" : "closed"}.`;
    return (
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold text-ink">Decision</h2>
        <p className="mt-2 text-muted">{text}</p>
        {store.status === "REJECTED" && store.rejectionReason && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="font-semibold">Reason given: </span>
            {store.rejectionReason}
          </p>
        )}
      </section>
    );
  }

  const waiting = documents.filter((d) => d.status === "PENDING").length;
  const missing = checklist.requiredDocuments.filter((d) => d.status !== "VERIFIED" && d.status !== "PENDING");
  const canApprove = waiting === 0 && checklist.requiredDocuments.every((d) => d.status === "VERIFIED");
  const blocker = waiting
    ? `Verify or reject ${waiting === 1 ? "the document" : `all ${waiting} documents`} first.`
    : missing.length
      ? `${missing.map((d) => d.label).join(" and ")} ${missing.length === 1 ? "isn't" : "aren't"} verified. Send it back so the shopkeeper uploads a new one.`
      : null;

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-ink">Decision</h2>
      <p className="mt-1 text-sm text-muted">Approving makes the store live straight away.</p>
      {blocker && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {blocker}
        </p>
      )}
      {message && !rejecting && (
        <div className="mt-3">
          <FormMessage error={message} />
        </div>
      )}
      {rejecting ? (
        <div className="mt-4">
          <ReasonForm
            label="What should the shopkeeper fix?"
            placeholder="The store address doesn't match the FSSAI licence. Please correct it and resubmit."
            submitLabel="Send back to shopkeeper"
            pending={pending}
            serverError={message}
            onCancel={() => setRejecting(false)}
            onSubmit={(reason) => decide(() => reviewStoreAction(store.storeId, { approved: false, reason }), "Sent back to the shopkeeper with your reason", () => setRejecting(false))}
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canApprove || pending}
            onClick={() => decide(() => reviewStoreAction(store.storeId, { approved: true }), `${store.name} is approved and live`)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-fresh px-6 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-fresh/40"
          >
            <BadgeCheck aria-hidden className="size-5" />
            {pending ? "Approving…" : "Approve store"}
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            Send back with a reason
          </button>
        </div>
      )}
    </section>
  );
}

function ReasonForm({ label, placeholder, submitLabel, pending, serverError, onCancel, onSubmit }: { label: string; placeholder: string; submitLabel: string; pending: boolean; serverError: string | null; onCancel: () => void; onSubmit: (reason: string) => void }) {
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
        maxLength={STORE_LIMITS.reason}
        autoFocus
        placeholder={placeholder}
        value={reason}
        onChange={(e) => {
          // One line: the backend allows no line breaks in a reason.
          setReason(e.target.value.replace(/[\r\n]+/g, " "));
          setError(undefined);
        }}
        aria-invalid={!!shown}
        aria-describedby={shown ? `${id}-error` : undefined}
        className={`min-h-24 w-full rounded-xl border bg-white px-3 py-3 text-base text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40 ${shown ? "border-red-500" : "border-line focus:border-ink"}`}
      />
      <div className="flex justify-between gap-3 text-sm">
        <span id={`${id}-error`} className="text-red-700">
          {shown}
        </span>
        <span aria-hidden className="shrink-0 tabular-nums text-muted">
          {reason.length}/{STORE_LIMITS.reason}
        </span>
      </div>
      <p className="text-xs text-muted">The shopkeeper sees this message.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const problem = reasonError(reason);
            if (problem) return setError(problem);
            onSubmit(reason);
          }}
          className="flex min-h-11 items-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Sending…" : submitLabel}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
