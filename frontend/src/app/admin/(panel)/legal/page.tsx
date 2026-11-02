import { ExternalLink, FileText, Plus, RefreshCcw, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, PRIMARY_BUTTON } from "@/components/admin/AdminShell";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { legalTabHref, policyFromTab, tabOf } from "@/lib/legal/admin-tabs";
import * as api from "@/lib/legal/service";
import { POLICY_PAGES, POLICY_TYPES, type Policy } from "@/lib/legal/types";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Legal pages", robots: { index: false, follow: false } };

// /admin/legal?type=privacy: the versions of one policy, newest first, with how
// many people accepted each. One call (GET /admin/legal/policies/{type}/versions).
export default function LegalPage({ searchParams }: PageProps<"/admin/legal">) {
  return (
    <>
      <AdminPageHeader
        title="Legal pages"
        subtitle="Terms, privacy, refund policy and the seller agreement. Each change is published as a new version; old versions stay readable."
      />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
        <Versions searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Versions({ searchParams }: Pick<PageProps<"/admin/legal">, "searchParams">) {
  await requireRole("admin");
  const { type: typeParam } = await searchParams;
  const type = policyFromTab(typeParam);
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const res = await api.adminVersions(token, type);
  // Nothing published yet is an empty list, not an error.
  const versions = res.ok ? res.data : res.error.code === "POLICY_NOT_FOUND" ? [] : null;
  const page = POLICY_PAGES[type];
  const newHref = `/admin/legal/new?type=${tabOf(type)}`;

  return (
    <div className="space-y-4">
      <nav aria-label="Policy" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {POLICY_TYPES.map((t) => {
            const current = t === type;
            return (
              <li key={t}>
                <Link
                  href={legalTabHref(t)}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${current ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
                >
                  {POLICY_PAGES[t].name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{page.name}</h2>
          <p className="text-sm text-muted">
            Shown at{" "}
            <Link href={page.path} target="_blank" className="font-semibold text-ink underline underline-offset-2">
              {page.path}
            </Link>
            {type === "REFUND" ? ". Shoppers read it; it's never accepted." : ". People accept it at signup, and again when a version asks for it."}
          </p>
        </div>
        <Link href={newHref} className={PRIMARY_BUTTON}>
          <Plus aria-hidden className="size-4" />
          Publish a new version
        </Link>
      </div>

      {versions === null ? (
        <AdminLoadFailed message={res.ok ? "" : res.error.message} />
      ) : versions.length === 0 ? (
        <EmptyOrders icon={FileText} title="Not published yet" text={`The ${page.name} page says it's coming soon until you publish the first version.`}>
          <Link href={newHref} className={`mt-5 ${PRIMARY_BUTTON}`}>
            <Plus aria-hidden className="size-4" />
            Write the first version
          </Link>
        </EmptyOrders>
      ) : (
        <ol className="space-y-2">
          {[...versions].sort((a, b) => b.version - a.version).map((v, i) => (
            <li key={v.version}>
              <VersionRow v={v} current={i === 0} href={i === 0 ? page.path : `${page.path}/versions/${v.version}`} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function VersionRow({ v, current, href }: { v: Policy; current: boolean; href: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 ring-1 sm:p-5 ${current ? "ring-ink" : "ring-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-ink ring-1 ring-line">Version {v.version}</span>
            {current && <span className="rounded-full bg-fresh-soft px-2 py-0.5 text-xs font-bold text-fresh">Current</span>}
            {/* The backend marks a first version as needing acceptance too; the refund policy is never accepted. */}
            {v.requiresReacceptance && v.policyType !== "REFUND" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                <RefreshCcw aria-hidden className="size-3" />
                {v.version === 1 ? "Everyone accepts it" : "Asked everyone to accept again"}
              </span>
            )}
          </div>
          <p className="mt-2 break-words font-bold text-ink">{v.title}</p>
          <p className="mt-0.5 text-sm text-muted">Published {when(v.publishedAt)}</p>
        </div>
        <Link href={href} target="_blank" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-ink">
          <ExternalLink aria-hidden className="size-4" />
          View
          <span className="sr-only"> version {v.version} (opens in a new tab)</span>
        </Link>
      </div>
      {v.changeSummary && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-ink/85">{v.changeSummary}</p>}
      {v.policyType !== "REFUND" && v.acceptances !== null && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <Users aria-hidden className="size-4" />
          <span>
            <b className="font-semibold tabular-nums text-ink">{v.acceptances.toLocaleString("en-IN")}</b> {v.acceptances === 1 ? "person" : "people"} accepted this version
          </span>
        </p>
      )}
    </div>
  );
}
