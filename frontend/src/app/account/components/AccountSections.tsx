import { ChevronRight, LogOut, MapPin, ShieldCheck, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";

// The body of /account. Features the backend doesn't support yet are shown as
// honest "Coming soon" rows/states, never with made-up data.

function Card({ title, id, action, children }: { title: string; id: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SoonPill({ short }: { short?: boolean }) {
  return (
    <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
      {short ? "Soon" : "Coming soon"}
    </span>
  );
}

function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl bg-surface px-6 py-8 text-center sm:py-10">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
        <Icon aria-hidden className="size-7" />
      </span>
      <p className="mt-4 font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

export function OrdersCard() {
  return (
    <Card title="Your orders" id="orders-title">
      <EmptyState icon={ShoppingBag} title="No orders yet" text="When you order from neighbourhood stores, you can track it here.">
        <Link
          href="/#categories"
          className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85"
        >
          Start shopping
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </EmptyState>
    </Card>
  );
}

export function AddressesCard() {
  return (
    <Card title="Saved addresses" id="addresses-title" action={<SoonPill />}>
      <EmptyState
        icon={MapPin}
        title="No saved addresses"
        text="Soon you'll be able to save your home and work addresses for faster checkout."
      />
    </Card>
  );
}

type Row = { icon: LucideIcon; title: string; text: string; href?: string };

const SETTINGS: Row[] = [
  { icon: UserRound, title: "Profile details", text: "Name, email and photo", href: "/account/profile" },
  { icon: MapPin, title: "Saved addresses", text: "Home, work and others" },
  { icon: ShieldCheck, title: "Login & security", text: "Password and signed-in devices" },
];

export function SettingsCard() {
  return (
    <div className="space-y-4">
      <Card title="Account settings" id="settings-title">
        <ul className="-mx-2 mt-3 divide-y divide-line">
          {SETTINGS.map((row) => (
            <li key={row.title}>
              <SettingsRow row={row} />
            </li>
          ))}
        </ul>
      </Card>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex min-h-14 w-full items-center gap-3 rounded-3xl border border-line bg-white px-5 text-left font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-50"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-red-50">
            <LogOut aria-hidden className="size-4" />
          </span>
          Log out
        </button>
      </form>
    </div>
  );
}

function SettingsRow({ row }: { row: Row }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink transition group-hover:bg-brand-soft group-hover:text-brand-deep">
        <row.icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{row.title}</span>
        <span className="block truncate text-sm text-muted">{row.text}</span>
      </span>
    </>
  );

  if (!row.href) {
    return (
      <div aria-disabled className="flex min-h-16 items-center gap-3 px-2 py-2 opacity-75">
        {body}
        <SoonPill short />
      </div>
    );
  }
  return (
    <Link href={row.href} className="group flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface">
      {body}
      <ChevronRight aria-hidden className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

export function AccountSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-56 animate-pulse rounded-3xl bg-line/60 sm:h-40" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
          <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
