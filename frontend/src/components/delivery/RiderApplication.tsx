"use client";

import { ArrowRight, CircleAlert, CircleCheck, FileUp, Loader2, Send, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConsentDialog } from "@/components/legal/ConsentDialog";
import { toastError, toastSuccess } from "@/components/Toaster";
import type { ApiResult } from "@/lib/api-client";
import { removeRiderDocument, saveVehicle, submitApplication, uploadRiderDocument } from "@/lib/delivery/rider-client";
import { isEditable, normalizeVehicleNumber, requiredDocuments, RIDER_DOCUMENT, RIDER_FILE_TYPES, riderFileError, vehicleLabel, type RiderDocumentType, type RiderProfile, type VehicleType } from "@/lib/delivery/types";
import { loadConsentsAction, type ConsentPrompt } from "@/lib/legal/actions";
import { when } from "@/lib/orders/format";
import { DocPill, RiderDocumentRow } from "./RiderParts";
import { VehicleFields } from "./VehicleFields";

type Saved = ApiResult<{ message: string; profile: RiderProfile | null }>;

/** Changes whenever the application's content changes (see StoreWizard: take the page's copy only then). */
const version = (p: RiderProfile) => [p.status, p.vehicleType, p.vehicleNumber, p.submittedAt, p.documents.map((d) => `${d.documentId}${d.status}`).join()].join("|");

