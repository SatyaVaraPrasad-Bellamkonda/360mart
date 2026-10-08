import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoonGrid, DashboardShell, DashboardSkeleton } from "@/components/auth/DashboardShell";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  await requireRole("admin");
  return (
    <DashboardShell badge="Admin" title="Admin panel" subtitle="Manage 360mart">
      <ComingSoonGrid
        items={[
          { icon: "🏪", title: "Stores", text: "Approve new shopkeepers and manage stores." },
          { icon: "🗂️", title: "Catalogue", text: "Categories, subcategories, products and SEO text." },
          { icon: "📊", title: "Orders & reports", text: "All orders across stores, payouts and reports." },
        ]}
      />
    </DashboardShell>
  );
}
