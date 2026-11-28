import { ArrowRight, Bike, CircleAlert, History, KeyRound, Navigation, PackageCheck, Smartphone, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddEmailPrompt } from "@/components/account/AddEmailPrompt";
import { RiderApplication } from "@/components/delivery/RiderApplication";
import { CashMeter, RiderPageHeader, RiderStatusPill, TaskStatusPill } from "@/components/delivery/RiderParts";
import { VEHICLE_ICON } from "@/components/delivery/vehicle-icons";
import { LoadFailed } from "@/app/account/addresses/AddressPageHeader";
import { requireRole } from "@/lib/auth/dal";
import { loadRiderCurrent, loadRiderProfile } from "@/lib/delivery/data";
import { money } from "@/lib/delivery/format";
import { vehicleLabel, type RiderCurrent, type RiderProfile } from "@/lib/delivery/types";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Deliveries", robots: { index: false, follow: false } };

// The delivery partner's home on the website. Applying (vehicle, documents,
// submit) works fully here; the deliveries themselves (going online, offers,
// navigation, pickup photo, delivery code) happen in the phone app, which
// shares the rider's location in the background. 1 call (GET /rider/profile),
// +1 for an approved rider (GET /rider/current).
export default function RiderPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-page space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Suspense fallback={<RiderSkeleton />}>
          <RiderHome />
        </Suspense>
      </div>
    </div>
  );
}

async function RiderHome() {
  const user = await requireRole("rider");
  const res = await loadRiderProfile("/rider");
  if (!res.ok) {
    return (
      <>
        <RiderPageHeader title="Deliveries" current="/rider" />
        <LoadFailed message={res.error.message} />
      </>
    );
  }
  const p = res.data;
  const applying = p.status === "ONBOARDING" || p.status === "REJECTED" || p.status === "PENDING_APPROVAL";
  const hi = user.firstName ? `Hi ${user.firstName}` : "Hi there";

  return (
    <>
      <RiderPageHeader
        title={applying ? "Your delivery partner application" : hi}
        subtitle={applying ? "Tell us your vehicle and upload your documents. Once approved, you deliver orders from stores near you with the 360mart app." : undefined}
        current="/rider"
      >
        <RiderStatusPill status={p.status} />
      </RiderPageHeader>
      {!user.emailVerified && <AddEmailPrompt userId={user.userId} hasEmail={!!user.email} />}
      {applying ? <RiderApplication key={p.riderId} initial={p} /> : <Approved profile={p} />}
    </>
  );
}

async function Approved({ profile: p }: { profile: RiderProfile }) {
  // Only an approved rider has a current offer / delivery (others get 403 RIDER_NOT_ACTIVE).
  const current = p.status === "ACTIVE" ? await loadRiderCurrent("/rider") : null;
  const Icon = p.vehicleType ? VEHICLE_ICON[p.vehicleType] : Bike;

  return (
    <div className="space-y-5">
      {p.status === "SUSPENDED" && (
        <section className="flex gap-3 rounded-3xl bg-red-50 p-5 text-red-900 ring-1 ring-red-200 sm:p-6">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold">Your delivery account is paused</h2>
            <p className="mt-1 text-sm">{p.suspensionReason ?? "Our team has paused your account."} You can&apos;t take deliveries until it&apos;s reactivated.</p>
            <Link href="/contact" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold underline">
              Contact 360mart support
            </Link>
          </div>
        </section>
      )}

      {/* Where the work happens: the app (location in the background, 45-second offers). */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-brand/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <span aria-hidden className={`size-2 rounded-full ${p.online ? "bg-green-400" : "bg-white/50"}`} />
              {p.online ? "You're online in the app" : "You're offline"}
            </span>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">Deliveries happen in the 360mart app</h2>
            <p className="mt-2 text-sm text-white/75">Open the 360mart app on your phone and log in with this number to go online. Offers come to the app with a short time to accept, and the app shares your location while you&apos;re online.</p>
          </div>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 md:w-80 md:grid-cols-2">
            {[
              { icon: Smartphone, text: "Go online" },
              { icon: Navigation, text: "Navigate" },
              { icon: PackageCheck, text: "Pickup photo" },
              { icon: KeyRound, text: "Delivery code" },
            ].map((x) => (
              <li key={x.text} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
                <x.icon aria-hidden className="size-4 shrink-0 text-brand" />
                {x.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 lg:grid-cols-3">
        <CurrentCard current={current} />

        <Link href="/rider/cash" className="group rounded-3xl bg-white p-5 ring-1 ring-line transition hover:ring-ink/40 sm:p-6">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
            <span className="flex items-center gap-2">
              <Wallet aria-hidden className="size-4 text-brand-deep" />
              Cash in hand
            </span>
            <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
          </p>
          <div className="mt-3">
            <CashMeter cashInHand={current?.ok ? current.data.cashInHand : p.cashInHand} cashLimit={current?.ok ? current.data.cashLimit : p.cashLimit} />
          </div>
          <p className="mt-3 text-xs text-muted">Cash collected on delivery belongs to 360mart until you hand it in.</p>
        </Link>

        <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Icon aria-hidden className="size-4 text-brand-deep" />
            Your vehicle
          </p>
          <p className="mt-3 text-xl font-extrabold text-ink">{vehicleLabel(p.vehicleType) ?? "Not set"}</p>
          {p.vehicleNumber && <p className="mt-1 inline-block rounded-md bg-surface px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-ink ring-1 ring-line">{p.vehicleNumber}</p>}
          {p.approvedAt && <p className="mt-3 text-xs text-muted">Approved {when(p.approvedAt)}</p>}
          <p className="mt-1 text-xs text-muted">To change your vehicle, contact 360mart support.</p>
        </section>
      </div>

      <Link href="/rider/deliveries" className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-line transition hover:ring-ink/40">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
          <History aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">Past deliveries</span>
          <span className="block text-sm text-muted">Every delivery you took, with the cash collected</span>
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </div>
  );
}

function CurrentCard({ current }: { current: Awaited<ReturnType<typeof loadRiderCurrent>> | null }) {
  const c: RiderCurrent | null = current?.ok ? current.data : null;
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Bike aria-hidden className="size-4 text-brand-deep" />
        Right now
      </p>
      {c?.task ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-ink">Order {c.task.orderNumber}</p>
            <TaskStatusPill status={c.task.status} />
          </div>
          {c.task.pickup?.name && <p className="text-sm text-muted">From {[c.task.pickup.name, c.task.pickup.area].filter(Boolean).join(", ")}</p>}
          {c.task.paymentMethod === "COD" && c.task.amountToCollect != null && c.task.amountToCollect > 0 && (
            <p className="inline-flex rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">Collect {money(c.task.amountToCollect)} in cash</p>
          )}
          <p className="text-xs text-muted">Continue this delivery in the app.</p>
        </div>
      ) : c?.offer ? (
        <div className="mt-3">
          <p className="font-bold text-ink">A new offer is waiting</p>
          <p className="mt-1 text-sm text-muted">Order {c.offer.orderNumber}. Open the app to accept it before it expires.</p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-bold text-ink">{current && !current.ok ? "Couldn't load right now" : "No delivery in progress"}</p>
          <p className="mt-1 text-sm text-muted">{current && !current.ok ? current.error.message : "New offers appear in the app while you're online."}</p>
        </div>
      )}
    </section>
  );
}

function RiderSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="h-16 w-72 max-w-full animate-pulse rounded-2xl bg-line/60" />
      <div className="h-10 w-80 max-w-full animate-pulse rounded-full bg-line/60" />
      <div className="h-48 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-5 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
        <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
        <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
