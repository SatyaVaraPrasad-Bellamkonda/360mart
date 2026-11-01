import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoadFailed } from "@/components/admin/AdminShell";
import { CampaignWorkspace } from "@/components/admin/campaigns/CampaignWorkspace";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import * as api from "@/lib/campaigns/service";
import { loadTopCategories } from "@/lib/catalog/data";
import { isUuidLike } from "@/lib/inventory/validation";

export const metadata: Metadata = { title: "Campaign", robots: { index: false, follow: false } };

// /admin/campaigns/[id]: the editor while it's a draft, the results once it's
// scheduled or sent. Two calls (the campaign, top-level categories).
export default function CampaignPage({ params }: PageProps<"/admin/campaigns/[campaignId]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[40rem] animate-pulse rounded-3xl bg-line/60" />}>
      <Campaign params={params} />
    </Suspense>
  );
}

async function Campaign({ params }: Pick<PageProps<"/admin/campaigns/[campaignId]">, "params">) {
  await requireRole("admin");
  const { campaignId } = await params;
  if (!isUuidLike(campaignId)) notFound();
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const [campaign, categories] = await Promise.all([api.getCampaign(token, campaignId), loadTopCategories()]);
  if (!campaign.ok) {
    if (campaign.error.code === "CAMPAIGN_NOT_FOUND") notFound();
    return <AdminLoadFailed message={campaign.error.message} />;
  }
  const options = categories.ok ? categories.data.map((c) => ({ id: c.categoryId, name: c.name, slug: c.slug })) : [];
  // Keyed on the saved version: a fresh visit after a change starts from the new copy (visited pages keep their state).
  return <CampaignWorkspace key={`${campaign.data.campaignId}@${campaign.data.updatedAt ?? campaign.data.createdAt}`} initial={campaign.data} categories={options} />;
}
