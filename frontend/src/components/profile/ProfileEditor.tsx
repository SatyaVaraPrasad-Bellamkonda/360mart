"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { SubmitButton, TextField } from "@/components/auth/AuthFields";
import type { ActionError } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/current-user";
import { formatMobile } from "@/lib/auth/validation";
import { removeProfileImageAction, updateProfileAction, uploadProfileImageAction } from "@/lib/profile/actions";
import { PROFILE_IMAGE_TYPES, profileErrors, profileImageError, type ProfileErrors } from "@/lib/profile/validation";
import { Avatar } from "./Avatar";

type Notice = { kind: "error" | "notice"; text: string } | null;

// The profile page's interactive part: photo (upload / remove) and the
// details form. Every change goes through a server action, which updates the
// stored userSession; we then show the returned user straight away.
export function ProfileEditor({ initialUser }: { initialUser: CurrentUser }) {
  const { user: liveUser, replaceUser, sessionExpired } = useAuth();
  // The live userSession once it's available (so the header, this page and any
  // link refresh always agree); the server's copy until then.
  const user = liveUser ?? initialUser;

  // The server copy is already updated; show it everywhere without a reload.
  const accept = replaceUser;

  // Shared handling: an ended session goes to login; anything else is shown.
  function handleError(error: ActionError, show: (text: string) => void) {
    if (error.code === "UNAUTHENTICATED") return sessionExpired();
    show(error.message);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <PhotoCard user={user} onSaved={accept} onError={handleError} />
      <DetailsCard user={user} onSaved={accept} onError={handleError} />
    </div>
  );
}

type CardProps = {
  user: CurrentUser;
  onSaved: (user: CurrentUser) => void;
  onError: (error: ActionError, show: (text: string) => void) => void;
};

function PhotoCard({ user, onSaved, onError }: CardProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Free the local preview's memory when it's replaced or the page closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function upload(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ""; // allow choosing the same file again
    const problem = profileImageError(file);
    if (problem || !file) return setNotice({ kind: "error", text: problem ?? "Choose a photo to upload." });

    setNotice(null);
    setPreview(URL.createObjectURL(file)); // show it immediately while it uploads
    const form = new FormData();
    form.append("file", file);
    startTransition(async () => {
      const res = await uploadProfileImageAction(form);
      setPreview(null);
      if (!res.ok) return onError(res.error, (text) => setNotice({ kind: "error", text }));
      onSaved(res.data);
      setNotice({ kind: "notice", text: "Photo updated." });
    });
  }

  function remove() {
    setNotice(null);
    startTransition(async () => {
      const res = await removeProfileImageAction();
      if (!res.ok) return onError(res.error, (text) => setNotice({ kind: "error", text }));
      onSaved(res.data);
      setNotice({ kind: "notice", text: "Photo removed." });
    });
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="rounded-3xl border border-line bg-white p-6">
      <h2 id={`${inputId}-title`} className="font-bold text-ink">
        Profile photo
      </h2>
      <div className="mt-4 flex items-center gap-4 md:flex-col md:items-start">
        <div className="relative">
          <Avatar user={user} size="lg" previewUrl={preview} />
          {pending && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <Loader2 aria-hidden className="size-6 animate-spin text-ink" />
              <span className="sr-only">Saving photo…</span>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            aria-disabled={pending}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${pending ? "pointer-events-none opacity-60" : ""}`}
          >
            <Camera aria-hidden className="size-4" />
            {user.profileImageUrl ? "Change photo" : "Add photo"}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={PROFILE_IMAGE_TYPES.join(",")}
              disabled={pending}
              onChange={(e) => upload(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {user.profileImageUrl && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 aria-hidden className="size-4" />
              Remove photo
            </button>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">JPEG or PNG, up to 2 MB.</p>
      <div className="mt-3" aria-live="polite">
        {notice && <Message notice={notice} />}
      </div>
    </section>
  );
}

function DetailsCard({ user, onSaved, onError }: CardProps) {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [notice, setNotice] = useState<Notice>(null);

  function save(event: FormEvent) {
    event.preventDefault();
    const found = profileErrors({ firstName, lastName, email });
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return;

    startTransition(async () => {
      const res = await updateProfileAction({ firstName, lastName, email });
      if (!res.ok) {
        const { fieldErrors, code } = res.error;
        setErrors({
          firstName: fieldErrors.firstName,
          lastName: fieldErrors.lastName,
          // 409: the email belongs to another account; show it under the field.
          email: fieldErrors.email ?? (code === "EMAIL_ALREADY_IN_USE" ? res.error.message : undefined),
        });
        if (code !== "VALIDATION_FAILED" && code !== "EMAIL_ALREADY_IN_USE") {
          onError(res.error, (text) => setNotice({ kind: "error", text }));
        }
        return;
      }
      // Show exactly what was saved (the backend trims and lowercases the email).
      setFirstName(res.data.firstName ?? "");
      setLastName(res.data.lastName ?? "");
      setEmail(res.data.email ?? "");
      onSaved(res.data);
      setNotice({ kind: "notice", text: "Profile saved." });
    });
  }

  return (
    <section aria-labelledby="details-title" className="rounded-3xl border border-line bg-white p-6">
      <h2 id="details-title" className="font-bold text-ink">
        Your details
      </h2>
      <form onSubmit={save} noValidate className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" name="firstName" autoComplete="given-name" maxLength={100} value={firstName} onChange={setFirstName} error={errors.firstName} />
          <TextField label="Last name" name="lastName" autoComplete="family-name" maxLength={100} value={lastName} onChange={setLastName} error={errors.lastName} optional />
        </div>
        <TextField label="Email" name="email" type="email" autoComplete="email" maxLength={255} value={email} onChange={setEmail} error={errors.email} optional hint="For order receipts and updates." />

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Mobile number</p>
          <p className="flex min-h-12 items-center rounded-xl bg-surface px-3 text-ink">{formatMobile(user.mobileNumber)}</p>
          <p className="mt-1.5 text-sm text-muted">Your login number can&apos;t be changed here.</p>
        </div>

        <div aria-live="polite">{notice && <Message notice={notice} />}</div>
        <div className="sm:max-w-xs">
          <SubmitButton pending={pending} label="Save changes" pendingLabel="Saving…" />
        </div>
      </form>
    </section>
  );
}

function Message({ notice }: { notice: NonNullable<Notice> }) {
  return notice.kind === "error" ? <FormMessage error={notice.text} /> : <FormMessage notice={notice.text} />;
}
