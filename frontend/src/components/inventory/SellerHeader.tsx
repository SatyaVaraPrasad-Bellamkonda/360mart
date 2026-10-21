import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Title of a shopkeeper page: where it sits (Your store › …), heading, one line of help and the page's main action. */
export function SellerHeader({ title, subtitle, crumbs = [], action }: { title: string; subtitle?: string; crumbs?: { name: string; href: string }[]; action?: ReactNode }) {
  return (
    <header className="space-y-3">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
          {[{ name: "Your store", href: "/seller" }, ...crumbs].map((c) => (
            <li key={c.href} className="flex items-center gap-1">
              <Link href={c.href} className="-my-2 inline-flex min-h-10 items-center rounded-md px-1 font-semibold hover:text-ink">
                {c.name}
              </Link>
              <ChevronRight aria-hidden className="size-4" />
            </li>
          ))}
          <li aria-current="page" className="min-w-0 truncate px-1 font-semibold text-ink">
            {title}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}

/** "Page 2 of 7" with previous / next links (the URL keeps the other filters). */
export function Pager({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const link = "flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line transition hover:ring-ink";
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {page > 0 ? (
        <Link href={href(page - 1)} className={`${link} bg-white text-ink`}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page + 1} of {totalPages}
      </span>
      {page + 1 < totalPages ? (
        <Link href={href(page + 1)} className={`${link} bg-white text-ink`}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
