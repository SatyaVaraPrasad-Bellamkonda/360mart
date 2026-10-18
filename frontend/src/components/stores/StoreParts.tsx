import { BadgeCheck, CircleAlert, Clock, ExternalLink, FileText, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { formatMobile } from "@/lib/auth/validation";
import { DAY_LABEL, DOCUMENT_LABEL, STORE_STATUS_LABEL, STORE_STATUS_TONE, type DocumentStatus, type RequiredDocumentState, type Store, type StoreApplication, type StoreDocument, type StoreStatus } from "@/lib/stores/types";
import { dateText, dateTimeText, timeText } from "@/lib/stores/validation";

// Read-only pieces shared by the shopkeeper's pages and the admin's review:
// status pills, the store's card, its details, hours and documents.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function StatusPill({ status }: { status: StoreStatus }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${STORE_STATUS_TONE[status]}`}>{STORE_STATUS_LABEL[status]}</span>;
}

const DOC_PILL: Record<RequiredDocumentState, { label: string; tone: string; icon: LucideIcon }> = {
  MISSING: { label: "Not uploaded", tone: "bg-slate-100 text-slate-700", icon: FileText },
  PENDING: { label: "Waiting for review", tone: "bg-amber-100 text-amber-800", icon: Clock },
  VERIFIED: { label: "Verified", tone: "bg-green-100 text-green-800", icon: BadgeCheck },
  REJECTED: { label: "Rejected", tone: "bg-red-100 text-red-800", icon: CircleAlert },
};

export function DocumentPill({ status }: { status: RequiredDocumentState }) {
  const pill = DOC_PILL[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${pill.tone}`}>
      <pill.icon aria-hidden className="size-3.5" />
      {pill.label}
    </span>
  );
}

export function StoreLogo({ store, className = "size-16 rounded-2xl" }: { store: Pick<Store, "logoUrl" | "name">; className?: string }) {
  return <CategoryImage key={store.logoUrl ?? "none"} src={store.logoUrl} alt={`${store.name} logo`} className={`shrink-0 overflow-hidden object-cover ring-1 ring-line ${className}`} iconClassName="size-1/2" />;
}

/** "Kukatpally, Hyderabad" (or null while not filled in). */
export function placeText(store: Pick<Store, "area" | "city">): string | null {
  return [store.area, store.city].filter(Boolean).join(", ") || null;
}

export function Card({ title, icon: Icon, action, children }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          {Icon && <Icon aria-hidden className="size-5 text-brand-deep" />}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children ?? <span className="text-muted">Not added</span>}</dd>
    </div>
  );
}

/** Everything the owner filled in, for the admin's review and the owner's locked view. */
export function StoreDetailsList({ store }: { store: Store }) {
  const address = [store.addressLine1, store.addressLine2, store.landmark && `Near ${store.landmark}`, placeText(store), [store.state, store.pincode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const hasPin = store.latitude != null && store.longitude != null;
  return (
    <dl className="divide-y divide-line">
      <Row label="Web address">360mart.in/{store.slug}</Row>
      <Row label="About">{store.description && <span className="whitespace-pre-line">{store.description}</span>}</Row>
      <Row label="Store phone">{store.contactPhone && formatMobile(store.contactPhone)}</Row>
      <Row label="Store email">{store.contactEmail}</Row>
      <Row label="Address">{address || null}</Row>
      <Row label="Map location">
        {hasPin ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=17/${store.latitude}/${store.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="-my-2 inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-deep hover:underline"
          >
            <MapPin aria-hidden className="size-4" />
            Open on the map
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </Row>
      <Row label="Delivers within">{store.deliveryRadiusKm != null ? `${store.deliveryRadiusKm} km` : null}</Row>
      <Row label="Minimum order">{store.minOrderAmount != null ? money.format(store.minOrderAmount) : null}</Row>
      <Row label="Delivery fee">{store.deliveryFee != null ? (store.deliveryFee === 0 ? "Free" : money.format(store.deliveryFee)) : null}</Row>
      <Row label="FSSAI licence">{store.fssaiLicenseNo && `${store.fssaiLicenseNo}${store.fssaiValidUntil ? `, valid until ${dateText(store.fssaiValidUntil)}` : ""}`}</Row>
      <Row label="GSTIN">{store.gstin}</Row>
    </dl>
  );
}

export function StoreHoursList({ hours }: { hours: StoreApplication["hours"] }) {
  if (hours.length === 0) return <p className="text-sm text-muted">Opening hours aren&apos;t set yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {hours.map((day) => (
        <li key={day.dayOfWeek} className="flex items-center justify-between gap-3 py-2">
          <span className="font-semibold text-ink">{DAY_LABEL[day.dayOfWeek]}</span>
          <span className={day.isClosed ? "text-muted" : "text-ink"}>{day.isClosed ? "Closed" : `${timeText(day.opensAt)} to ${timeText(day.closesAt)}`}</span>
        </li>
      ))}
    </ul>
  );
}

/** One uploaded document: type, number, expiry, status, the admin's reason and a link to the file. */
export function DocumentRow({ document, actions }: { document: StoreDocument; actions?: ReactNode }) {
  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{DOCUMENT_LABEL[document.documentType]}</p>
          <p className="mt-0.5 text-sm text-muted">
            {[document.documentNumber && `No. ${document.documentNumber}`, document.validUntil && `Valid until ${dateText(document.validUntil)}`, `Uploaded ${dateTimeText(document.createdAt)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <DocumentPill status={document.status satisfies DocumentStatus} />
      </div>
      {document.status === "REJECTED" && document.rejectionReason && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          <span className="font-semibold">Reason: </span>
          {document.rejectionReason}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FileLink url={document.fileUrl} />
        {actions}
      </div>
    </li>
  );
}

/** Signed links last about an hour; when one fails, reloading the page gives a fresh one. */
export function FileLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-sm text-muted">File unavailable right now. Reload the page in a minute.</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
      <FileText aria-hidden className="size-4" />
      Open file
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
