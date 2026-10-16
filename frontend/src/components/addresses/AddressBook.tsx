"use client";

import { Briefcase, Home, Loader2, MapPin, MapPinned, Pencil, Phone, Plus, Star, StickyNote, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { FormMessage } from "@/components/auth/AuthCard";
import { deleteAddressAction, makeDefaultAddressAction } from "@/lib/addresses/actions";
import { addressLines, hasPin, listVersion } from "@/lib/addresses/format";
import { ADDRESS_TYPE_LABEL, MAX_ADDRESSES, type Address, type AddressType } from "@/lib/addresses/types";
import { formatMobile } from "@/lib/auth/validation";

const TYPE_ICON: Record<AddressType, LucideIcon> = { HOME: Home, WORK: Briefcase, OTHER: MapPin };

type Notice = { kind: "error" | "notice"; text: string } | null;

const NOTICE_MS = 6000;

const SAVED_TEXT = { added: "Address saved.", updated: "Changes saved." } as const;

// The saved-addresses list: default first (the backend's order), with Edit,
// Make default and Delete. After make default / delete the list is re-read,
// because the backend may have moved the default to another address.
export function AddressBook({ initial, saved }: { initial: Address[]; saved: keyof typeof SAVED_TEXT | null }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const [addresses, setAddresses] = useState(initial);
  // Next.js keeps this page alive in the background (React <Activity>), so a later
  // visit brings new server data into the same component: take it over.
  const version = listVersion(initial);
  const [shown, setShown] = useState(version);
  if (version !== shown) {
    setShown(version);
    setAddresses(initial);
  }
  const [notice, setNotice] = useState<Notice>(saved ? { kind: "notice", text: SAVED_TEXT[saved] } : null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const full = addresses.length >= MAX_ADDRESSES;

  // Leaving the page hides it rather than closing it; don't come back to a
  // half-finished "Delete this address?".
  useLayoutEffect(() => () => setConfirming(null), []);

  // "Address saved." and friends go away by themselves, so they never look stale.
  useEffect(() => {
    if (notice?.kind !== "notice") return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Drop ?saved= from the URL, so a reload or a shared link doesn't repeat the message.
  useEffect(() => {
    if (saved) router.replace("/account/addresses", { scroll: false });
  }, [saved, router]);

  function run(addressId: string, action: typeof deleteAddressAction, done: string) {
    setNotice(null);
    setConfirming(null);
    setBusy(addressId);
    startTransition(async () => {
      const res = await action(addressId);
      setBusy(null);
      if (!res.ok) {
        if (res.error.code === "UNAUTHENTICATED") return sessionExpired();
        return setNotice({ kind: "error", text: res.error.message });
      }
      setAddresses(res.data.addresses);
      setNotice({ kind: res.data.notice ? "error" : "notice", text: res.data.notice ?? done });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {addresses.length} of {MAX_ADDRESSES} saved
        </p>
        {full ? (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
            You can save up to {MAX_ADDRESSES} addresses. Delete one to add another.
          </p>
        ) : (
          addresses.length > 0 && <AddButton />
        )}
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice && (notice.kind === "error" ? <FormMessage error={notice.text} /> : <FormMessage notice={notice.text} />)}
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-line bg-white px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
            <MapPin aria-hidden className="size-7" />
          </span>
          <p className="mt-4 font-bold text-ink">No saved addresses yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Save your home or work address once and choose it at checkout.</p>
          <div className="mt-5">
            <AddButton label="Add your first address" />
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.addressId}>
              <AddressCard
                address={address}
                busy={busy === address.addressId}
                disabled={busy !== null}
                confirming={confirming === address.addressId}
                onAskDelete={() => setConfirming(address.addressId)}
                onCancelDelete={() => setConfirming(null)}
                onDelete={() => run(address.addressId, deleteAddressAction, "Address deleted.")}
                onMakeDefault={() => run(address.addressId, makeDefaultAddressAction, "Default address changed.")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddButton({ label = "Add address" }: { label?: string }) {
  return (
    <Link
      href="/account/addresses/new"
      className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85"
    >
      <Plus aria-hidden className="size-4" />
      {label}
    </Link>
  );
}

type CardProps = {
  address: Address;
  busy: boolean;
  disabled: boolean;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
};

function AddressCard({ address, busy, disabled, confirming, onAskDelete, onCancelDelete, onDelete, onMakeDefault }: CardProps) {
  const Icon = TYPE_ICON[address.addressType];
  const titleId = `address-${address.addressId}`;
  return (
    <article
      aria-labelledby={titleId}
      aria-busy={busy}
      className={`flex h-full flex-col rounded-3xl border bg-white p-5 transition ${address.isDefault ? "border-brand/50 ring-1 ring-brand/30" : "border-line"} ${busy ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
          <Icon aria-hidden className="size-4" />
        </span>
        <h2 id={titleId} className="font-bold text-ink">
          {ADDRESS_TYPE_LABEL[address.addressType]}
        </h2>
        {address.isDefault && (
          <span className="ml-auto rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-deep">Default</span>
        )}
      </div>

      <p className="mt-3 break-words font-semibold text-ink">{address.recipientName}</p>
      <address className="mt-1 break-words text-sm not-italic leading-relaxed text-muted">
        {addressLines(address).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>

      <ul className="mt-3 space-y-1.5 text-sm text-muted">
        {address.alternatePhone && (
          <li className="flex items-center gap-2">
            <Phone aria-hidden className="size-4 shrink-0" />
            <span>
              <span className="sr-only">Alternate phone: </span>
              {formatMobile(address.alternatePhone)}
            </span>
          </li>
        )}
        {address.deliveryInstruction && (
          <li className="flex items-start gap-2">
            <StickyNote aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 whitespace-pre-line break-words">
              <span className="sr-only">Delivery instructions: </span>
              {address.deliveryInstruction}
            </span>
          </li>
        )}
        {hasPin(address) && (
          <li className="flex items-center gap-2 text-fresh">
            <MapPinned aria-hidden className="size-4 shrink-0" />
            Location pinned on map
          </li>
        )}
      </ul>

      <div className="mt-auto pt-4">
        {confirming ? (
          <div role="group" aria-label="Confirm delete" className="rounded-2xl bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">Delete this address?</p>
            {address.isDefault && <p className="mt-0.5 text-sm text-red-800/80">Your most recently added other address becomes the default.</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onDelete} className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800">
                Delete
              </button>
              <button type="button" onClick={onCancelDelete} autoFocus className="flex min-h-10 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                Keep
              </button>
            </div>
          </div>
        ) : (
          <div className="-mx-2 flex flex-wrap items-center gap-1 border-t border-line pt-3">
            <Link
              href={`/account/addresses/${address.addressId}/edit`}
              aria-disabled={disabled}
              className={`${ACTION} ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <Pencil aria-hidden className="size-4" />
              Edit
            </Link>
            {/* No "unset default": the default moves only by choosing another address. */}
            {!address.isDefault && (
              <button type="button" onClick={onMakeDefault} disabled={disabled} className={ACTION}>
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Star aria-hidden className="size-4" />}
                Set default
              </button>
            )}
            <button type="button" onClick={onAskDelete} disabled={disabled} className={`${ACTION} ml-auto text-red-700 hover:bg-red-50`}>
              <Trash2 aria-hidden className="size-4" />
              Delete
              <span className="sr-only"> {ADDRESS_TYPE_LABEL[address.addressType]} address</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

const ACTION = "flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm sm:px-3 font-semibold text-ink transition hover:bg-surface disabled:opacity-60";
