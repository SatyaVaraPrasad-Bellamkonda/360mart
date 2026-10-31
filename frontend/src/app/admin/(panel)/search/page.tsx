import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { SearchReport } from "@/components/admin/SearchReport";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import * as api from "@/lib/home-page/service";

export const metadata: Metadata = { title: "Search report" };

// /admin/search?days=7|30: what shoppers searched for (most first), the
// searches that found nothing (products worth listing), and the words kept
// out of trending searches. Two calls.
export default function SearchReportPage({ searchParams }: PageProps<"/admin/search">) {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <AdminPageHeader title="Search report" subtitle="What shoppers look for. Searches are stored without who searched, and deleted after 90 days." />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Report({ searchParams }: Pick<PageProps<"/admin/search">, "searchParams">) {
  await requireRole("admin");
  const { days: raw } = await searchParams;
  const days = raw === "30" ? 30 : 7;
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const [terms, hidden] = await Promise.all([api.searchTerms(token, days), api.hiddenTerms(token)]);
  if (!terms.ok) return <AdminLoadFailed message={terms.error.message} />;
  return <SearchReport key={days} days={days} terms={terms.data} hidden={hidden.ok ? hidden.data : []} />;
}
