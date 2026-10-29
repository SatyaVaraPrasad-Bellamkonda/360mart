import { ArrowRight, Wallet, Radius, Scooter, ShoppingCart, BadgeCheck, Check, CircleAlert, Clock, FileText, IdCard, MapPin, Package, PartyPopper, ReceiptText, Send, ShoppingBag, Store, Truck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { HoursCard } from "@/components/seller/HoursCard";
import { placeText, StatusPill, StoreLogo } from "@/components/stores/StoreParts";
import { requireRole } from "@/lib/auth/dal";
import { loadStoreOrders } from "@/lib/orders/data";
import { loadMyStore } from "@/lib/stores/data";
import { doneCount, firstOpenStep, isDone, STEPS, type Step } from "@/lib/stores/progress";
import type { StoreApplication } from "@/lib/stores/types";
import { dateTimeText } from "@/lib/stores/validation";

export const metadata: Metadata = { title: "Your Store", robots: { index: false, follow: false } };

export default function SellerDashboardPage() {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
        <Suspense fallback={<DashboardSkeleton />}>
          <SellerDashboard />
        </Suspense>
      </div>
    </div>
  );
}

// One backend call: the shopkeeper's application (or none yet).
async function SellerDashboard() {
  const user = await requireRole("seller");
  const res = await loadMyStore("/seller");
  const app = res.ok ? res.data : null;
  // Orders only exist for a live store.
  const live = app?.store.status === "ACTIVE";
  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-deep">Seller hub</p>
          <h1 className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{user.firstName ? `Hi ${user.firstName}` : "Your store"}</h1>
        </div>
        <LogoutButton />
      </header>

      {!res.ok ? (
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {res.error.message}
        </p>
      ) : app ? (
        <Application app={app} />
      ) : (
        <Welcome />
      )}

      <section aria-labelledby="next-title" className="motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]">
        <h2 id="next-title" className="text-lg font-bold text-ink">
          {app?.store.status === "ACTIVE" ? "Run your store" : "After you go live"}
        </h2>
        <ul className={`mt-3 grid gap-3 ${live ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          <Tile
            icon={ReceiptText}
            title="Orders"
            text="Accept orders and mark them packed and delivered."
            href={live ? "/seller/orders" : undefined}
            badge={
              live && (
                <Suspense fallback={null}>
                  <NewOrdersBadge />
                </Suspense>
              )
            }
          />
          {/* Products can be set up from the moment a store is started (customers see them once it's live). */}
          <Tile icon={Package} title="Products and prices" text="Pick products from the catalogue, set prices and stock." href={app ? "/seller/products" : undefined} />
          {live && <Tile icon={Wallet} title="Payments & dues" text="Commission on cash orders and settlements with 360mart." href="/seller/ledger" />}
          <Tile icon={ShoppingBag} title="Shop on 360mart" text="Your own shopping account: addresses, profile, orders." href="/account" />
        </ul>
      </section>
    </>
  );
}

// ---- no application yet ----

const HOW_IT_WORKS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Store, title: "Tell us about your store", text: "Name, address, map pin and how far you deliver." },
  { icon: Clock, title: "Set your opening hours", text: "Day by day. Closed on Sundays? Just switch it off." },
  { icon: FileText, title: "Upload your documents", text: "Your FSSAI licence, and GST certificate if you have a GSTIN." },
  { icon: BadgeCheck, title: "We review, you go live", text: "Our team checks everything. Then shoppers nearby can find you." },
];

const NEED: { icon: LucideIcon; text: string }[] = [
  { icon: IdCard, text: "FSSAI licence number, expiry date and a photo or PDF of it" },
  { icon: MapPin, text: "Your store's full address (you'll pin it on a map)" },
  { icon: Truck, text: "How far you deliver, minimum order and delivery fee" },
  { icon: FileText, text: "GSTIN and GST certificate, only if you're registered" },
];

function Welcome() {
  return (
    <>
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-white">
        {/* Soft colour glows behind the content. */}
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-80 rounded-full bg-fresh/20 blur-3xl" />
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-white/15">
              <Store aria-hidden className="size-3.5" />
              Sell on 360mart
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Bring your store online, for shoppers in your neighbourhood</h2>
            <p className="mt-3 max-w-lg text-white/70">Three short steps. Save as you go, come back any time, and submit when you&apos;re ready.</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/seller/store" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-ink shadow-lg shadow-brand/20 transition hover:bg-amber-400">
                Start registration
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <span className="text-sm text-white/60">Only the store name is needed to start</span>
            </div>
          </div>
          <StorePreview />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6" aria-labelledby="how-title">
          <h2 id="how-title" className="text-lg font-bold text-ink">
            How it works
          </h2>
          <ol className="mt-5 space-y-0">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {/* The line joining the steps. */}
                {i < HOW_IT_WORKS.length - 1 && <span aria-hidden className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px bg-line" />}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
                  <step.icon aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="font-bold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6" aria-labelledby="need-title">
          <h2 id="need-title" className="text-lg font-bold text-ink">
            Keep these handy
          </h2>
          <ul className="mt-4 space-y-3">
            {NEED.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-ink">
                <item.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fresh" />
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

/** An illustration of a store card (clearly a sample: placeholder name, no ratings or prices). */
function StorePreview() {
  return (
    <div aria-hidden className="hidden sm:block">
      <div className="mx-auto w-72 rotate-2 rounded-3xl bg-white p-4 text-ink shadow-2xl shadow-black/40 transition-transform motion-safe:hover:rotate-0">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-soft to-green-50 text-brand-deep">
            <Store className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="font-bold">Your store name</p>
            <p className="text-xs text-muted">Your area, your city</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl bg-fresh-soft px-2.5 py-2 font-semibold text-fresh">
            <Clock className="size-3.5" />
            Open now
          </span>
          <span className="flex items-center gap-1.5 rounded-xl bg-surface px-2.5 py-2 font-semibold">
            <Truck className="size-3.5" />
            Within 3 km
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <span className="block h-2.5 w-full rounded-full bg-line" />
          <span className="block h-2.5 w-2/3 rounded-full bg-line" />
        </div>
      </div>
    </div>
  );
}

// ---- an application exists ----

const STEP_ICON: Record<Step, LucideIcon> = { details: Store, hours: Clock, documents: FileText, submit: Send };

function Application({ app }: { app: StoreApplication }) {
  if (app.store.status === "ACTIVE") return <LiveStore app={app} />;
  const { store, checklist } = app;
  const editable = store.status === "DRAFT" || store.status === "REJECTED";
  const done = doneCount(app);
  const next = firstOpenStep(app);
  const nextMeta = STEPS.find((s) => s.id === next)!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <StoreLogo store={store} className="size-16 rounded-2xl sm:size-20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-extrabold tracking-tight text-ink">{store.name}</h2>
              <StatusPill status={store.status} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{placeText(store) ?? "Area not added yet"}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink/70">360mart.in/{store.slug}</p>
          </div>
          {editable && <ProgressRing done={done} total={3} />}
        </div>

        <StatusBanner app={app} />

        {editable && (
          <ol className="border-t border-line">
            {STEPS.map((step) => {
              const complete = isDone(app, step.id);
              const Icon = STEP_ICON[step.id];
              const isNext = step.id === next && !complete;
              return (
                <li key={step.id} className="border-b border-line last:border-b-0">
                  <Link href={`/seller/store?step=${step.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface sm:px-6">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${complete ? "bg-fresh text-white" : isNext ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line"}`}>
                      {complete ? <Check aria-hidden className="size-5" strokeWidth={3} /> : <Icon aria-hidden className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{step.label}</span>
                      <span className="block truncate text-sm text-muted">{complete ? "Done" : isNext ? "Up next" : step.text}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <aside className="space-y-4">
        {editable ? (
          <section className="rounded-3xl bg-ink p-5 text-white sm:p-6">
            <p className="text-sm font-semibold text-brand">{checklist.readyToSubmit ? "All steps done" : "Your next step"}</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight">{checklist.readyToSubmit ? "Submit for review" : nextMeta.label}</p>
            <p className="mt-1 text-sm text-white/70">{checklist.readyToSubmit ? "Our team checks your details and documents before you go live." : nextMeta.text}</p>
            <Link href={`/seller/store?step=${next}`} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-ink transition hover:bg-amber-400">
              {checklist.readyToSubmit ? "Review and submit" : "Continue"}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </section>
        ) : (
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <p className="font-bold text-ink">Your application</p>
            <p className="mt-1 text-sm text-muted">See everything you submitted: details, hours and documents.</p>
            <Link href="/seller/store" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-semibold text-white transition hover:bg-ink/85">
              View
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </section>
        )}
        {editable && checklist.missingSteps.length > 0 && (
          <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
            <p className="font-bold text-ink">Still needed</p>
            <ul className="mt-3 space-y-2">
              {checklist.missingSteps.map((sentence) => (
                <li key={sentence} className="flex items-start gap-2 text-sm text-ink">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-deep" />
                  {sentence}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

// "₹20", or "₹20.50" when there are paise.
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

// A live store: a storefront card (turning gradient border, slowly drifting
// aurora glows, logo with a live dot, three stat tiles with line icons), then
// its hours and holidays side by side. Every number here comes from the one load.
function LiveStore({ app }: { app: StoreApplication }) {
  const { store } = app;
  const fee = store.deliveryFee ?? 0;
  const min = store.minOrderAmount ?? 0;
  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Radius, label: "Delivers within", value: store.deliveryRadiusKm != null ? `${store.deliveryRadiusKm} km` : "Not set" },
    { icon: Scooter, label: "Delivery fee", value: fee > 0 ? money.format(fee) : "Free" },
    { icon: ShoppingCart, label: "Minimum order", value: min > 0 ? money.format(min) : "None" },
  ];
  return (
    <div className="space-y-6">
      {/* A 1.5px border: the wrapper's turning gradient shows around the card. */}
      <div className="rounded-[2rem] bg-[conic-gradient(from_var(--border-angle),#fbbf24,#f472b6,#a78bfa,#38bdf8,#fbbf24)] p-[1.5px] shadow-[0_24px_60px_-32px_rgba(124,58,237,0.35)] motion-safe:[animation:border-spin_10s_linear_infinite,fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
        <section className="relative isolate overflow-hidden rounded-[calc(2rem-1.5px)] bg-white">
          {/* Decoration only: an "aurora" of soft gold, pink, violet and sky glows drifting
              slowly, a fine grid fading from the top right, and a light sheen passing now and then. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-white to-violet-50" />
          <div aria-hidden className="absolute -left-24 -top-28 -z-10 size-80 rounded-full bg-amber-200/60 blur-3xl motion-safe:animate-drift-a" />
          <div aria-hidden className="absolute left-1/3 -top-36 -z-10 size-80 rounded-full bg-pink-200/50 blur-3xl motion-safe:animate-drift-b" />
          <div aria-hidden className="absolute -bottom-32 right-1/4 -z-10 size-96 rounded-full bg-violet-200/50 blur-3xl motion-safe:animate-drift-c" />
          <div aria-hidden className="absolute -right-24 -top-16 -z-10 size-72 rounded-full bg-sky-200/50 blur-3xl motion-safe:animate-drift-b" />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_100%_0%,black,transparent)]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/4 bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-sheen motion-reduce:hidden" />

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
                {/* The logo, with a "live" dot on its corner. */}
                <div className="relative shrink-0">
                  <StoreLogo store={store} className="size-16 rounded-2xl bg-white shadow-md shadow-slate-900/10 sm:size-20" />
                  <span className="absolute -bottom-1 -right-1 flex size-4">
                    <span aria-hidden className="absolute inline-flex size-full rounded-full bg-green-400 opacity-60 motion-safe:animate-ping" />
                    <span aria-hidden className="relative inline-flex size-4 rounded-full bg-green-500 ring-[3px] ring-white" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Your storefront</p>
                  <h2 className="mt-1 break-words text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">{store.name}</h2>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-ink ring-1 ring-line">
                      <span aria-hidden className="size-1.5 rounded-full bg-green-500" />
                      Live
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-ink/80 ring-1 ring-line">
                      <MapPin aria-hidden className="size-3.5 shrink-0 text-muted" />
                      <span className="truncate">{placeText(store) ?? "Area not added"}</span>
                    </span>
                    <span className="hidden min-w-0 items-center rounded-full bg-white px-2.5 py-1 font-medium text-muted ring-1 ring-line sm:inline-flex">
                      <span className="truncate">360mart.in/{store.slug}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Link href="/seller/store" className="group/cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/90">
                  Store details
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
                <p className="text-xs text-muted sm:text-right">Live since {dateTimeText(store.approvedAt)}</p>
              </div>
            </div>

            {/* What shoppers see. */}
            <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {facts.map((f, i) => (
                <div
                  key={f.label}
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                  className="group rounded-2xl bg-white/80 p-3 ring-1 ring-line backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)] motion-safe:animate-fade-up motion-reduce:hover:translate-y-0 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
                    <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink ring-1 ring-line transition group-hover:bg-ink group-hover:text-white sm:flex">
                      <f.icon aria-hidden className="size-4" strokeWidth={1.75} />
                    </span>
                  </div>
                  <dd className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-ink sm:mt-2 sm:text-2xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
      <HoursCard initial={app} />
    </div>
  );
}

function StatusBanner({ app }: { app: StoreApplication }) {
  const { store } = app;
  const banner =
    store.status === "PENDING_APPROVAL"
      ? { icon: Clock, tone: "bg-amber-50 text-amber-900", title: "Under review", text: `Submitted ${dateTimeText(store.submittedAt)}. Our team is checking your details and documents.` }
      : store.status === "ACTIVE"
        ? { icon: PartyPopper, tone: "bg-green-50 text-green-900", title: "Your store is live", text: `Approved ${dateTimeText(store.approvedAt)}.` }
        : store.status === "REJECTED"
          ? { icon: CircleAlert, tone: "bg-red-50 text-red-900", title: "Changes needed", text: store.rejectionReason ?? "Please check your application and submit again." }
          : store.status === "SUSPENDED" || store.status === "CLOSED"
            ? { icon: CircleAlert, tone: "bg-surface text-ink", title: store.status === "SUSPENDED" ? "Suspended" : "Closed", text: store.rejectionReason ?? "" }
            : null;
  if (!banner) return null;
  return (
    <div className={`flex items-start gap-3 border-t border-line px-5 py-4 sm:px-6 ${banner.tone}`}>
      <banner.icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">{banner.title}</p>
        {banner.text && <p className="mt-0.5 whitespace-pre-line break-words text-sm">{banner.text}</p>}
      </div>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const length = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={`${done} of ${total} steps done`} className="relative hidden size-16 shrink-0 sm:block">
      <svg viewBox="0 0 56 56" className="size-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-line" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - done / total)} className="stroke-fresh transition-all" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-ink">
        {done}/{total}
      </span>
    </div>
  );
}

// New orders waiting for an answer (one call, size 1: only the count is used).
async function NewOrdersBadge() {
  const res = await loadStoreOrders("new", 0, "/seller", 1);
  const count = res.ok ? res.data.totalItems : 0;
  if (!count) return null;
  return <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white motion-safe:animate-pop-in">{count} new</span>;
}

function Tile({ icon: Icon, title, text, href, badge }: { icon: LucideIcon; title: string; text: string; href?: string; badge?: ReactNode }) {
  const body = (
    <>
      <span className="flex size-10 items-center justify-center rounded-2xl bg-surface text-ink ring-1 ring-line">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-bold text-ink">
          {title}
          {!href && <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">Soon</span>}
          {badge}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
    </>
  );
  return (
    <li className="flex">
      {href ? (
        <Link href={href} className="flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md motion-reduce:hover:translate-y-0">
          {body}
        </Link>
      ) : (
        <div className="flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-4">{body}</div>
      )}
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-14 w-60 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-80 animate-pulse rounded-[2rem] bg-line/60" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-line/60" />
        ))}
      </div>
    </div>
  );
}
