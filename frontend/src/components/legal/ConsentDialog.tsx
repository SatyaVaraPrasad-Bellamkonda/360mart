"use client";

import { ExternalLink, FileCheck2, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/Dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { logoutAction } from "@/lib/auth/actions";
import { acceptPoliciesAction, loadConsentsAction, type ConsentPrompt } from "@/lib/legal/actions";
import { POLICY_PAGES } from "@/lib/legal/types";
import { day } from "@/lib/orders/format";

type Pending = ConsentPrompt["pending"];

const COPY = {
  updated: { title: "We've updated our terms", text: "Please read what changed and accept to keep using 360mart." },
  checkout: { title: "One step before your order", text: "Please accept the latest terms to place your order. Your cart is kept." },
  store: { title: "Accept the latest terms", text: "Your store application needs the latest versions accepted." },
} as const;

// The policies the user still has to accept, each with what changed and a
// link to read it (in a new tab, so nothing here is lost). Accept sends the
// exact versions shown; if a newer one was published meanwhile
// (POLICY_VERSION_OUTDATED), the list is reloaded and shown again.
export function ConsentDialog({
  open,
  pending,
  reason,
  onAccepted,
  onClose,
}: {
  open: boolean;
  pending: Pending;
  reason: keyof typeof COPY;
  onAccepted: () => void;
  /** Absent = blocking: no close button, Esc or backdrop; "Log out" instead. */
  onClose?: () => void;
}) {
  const { sessionExpired } = useAuth();
  const [shown, setShown] = useState<Pending>(pending);
  const [seen, setSeen] = useState(pending);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAccept, startAccept] = useTransition();
  // A new list from the parent (another prompt) replaces what's shown.
  if (pending !== seen) {
    setSeen(pending);
    setShown(pending);
    setNotice(null);
    setError(null);
  }
  const copy = COPY[reason];

  function accept() {
    setError(null);
    startAccept(async () => {
      const res = await acceptPoliciesAction(shown.map((p) => ({ policyType: p.policyType, version: p.currentVersion })));
      if (res.ok) return onAccepted();
      if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
      if (res.error.code === "POLICY_VERSION_OUTDATED") {
        const fresh = await loadConsentsAction();
        if (fresh.ok) {
          if (!fresh.data.pending.length) return onAccepted();
          setShown(fresh.data.pending);
          return setNotice("A newer version was published just now. Please have a look and accept again.");
        }
      }
      setError(res.error.message);
    });
  }

  return (
    <Dialog open={open} onClose={onClose ?? (() => {})} dismissible={!!onClose} title={copy.title} description={copy.text}>
      <div className="space-y-3 pb-5">
        {notice && <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 ring-1 ring-sky-200">{notice}</p>}
        <ul className="space-y-2.5">
          {shown.map((p) => (
            <li key={p.policyType} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-deep ring-1 ring-line">
                  <FileCheck2 aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{p.title}</p>
                  <p className="text-xs text-muted">
                    Version {p.currentVersion}
                    {p.publishedAt ? ` · updated on ${day(p.publishedAt)}` : ""}
                    {p.acceptedVersion ? ` · you accepted version ${p.acceptedVersion}` : ""}
                  </p>
                  {p.changeSummary && <p className="mt-2 text-sm text-ink/85">{p.changeSummary}</p>}
                  <a href={POLICY_PAGES[p.policyType].path} target="_blank" rel="noopener" className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brand-deep hover:underline">
                    Read the {POLICY_PAGES[p.policyType].name}
                    <ExternalLink aria-hidden className="size-3.5" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-line bg-white px-5 pb-5 pt-4 sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:px-0 sm:pb-0">
          {onClose ? (
            <button type="button" onClick={onClose} className="min-h-11 rounded-full px-5 text-sm font-semibold text-muted hover:text-ink">
              Not now
            </button>
          ) : (
            <form action={logoutAction}>
              <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-muted hover:text-ink">
                <LogOut aria-hidden className="size-4" />
                Log out instead
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={accept}
            disabled={pendingAccept || shown.length === 0}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
          >
            {pendingAccept ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ShieldCheck aria-hidden className="size-4" />}
            {pendingAccept ? "Saving…" : "I agree and continue"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
