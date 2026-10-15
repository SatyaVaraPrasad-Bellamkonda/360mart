import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

type Props = { badge: string; title: string; subtitle: string; children: ReactNode };

// Common frame for the customer, shopkeeper and admin dashboards.
export function DashboardShell({ badge, title, subtitle, children }: Props) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">{badge}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-muted">{subtitle}</p>
        </div>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}

// Dashboard cards: a link when the feature exists, "Coming soon" otherwise.
export function ComingSoonGrid({ items }: { items: { icon: LucideIcon; title: string; text: string; href?: string }[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const body = (
          <>
            <item.icon aria-hidden className="size-7 text-brand-deep" />
            <h2 className="mt-3 font-bold text-ink">{item.title}</h2>
            <p className="mt-1 text-sm text-muted">{item.text}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-deep">{item.href ? "Open" : "Coming soon"}</p>
          </>
        );
        return (
          <li key={item.title} className="flex">
            {item.href ? (
              <Link href={item.href} className="w-full rounded-2xl border border-line bg-white p-5 transition hover:border-ink hover:shadow-sm">
                {body}
              </Link>
            ) : (
              <div className="w-full rounded-2xl border border-line bg-white p-5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardSkeleton() {
  return <div aria-hidden className="mx-auto h-64 max-w-6xl animate-pulse rounded-3xl bg-surface" />;
}
