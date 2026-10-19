"use client";

import { ArrowRight, Check, CircleAlert, Clock, FileText, MapPin, PartyPopper, Pencil, Send, Store as StoreIcon, Truck } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { Dialog } from "@/components/Dialog";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { Card, DocumentRow, StatusPill, StoreDetailsList, StoreHoursList } from "@/components/stores/StoreParts";
import type { MapConfig } from "@/lib/maps/config";
import { submitStoreAction, withdrawStoreAction } from "@/lib/stores/actions";
import { doneCount, firstOpenStep, isDone, STEPS, type Step } from "@/lib/stores/progress";
import { EDITABLE_STATUSES, type StoreApplication, type StoreDraft } from "@/lib/stores/types";
import { dateTimeText, emptyStoreDraft, storeSlug, toStoreDraft } from "@/lib/stores/validation";
import { ActionBar } from "./ActionBar";
import { StoreDetailsForm } from "./StoreDetailsForm";
import { StoreDocuments } from "./StoreDocuments";
import { SpecialHours } from "./SpecialHours";
import { StoreHoursForm } from "./StoreHoursForm";

type Props = {
  /** null = no application yet (the first save starts one). */
  initial: StoreApplication | null;
  /** The owner's own mobile, suggested as the store's number. */
  ownerPhone: string;
  map: MapConfig;
  /** From ?step= (links on the dashboard); otherwise the first step still to do. */
  startStep?: Step;
};

/** Changes whenever anything in the application changes (details, hours or documents). */
function version(app: StoreApplication | null): string {
  if (!app) return "none";
  // Milliseconds: a save's answer and a later re-read can spell the same time with different precision.
  return [Date.parse(app.store.updatedAt), app.store.status, app.hours.map((h) => `${h.dayOfWeek}${h.opensAt}${h.closesAt}${h.isClosed}`).join(), (app.hoursExceptions ?? []).map((e) => `${e.exceptionId}${e.date}${e.isClosed}${e.opensAt}${e.closesAt}${e.reason}`).join(), app.documents.map((d) => `${d.documentId}${d.status}`).join()].join("|");
}

