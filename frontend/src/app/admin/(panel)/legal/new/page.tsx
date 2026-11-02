import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { PolicyEditor } from "@/components/admin/legal/PolicyEditor";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { legalTabHref, policyFromTab } from "@/lib/legal/admin-tabs";
import { getPolicy } from "@/lib/legal/data";
import * as api from "@/lib/legal/service";
import { POLICY_PAGES } from "@/lib/legal/types";

export const metadata: Metadata = { title: "Publish a policy version", robots: { index: false, follow: false } };

// /admin/legal/new?type=privacy: write the next version, starting from the
// current text. Two calls: the versions (for the next number, live) and the
// current text (the cached public copy; fresh right after a publish).
export default function NewPolicyVersionPage({ searchParams }: PageProps<"/admin/legal/new">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[40rem] animate-pulse rounded-3xl bg-line/60" />}>
      <Editor searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({ searchParams }: Pick<PageProps<"/admin/legal/new">, "searchParams">) {
  await requireRole("admin");
  const type = policyFromTab((await searchParams).type);
  const page = POLICY_PAGES[type];
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const [versions, current] = await Promise.all([api.adminVersions(token, type), getPolicy(type)]);
  const list = versions.ok ? versions.data : versions.error.code === "POLICY_NOT_FOUND" ? [] : null;
  if (list === null) return <AdminLoadFailed message={versions.ok ? "" : versions.error.message} />;
  if (!current.ok) return <AdminLoadFailed message={current.error.message} />;
  const latest = list.reduce((n, v) => Math.max(n, v.version), 0);
  const start = current.data ? { title: current.data.title, content: current.data.content ?? "" } : { title: page.name, content: "" };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={latest ? `New version of the ${page.name}` : `First version of the ${page.name}`}
        subtitle={latest ? `Starts from version ${latest}. Change what's needed, then publish.` : "Write the text shoppers and shopkeepers will read."}
        crumbs={[{ name: "Legal pages", href: legalTabHref(type) }]}
      />
      <PolicyEditor key={`${type}@${latest}`} type={type} start={start} nextVersion={latest + 1} />
    </div>
  );
}