// The rider's application (status ONBOARDING or REJECTED): the vehicle, the
// documents it needs, then submit. Under review it's shown read-only. Each
// change is one write + one read of the profile, whose missingSteps and
// canSubmit (worked out by the backend) drive the checklist and the button.
export function RiderApplication({ initial }: { initial: RiderProfile }) {
  const { user, sessionExpired } = useAuth();
  const [profile, setProfile] = useState(initial);
  const [pageVersion, setPageVersion] = useState(version(initial));
  if (version(initial) !== pageVersion) {
    setPageVersion(version(initial));
    setProfile(initial);
  }
  const [consent, setConsent] = useState<ConsentPrompt["pending"] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editable = isEditable(profile.status);

  /** Shared ending of every write: new profile in, message out. */
  function settle(res: Saved, fail?: (code: string, message: string, fields: Record<string, string>) => void): boolean {
    if (res.ok) {
      if (res.data.profile) setProfile(res.data.profile);
      toastSuccess(res.data.message);
      return true;
    }
    if (res.error.code === "UNAUTHENTICATED") {
      sessionExpired();
      return false;
    }
    fail?.(res.error.code, res.error.message, res.error.fieldErrors);
    toastError(res.error.message);
    return false;
  }

  async function submit() {
    setSubmitting(true);
    const res = await submitApplication();
    setSubmitting(false);
    if (!res.ok && res.error.code === "CONSENT_REQUIRED") {
      const prompt = await loadConsentsAction();
      if (prompt.ok && prompt.data.pending.length) return setConsent(prompt.data.pending);
    }
    settle(res);
  }

  const needed = requiredDocuments(profile.licenceRequired);
  const noName = !user?.firstName;

  return (
    <div className="space-y-5">
      {profile.status === "REJECTED" && (
        <section className="flex gap-3 rounded-3xl bg-red-50 p-5 text-red-900 ring-1 ring-red-200 sm:p-6">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold">Please fix your application</h2>
            <p className="mt-1 text-sm">{profile.rejectionReason ?? "Our team asked for changes. Check the documents below."}</p>
            <p className="mt-1 text-sm">Make the changes, then submit it again.</p>
          </div>
        </section>
      )}

      {profile.status === "PENDING_APPROVAL" && (
        <section className="flex gap-3 rounded-3xl bg-amber-50 p-5 text-amber-950 ring-1 ring-amber-200 sm:p-6">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <h2 className="font-bold">Your application is under review</h2>
            <p className="mt-1 text-sm">
              {profile.submittedAt ? `Submitted ${when(profile.submittedAt)}. ` : ""}Our team checks your documents. You&apos;ll see the result here and in the 360mart app.
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <VehicleCard profile={profile} editable={editable} onSaved={settle} />
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="font-bold text-ink">Documents</h2>
            <p className="mt-1 text-sm text-muted">
              PDF, JPEG or PNG, up to 5 MB each.{" "}
              {profile.licenceRequired ? "Your vehicle needs a licence, so we also need your driving licence and the vehicle's RC." : "Only an ID proof is needed for your vehicle."}
            </p>
            <ul className="mt-4 space-y-4">
              {needed.map((type) => (
                <DocumentSlot key={type} type={type} profile={profile} editable={editable} onSaved={settle} />
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {noName && (
            <Link href="/account/profile" className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-line transition hover:ring-ink/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
                <UserRound aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold text-ink">Add your name</span>
                <span className="block text-muted">Stores and customers see your first name.</span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
            </Link>
          )}
          {editable && (
            <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
              {profile.canSubmit ? (
                <>
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-fresh-soft text-fresh">
                    <Send aria-hidden className="size-6" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-ink">Ready to submit</h2>
                  <p className="mt-1 text-sm text-muted">Our team checks your documents. While it&apos;s under review you can&apos;t change them.</p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-ink">Before you submit</h2>
                  <ul className="mt-3 space-y-2">
                    {profile.missingSteps.map((step) => (
                      <li key={step} className="flex gap-2 text-sm text-ink">
                        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!profile.canSubmit || submitting}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:bg-ink/30"
              >
                {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
                {submitting ? "Submitting…" : profile.status === "REJECTED" ? "Submit again" : "Submit application"}
              </button>
            </section>
          )}
        </aside>
      </div>

      {consent && (
        <ConsentDialog
          open
          pending={consent}
          reason="rider"
          onClose={() => setConsent(null)}
          onAccepted={() => {
            setConsent(null);
            void submit();
          }}
        />
      )}
    </div>
  );
}

function VehicleCard({ profile, editable, onSaved }: { profile: RiderProfile; editable: boolean; onSaved: (res: Saved, fail?: (code: string, message: string, fields: Record<string, string>) => void) => boolean }) {
  const [vehicle, setVehicle] = useState<VehicleType | null>(profile.vehicleType);
  const [number, setNumber] = useState(profile.vehicleNumber ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = vehicle !== profile.vehicleType || normalizeVehicleNumber(number) !== (profile.vehicleNumber ?? null);

  if (!editable) {
    return (
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold text-ink">Vehicle</h2>
        <p className="mt-2 text-ink">
          {vehicleLabel(profile.vehicleType) ?? "Not chosen"}
          {profile.vehicleNumber && <span className="ml-2 rounded-md bg-surface px-1.5 font-mono text-sm font-semibold tracking-wider ring-1 ring-line">{profile.vehicleNumber}</span>}
        </p>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setErrors({});
    const res = await saveVehicle(vehicle, number);
    setSaving(false);
    onSaved(res, (_c, _m, fields) => setErrors(fields));
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="font-bold text-ink">Vehicle</h2>
      <p className="mt-1 mb-4 text-sm text-muted">The vehicle decides which orders you can take (how far, how many items).</p>
      <VehicleFields
        vehicle={vehicle}
        number={number}
        onVehicle={(v) => {
          setVehicle(v);
          setErrors((e) => ({ ...e, vehicleType: "" }));
        }}
        onNumber={setNumber}
        vehicleError={errors.vehicleType || undefined}
        numberError={errors.vehicleNumber || undefined}
        licenceRequired={vehicle === profile.vehicleType ? profile.licenceRequired : undefined}
        disabled={saving}
      />
      {dirty && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={saving} className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
            {saving && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Save vehicle
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setVehicle(profile.vehicleType);
              setNumber(profile.vehicleNumber ?? "");
              setErrors({});
            }}
            className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink"
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}

/** One required document: what's uploaded (newest first), and upload / replace / remove while it's editable. */
function DocumentSlot({ type, profile, editable, onSaved }: { type: RiderDocumentType; profile: RiderProfile; editable: boolean; onSaved: (res: Saved, fail?: (code: string, message: string, fields: Record<string, string>) => void) => boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docs = profile.documents.filter((d) => d.documentType === type).sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
  const current = docs.find((d) => d.status !== "REJECTED") ?? null;
  const state = current?.status ?? (docs.length ? "REJECTED" : "MISSING");
  const canUpload = editable && current?.status !== "VERIFIED";

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = riderFileError(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy("upload");
    const res = await uploadRiderDocument(type, file);
    setBusy(null);
    onSaved(res, (_c, message) => setError(message));
  }

  async function remove(documentId: string) {
    setBusy(documentId);
    const res = await removeRiderDocument(documentId);
    setBusy(null);
    setConfirm(null);
    onSaved(res, (_c, message) => setError(message));
  }

  return (
    <li className="rounded-2xl bg-surface/60 p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{RIDER_DOCUMENT[type].label}</p>
          <p className="text-sm text-muted">{RIDER_DOCUMENT[type].hint}</p>
        </div>
        <DocPill status={state} />
      </div>
      {docs.length > 0 && (
        <ul className="mt-3 space-y-3">
          {docs.map((doc) => (
            <RiderDocumentRow
              key={doc.documentId}
              document={doc}
              plain
              actions={
                editable &&
                doc.status === "PENDING" &&
                (confirm === doc.documentId ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">Remove this file?</span>
                    <button type="button" disabled={busy !== null} onClick={() => void remove(doc.documentId)} className="min-h-10 rounded-full bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                      {busy === doc.documentId ? "Removing…" : "Remove"}
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="min-h-10 rounded-full px-3 font-semibold text-muted hover:text-ink">
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(doc.documentId)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                    <Trash2 aria-hidden className="size-4" />
                    Remove
                  </button>
                ))
              }
            />
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {canUpload && (
        <>
          <input ref={input} type="file" accept={RIDER_FILE_TYPES.join(",")} onChange={(e) => void choose(e)} className="sr-only" tabIndex={-1} aria-hidden />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy !== null}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink disabled:opacity-60 sm:w-auto"
          >
            {busy === "upload" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileUp aria-hidden className="size-4" />}
            {busy === "upload" ? "Uploading…" : current ? "Replace file" : docs.length ? "Upload a new file" : "Upload file"}
          </button>
        </>
      )}
    </li>
  );
}