// The shopkeeper's application in 4 steps. Every save returns the whole
// application, so this one state object drives the steps, the ticks and the
// submit button. While under review or live it's shown read-only.
export function StoreWizard({ initial, ownerPhone, map, startStep }: Props) {
  const top = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState(initial);
  const [step, setStep] = useState<Step>(() => (startStep && (initial || startStep === "details") ? startStep : firstOpenStep(initial)));
  // What the details form currently says, for the live preview (null = use the saved store).
  const [preview, setPreview] = useState<{ draft: StoreDraft; logo: string | null } | null>(null);
  const onDraft = useCallback((draft: StoreDraft, logo: string | null) => setPreview({ draft, logo }), []);
  // The page re-reads the application after each save (and on back/forward):
  // take its copy only when the page's data itself changes. Comparing with our
  // own state instead would undo a save whose page refresh hasn't arrived yet.
  const [pageVersion, setPageVersion] = useState(version(initial));
  if (version(initial) !== pageVersion) {
    setPageVersion(version(initial));
    setApp(initial);
  }

  // Each opening of a step gets a fresh form from the latest saved values. A
  // re-read of the same data in the background never resets what's being typed.
  const [visit, setVisit] = useState(0);

  function goTo(next: Step) {
    setStep(next);
    setVisit((v) => v + 1);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function saved(next: StoreApplication, then?: Step) {
    setApp(next);
    if (then) goTo(then);
  }

  if (app && !EDITABLE_STATUSES.includes(app.store.status)) {
    return (
      <>
        <PageTitle app={app} />
        <LockedView app={app} onChanged={(next) => saved(next, firstOpenStep(next))} onHoursSaved={(next) => saved(next)} />
      </>
    );
  }

  const meta = STEPS.find((s) => s.id === step)!;
  const index = STEPS.indexOf(meta);
  return (
    <>
      <PageTitle app={app} />
      <div ref={top} className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <StepNav app={app} step={step} onStep={goTo} />
          <div className="hidden lg:block">
            <StorePreviewCard app={app} preview={step === "details" ? preview : null} />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {app?.store.status === "REJECTED" && <RejectedBanner app={app} />}
          <div>
            <p className="text-sm font-semibold text-brand-deep">
              Step {index + 1} of {STEPS.length}
            </p>
            <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{meta.label}</h2>
            <p className="mt-0.5 text-muted">{meta.text}.</p>
          </div>

          {step === "details" && (
            <StoreDetailsForm
              key={`details-${visit}`}
              application={app}
              initial={app ? toStoreDraft(app.store) : emptyStoreDraft(ownerPhone)}
              map={map}
              onSaved={(next) => saved(next, "hours")}
              onDraft={onDraft}
            />
          )}
          {step === "hours" && app && (
            <>
              <StoreHoursForm key={`hours-${visit}`} application={app} onSaved={(next) => saved(next, "documents")} />
              <SpecialHours app={app} onChanged={(next) => saved(next)} />
            </>
          )}
          {step === "documents" && app && (
            <>
              <StoreDocuments application={app} onChanged={(next) => saved(next)} />
              <ActionBar note={isDone(app, "documents") ? "Required documents are uploaded." : "Upload the required documents to continue."}>
                <button type="button" onClick={() => goTo("submit")} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:bg-ink/85">
                  Continue
                  <ArrowRight aria-hidden className="size-4" />
                </button>
              </ActionBar>
            </>
          )}
          {step === "submit" && app && <SubmitStep app={app} onStep={goTo} onSubmitted={(next) => saved(next)} />}
        </div>
      </div>
    </>
  );
}

/** The page's heading: from the saved application, so it changes as soon as a save does. */
function PageTitle({ app }: { app: StoreApplication | null }) {
  const text =
    !app || EDITABLE_STATUSES.includes(app.store.status)
      ? "Save each step as you go, and submit when all are done."
      : app.store.status === "ACTIVE"
        ? "Your live store's details. Opening hours can be changed any time."
        : "Your application as submitted.";
  return (
    <div className="min-w-0">
      <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {app?.store.name ?? "Register your store"}
        {app && <StatusPill status={app.store.status} />}
      </h1>
      <p className="mt-1 text-muted">{text}</p>
    </div>
  );
}

/** Phones: 4 compact tabs under a progress bar. Desktop: a vertical list with what each step needs. */
function StepNav({ app, step, onStep }: { app: StoreApplication | null; step: Step; onStep: (step: Step) => void }) {
  const done = doneCount(app);
  return (
    <nav aria-label="Registration steps" className="rounded-3xl border border-line bg-white p-3 lg:p-4">
      <div className="mb-3 flex items-center justify-between px-1 text-sm">
        <span className="font-bold text-ink">Your progress</span>
        <span className="text-muted">{done} of 3 done</span>
      </div>
      <div aria-hidden className="mx-1 mb-3 h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
        <div className="h-full rounded-full bg-fresh transition-all duration-500" style={{ width: `${(done / 3) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-4 gap-1.5 lg:grid-cols-1 lg:gap-1">
        {STEPS.map((s, i) => {
          const current = s.id === step;
          const complete = isDone(app, s.id);
          // Hours, documents and submit need a saved application first.
          const locked = !app && s.id !== "details";
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onStep(s.id)}
                aria-current={current ? "step" : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-xs font-semibold transition lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left lg:text-sm ${
                  current ? "bg-ink text-white" : locked ? "cursor-not-allowed text-muted/60" : "text-ink hover:bg-surface"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-fresh text-white" : current ? "bg-white text-ink" : "bg-surface text-muted ring-1 ring-line"}`}
                >
                  {complete ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate lg:hidden">{s.short}</span>
                  <span className="hidden lg:block">{s.label}</span>
                  <span className={`hidden text-xs font-normal lg:block ${current ? "text-white/70" : "text-muted"}`}>{complete ? "Done" : locked ? "After step 1" : s.text}</span>
                </span>
                {complete && <span className="sr-only">(done)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** How the store will look to shoppers: live while editing the details, else the saved store. */
function StorePreviewCard({ app, preview }: { app: StoreApplication | null; preview: { draft: StoreDraft; logo: string | null } | null }) {
  const saved = app ? toStoreDraft(app.store) : null;
  const draft = preview?.draft ?? saved;
  const logo = preview?.logo ?? app?.store.logoUrl ?? null;
  const name = draft?.name.trim() || "Your store name";
  const place = [draft?.area, draft?.city].map((v) => v?.trim()).filter(Boolean).join(", ") || "Your area";
  const slug = draft ? storeSlug(draft) : null;
  const fee = Number(draft?.deliveryFee || 0);
  return (
    <section aria-label="Preview" className="overflow-hidden rounded-3xl border border-line bg-white">
      <p className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">How shoppers will see you</p>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <CategoryImage key={logo ?? "none"} src={logo} alt="" className="size-14 shrink-0 overflow-hidden rounded-2xl object-cover ring-1 ring-line" iconClassName="size-6" />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{name}</p>
            <p className="flex items-center gap-1 truncate text-sm text-muted">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              {place}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          {draft?.deliveryRadiusKm && (
            <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-ink ring-1 ring-line">
              <Truck aria-hidden className="size-3.5" />
              Within {draft.deliveryRadiusKm} km
            </span>
          )}
          <span className="rounded-full bg-fresh-soft px-2.5 py-1 text-fresh">{fee > 0 ? `₹${fee} delivery` : "Free delivery"}</span>
          {Number(draft?.minOrderAmount || 0) > 0 && <span className="rounded-full bg-surface px-2.5 py-1 text-ink ring-1 ring-line">Min ₹{draft?.minOrderAmount}</span>}
        </div>
        {slug && <p className="mt-3 truncate text-xs text-muted">360mart.in/{slug}</p>}
      </div>
    </section>
  );
}

function RejectedBanner({ app }: { app: StoreApplication }) {
  const rejectedDocs = app.documents.filter((d) => d.status === "REJECTED").length;
  return (
    <div role="status" className="rounded-3xl border border-red-200 bg-red-50 p-5">
      <p className="flex items-center gap-2 font-bold text-red-800">
        <CircleAlert aria-hidden className="size-5 shrink-0" />
        Changes needed before your store can go live
      </p>
      {app.store.rejectionReason && <p className="mt-2 whitespace-pre-line text-red-900">{app.store.rejectionReason}</p>}
      <p className="mt-2 text-sm text-red-800">
        Fix the points above{rejectedDocs ? `, upload new files for the ${rejectedDocs === 1 ? "rejected document" : `${rejectedDocs} rejected documents`} (the reasons are in Documents)` : ""} and submit again.
      </p>
    </div>
  );
}

// Which step a "missing" sentence belongs to, so each one can link there.
function stepOf(sentence: string): Step {
  const text = sentence.toLowerCase();
  if (text.includes("hour")) return "hours";
  if (text.includes("upload") || text.includes("document") || text.includes("certificate")) return "documents";
  return "details";
}

function SubmitStep({ app, onStep, onSubmitted }: { app: StoreApplication; onStep: (step: Step) => void; onSubmitted: (app: StoreApplication) => void }) {
  const { sessionExpired } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { readyToSubmit, missingSteps } = app.checklist;

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const res = await submitStoreAction();
      if (res.ok) {
        toastSuccess("Submitted for review. We'll check your details and documents.");
        return onSubmitted(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setMessage(res.error.message);
      toastError(`Couldn't submit. ${res.error.message}`);
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      {readyToSubmit ? (
        <>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-fresh-soft text-fresh">
            <Send aria-hidden className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">Ready to submit</h2>
          <p className="mt-1 text-muted">Our team checks your details and documents. While it&apos;s under review you can&apos;t make changes, but you can withdraw it to edit and submit again.</p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-ink">Almost there</h2>
          <p className="mt-1 text-muted">Finish these, then submit:</p>
          <ul className="mt-4 space-y-2">
            {missingSteps.map((sentence) => (
              <li key={sentence}>
                <button type="button" onClick={() => onStep(stepOf(sentence))} className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-2 text-left text-ink ring-1 ring-line hover:ring-ink">
                  <CircleAlert aria-hidden className="size-5 shrink-0 text-brand-deep" />
                  <span className="min-w-0 flex-1">{sentence}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {message && (
        <div className="mt-4">
          <FormMessage error={message} />
        </div>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!readyToSubmit || pending}
        aria-busy={pending}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/40 sm:w-64"
      >
        <Send aria-hidden className="size-4" />
        {pending ? "Submitting…" : "Submit for approval"}
      </button>
    </section>
  );
}

/** Under review, live (or suspended / closed): the application as submitted, nothing editable. */
function LockedView({ app, onChanged, onHoursSaved }: { app: StoreApplication; onChanged: (app: StoreApplication) => void; onHoursSaved: (app: StoreApplication) => void }) {
  const { store } = app;
  // Once live, the shopkeeper can still change the opening hours (in a dialog; the other details stay locked).
  const live = store.status === "ACTIVE";
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-5">
      {store.status === "PENDING_APPROVAL" && <UnderReview app={app} onWithdrawn={onChanged} />}
      {store.status === "ACTIVE" && (
        <div role="status" className="rounded-3xl border border-green-200 bg-green-50 p-5">
          <p className="flex items-center gap-2 font-bold text-green-800">
            <PartyPopper aria-hidden className="size-5" />
            Your store is approved and live
          </p>
          <p className="mt-1 text-sm text-green-900">Approved {dateTimeText(store.approvedAt)}. You can change your opening hours any time; other details can&apos;t be changed here yet.</p>
        </div>
      )}
      <Dialog open={editing} onClose={() => setEditing(false)} title="Change opening hours" description="Shoppers see the new times as soon as you save.">
        <StoreHoursForm
          application={app}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            onHoursSaved(next);
          }}
        />
      </Dialog>
      {(store.status === "SUSPENDED" || store.status === "CLOSED") && (
        <div role="status" className="rounded-3xl border border-line bg-white p-5">
          <p className="font-bold text-ink">This store is {store.status === "SUSPENDED" ? "suspended" : "closed"}.</p>
          {store.rejectionReason && <p className="mt-1 text-muted">{store.rejectionReason}</p>}
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card title="Store details" icon={StoreIcon}>
          <StoreDetailsList store={store} />
        </Card>
        <div className="space-y-5">
          <Card
            title="Opening hours"
            icon={Clock}
            action={
              live && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit opening hours"
                  title="Edit opening hours"
                  className="-my-2 flex size-10 items-center justify-center rounded-full text-ink ring-1 ring-line transition hover:bg-surface hover:ring-ink"
                >
                  <Pencil aria-hidden className="size-4" />
                </button>
              )
            }
          >
            <StoreHoursList hours={app.hours} />
          </Card>
          {store.status !== "CLOSED" && <SpecialHours app={app} onChanged={onHoursSaved} />}
          <Card title="Documents" icon={FileText}>
            {app.documents.length ? (
              <ul className="space-y-3">
                {app.documents.map((doc) => (
                  <DocumentRow key={doc.documentId} document={doc} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No documents.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function UnderReview({ app, onWithdrawn }: { app: StoreApplication; onWithdrawn: (app: StoreApplication) => void }) {
  const { sessionExpired } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function withdraw() {
    setMessage(null);
    startTransition(async () => {
      const res = await withdrawStoreAction();
      if (res.ok) {
        toastSuccess("Application withdrawn. You can edit it now.");
        return onWithdrawn(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      toastError(`Couldn't withdraw. ${res.error.message}`);
      setConfirming(false);
      setMessage(res.error.message);
    });
  }

  return (
    <div role="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <p className="flex items-center gap-2 font-bold text-amber-900">
        <Clock aria-hidden className="size-5" />
        Under review
      </p>
      <p className="mt-1 text-sm text-amber-900">
        Submitted {dateTimeText(app.store.submittedAt)}. Our team is checking your details and documents. Need to change something? Withdraw the application, edit it and submit again.
      </p>
      {message && (
        <div className="mt-3">
          <FormMessage error={message} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm font-semibold text-ink">Withdraw and go back to editing?</span>
            <button type="button" onClick={withdraw} disabled={pending} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
              {pending ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink">
              Keep it under review
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
            Withdraw application
          </button>
        )}
      </div>
    </div>
  );
}
