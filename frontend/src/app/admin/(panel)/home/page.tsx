import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { HomeEditor } from "@/components/admin/home-editor/HomeEditor";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { loadTopCategories } from "@/lib/catalog/data";
import * as api from "@/lib/home-page/service";

export const metadata: Metadata = { title: "Design the home page" };

// /admin/home: the home page designer. Calls: the editor's data, the draft as
// shoppers would see it (names of picked products and what each row shows now)
// and the top-level categories (for the pickers).
export default function HomeDesignPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <AdminPageHeader title="Home page" subtitle="Design what shoppers see first. Changes go live when you publish." />
      <Suspense fallback={<EditorSkeleton />}>
        <Design />
      </Suspense>
    </div>
  );
}

async function Design() {
  await requireRole("admin");
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const [admin, preview, top] = await Promise.all([api.getAdminPage(token), api.preview(token), loadTopCategories()]);
  if (!admin.ok) return <AdminLoadFailed message={admin.error.message} />;
  return <HomeEditor initial={admin.data} preview={preview.ok ? preview.data : null} categories={top.ok ? top.data : []} />;
}

function EditorSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="h-12 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />
        <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
