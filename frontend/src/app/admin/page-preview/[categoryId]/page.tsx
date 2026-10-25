import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryPageView } from "@/components/category-page/CategoryPageView";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { parseCategoryId } from "@/lib/catalog/validation";
import * as api from "@/lib/category-page/service";

export const metadata: Metadata = { title: "Page preview", robots: { index: false, follow: false } };

// The page editor's full preview: the real shop page (site header included)
// built from the draft, or from an older published version (?history=4).
// Outside the admin frame on purpose, so the editor can show it in a frame at
// phone width. Live, never cached.
export default function PagePreview({ params, searchParams }: PageProps<"/admin/page-preview/[categoryId]">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <Preview params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ params, searchParams }: Pick<PageProps<"/admin/page-preview/[categoryId]">, "params" | "searchParams">) {
  await requireRole("admin");
  const [{ categoryId: raw }, { history }] = await Promise.all([params, searchParams]);
  const categoryId = parseCategoryId(raw);
  const version = typeof history === "string" && /^\d{1,9}$/.test(history) ? Number(history) : null;
  const token = await getSessionToken();
  if (categoryId === null || !token) return <CatalogUnavailable message="This preview can't be opened." />;

  const res = version ? await api.historyVersion(token, categoryId, version) : await api.preview(token, categoryId);
  if (!res.ok) return <CatalogUnavailable message={res.error.message} />;
  return (
    <>
      <p className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-xs font-semibold text-white">
        <Eye aria-hidden className="size-4 shrink-0" />
        {version ? `Preview of published version ${version}` : "Preview of your draft"}: shoppers don&apos;t see this yet
      </p>
      <CategoryPageView data={res.data} preview />
    </>
  );
}
