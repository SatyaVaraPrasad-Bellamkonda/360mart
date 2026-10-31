import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { HomeView } from "@/components/home/HomeView";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { loadTopCategories } from "@/lib/catalog/data";
import * as api from "@/lib/home-page/service";
import { indiaMinutes } from "@/lib/home-page/validation";

export const metadata: Metadata = { title: "Home page preview", robots: { index: false, follow: false } };

// The home designer's full preview: the real home page (site header included)
// built from the draft, or from an older published version (?history=4).
// Outside the admin frame on purpose, so the designer can show it at phone width.
export default function HomePreview({ searchParams }: PageProps<"/admin/home-preview">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ searchParams }: Pick<PageProps<"/admin/home-preview">, "searchParams">) {
  await requireRole("admin");
  const { history } = await searchParams;
  const version = typeof history === "string" && /^\d{1,9}$/.test(history) ? Number(history) : null;
  const token = await getSessionToken();
  if (!token) return <CatalogUnavailable message="This preview can't be opened." />;
  const [res, top] = await Promise.all([version ? api.historyVersion(token, version) : api.preview(token), loadTopCategories()]);
  if (!res.ok) return <CatalogUnavailable message={res.error.message} />;
  return (
    <>
      <p className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-xs font-semibold text-white">
        <Eye aria-hidden className="size-4 shrink-0" />
        {version ? `Preview of published version ${version}` : "Preview of your draft"}: shoppers don&apos;t see this yet
      </p>
      <HomeView data={res.data} minute={indiaMinutes(new Date())} parents={top.ok ? top.data : []} preview />
    </>
  );
}
