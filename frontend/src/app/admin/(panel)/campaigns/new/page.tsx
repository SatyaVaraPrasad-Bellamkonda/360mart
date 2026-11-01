import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed } from "@/components/admin/AdminShell";
import { CampaignWorkspace } from "@/components/admin/campaigns/CampaignWorkspace";
import { requireRole } from "@/lib/auth/dal";
import { loadTopCategories } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "New campaign", robots: { index: false, follow: false } };

// /admin/campaigns/new: an empty campaign. Saved the first time with "Save
// draft", "Send test" or "Send or schedule"; it then gets its own address.
// One call (top-level categories for the link shortcuts and "Bought from").
export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div aria-hidden className="h-[40rem] animate-pulse rounded-3xl bg-line/60" />}>
      <NewCampaign />
    </Suspense>
  );
}

async function NewCampaign() {
  await requireRole("admin");
  const categories = await loadTopCategories();
  if (!categories.ok) return <AdminLoadFailed message={categories.error.message} />;
  return <CampaignWorkspace initial={null} categories={categories.data.map((c) => ({ id: c.categoryId, name: c.name, slug: c.slug }))} />;
}
