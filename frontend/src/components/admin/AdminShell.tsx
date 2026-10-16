import { ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";

// Frame of every admin page. No side menu: the dashboard is the menu (a grid of
// sections), and every other page shows where it sits (Admin › Categories) so
// one tap goes back. A slim bar on top: the panel's name, the shop and log out
// (the site header above already shows who is signed in).
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex min-h-10 items-center gap-2 rounded-full pr-2 font-extrabold tracking-tight text-ink">
            <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-brand">
              <ShieldCheck aria-hidden className="size-4" />
            </span>
            Admin
          </Link>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink">
              <ExternalLink aria-hidden className="size-4" />
              View shop
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}

export type AdminCrumb = { name: string; href: string };

/** Title of an admin page: where it sits (Admin › …), heading, one line of help and the page's main action. */
export function AdminPageHeader({ title, subtitle, action, crumbs = [] }: { title: string; subtitle?: string; action?: ReactNode; crumbs?: AdminCrumb[] }) {
  return (
    <header className="space-y-3">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
          {[{ name: "Admin", href: "/admin" }, ...crumbs].map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1">
              <Link href={crumb.href} className="-my-2 inline-flex min-h-10 items-center rounded-md px-1 font-semibold hover:text-ink">
                {crumb.name}
              </Link>
              <ChevronRight aria-hidden className="size-4" />
            </li>
          ))}
          <li aria-current="page" className="px-1 font-semibold text-ink">
            {title}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}

export function AdminSkeleton() {
  return (
    <div aria-hidden className="bg-surface">
      <div className="h-14 border-b border-line bg-white" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:py-8">
        <div className="h-44 animate-pulse rounded-3xl bg-line/60" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-line/60" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}

export function AdminLoadFailed({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
      {message}
    </p>
  );
}

export const PRIMARY_BUTTON = "flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85";
export const SECONDARY_BUTTON = "flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink";
