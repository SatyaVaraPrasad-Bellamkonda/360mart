"use client";

import { AlertTriangle, ImagePlus, Loader2, Minus, Plus, SendHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { toastError, toastSuccess } from "@/components/Toaster";
import { addTicketPhotoAction, createTicketAction } from "@/lib/support/actions";
import { CATEGORIES, needsItems, type SupportCategory } from "@/lib/support/types";
import { descriptionError, photoError, PHOTO_TYPES, SUPPORT_LIMITS } from "@/lib/support/validation";

export type FormOrder = {
  orderId: string;
  orderNumber: string;
  storeName: string;
  items: { listingId: string; productName: string; variantLabel: string; imageUrl: string | null; received: number }[];
};

type Photo = { file: File; preview: string };
type Banner = { title: string; text: string; link?: { href: string; label: string } };

// A new support request: what's wrong (only the choices allowed right now),
// which items and how many (item problems), what happened, and up to 3
// photos. The request is created first, then the photos go up one by one,
// then the shopper lands on the request page.
export function TicketForm({ order, categories }: { order: FormOrder | null; categories: SupportCategory[] }) {
  const router = useRouter();
  const { sessionExpired } = useAuth();
  const descId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<SupportCategory | null>(categories.length === 1 ? categories[0] : null);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const withItems = !!category && needsItems(category) && !!order;

  function choose(c: SupportCategory) {
    setCategory(c);
    setErrors({});
    setBanner(null);
  }

  function setQty(listingId: string, qty: number) {
    setPicked((now) => {
      const next = { ...now };
      if (qty <= 0) delete next[listingId];
      else next[listingId] = qty;
      return next;
    });
  }

  function addPhotos(files: FileList | null) {
    // Copy first: the FileList is live, and clearing the input (so the same file can be picked again) empties it.
    const chosen = Array.from(files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    for (const file of chosen.slice(0, SUPPORT_LIMITS.photos - photos.length)) {
      const problem = photoError(file);
      if (problem) {
        setErrors((e) => ({ ...e, photos: problem }));
        continue;
      }
      // A data URL preview: no object URL to clean up.
      const reader = new FileReader();
      reader.onload = () => setPhotos((now) => (now.length < SUPPORT_LIMITS.photos ? [...now, { file, preview: String(reader.result) }] : now));
      reader.readAsDataURL(file);
      setErrors((e) => ({ ...e, photos: "" }));
    }
  }

  async function submit() {
    if (!category || busy) return;
    const found: Record<string, string> = {};
    const d = descriptionError(description);
    if (d) found.description = d;
    const items = withItems ? Object.entries(picked).map(([listingId, quantity]) => ({ listingId, quantity })) : [];
    if (withItems && items.length === 0) found.items = "Choose the items with the problem";
    setErrors(found);
    setBanner(null);
    if (Object.keys(found).length) return;

    setBusy("Sending your request…");
    const res = await createTicketAction({ category, orderId: order?.orderId, description, items });
    if (!res.ok) {
      setBusy(null);
      const { code, message, fieldErrors } = res.error;
      if (code === "UNAUTHENTICATED") return sessionExpired();
      if (code === "TICKET_ALREADY_OPEN") {
        if (res.error.openTicketId) {
          toastError(message);
          return router.push(`/account/support/${res.error.openTicketId}`);
        }
        return setBanner({ title: "This order already has an open request", text: message, link: { href: "/account/support", label: "See your requests" } });
      }
      if (code === "TOO_MANY_OPEN_TICKETS") return setBanner({ title: "Too many open requests", text: message, link: { href: "/account/support", label: "See your requests" } });
      if (code === "ISSUE_WINDOW_CLOSED") return setBanner({ title: "This can't be reported now", text: message, link: { href: "/account/support/new", label: "Contact support without an order" } });
      if (code === "VALIDATION_FAILED") {
        // items[0].quantity → the first picked item's row.
        const mapped: Record<string, string> = {};
        for (const [field, msg] of Object.entries(fieldErrors)) {
          const m = /^items\[(\d+)\]/.exec(field);
          if (m && items[Number(m[1])]) mapped[`item:${items[Number(m[1])].listingId}`] = msg;
          else mapped[field] = msg;
        }
        setErrors(mapped);
        return setBanner({ title: "Please check the form", text: message });
      }
      return setBanner({ title: "Couldn't send your request", text: message });
    }

    const ticketId = res.data.ticketId;
    let failedPhotos = 0;
    for (let i = 0; i < photos.length; i++) {
      setBusy(`Uploading photo ${i + 1} of ${photos.length}…`);
      const form = new FormData();
      form.append("image", photos[i].file);
      const up = await addTicketPhotoAction(ticketId, form);
      if (!up.ok) failedPhotos++;
    }
    toastSuccess(res.data.message);
    if (failedPhotos) toastError(`${failedPhotos === 1 ? "A photo" : `${failedPhotos} photos`} couldn't be uploaded. You can add ${failedPhotos === 1 ? "it" : "them"} on the request page.`);
    router.push(`/account/support/${ticketId}?created=1`);
  }

  return (
    <div className="space-y-5">
      {order && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-muted ring-1 ring-line">
          About order <b className="text-ink">{order.orderNumber}</b> from <b className="text-ink">{order.storeName}</b>
        </p>
      )}

      <Section n={1} title="What's the problem?">
        <div role="radiogroup" aria-label="What's the problem?" className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => {
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(c)}
                className={`flex min-h-16 flex-col justify-center rounded-2xl px-4 py-3 text-left ring-1 transition ${on ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-ink/40"}`}
              >
                <span className="font-semibold">{CATEGORIES[c].label}</span>
                <span className={`text-xs ${on ? "text-white/75" : "text-muted"}`}>{CATEGORIES[c].hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {category && (
        <>
          {withItems && order && (
            <Section n={2} title="Which items?" text="Tick each item with the problem and how many.">
              <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
                {order.items.map((item) => {
                  const qty = picked[item.listingId] ?? 0;
                  const error = errors[`item:${item.listingId}`];
                  return (
                    <li key={item.listingId} className={`bg-white px-3 py-3 ${qty ? "bg-brand-soft/30" : ""}`}>
                      <div className="flex items-center gap-3">
                        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input type="checkbox" checked={qty > 0} onChange={(e) => setQty(item.listingId, e.target.checked ? 1 : 0)} className="size-5 shrink-0 accent-ink" />
                          <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface">
                            <CategoryImage src={item.imageUrl} alt="" className="size-full object-cover" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{item.productName}</span>
                            <span className="block text-xs text-muted">
                              {item.variantLabel} · you got {item.received}
                            </span>
                          </span>
                        </label>
                        {qty > 0 && item.received > 1 && (
                          <div className="flex shrink-0 items-center rounded-full ring-1 ring-line">
                            <button type="button" onClick={() => setQty(item.listingId, qty - 1)} aria-label={`One less ${item.productName}`} className="flex size-10 items-center justify-center rounded-full hover:bg-surface">
                              <Minus aria-hidden className="size-4" />
                            </button>
                            <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">
                              {qty}
                            </span>
                            <button type="button" onClick={() => setQty(item.listingId, Math.min(item.received, qty + 1))} disabled={qty >= item.received} aria-label={`One more ${item.productName}`} className="flex size-10 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40">
                              <Plus aria-hidden className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {error && <p className="mt-1 pl-8 text-sm text-red-700">{error}</p>}
                    </li>
                  );
                })}
              </ul>
              {order.items.length === 0 && <p className="text-sm text-muted">No items were delivered in this order, so choose another problem.</p>}
              {errors.items && <p className="text-sm text-red-700">{errors.items}</p>}
            </Section>
          )}

          <Section n={withItems ? 3 : 2} title="Tell us what happened">
            <textarea
              id={descId}
              aria-label="What happened"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={SUPPORT_LIMITS.descriptionMax}
              placeholder="For example: the milk packet was leaking when it arrived."
              aria-invalid={!!errors.description}
              className={`w-full rounded-2xl border bg-white px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-brand/40 ${errors.description ? "border-red-500" : "border-line focus:border-ink"}`}
            />
            <p className={`text-xs ${errors.description ? "font-semibold text-red-700" : "text-muted"}`}>
              {errors.description || `${description.trim().length}/${SUPPORT_LIMITS.descriptionMax} · at least ${SUPPORT_LIMITS.descriptionMin} characters`}
            </p>
          </Section>

          <Section n={withItems ? 4 : 3} title="Photos" text={`Optional, up to ${SUPPORT_LIMITS.photos}. A clear photo helps us sort it out faster.`}>
            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={p.preview.slice(-24) + i} className="relative size-24 overflow-hidden rounded-2xl ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
                  <img src={p.preview} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                  <button type="button" onClick={() => setPhotos((now) => now.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-ink/80 text-white hover:bg-ink">
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ))}
              {photos.length < SUPPORT_LIMITS.photos && (
                <button type="button" onClick={() => fileRef.current?.click()} className="flex size-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-xs font-semibold text-muted hover:border-ink hover:text-ink">
                  <ImagePlus aria-hidden className="size-6" />
                  Add photo
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} aria-label="Add photos" />
            {errors.photos ? <p className="text-sm text-red-700">{errors.photos}</p> : <p className="text-xs text-muted">JPEG or PNG, up to 2 MB each.</p>}
          </Section>

          {banner && (
            <div role="alert" className="flex items-start gap-3 rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
              <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-red-700" />
              <div className="min-w-0">
                <p className="font-semibold text-red-900">{banner.title}</p>
                <p className="text-sm text-red-800">{banner.text}</p>
                {banner.link && (
                  <Link href={banner.link.href} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ink underline">
                    {banner.link.label}
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <button type="button" onClick={submit} disabled={!!busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60 sm:w-auto">
              {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <SendHorizontal aria-hidden className="size-4" />}
              {busy ?? "Send request"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ n, title, text, children }: { n: number; title: string; text?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{title}</h2>
          {text && <p className="text-sm text-muted">{text}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
