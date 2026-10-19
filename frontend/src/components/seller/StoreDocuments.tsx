"use client";

import { FileUp, Trash2, Upload, X } from "lucide-react";
import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { FormMessage } from "@/components/auth/AuthCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastSuccess } from "@/components/Toaster";
import { FieldError, TextField } from "@/components/auth/AuthFields";
import { DocumentPill, DocumentRow } from "@/components/stores/StoreParts";
import { deleteDocumentAction, uploadDocumentAction } from "@/lib/stores/actions";
import { DOCUMENT_HINT, DOCUMENT_LABEL, DOCUMENT_TYPES, type DocumentDraft, type DocumentErrors, type DocumentType, type RequiredDocumentState, type StoreApplication, type StoreDocument } from "@/lib/stores/types";
import { DOCUMENT_FILE_TYPES, documentErrors, STORE_LIMITS, todayInIndia } from "@/lib/stores/validation";

type Props = { application: StoreApplication; onChanged: (application: StoreApplication) => void };

// Step 3: documents. One card per type: required ones first (from the backend's
// checklist), then optional ones. A pending upload can be replaced or removed;
// a verified one is final; a rejected one stays with its reason, and a new file
// goes next to it.
export function StoreDocuments({ application, onChanged }: Props) {
  const required = new Map(application.checklist.requiredDocuments.map((d) => [d.documentType, d.status]));
  const types = [...DOCUMENT_TYPES].sort((a, b) => Number(required.has(b)) - Number(required.has(a)));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">PDF, JPEG or PNG, up to 5 MB each. Our team checks every document before your store goes live.</p>
      {types.map((type) => (
        <DocumentCard
          key={type}
          type={type}
          required={required.get(type) ?? null}
          documents={application.documents.filter((d) => d.documentType === type)}
          prefill={type === "FSSAI_LICENSE" ? { documentNumber: application.store.fssaiLicenseNo ?? "", validUntil: application.store.fssaiValidUntil ?? "" } : null}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

type CardProps = {
  type: DocumentType;
  /** Its checklist state when required; null when optional. */
  required: RequiredDocumentState | null;
  documents: StoreDocument[];
  prefill: Pick<DocumentDraft, "documentNumber" | "validUntil"> | null;
  onChanged: (application: StoreApplication) => void;
};

function DocumentCard({ type, required, documents, prefill, onChanged }: CardProps) {
  const { sessionExpired } = useAuth();
  const current = documents.find((d) => d.status !== "REJECTED") ?? null;
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const state: RequiredDocumentState = required ?? current?.status ?? (documents.length ? "REJECTED" : "MISSING");
  const canUpload = current?.status !== "VERIFIED";

  function remove(documentId: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await deleteDocumentAction(documentId);
      setRemoving(null);
      if (res.ok) {
        toastSuccess(`File removed from ${DOCUMENT_LABEL[type]}`);
        return onChanged(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setMessage(res.error.message);
      toastError(`Couldn't remove the file. ${res.error.message}`);
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-bold text-ink">
            {DOCUMENT_LABEL[type]}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${required ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line"}`}>{required ? "Required" : "Optional"}</span>
          </h2>
          <p className="mt-0.5 text-sm text-muted">{DOCUMENT_HINT[type]}</p>
        </div>
        {(required || documents.length > 0) && <DocumentPill status={state} />}
      </div>

      {documents.length > 0 && (
        <ul className="mt-4 space-y-3">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.documentId}
              document={doc}
              actions={
                doc.status === "PENDING" &&
                (removing === doc.documentId ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">Remove this file?</span>
                    <button type="button" disabled={pending} onClick={() => remove(doc.documentId)} className="min-h-10 rounded-full bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                      {pending ? "Removing…" : "Remove"}
                    </button>
                    <button type="button" disabled={pending} onClick={() => setRemoving(null)} className="min-h-10 rounded-full px-3 font-semibold text-muted hover:text-ink">
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setRemoving(doc.documentId)} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                    <Trash2 aria-hidden className="size-4" />
                    Remove
                  </button>
                ))
              }
            />
          ))}
        </ul>
      )}

      {message && (
        <div className="mt-3">
          <FormMessage error={message} />
        </div>
      )}

      {canUpload &&
        (uploading ? (
          <UploadForm type={type} prefill={prefill} replacing={current?.status === "PENDING"} onCancel={() => setUploading(false)} onUploaded={(app) => { setUploading(false); onChanged(app); }} />
        ) : (
          <button type="button" onClick={() => setUploading(true)} className="mt-4 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            <Upload aria-hidden className="size-4" />
            {current?.status === "PENDING" ? "Replace file" : documents.length ? "Upload a new file" : "Upload"}
          </button>
        ))}
    </section>
  );
}

function UploadForm({ type, prefill, replacing, onCancel, onUploaded }: { type: DocumentType; prefill: CardProps["prefill"]; replacing: boolean; onCancel: () => void; onUploaded: (app: StoreApplication) => void }) {
  const { sessionExpired } = useAuth();
  const fileId = useId();
  const [draft, setDraft] = useState<DocumentDraft>({ documentType: type, documentNumber: prefill?.documentNumber ?? "", validUntil: prefill?.validUntil ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    setFile(picked);
    // Type and size checked at once; the server checks the real content again.
    setErrors((e) => ({ ...e, file: documentErrors(draft, picked).file }));
  }

  function upload(event: FormEvent) {
    event.preventDefault();
    const found = documentErrors(draft, file);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length || !file) return toastError(`Couldn't upload. ${Object.values(found)[0] ?? "Choose the file to upload"}`);
    startTransition(async () => {
      const form = new FormData();
      form.append("document", JSON.stringify(draft));
      form.append("file", file);
      const res = await uploadDocumentAction(form);
      if (res.ok) {
        toastSuccess(`${DOCUMENT_LABEL[type]} uploaded. Our team will check it.`);
        return onUploaded(res.data);
      }
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      setErrors(res.error.fieldErrors as DocumentErrors);
      setMessage(Object.keys(res.error.fieldErrors).length ? null : res.error.message);
      toastError(`Couldn't upload. ${Object.values(res.error.fieldErrors)[0] ?? res.error.message}`);
    });
  }

  return (
    <form onSubmit={upload} noValidate className="mt-4 space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-ink">{replacing ? "Replace the file waiting for review" : `Upload your ${DOCUMENT_LABEL[type]}`}</p>
        <button type="button" onClick={onCancel} aria-label="Cancel upload" className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-white hover:text-ink">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div>
        <label htmlFor={fileId} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed bg-white px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${errors.file ? "border-red-500" : "border-line hover:border-ink"}`}>
          <FileUp aria-hidden className="size-5 shrink-0 text-brand-deep" />
          <span className="min-w-0">
            <span className="block break-all font-semibold text-ink">{file ? file.name : "Choose a file"}</span>
            <span className="block text-sm text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "PDF, JPEG or PNG, up to 5 MB"}</span>
          </span>
        </label>
        <input id={fileId} type="file" accept={DOCUMENT_FILE_TYPES.join(",")} onChange={choose} aria-invalid={!!errors.file} aria-describedby={errors.file ? `${fileId}-error` : undefined} className="sr-only" />
        <FieldError id={`${fileId}-error`} message={errors.file} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Document number" name="documentNumber" autoComplete="off" maxLength={STORE_LIMITS.documentNumber} optional value={draft.documentNumber} onChange={(v) => setDraft((d) => ({ ...d, documentNumber: v }))} error={errors.documentNumber} />
        <TextField label="Valid until" name="validUntil" type="date" autoComplete="off" maxLength={10} min={todayInIndia()} optional value={draft.validUntil} onChange={(v) => setDraft((d) => ({ ...d, validUntil: v }))} error={errors.validUntil} />
      </div>
      {message && <FormMessage error={message} />}
      <button type="submit" disabled={pending} aria-busy={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white hover:bg-ink/85 disabled:cursor-wait disabled:bg-ink/60 sm:w-auto">
        <Upload aria-hidden className="size-4" />
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
